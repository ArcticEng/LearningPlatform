import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";
import { logError } from "@/lib/logger";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");

// POST /api/modules - create module (with optional PDF)
export async function POST(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const title = formData.get("title");
    const courseId = formData.get("courseId");
    const pdf = formData.get("pdf");

    if (!title || !courseId) return NextResponse.json({ error: "Title and courseId required" }, { status: 400 });

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
  } catch (err) {
    await logError({ source: "api", path: "/api/modules/POST", message: err.message, details: err.stack, tenantId: user.tenantId, userId: user.id });
    return NextResponse.json({ error: "Failed to create module" }, { status: 500 });
  }
}

// PUT /api/modules - update module title / replace PDF
export async function PUT(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const id = formData.get("id");
    const title = formData.get("title");
    const pdf = formData.get("pdf");

    if (!id) return NextResponse.json({ error: "Module ID required" }, { status: 400 });

    const mod = await prisma.module.findUnique({
      where: { id },
      include: { course: { select: { tenantId: true } } },
    });
    if (!mod) return NextResponse.json({ error: "Module not found" }, { status: 404 });
    if (user.tenantId && mod.course.tenantId !== user.tenantId) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    const updateData = {};
    if (title) updateData.title = title;

    if (pdf && pdf.size > 0) {
      if (mod.pdfPath) {
        try { await unlink(path.join(UPLOAD_DIR, path.basename(mod.pdfPath))); } catch {}
      }
      await mkdir(UPLOAD_DIR, { recursive: true });
      const ext = path.extname(pdf.name) || ".pdf";
      const filename = `${uuid()}${ext}`;
      const filepath = path.join(UPLOAD_DIR, filename);
      const buffer = Buffer.from(await pdf.arrayBuffer());
      await writeFile(filepath, buffer);
      updateData.pdfPath = `/api/files/${filename}`;
      updateData.pdfName = pdf.name;
    }

    const updated = await prisma.module.update({ where: { id }, data: updateData });
    return NextResponse.json({ module: updated });
  } catch (err) {
    await logError({ source: "api", path: "/api/modules/PUT", message: err.message, details: err.stack, tenantId: user.tenantId, userId: user.id });
    return NextResponse.json({ error: "Failed to update module" }, { status: 500 });
  }
}

// DELETE /api/modules
export async function DELETE(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await req.json();

    const mod = await prisma.module.findUnique({
      where: { id },
      include: { course: { select: { tenantId: true } } },
    });

    if (!mod) return NextResponse.json({ error: "Module not found" }, { status: 404 });
    if (user.tenantId && mod.course.tenantId !== user.tenantId) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    if (mod.pdfPath) {
      try {
        const filename = path.basename(mod.pdfPath);
        await unlink(path.join(UPLOAD_DIR, filename));
      } catch {}
    }

    await prisma.module.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    await logError({ source: "api", path: "/api/modules/DELETE", message: err.message, details: err.stack, tenantId: user.tenantId, userId: user.id });
    return NextResponse.json({ error: "Failed to delete module" }, { status: 500 });
  }
}
