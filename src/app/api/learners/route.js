import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

async function requireAdmin() {
  const user = await getSession();
  if (!user || user.role !== "admin") return null;
  return user;
}

// GET /api/learners
export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const learners = await prisma.user.findMany({
    where: { role: "learner" },
    select: { id: true, name: true, idNumber: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ learners });
}

// POST /api/learners - create learner
export async function POST(req) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, idNumber, password } = await req.json();
  if (!name || !idNumber || !password) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { idNumber } });
  if (existing) {
    return NextResponse.json({ error: "ID number already exists" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const learner = await prisma.user.create({
    data: { name, idNumber, password: hashed, role: "learner" },
    select: { id: true, name: true, idNumber: true, createdAt: true },
  });

  return NextResponse.json({ learner }, { status: 201 });
}

// PUT /api/learners - update password
export async function PUT(req) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, password } = await req.json();
  if (!id || !password) return NextResponse.json({ error: "ID and password required" }, { status: 400 });

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id }, data: { password: hashed } });

  return NextResponse.json({ ok: true });
}

// DELETE /api/learners
export async function DELETE(req) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
