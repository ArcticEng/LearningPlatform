import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/courses
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const courses = await prisma.course.findMany({
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
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description } = await req.json();
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const course = await prisma.course.create({
    data: { title, description: description || "" },
  });

  return NextResponse.json({ course }, { status: 201 });
}

// DELETE /api/courses
export async function DELETE(req) {
  const user = await getSession();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  await prisma.course.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
