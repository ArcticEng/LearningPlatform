import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { v4 as uuid } from "uuid";

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");

// POST /api/superadmin/upload-logo - upload tenant logo
export async function POST(req) {
  if (!(await requireSuperAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("logo");
  const tenantId = formData.get("tenantId");

  if (!file || file.size === 0) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });

  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = path.extname(file.name) || ".jpg";
  const filename = `logo-${uuid()}${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  const logoUrl = `/api/files/${filename}`;

  // Update tenant
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { logoUrl },
  });

  return NextResponse.json({ logoUrl });
}
