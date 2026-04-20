import { prisma } from "./db";

/**
 * Log an error/warning/info to the database.
 * Call from API routes: logError({ source: "api", path: "/api/courses", message: "...", details: stack })
 */
export async function logError({ level = "error", source = "api", path = "", message, details = "", tenantId = null, userId = null }) {
  try {
    await prisma.errorLog.create({
      data: {
        level,
        source,
        path: path.slice(0, 500),
        message: String(message).slice(0, 2000),
        details: String(details).slice(0, 5000),
        tenantId: tenantId || null,
        userId: userId || null,
      },
    });
  } catch (e) {
    // If DB logging fails, at least console it
    console.error("[LOG FAILED]", message, e);
  }
}

/**
 * Wrap an API handler with automatic error logging.
 * Usage: export const GET = withErrorLogging("/api/courses", async (req) => { ... });
 */
export function withErrorLogging(routePath, handler) {
  return async function (req, ctx) {
    try {
      return await handler(req, ctx);
    } catch (err) {
      console.error(`[${routePath}]`, err);
      await logError({
        source: "api",
        path: routePath,
        message: err.message || "Unknown error",
        details: err.stack || "",
      });
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  };
}
