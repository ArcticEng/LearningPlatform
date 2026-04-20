import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";

// GET /api/superadmin/logs?level=&source=&limit=100
export async function GET(req) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const level = searchParams.get("level");
  const source = searchParams.get("source");
  const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);

  const where = {};
  if (level) where.level = level;
  if (source) where.source = source;

  const logs = await prisma.errorLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const counts = {
    total: await prisma.errorLog.count(),
    error: await prisma.errorLog.count({ where: { level: "error" } }),
    warn: await prisma.errorLog.count({ where: { level: "warn" } }),
    info: await prisma.errorLog.count({ where: { level: "info" } }),
  };

  return NextResponse.json({ logs, counts });
}

// DELETE /api/superadmin/logs - clear logs
export async function DELETE(req) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { olderThanDays } = await req.json().catch(() => ({}));

    if (olderThanDays) {
      const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      const result = await prisma.errorLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
      return NextResponse.json({ deleted: result.count });
    } else {
      const result = await prisma.errorLog.deleteMany();
      return NextResponse.json({ deleted: result.count });
    }
  } catch {
    return NextResponse.json({ error: "Failed to clear logs" }, { status: 500 });
  }
}
