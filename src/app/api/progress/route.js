import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// GET /api/progress - get user's progress (last accessed module per course)
export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const progress = await prisma.progress.findMany({
    where: { userId: user.id },
    include: { module: { select: { id: true, title: true, courseId: true } } },
    orderBy: { lastAccess: "desc" },
  });

  return NextResponse.json({ progress });
}

// POST /api/progress - track module access
export async function POST(req) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { moduleId, completed } = await req.json();
  if (!moduleId) return NextResponse.json({ error: "moduleId required" }, { status: 400 });

  const progress = await prisma.progress.upsert({
    where: { userId_moduleId: { userId: user.id, moduleId } },
    update: { lastAccess: new Date(), completed: completed || false },
    create: { userId: user.id, moduleId, completed: completed || false },
  });

  return NextResponse.json({ progress });
}
