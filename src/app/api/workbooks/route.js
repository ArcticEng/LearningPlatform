import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/workbooks?moduleId=xxx — get workbook for a module
// GET /api/workbooks?moduleId=xxx&submission=true — include learner's submission
export async function GET(req) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get("moduleId");
  const workbookId = searchParams.get("workbookId");
  const includeSubmission = searchParams.get("submission") === "true";

  if (workbookId) {
    // Admin: get workbook with all submissions
    if (user.role !== "admin" && user.role !== "superadmin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const workbook = await prisma.workbook.findUnique({
      where: { id: workbookId },
      include: {
        submissions: {
          where: { status: { not: "draft" } },
          orderBy: { submittedAt: "desc" },
        },
      },
    });
    if (!workbook || workbook.tenantId !== user.tenantId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    // Enrich with user names
    const userIds = workbook.submissions.map(s => s.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, idNumber: true },
    });
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));
    const submissions = workbook.submissions.map(s => ({
      ...s,
      answers: JSON.parse(s.answers),
      userName: userMap[s.userId]?.name || "Unknown",
      userIdNumber: userMap[s.userId]?.idNumber || "",
    }));
    return NextResponse.json({ workbook: { ...workbook, sections: JSON.parse(workbook.sections), submissions } });
  }

  if (!moduleId) return NextResponse.json({ error: "moduleId required" }, { status: 400 });

  const workbook = await prisma.workbook.findUnique({ where: { moduleId } });
  if (!workbook) return NextResponse.json({ workbook: null });

  const result = { ...workbook, sections: JSON.parse(workbook.sections) };

  // Include learner's own submission if requested
  if (includeSubmission && user.role === "learner") {
    const sub = await prisma.workbookSubmission.findFirst({
      where: { workbookId: workbook.id, userId: user.id },
    });
    if (sub) {
      result.submission = { ...sub, answers: JSON.parse(sub.answers) };
    }
  }

  return NextResponse.json({ workbook: result });
}

// POST /api/workbooks — admin creates a workbook for a module
export async function POST(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { moduleId, title, sections } = await req.json();
  if (!moduleId || !sections) return NextResponse.json({ error: "moduleId and sections required" }, { status: 400 });

  // Verify module belongs to tenant
  const mod = await prisma.module.findUnique({
    where: { id: moduleId },
    include: { course: true },
  });
  if (!mod || mod.course.tenantId !== user.tenantId) {
    return NextResponse.json({ error: "Module not found" }, { status: 404 });
  }

  // Check if workbook already exists for this module
  const existing = await prisma.workbook.findUnique({ where: { moduleId } });
  if (existing) {
    // Update instead
    const updated = await prisma.workbook.update({
      where: { id: existing.id },
      data: { title: title || "", sections: JSON.stringify(sections) },
    });
    return NextResponse.json({ workbook: { ...updated, sections } });
  }

  const workbook = await prisma.workbook.create({
    data: {
      moduleId,
      tenantId: user.tenantId,
      title: title || "",
      sections: JSON.stringify(sections),
    },
  });

  return NextResponse.json({ workbook: { ...workbook, sections } }, { status: 201 });
}

// PUT /api/workbooks — update workbook sections
export async function PUT(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, title, sections } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const workbook = await prisma.workbook.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!workbook) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data = {};
  if (title !== undefined) data.title = title;
  if (sections !== undefined) data.sections = JSON.stringify(sections);

  const updated = await prisma.workbook.update({ where: { id }, data });
  return NextResponse.json({ workbook: { ...updated, sections: JSON.parse(updated.sections) } });
}

// DELETE /api/workbooks
export async function DELETE(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  const workbook = await prisma.workbook.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!workbook) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.workbook.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
