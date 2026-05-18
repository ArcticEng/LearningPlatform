import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { sendEmail, bookingConfirmationEmail, bookingAdminNotificationEmail } from "@/lib/email";

// GET /api/bookings — admin: list all bookings, learner: list own bookings
export async function GET(req) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const slotId = searchParams.get("slotId");

  const where = { tenantId: user.tenantId };
  if (user.role === "learner") where.userId = user.id;
  if (slotId) where.slotId = slotId;

  const bookings = await prisma.booking.findMany({
    where,
    include: { slot: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ bookings });
}

// POST /api/bookings — create a booking (public or authenticated)
export async function POST(req) {
  const { slotId, studentName, studentEmail, studentPhone, studentId, courseId, tenantSlug, userId, paymentId } = await req.json();

  if (!slotId || !studentName || !studentEmail) {
    return NextResponse.json({ error: "slotId, studentName, and studentEmail are required" }, { status: 400 });
  }

  // Find the slot
  const slot = await prisma.bookingSlot.findUnique({ where: { id: slotId } });
  if (!slot || !slot.active) return NextResponse.json({ error: "Slot not found or inactive" }, { status: 404 });

  // Check tenant has bookings enabled
  const tenant = await prisma.tenant.findUnique({ where: { id: slot.tenantId } });
  if (!tenant?.featureBookings) return NextResponse.json({ error: "Bookings not enabled" }, { status: 403 });

  // Check capacity
  if (slot.bookedCount >= slot.capacity) {
    return NextResponse.json({ error: "This slot is fully booked" }, { status: 400 });
  }

  // Check for duplicate booking (same email, same course — one booking per course)
  const existingForCourse = await prisma.booking.findFirst({
    where: {
      tenantId: slot.tenantId,
      studentEmail: studentEmail.toLowerCase().trim(),
      courseId: courseId || slot.courseId || undefined,
      status: "confirmed",
    },
  });
  if (existingForCourse) return NextResponse.json({ error: "You already have a booking for this course" }, { status: 409 });

  // Check for duplicate booking (same slot)
  const existing = await prisma.booking.findFirst({
    where: { slotId, studentEmail: studentEmail.toLowerCase().trim(), status: "confirmed" },
  });
  if (existing) return NextResponse.json({ error: "You are already booked for this slot" }, { status: 409 });

  // Create booking
  const booking = await prisma.booking.create({
    data: {
      tenantId: slot.tenantId,
      slotId,
      courseId: courseId || slot.courseId || null,
      studentName: studentName.trim(),
      studentEmail: studentEmail.toLowerCase().trim(),
      studentPhone: studentPhone || "",
      studentId: studentId || "",
      userId: userId || null,
      paymentId: paymentId || null,
    },
    include: { slot: true },
  });

  // Increment booked count
  await prisma.bookingSlot.update({
    where: { id: slotId },
    data: { bookedCount: { increment: 1 } },
  });

  // Get course name if applicable
  let courseName = "";
  if (booking.courseId) {
    const course = await prisma.course.findUnique({ where: { id: booking.courseId }, select: { title: true } });
    courseName = course?.title || "";
  }

  const dateStr = new Date(slot.date).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Send confirmation email to student
  const studentHtml = bookingConfirmationEmail({
    studentName: studentName.trim(),
    courseName,
    date: dateStr,
    startTime: slot.startTime,
    endTime: slot.endTime,
    location: slot.location,
    tenantName: tenant.name,
    tenantLogo: tenant.logoUrl ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN || "training-platform.up.railway.app"}${tenant.logoUrl}` : "",
  });

  await sendEmail({
    to: studentEmail.toLowerCase().trim(),
    subject: `Booking Confirmed — ${courseName || tenant.name}${slot.startTime ? ` on ${dateStr}` : ""}`,
    html: studentHtml,
  });

  // Send notification to admin
  if (tenant.bookingAdminEmail) {
    const adminHtml = bookingAdminNotificationEmail({
      studentName: studentName.trim(),
      studentEmail: studentEmail.toLowerCase().trim(),
      studentPhone: studentPhone || "",
      courseName,
      date: dateStr,
      startTime: slot.startTime,
      endTime: slot.endTime,
      location: slot.location,
      tenantName: tenant.name,
    });

    await sendEmail({
      to: tenant.bookingAdminEmail,
      subject: `New Booking: ${studentName.trim()} — ${dateStr}${slot.startTime ? ` at ${slot.startTime}` : ""}`,
      html: adminHtml,
    });
  }

  return NextResponse.json({ booking }, { status: 201 });
}

// DELETE /api/bookings — cancel a booking
export async function DELETE(req) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  const where = { id, tenantId: user.tenantId };
  if (user.role === "learner") where.userId = user.id;

  const booking = await prisma.booking.findFirst({ where });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.booking.update({ where: { id }, data: { status: "cancelled" } });

  // Decrement booked count
  await prisma.bookingSlot.update({
    where: { id: booking.slotId },
    data: { bookedCount: { decrement: 1 } },
  });

  return NextResponse.json({ ok: true });
}
