import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

async function getAdminWithTenant() {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) return null;
  if (!user.tenantId && user.role !== "superadmin") return null;
  return user;
}

// GET /api/learners
export async function GET() {
  const user = await getAdminWithTenant();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const learners = await prisma.user.findMany({
    where: { role: "learner", tenantId: user.tenantId },
    select: { id: true, name: true, idNumber: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ learners });
}

// POST /api/learners - create learner
export async function POST(req) {
  const user = await getAdminWithTenant();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, idNumber, password } = await req.json();
  if (!name || !idNumber || !password) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const existing = await prisma.user.findFirst({
    where: { idNumber, tenantId: user.tenantId },
  });
  if (existing) {
    return NextResponse.json({ error: "ID number already exists" }, { status: 409 });
  }

  const hashed = await bcrypt.hash(password, 10);
  const learner = await prisma.user.create({
    data: { name, idNumber, password: hashed, role: "learner", tenantId: user.tenantId },
    select: { id: true, name: true, idNumber: true, createdAt: true },
  });

  return NextResponse.json({ learner }, { status: 201 });
}

// PUT /api/learners - update password
export async function PUT(req) {
  const user = await getAdminWithTenant();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, password, name } = await req.json();
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  // Verify learner belongs to this tenant
  const learner = await prisma.user.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!learner) return NextResponse.json({ error: "Learner not found" }, { status: 404 });

  const updateData = {};
  if (name) updateData.name = name;
  if (password) updateData.password = await bcrypt.hash(password, 10);

  if (Object.keys(updateData).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  await prisma.user.update({ where: { id }, data: updateData });

  return NextResponse.json({ ok: true });
}

// DELETE /api/learners
export async function DELETE(req) {
  const user = await getAdminWithTenant();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();

  const learner = await prisma.user.findFirst({ where: { id, tenantId: user.tenantId } });
  if (!learner) return NextResponse.json({ error: "Learner not found" }, { status: 404 });

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
