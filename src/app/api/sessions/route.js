import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

// GET /api/sessions — admin: all sessions, learner: assigned sessions
export async function GET(req) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const upcoming = searchParams.get("upcoming") === "true";

  const where = { tenantId: user.tenantId };
  if (upcoming) where.date = { gte: new Date() };

  if (user.role === "learner") {
    // Learner only sees sessions they're assigned to
    const attendances = await prisma.sessionAttendee.findMany({
      where: { userId: user.id, tenantId: user.tenantId },
      include: { session: true },
      orderBy: { session: { date: "asc" } },
    });
    const sessions = attendances
      .filter(a => !upcoming || new Date(a.session.date) >= new Date())
      .map(a => ({ ...a.session, myStatus: a.status, attendeeId: a.id }));
    return NextResponse.json({ sessions });
  }

  // Admin: all sessions with attendees
  const sessions = await prisma.trainingSession.findMany({
    where,
    include: {
      attendees: {
        include: { session: false },
      },
    },
    orderBy: { date: "asc" },
  });

  // Enrich attendees with user names
  const allUserIds = sessions.flatMap(s => s.attendees.map(a => a.userId));
  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(allUserIds)] } },
    select: { id: true, name: true, idNumber: true },
  });
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  const enriched = sessions.map(s => ({
    ...s,
    attendees: s.attendees.map(a => ({
      ...a,
      userName: userMap[a.userId]?.name || "Unknown",
      userIdNumber: userMap[a.userId]?.idNumber || "",
    })),
  }));

  return NextResponse.json({ sessions: enriched });
}

// POST /api/sessions — admin creates a training session
export async function POST(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, description, date, startTime, endTime, location, notes, capacity, courseId, learnerIds } = await req.json();
  if (!title || !date) return NextResponse.json({ error: "Title and date are required" }, { status: 400 });

  const session = await prisma.trainingSession.create({
    data: {
      tenantId: user.tenantId,
      title,
      description: description || "",
      date: new Date(date),
      startTime: startTime || "",
      endTime: endTime || "",
      location: location || "",
      notes: notes || "",
      capacity: capacity || 20,
      courseId: courseId || null,
    },
  });

  // Assign learners if provided
  if (learnerIds?.length > 0) {
    for (const uid of learnerIds) {
      await prisma.sessionAttendee.create({
        data: { sessionId: session.id, userId: uid, tenantId: user.tenantId },
      }).catch(() => {});

      // Create notification for the learner
      const dateStr = new Date(date).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });
      await prisma.notification.create({
        data: {
          userId: uid,
          tenantId: user.tenantId,
          title: "New Training Session Scheduled",
          message: `You've been scheduled for "${title}" on ${dateStr}${startTime ? ` at ${startTime}` : ""}${location ? ` at ${location}` : ""}.`,
          type: "schedule",
        },
      });
    }

    // Send email notifications
    const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
    const assignedUsers = await prisma.user.findMany({
      where: { id: { in: learnerIds } },
      select: { id: true, name: true, email: true },
    });
    const dateStr = new Date(date).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    for (const u of assignedUsers) {
      if (u.email) {
        await sendEmail({
          to: u.email,
          subject: `Training Scheduled: ${title} — ${dateStr}`,
          html: sessionNotificationEmail({
            studentName: u.name,
            title,
            date: dateStr,
            startTime: startTime || "",
            endTime: endTime || "",
            location: location || "",
            notes: notes || "",
            tenantName: tenant?.name || "",
          }),
        });

        await prisma.sessionAttendee.updateMany({
          where: { sessionId: session.id, userId: u.id },
          data: { notifiedAt: new Date() },
        });
      }
    }
  }

  return NextResponse.json({ session }, { status: 201 });
}

// PUT /api/sessions — update session or manage attendees
export async function PUT(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, title, description, date, startTime, endTime, location, notes, capacity, status, addLearnerIds, removeLearnerIds } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const session = await prisma.trainingSession.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Update session fields
  const data = {};
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;
  if (date !== undefined) data.date = new Date(date);
  if (startTime !== undefined) data.startTime = startTime;
  if (endTime !== undefined) data.endTime = endTime;
  if (location !== undefined) data.location = location;
  if (notes !== undefined) data.notes = notes;
  if (capacity !== undefined) data.capacity = capacity;
  if (status !== undefined) data.status = status;

  if (Object.keys(data).length > 0) {
    await prisma.trainingSession.update({ where: { id }, data });
  }

  // Add learners
  if (addLearnerIds?.length > 0) {
    const dateStr = new Date(session.date).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });
    for (const uid of addLearnerIds) {
      await prisma.sessionAttendee.create({
        data: { sessionId: id, userId: uid, tenantId: user.tenantId },
      }).catch(() => {});

      await prisma.notification.create({
        data: {
          userId: uid,
          tenantId: user.tenantId,
          title: "Training Session Scheduled",
          message: `You've been scheduled for "${session.title}" on ${dateStr}${session.startTime ? ` at ${session.startTime}` : ""}${session.location ? ` at ${session.location}` : ""}.`,
          type: "schedule",
        },
      });
    }
  }

  // Remove learners
  if (removeLearnerIds?.length > 0) {
    await prisma.sessionAttendee.deleteMany({
      where: { sessionId: id, userId: { in: removeLearnerIds } },
    });
  }

  // Update attendee status (e.g., mark attendance)
  const { attendeeUpdates } = await req.json().catch(() => ({}));
  // This is handled by a separate endpoint

  return NextResponse.json({ ok: true });
}

// DELETE /api/sessions
export async function DELETE(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  const session = await prisma.trainingSession.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Notify attendees about cancellation
  const attendees = await prisma.sessionAttendee.findMany({ where: { sessionId: id } });
  const dateStr = new Date(session.date).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" });
  for (const a of attendees) {
    await prisma.notification.create({
      data: {
        userId: a.userId,
        tenantId: user.tenantId,
        title: "Training Session Cancelled",
        message: `The session "${session.title}" on ${dateStr} has been cancelled.`,
        type: "schedule",
      },
    });
  }

  await prisma.trainingSession.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// Email template
function sessionNotificationEmail({ studentName, title, date, startTime, endTime, location, notes, tenantName }) {
  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:0 auto;background:#fff;">
  <div style="background:#1a2e6b;padding:28px 32px;">
    <h1 style="margin:0;color:#fff;font-size:20px;">${tenantName}</h1>
    <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">Training Session Notification</p>
  </div>
  <div style="padding:32px;">
    <p style="color:#333;margin:0 0 16px;font-size:15px;">Hi ${studentName},</p>
    <p style="color:#333;margin:0 0 24px;font-size:15px;">You've been scheduled for an upcoming training session:</p>
    <div style="background:#f8f9fb;border-radius:12px;padding:20px;margin-bottom:24px;border-left:4px solid #1a2e6b;">
      <div style="font-size:18px;font-weight:700;color:#1a2e6b;margin-bottom:12px;">${title}</div>
      <div style="display:flex;flex-wrap:wrap;gap:16px;">
        <div><span style="color:#888;font-size:12px;text-transform:uppercase;">Date</span><br><strong>${date}</strong></div>
        ${startTime ? `<div><span style="color:#888;font-size:12px;text-transform:uppercase;">Time</span><br><strong>${startTime}${endTime ? ` – ${endTime}` : ""}</strong></div>` : ""}
        ${location ? `<div><span style="color:#888;font-size:12px;text-transform:uppercase;">Location</span><br><strong>${location}</strong></div>` : ""}
      </div>
      ${notes ? `<p style="margin:16px 0 0;color:#666;font-size:14px;border-top:1px solid #eee;padding-top:12px;">${notes}</p>` : ""}
    </div>
    <p style="color:#888;font-size:13px;margin:0;">Please ensure you arrive on time. Contact your facilitator if you have any questions.</p>
  </div>
  <div style="background:#f8f9fb;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
    <p style="color:#aaa;font-size:12px;margin:0;">${tenantName} • Powered by Onyx Digital</p>
  </div>
</div>
</body></html>`;
}
