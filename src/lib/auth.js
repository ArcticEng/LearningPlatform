import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./db";

const SECRET = process.env.JWT_SECRET || "dev-secret";

function cookieName(tenantSlug) {
  if (!tenantSlug) return "lp_super";
  return `lp_${tenantSlug}`;
}

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: "7d" });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = cookies();

  // Try all lp_ cookies to find a valid session
  const allCookies = cookieStore.getAll();
  for (const c of allCookies) {
    if (!c.name.startsWith("lp_")) continue;
    const payload = verifyToken(c.value);
    if (!payload) continue;
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, name: true, idNumber: true, role: true, tenantId: true },
    });
    if (user) return user;
  }
  return null;
}

export async function getSessionForTenant(tenantSlug) {
  const cookieStore = cookies();
  const name = cookieName(tenantSlug);
  const token = cookieStore.get(name)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, name: true, idNumber: true, role: true, tenantId: true },
  });
  return user;
}

export async function getTenant(tenantId) {
  if (!tenantId) return null;
  return prisma.tenant.findUnique({ where: { id: tenantId } });
}

export async function getTenantBySlug(slug) {
  if (!slug) return null;
  return prisma.tenant.findUnique({ where: { slug } });
}

export async function requireSuperAdmin() {
  const user = await getSession();
  if (!user || user.role !== "superadmin") return null;
  return user;
}

export async function requireAdmin() {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) return null;
  return user;
}

export function setSessionCookie(token, tenantSlug) {
  const name = cookieName(tenantSlug);
  cookies().set(name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export function clearSessionCookie(tenantSlug) {
  const name = cookieName(tenantSlug);
  cookies().set(name, "", { maxAge: 0, path: "/" });
}
