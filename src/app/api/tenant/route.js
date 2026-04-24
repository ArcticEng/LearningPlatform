import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/tenant?slug=act — public, returns branding + features
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Slug required" }, { status: 400 });

  const tenant = await prisma.tenant.findUnique({
    where: { slug: slug.toLowerCase().trim() },
    select: {
      id: true, slug: true, name: true, tagline: true, logoUrl: true,
      colorPrimary: true, colorSecondary: true, colorAccent: true, colorBgDark: true,
      fontHeading: true, fontBody: true, active: true,
      featureVideos: true, featureWhatsapp: true, whatsappNumber: true,
      featureCourseAccess: true, featureContinue: true, featureCertificates: true,
      featureAiImport: true,
      featureSelfRegister: true,
      featurePayments: true,
    },
  });

  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!tenant.active) return NextResponse.json({ error: "Disabled" }, { status: 403 });

  return NextResponse.json({ tenant });
}
