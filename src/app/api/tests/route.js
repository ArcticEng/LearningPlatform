import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST /api/tests - create or replace test for a module
export async function POST(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { moduleId, questions } = await req.json();
  if (!moduleId || !questions?.length) {
    return NextResponse.json({ error: "moduleId and questions required" }, { status: 400 });
  }

  // Delete existing test for this module if any
  const existing = await prisma.test.findUnique({ where: { moduleId } });
  if (existing) {
    await prisma.test.delete({ where: { id: existing.id } });
  }

  // Create new test with questions
  const test = await prisma.test.create({
    data: {
      moduleId,
      questions: {
        create: questions.map((q, i) => ({
          text: q.question || q.text,
          optionA: q.options?.[0] || q.optionA,
          optionB: q.options?.[1] || q.optionB,
          optionC: q.options?.[2] || q.optionC,
          optionD: q.options?.[3] || q.optionD,
          correct: q.correct,
          order: i,
        })),
      },
    },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json({ test }, { status: 201 });
}
