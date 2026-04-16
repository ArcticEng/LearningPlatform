import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./db";

const SECRET = process.env.JWT_SECRET || "dev-secret";
const COOKIE_NAME = "lp_session";

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
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({
    where: { id: payload.id },
    select: { id: true, name: true, idNumber: true, role: true },
  });
  return user;
}

export function setSessionCookie(token) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export function clearSessionCookie() {
  cookies().set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
}
