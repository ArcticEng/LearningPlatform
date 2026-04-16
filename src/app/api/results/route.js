import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/results - get results (admin gets all, learner gets own)
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = user.role === "admin" ? {} : { userId: user.id };

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

  // Get the test and questions
  const test = await prisma.test.findUnique({
    where: { moduleId },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  if (!test) return NextResponse.json({ error: "No test found" }, { status: 404 });

  // Grade
  let score = 0;
  test.questions.forEach((q, i) => {
    if (answers[i] === q.correct) score++;
  });

  const total = test.questions.length;
  const percentage = Math.round((score / total) * 100);

  const result = await prisma.result.create({
    data: {
      score,
      total,
      percentage,
      answers: JSON.stringify(answers),
      userId: user.id,
      courseId,
      moduleId,
    },
    include: {
      user: { select: { name: true, idNumber: true } },
      course: { select: { title: true } },
      module: { select: { title: true } },
    },
  });

  return NextResponse.json({ result }, { status: 201 });
}
