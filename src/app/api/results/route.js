import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/results
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let where = {};
  if (user.role === "learner") {
    where = { userId: user.id };
  } else if (user.tenantId) {
    where = { course: { tenantId: user.tenantId } };
  }

  const results = await prisma.result.findMany({
    where,
    include: {
      user: { select: { name: true, idNumber: true } },
      course: { select: { title: true } },
      module: { select: { title: true } },
    },
    orderBy: { completedAt: "desc" },
  });

  return NextResponse.json({ results });
}

// POST /api/results - submit a test
export async function POST(req) {
  const user = await getSession();
  if (!user || user.role !== "learner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { moduleId, courseId, answers } = await req.json();
  if (!moduleId || !courseId || !answers) {
    return NextResponse.json({ error: "moduleId, courseId, and answers required" }, { status: 400 });
  }

  // Verify course belongs to user's tenant
  const course = await prisma.course.findFirst({ where: { id: courseId, tenantId: user.tenantId } });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const test = await prisma.test.findUnique({
    where: { moduleId },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!test) return NextResponse.json({ error: "No test found" }, { status: 404 });

  let score = 0;
  test.questions.forEach((q, i) => {
    if (answers[i] === q.correct) score++;
  });

  const total = test.questions.length;
  const percentage = Math.round((score / total) * 100);

  const result = await prisma.result.create({
    data: {
      score, total, percentage,
      answers: JSON.stringify(answers),
      userId: user.id, courseId, moduleId,
    },
    include: {
      user: { select: { name: true, idNumber: true } },
      course: { select: { title: true } },
      module: { select: { title: true } },
    },
  });

  return NextResponse.json({ result }, { status: 201 });
}
