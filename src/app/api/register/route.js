import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken, setSessionCookie } from "@/lib/auth";

// POST /api/register - learner self-registration with access code
export async function POST(req) {
  const { name, idNumber, password, accessCode, tenantSlug } = await req.json();

  if (!name || !idNumber || !password || !accessCode || !tenantSlug) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  // Find tenant
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug.toLowerCase().trim() } });
  if (!tenant) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  if (!tenant.active) return NextResponse.json({ error: "Organization is currently disabled" }, { status: 403 });
  if (!tenant.featureSelfRegister) return NextResponse.json({ error: "Self-registration is not enabled" }, { status: 403 });

  // Find and validate access code
  const code = await prisma.accessCode.findFirst({
    where: { code: accessCode.toUpperCase().trim(), tenantId: tenant.id },
  });

  if (!code) return NextResponse.json({ error: "Invalid access code" }, { status: 404 });
  if (!code.active) return NextResponse.json({ error: "This access code has been deactivated" }, { status: 403 });
  if (code.expiresAt && new Date(code.expiresAt) < new Date()) {
    return NextResponse.json({ error: "This access code has expired" }, { status: 403 });
  }
  if (code.maxUses > 0 && code.usedCount >= code.maxUses) {
    return NextResponse.json({ error: "This access code has reached its maximum number of registrations" }, { status: 403 });
  }

  // Check if ID number already exists for this tenant
  const existing = await prisma.user.findFirst({
    where: { idNumber: idNumber.trim(), tenantId: tenant.id },
  });
  if (existing) {
    return NextResponse.json({ error: "This ID number is already registered. Please sign in instead." }, { status: 409 });
  }

  // Create the learner
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      idNumber: idNumber.trim(),
      password: hashed,
      role: "learner",
      tenantId: tenant.id,
    },
  });

  // Auto-assign course if the access code is tied to one
  if (code.courseId) {
    await prisma.courseAccess.create({
      data: { userId: user.id, courseId: code.courseId, tenantId: tenant.id },
    }).catch(() => {}); // Ignore if already exists
  }

  // Increment used count
  await prisma.accessCode.update({
    where: { id: code.id },
    data: { usedCount: { increment: 1 } },
  });

  // Auto-login
  const token = signToken({ id: user.id, role: user.role });
  setSessionCookie(token, tenantSlug);

  return NextResponse.json({
    user: { id: user.id, name: user.name, idNumber: user.idNumber, role: user.role, tenantId: user.tenantId },
    tenant,
  }, { status: 201 });
}
