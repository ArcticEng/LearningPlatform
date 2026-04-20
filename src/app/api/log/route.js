import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";

// POST /api/log - client-side error reporting
export async function POST(req) {
  try {
    const { level, path, message, details, tenantId, userId } = await req.json();
    if (!message) return NextResponse.json({ error: "message required" }, { status: 400 });

    await logError({
      level: level || "error",
      source: "client",
      path: path || "",
      message,
      details: details || "",
      tenantId: tenantId || null,
      userId: userId || null,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to log" }, { status: 500 });
  }
}
