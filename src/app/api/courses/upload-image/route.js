import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("image");
  const courseId = formData.get("courseId");

  if (!file || !courseId) {
    return NextResponse.json({ error: "Image and courseId required" }, { status: 400 });
  }

  // Verify course belongs to tenant
  const course = await prisma.course.findFirst({ where: { id: courseId, tenantId: user.tenantId } });
  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Always use same extension to overwrite previous file
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const filename = `course-img-${courseId}.${ext}`;

  const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });
  await writeFile(path.join(uploadDir, filename), buffer);

  // Add timestamp to bust browser cache
  const imageUrl = `/api/files/${filename}?v=${Date.now()}`;

  // Update course with image URL
  await prisma.course.update({
    where: { id: courseId },
    data: { imageUrl },
  });

  return NextResponse.json({ imageUrl });
}
