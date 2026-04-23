import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession, getTenant } from "@/lib/auth";

// GET /api/certificates?courseId=xxx - check eligibility + generate certificate
export async function GET(req) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  const format = searchParams.get("format"); // "html" for printable certificate

  if (!courseId) return NextResponse.json({ error: "courseId required" }, { status: 400 });

  const tenant = await getTenant(user.tenantId);
  if (!tenant?.featureCertificates) {
    return NextResponse.json({ error: "Certificates not enabled" }, { status: 403 });
  }

  const course = await prisma.course.findFirst({
    where: { id: courseId, tenantId: user.tenantId },
    include: { modules: { include: { test: true }, orderBy: { order: "asc" } } },
  });

  if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });

  // Check if all modules with tests have been passed (50%+)
  const modulesWithTests = course.modules.filter(m => m.test);
  if (modulesWithTests.length === 0) {
    return NextResponse.json({ error: "No assessments in this course", eligible: false }, { status: 400 });
  }

  const passResults = [];
  for (const mod of modulesWithTests) {
    const bestResult = await prisma.result.findFirst({
      where: { userId: user.id, moduleId: mod.id },
      orderBy: { percentage: "desc" },
    });
    if (!bestResult || bestResult.percentage < 50) {
      return NextResponse.json({
        eligible: false,
        message: `You have not passed "${mod.title}" yet`,
        moduleTitle: mod.title,
      });
    }
    passResults.push({ module: mod.title, score: bestResult.percentage });
  }

  // Eligible! Return certificate data or HTML
  const certData = {
    eligible: true,
    studentName: user.name,
    courseName: course.title,
    tenantName: tenant.name,
    logoUrl: tenant.logoUrl,
    completedDate: new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" }),
    modules: passResults,
    colors: { primary: tenant.colorPrimary, secondary: tenant.colorSecondary, accent: tenant.colorAccent },
  };

  if (format === "html") {
    const html = generateCertificateHTML(certData);
    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return NextResponse.json(certData);
}

function generateCertificateHTML({ studentName, courseName, tenantName, logoUrl, completedDate, colors }) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Certificate of Completion - ${studentName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Quicksand:wght@400;500;600;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: landscape A4; margin: 0; }
  body { width: 297mm; height: 210mm; margin: 0 auto; position: relative; background: #fff; font-family: 'Quicksand', sans-serif; }
  .cert { width: 100%; height: 100%; padding: 20mm; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
  .border-outer { position: absolute; inset: 8mm; border: 3px solid ${colors.primary}; border-radius: 4px; }
  .border-inner { position: absolute; inset: 12mm; border: 1px solid ${colors.accent}; border-radius: 2px; }
  .logo { width: 60px; height: 60px; object-fit: contain; margin-bottom: 10mm; border-radius: 12px; }
  .org { font-size: 14px; color: ${colors.primary}; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 6mm; font-weight: 600; }
  .title { font-family: 'Playfair Display', serif; font-size: 42px; color: ${colors.primary}; margin-bottom: 4mm; font-weight: 700; }
  .subtitle { font-size: 14px; color: #666; margin-bottom: 10mm; letter-spacing: 2px; }
  .name { font-family: 'Playfair Display', serif; font-size: 32px; color: #1a1a1a; border-bottom: 2px solid ${colors.accent}; padding: 4mm 20mm; margin-bottom: 8mm; }
  .course-label { font-size: 12px; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 3mm; }
  .course { font-size: 20px; color: ${colors.primary}; font-weight: 700; margin-bottom: 10mm; }
  .date { font-size: 13px; color: #666; margin-bottom: 8mm; }
  .footer { display: flex; gap: 60mm; align-items: flex-end; margin-top: auto; }
  .sig { text-align: center; }
  .sig-line { width: 50mm; border-top: 1px solid #999; margin-bottom: 2mm; }
  .sig-label { font-size: 10px; color: #888; }
  @media print { body { width: 297mm; height: 210mm; } }
</style>
</head>
<body>
<div class="cert">
  <div class="border-outer"></div>
  <div class="border-inner"></div>
  ${logoUrl ? `<img class="logo" src="${logoUrl}" alt="Logo">` : ""}
  <div class="org">${tenantName}</div>
  <div class="title">Certificate of Completion</div>
  <div class="subtitle">THIS IS TO CERTIFY THAT</div>
  <div class="name">${studentName}</div>
  <div class="course-label">HAS SUCCESSFULLY COMPLETED</div>
  <div class="course">${courseName}</div>
  <div class="date">${completedDate}</div>
  <div class="footer">
    <div class="sig"><div class="sig-line"></div><div class="sig-label">Student Signature</div></div>
    <div class="sig"><div class="sig-line"></div><div class="sig-label">Authorised Signature</div></div>
  </div>
</div>
<script>window.onload=()=>window.print();</script>
</body>
</html>`;
}
