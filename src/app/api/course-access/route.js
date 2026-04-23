import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/course-access?courseId=xxx or ?userId=xxx
export async function GET(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  const userId = searchParams.get("userId");

  const where = { tenantId: user.tenantId };
  if (courseId) where.courseId = courseId;
  if (userId) where.userId = userId;

  const access = await prisma.courseAccess.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, idNumber: true } },
      course: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ access });
}

// POST /api/course-access - assign course to learner
export async function POST(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, courseId } = await req.json();
  if (!userId || !courseId) return NextResponse.json({ error: "userId and courseId required" }, { status: 400 });

  // Verify both belong to tenant
  const learner = await prisma.user.findFirst({ where: { id: userId, tenantId: user.tenantId } });
  const course = await prisma.course.findFirst({ where: { id: courseId, tenantId: user.tenantId } });
  if (!learner || !course) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const access = await prisma.courseAccess.create({
      data: { userId, courseId, tenantId: user.tenantId },
    });
    return NextResponse.json({ access }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Already assigned" }, { status: 409 });
  }
}

// DELETE /api/course-access
export async function DELETE(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  const access = await prisma.courseAccess.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!access) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.courseAccess.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
