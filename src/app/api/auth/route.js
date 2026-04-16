import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken, setSessionCookie, clearSessionCookie, getSession } from "@/lib/auth";

// GET /api/auth - get current session
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}

// POST /api/auth - login
export async function POST(req) {
  const { idNumber, password } = await req.json();
  if (!idNumber || !password) {
    return NextResponse.json({ error: "ID number and password required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { idNumber } });
  if (!user) {
    return NextResponse.json({ error: "Invalid ID number or password" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid ID number or password" }, { status: 401 });
  }

  const token = signToken({ id: user.id, role: user.role });
  setSessionCookie(token);

  return NextResponse.json({
    user: { id: user.id, name: user.name, idNumber: user.idNumber, role: user.role },
  });
}

// DELETE /api/auth - logout
export async function DELETE() {
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}
