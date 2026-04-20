import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");

// POST /api/modules - create module (with optional PDF)
export async function POST(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const title = formData.get("title");
  const courseId = formData.get("courseId");
  const pdf = formData.get("pdf");

  if (!title || !courseId) return NextResponse.json({ error: "Title and courseId required" }, { status: 400 });

  // Verify course belongs to user's tenant
  if (user.tenantId) {
    const course = await prisma.course.findFirst({ where: { id: courseId, tenantId: user.tenantId } });
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
  }

  const count = await prisma.module.count({ where: { courseId } });

  let pdfPath = null;
  let pdfName = null;

  if (pdf && pdf.size > 0) {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const ext = path.extname(pdf.name) || ".pdf";
    const filename = `${uuid()}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);
    const buffer = Buffer.from(await pdf.arrayBuffer());
    await writeFile(filepath, buffer);
    pdfPath = `/api/files/${filename}`;
    pdfName = pdf.name;
  }

  const module = await prisma.module.create({
    data: { title, courseId, order: count, pdfPath, pdfName },
  });

  return NextResponse.json({ module }, { status: 201 });
}

// DELETE /api/modules
export async function DELETE(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  const mod = await prisma.module.findUnique({ where: { id } });

  if (mod?.pdfPath) {
    try {
      const filename = path.basename(mod.pdfPath);
      await unlink(path.join(UPLOAD_DIR, filename));
    } catch {}
  }

  await prisma.module.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
