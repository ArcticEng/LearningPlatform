import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/access-codes - list codes for this tenant
export async function GET() {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const codes = await prisma.accessCode.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "desc" },
  });

  // Enrich with course titles
  const courseIds = [...new Set(codes.filter(c => c.courseId).map(c => c.courseId))];
  const courses = courseIds.length > 0
    ? await prisma.course.findMany({ where: { id: { in: courseIds } }, select: { id: true, title: true } })
    : [];
  const courseMap = Object.fromEntries(courses.map(c => [c.id, c.title]));

  const enriched = codes.map(c => ({
    ...c,
    courseTitle: c.courseId ? (courseMap[c.courseId] || "Unknown") : "All Courses",
  }));

  return NextResponse.json({ codes: enriched });
}

// POST /api/access-codes - create new code
export async function POST(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.tenantId) return NextResponse.json({ error: "No tenant" }, { status: 400 });

  const { code, courseId, maxUses, expiresAt } = await req.json();
  if (!code) return NextResponse.json({ error: "Code is required" }, { status: 400 });

  const cleanCode = code.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (cleanCode.length < 3) return NextResponse.json({ error: "Code must be at least 3 characters" }, { status: 400 });

  // Check uniqueness
  const existing = await prisma.accessCode.findFirst({
    where: { code: cleanCode, tenantId: user.tenantId },
  });
  if (existing) return NextResponse.json({ error: "Code already exists" }, { status: 409 });

  // Verify course belongs to tenant if specified
  if (courseId) {
    const course = await prisma.course.findFirst({ where: { id: courseId, tenantId: user.tenantId } });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const accessCode = await prisma.accessCode.create({
    data: {
      code: cleanCode,
      tenantId: user.tenantId,
      courseId: courseId || null,
      maxUses: maxUses || 0,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json({ accessCode }, { status: 201 });
}

// PUT /api/access-codes - toggle active / update
export async function PUT(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, active, maxUses } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const code = await prisma.accessCode.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!code) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData = {};
  if (active !== undefined) updateData.active = active;
  if (maxUses !== undefined) updateData.maxUses = maxUses;

  const updated = await prisma.accessCode.update({ where: { id }, data: updateData });
  return NextResponse.json({ accessCode: updated });
}

// DELETE /api/access-codes
export async function DELETE(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  const code = await prisma.accessCode.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!code) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.accessCode.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
