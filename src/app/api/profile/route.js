import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// PATCH /api/profile — update the current user's name / email / phone / password
//
// Body fields (all optional, only provided ones are updated):
//   - name:        string
//   - email:       string (validated; "" allowed to clear)
//   - phone:       string
//   - newPassword: string (>= 6 chars). Requires currentPassword to match.
//   - currentPassword: string — required when newPassword is set
export async function PATCH(req) {
  const sessionUser = await getSession();
  if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const data = {};

  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim();
  }

  if (typeof body.email === "string") {
    const cleanEmail = body.email.trim().toLowerCase();
    if (cleanEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    data.email = cleanEmail;
  }

  if (typeof body.phone === "string") {
    data.phone = body.phone.trim();
  }

  // Password change — requires verifying the current password first
  if (typeof body.newPassword === "string" && body.newPassword) {
    if (body.newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
    }
    if (typeof body.currentPassword !== "string" || !body.currentPassword) {
      return NextResponse.json({ error: "Current password is required to change your password" }, { status: 400 });
    }
    // Look up the full user including password hash (session doesn't carry it)
    const fullUser = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { password: true },
    });
    if (!fullUser) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const valid = await bcrypt.compare(body.currentPassword, fullUser.password);
    if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    data.password = await bcrypt.hash(body.newPassword, 10);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: sessionUser.id },
    data,
    select: { id: true, name: true, idNumber: true, email: true, phone: true, role: true, tenantId: true },
  });

  return NextResponse.json({ user: updated });
}
