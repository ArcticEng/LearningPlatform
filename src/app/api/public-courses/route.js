import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/public-courses?slug=scarletrose — public, no auth
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const tenant = await prisma.tenant.findUnique({ where: { slug: slug.toLowerCase().trim() } });
  if (!tenant || !tenant.active) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!tenant.featurePayments) return NextResponse.json({ error: "Not available" }, { status: 403 });

  const courses = await prisma.course.findMany({
    where: { tenantId: tenant.id, price: { gt: 0 } },
    select: {
      id: true, title: true, description: true, price: true, currency: true,
      _count: { select: { modules: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ courses, tenant: { name: tenant.name, paystackPublicKey: tenant.paystackPublicKey } });
}
