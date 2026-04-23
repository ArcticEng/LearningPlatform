import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, getTenant } from "@/lib/auth";

// GET /api/courses
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let where = user.tenantId ? { tenantId: user.tenantId } : {};

  // If learner + courseAccess feature enabled, filter to assigned courses only
  if (user.role === "learner" && user.tenantId) {
    const tenant = await getTenant(user.tenantId);
    if (tenant?.featureCourseAccess) {
      const access = await prisma.courseAccess.findMany({
        where: { userId: user.id },
        select: { courseId: true },
      });
      const courseIds = access.map(a => a.courseId);
      where = { id: { in: courseIds }, tenantId: user.tenantId };
    }
  }

  const courses = await prisma.course.findMany({
    where,
    include: {
      modules: {
        orderBy: { order: "asc" },
        include: {
          test: { include: { questions: { orderBy: { order: "asc" } } } },
        },
      },
      _count: { select: { results: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ courses });
}

// POST /api/courses
export async function POST(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!user.tenantId) return NextResponse.json({ error: "No tenant context" }, { status: 400 });

  const { title, description } = await req.json();
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const course = await prisma.course.create({
    data: { title, description: description || "", tenantId: user.tenantId },
  });

  return NextResponse.json({ course }, { status: 201 });
}

// PUT /api/courses - update course
export async function PUT(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, title, description } = await req.json();
  if (!id || !title) return NextResponse.json({ error: "ID and title required" }, { status: 400 });

  const course = await prisma.course.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const updated = await prisma.course.update({
    where: { id },
    data: { title, description: description || "" },
  });

  return NextResponse.json({ course: updated });
}

// DELETE /api/courses
export async function DELETE(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  const course = await prisma.course.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  await prisma.course.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
