import jwt from "jsonwebtoken";
import { cookies, headers } from "next/headers";
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

// Extract tenant slug from Referer header (e.g. /scarletrose/admin -> "scarletrose")
function getTenantSlugFromReferer() {
  try {
    const headerStore = headers();
    const referer = headerStore.get("referer") || "";
    if (!referer) return null;
    const url = new URL(referer);
    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length === 0) return null;
    const first = segments[0].toLowerCase();
    // Skip system routes
    if (["api", "admin", "learner", "superadmin", "_next"].includes(first)) return null;
    return first;
  } catch {
    return null;
  }
}

async function findUserFromToken(token) {
  const payload = verifyToken(token);
  if (!payload) return null;
  return prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, name: true, idNumber: true, role: true, tenantId: true },
  });
}

export async function getSession() {
  const cookieStore = cookies();

  // 1. Try tenant-specific cookie based on Referer URL
  const refererSlug = getTenantSlugFromReferer();
  if (refererSlug) {
    const token = cookieStore.get(`lp_${refererSlug}`)?.value;
    if (token) {
      const user = await findUserFromToken(token);
      if (user) return user;
    }
  }

  // 2. Try superadmin cookie
  const superToken = cookieStore.get("lp_super")?.value;
  if (superToken) {
    const user = await findUserFromToken(superToken);
    if (user && user.role === "superadmin") return user;
  }

  // 3. Fallback: scan all lp_ cookies (for backward compat / direct /admin access)
  const allCookies = cookieStore.getAll();
  for (const c of allCookies) {
    if (!c.name.startsWith("lp_")) continue;
    // Skip ones we already tried
    if (c.name === "lp_super") continue;
    if (refererSlug && c.name === `lp_${refererSlug}`) continue;
    const user = await findUserFromToken(c.value);
    if (user) return user;
  }
  return null;
}

export async function getSessionForTenant(tenantSlug) {
  const cookieStore = cookies();
  const name = cookieName(tenantSlug);
  const token = cookieStore.get(name)?.value;
  if (!token) return null;
  return findUserFromToken(token);
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
