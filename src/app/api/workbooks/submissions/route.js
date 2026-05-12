import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// POST /api/workbooks/submissions — learner saves/submits answers
export async function POST(req) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workbookId, answers, submit } = await req.json();
  if (!workbookId || !answers) return NextResponse.json({ error: "workbookId and answers required" }, { status: 400 });

  const workbook = await prisma.workbook.findUnique({ where: { id: workbookId } });
  if (!workbook) return NextResponse.json({ error: "Workbook not found" }, { status: 404 });

  // Find existing submission or create new
  let submission = await prisma.workbookSubmission.findFirst({
    where: { workbookId, userId: user.id },
  });

  const data = {
    answers: JSON.stringify(answers),
    status: submit ? "submitted" : "draft",
    ...(submit ? { submittedAt: new Date() } : {}),
  };

  if (submission) {
    // Can only update if draft or returned
    if (submission.status === "submitted" || submission.status === "reviewed") {
      return NextResponse.json({ error: "Already submitted. Contact your facilitator to return it for editing." }, { status: 400 });
    }
    submission = await prisma.workbookSubmission.update({
      where: { id: submission.id },
      data,
    });
  } else {
    submission = await prisma.workbookSubmission.create({
      data: {
        workbookId,
        userId: user.id,
        tenantId: user.tenantId,
        ...data,
      },
    });
  }

  return NextResponse.json({ submission: { ...submission, answers: JSON.parse(submission.answers) } });
}

// PUT /api/workbooks/submissions — admin reviews a submission
export async function PUT(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, status, feedback, score } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const submission = await prisma.workbookSubmission.findFirst({
    where: { id, tenantId: user.tenantId },
  });
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = {};
  if (status) data.status = status; // reviewed | returned
  if (feedback !== undefined) data.feedback = feedback;
  if (score !== undefined) data.score = score;
  if (status === "reviewed") data.reviewedAt = new Date();

  const updated = await prisma.workbookSubmission.update({ where: { id }, data });
  return NextResponse.json({ submission: { ...updated, answers: JSON.parse(updated.answers) } });
}
