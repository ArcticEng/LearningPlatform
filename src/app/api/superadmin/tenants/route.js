import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";

// GET /api/superadmin/tenants
export async function GET() {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenants = await prisma.tenant.findMany({
    include: {
      _count: { select: { users: true, courses: true } },
      users: {
        where: { role: "admin" },
        select: { id: true, name: true, idNumber: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get result counts per tenant
  const tenantsWithStats = await Promise.all(
    tenants.map(async (t) => {
      const learnerCount = await prisma.user.count({ where: { tenantId: t.id, role: "learner" } });
      const resultCount = await prisma.result.count({ where: { course: { tenantId: t.id } } });
      const avgResult = await prisma.result.aggregate({
        where: { course: { tenantId: t.id } },
        _avg: { percentage: true },
      });
      return {
        ...t,
        learnerCount,
        resultCount,
        avgScore: Math.round(avgResult._avg.percentage || 0),
        admins: t.users,
      };
    })
  );

  return NextResponse.json({ tenants: tenantsWithStats });
}

// POST /api/superadmin/tenants - create tenant + admin
export async function POST(req) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, name, tagline, logoUrl, colorPrimary, colorSecondary, colorAccent, colorBgDark, fontHeading, fontBody, adminName, adminIdNumber, adminPassword } = await req.json();

  if (!slug || !name) return NextResponse.json({ error: "Slug and name required" }, { status: 400 });

  const existing = await prisma.tenant.findUnique({ where: { slug: slug.toLowerCase().trim() } });
  if (existing) return NextResponse.json({ error: "Slug already exists" }, { status: 409 });

  const tenant = await prisma.tenant.create({
    data: {
      slug: slug.toLowerCase().trim(),
      name,
      tagline: tagline || "",
      logoUrl: logoUrl || "",
      colorPrimary: colorPrimary || "#1A2E6B",
      colorSecondary: colorSecondary || "#2A4AA8",
      colorAccent: colorAccent || "#C3E234",
      fontHeading: fontHeading || "Montserrat",
      fontBody: fontBody || "Nunito",
      colorBgDark: colorBgDark || "",
    },
  });

  // Create admin user if provided
  if (adminName && adminIdNumber && adminPassword) {
    await prisma.user.create({
      data: {
        name: adminName,
        idNumber: adminIdNumber,
        password: await bcrypt.hash(adminPassword, 10),
        role: "admin",
        tenantId: tenant.id,
      },
    });
  }

  return NextResponse.json({ tenant }, { status: 201 });
}

// PUT /api/superadmin/tenants - update tenant branding
export async function PUT(req) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, ...data } = await req.json();
  if (!id) return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });

  // Only allow updating specific fields
  const allowed = ["name", "tagline", "logoUrl", "colorPrimary", "colorSecondary", "colorAccent", "colorBgDark", "fontHeading", "fontBody", "active",
    "featureVideos", "featureWhatsapp", "whatsappNumber", "featureCourseAccess", "featureContinue", "featureCertificates", "featureAiImport", "featureSelfRegister"];
  const updateData = {};
  for (const key of allowed) {
    if (data[key] !== undefined) updateData[key] = data[key];
  }

  const tenant = await prisma.tenant.update({ where: { id }, data: updateData });
  return NextResponse.json({ tenant });
}

// DELETE /api/superadmin/tenants
export async function DELETE(req) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Tenant ID required" }, { status: 400 });

  await prisma.tenant.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// PATCH /api/superadmin/tenants - add admin user to existing tenant
export async function PATCH(req) {
  if (!(await requireSuperAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tenantId, adminName, adminIdNumber, adminPassword } = await req.json();
  if (!tenantId || !adminName || !adminIdNumber || !adminPassword) {
    return NextResponse.json({ error: "tenantId, adminName, adminIdNumber, and adminPassword required" }, { status: 400 });
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const existing = await prisma.user.findFirst({ where: { idNumber: adminIdNumber, tenantId } });
  if (existing) return NextResponse.json({ error: "ID number already exists in this tenant" }, { status: 409 });

  const user = await prisma.user.create({
    data: {
      name: adminName,
      idNumber: adminIdNumber,
      password: await bcrypt.hash(adminPassword, 10),
      role: "admin",
      tenantId,
    },
    select: { id: true, name: true, idNumber: true },
  });

  return NextResponse.json({ admin: user }, { status: 201 });
}
