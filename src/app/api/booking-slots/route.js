import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/booking-slots?future=true — list slots for this tenant
export async function GET(req) {
  const user = await getSession();
  const { searchParams } = new URL(req.url);
  const futureOnly = searchParams.get("future") === "true";
  const courseId = searchParams.get("courseId");
  const tenantSlug = searchParams.get("slug"); // for public access

  let tenantId;
  if (user?.tenantId) {
    tenantId = user.tenantId;
  } else if (tenantSlug) {
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant || !tenant.featureBookings) return NextResponse.json({ error: "Not available" }, { status: 403 });
    tenantId = tenant.id;
  } else {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where = { tenantId, active: true };
  if (futureOnly) where.date = { gte: new Date() };
  if (courseId) where.courseId = courseId;

  const slots = await prisma.bookingSlot.findMany({
    where,
    include: { bookings: { where: { status: "confirmed" }, select: { id: true, studentName: true, studentEmail: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  // For non-admin users, only show available (not full) slots and hide booking details
  if (!user || user.role === "learner") {
    const publicSlots = slots
      .filter(s => s.bookedCount < s.capacity)
      .map(({ bookings, ...s }) => ({ ...s, spotsLeft: s.capacity - s.bookedCount }));
    return NextResponse.json({ slots: publicSlots });
  }

  return NextResponse.json({ slots });
}

// POST /api/booking-slots — admin creates a slot
export async function POST(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, date, startTime, endTime, location, capacity, courseId } = await req.json();
  if (!date) return NextResponse.json({ error: "Date is required" }, { status: 400 });

  const slot = await prisma.bookingSlot.create({
    data: {
      tenantId: user.tenantId,
      title: title || "",
      date: new Date(date),
      startTime: startTime || "",
      endTime: endTime || "",
      location: location || "",
      capacity: capacity || 10,
      courseId: courseId || null,
    },
  });

  return NextResponse.json({ slot }, { status: 201 });
}

// PUT /api/booking-slots — update slot
export async function PUT(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, title, date, startTime, endTime, location, capacity, active } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const slot = await prisma.bookingSlot.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!slot) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = {};
  if (title !== undefined) data.title = title;
  if (date !== undefined) data.date = new Date(date);
  if (startTime !== undefined) data.startTime = startTime;
  if (endTime !== undefined) data.endTime = endTime;
  if (location !== undefined) data.location = location;
  if (capacity !== undefined) data.capacity = capacity;
  if (active !== undefined) data.active = active;

  const updated = await prisma.bookingSlot.update({ where: { id }, data });
  return NextResponse.json({ slot: updated });
}

// DELETE /api/booking-slots
export async function DELETE(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  const slot = await prisma.bookingSlot.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!slot) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.bookingSlot.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
