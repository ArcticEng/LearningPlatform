import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken, setSessionCookie, clearSessionCookie, getSession, getTenant } from "@/lib/auth";

// GET /api/auth - get current session + tenant branding
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  let tenant = null;
  if (user.tenantId) {
    tenant = await getTenant(user.tenantId);
  }

  return NextResponse.json({ user, tenant });
}

// POST /api/auth - login
export async function POST(req) {
  const { idNumber, password, tenantSlug } = await req.json();
  if (!idNumber || !password) {
    return NextResponse.json({ error: "ID number and password required" }, { status: 400 });
  }

  // Try superadmin first (no tenant needed)
  const superadmin = await prisma.user.findFirst({
    where: { idNumber, role: "superadmin" },
  });

  if (superadmin) {
    const valid = await bcrypt.compare(password, superadmin.password);
    if (!valid) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

    const token = signToken({ id: superadmin.id, role: superadmin.role });
    setSessionCookie(token, null); // superadmin cookie: lp_super
    return NextResponse.json({
      user: { id: superadmin.id, name: superadmin.name, idNumber: superadmin.idNumber, role: superadmin.role, tenantId: null },
    });
  }

  // Regular user — tenant required
  if (!tenantSlug) {
    return NextResponse.json({ error: "Organization code required" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug.toLowerCase().trim() } });
  if (!tenant) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  if (!tenant.active) {
    return NextResponse.json({ error: "This organization's access is currently disabled" }, { status: 403 });
  }

  const user = await prisma.user.findFirst({
    where: { idNumber, tenantId: tenant.id },
  });

  if (!user) {
    return NextResponse.json({ error: "Invalid ID number or password" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Invalid ID number or password" }, { status: 401 });
  }

  const token = signToken({ id: user.id, role: user.role });
  setSessionCookie(token, tenantSlug); // tenant-specific cookie: lp_act, lp_scarletrose, etc.

  return NextResponse.json({
    user: { id: user.id, name: user.name, idNumber: user.idNumber, role: user.role, tenantId: user.tenantId },
    tenant,
  });
}

// DELETE /api/auth - logout
export async function DELETE(req) {
  // Clear the specific tenant cookie if slug provided, otherwise clear superadmin
  try {
    const { tenantSlug } = await req.json().catch(() => ({}));
    clearSessionCookie(tenantSlug || null);
  } catch {
    clearSessionCookie(null);
  }
  return NextResponse.json({ ok: true });
}
