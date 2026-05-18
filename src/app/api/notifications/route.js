import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/notifications — list notifications for current user
export async function GET(req) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "true";
  const countOnly = searchParams.get("count") === "true";

  const where = { userId: user.id, tenantId: user.tenantId };
  if (unreadOnly) where.read = false;

  if (countOnly) {
    const count = await prisma.notification.count({ where: { userId: user.id, tenantId: user.tenantId, read: false } });
    return NextResponse.json({ count });
  }

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: user.id, tenantId: user.tenantId, read: false },
  });

  return NextResponse.json({ notifications, unreadCount });
}

// PUT /api/notifications — mark as read
export async function PUT(req) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, markAllRead } = await req.json();

  if (markAllRead) {
    await prisma.notification.updateMany({
      where: { userId: user.id, tenantId: user.tenantId, read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (id) {
    await prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { read: true },
    });
  }

  return NextResponse.json({ ok: true });
}
