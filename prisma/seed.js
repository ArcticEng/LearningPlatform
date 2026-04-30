const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // ═══════════════════════════════════════
  // 1. SUPERADMIN (global — no tenant)
  // ═══════════════════════════════════════
  const superExists = await prisma.user.findFirst({ where: { role: "superadmin" } });
  if (!superExists) {
    await prisma.user.create({
      data: {
        name: "Onyx Digital",
        idNumber: "Arctic13",
        password: await bcrypt.hash("Arctic13!", 10),
        role: "superadmin",
        tenantId: null,
      },
    });
    console.log("✅ Superadmin created (ID: Arctic13 / Pass: Arctic13!)");
  } else {
    console.log("ℹ️  Superadmin already exists");
  }

  // ═══════════════════════════════════════
  // 2. TENANT: Aloe Care Trainify (ACT)
  // ═══════════════════════════════════════
  let actTenant = await prisma.tenant.findUnique({ where: { slug: "act" } });
  if (!actTenant) {
    actTenant = await prisma.tenant.create({
      data: {
        slug: "act",
        name: "Aloe Care Trainify",
        tagline: "Dementia Care Training Platform",
        logoUrl: "/logo.jpg",
        colorPrimary: "#1A2E6B",
        colorSecondary: "#2A4AA8",
        colorAccent: "#C3E234",
        fontHeading: "Montserrat",
        fontBody: "Nunito",
        colorBgDark: "#0d1538",
      },
    });
    console.log("✅ Tenant 'act' created");
  } else {
    console.log("ℹ️  Tenant 'act' already exists");
  }

  const actAdmin = await prisma.user.findFirst({
    where: { idNumber: "admin", tenantId: actTenant.id },
  });
  if (!actAdmin) {
    await prisma.user.create({
      data: {
        name: "ACT Administrator",
        idNumber: "admin",
        password: await bcrypt.hash("admin123", 10),
        role: "admin",
        tenantId: actTenant.id,
      },
    });
    console.log("✅ ACT admin created (ID: admin / Pass: admin123)");
  } else {
    console.log("ℹ️  ACT admin already exists");
  }

  // ═══════════════════════════════════════
  // 3. TENANT: Scarlet Rose Beauty
  // ═══════════════════════════════════════
  let scarletTenant = await prisma.tenant.findUnique({ where: { slug: "scarletrose" } });
  if (!scarletTenant) {
    scarletTenant = await prisma.tenant.create({
      data: {
        slug: "scarletrose",
        name: "Scarlet Rose Beauty",
        tagline: "Nail Technician Training Academy",
        logoUrl: "/api/files/logo-scarletrose.jpeg",
        colorPrimary: "#E875A0",
        colorSecondary: "#F4A0C0",
        colorAccent: "#FFD6E8",
        fontHeading: "Playfair Display",
        fontBody: "Quicksand",
        colorBgDark: "#1f0f18",
      },
    });
    console.log("✅ Tenant 'scarletrose' created");
  } else {
    // Update logo if it changed
    if (scarletTenant.logoUrl !== "/api/files/logo-scarletrose.jpeg") {
      await prisma.tenant.update({ where: { slug: "scarletrose" }, data: { logoUrl: "/api/files/logo-scarletrose.jpeg" } });
      console.log("🖼️  SRB logo updated");
    }
    console.log("ℹ️  Tenant 'scarletrose' already exists");
  }

  const srAdmin = await prisma.user.findFirst({
    where: { idNumber: "admin", tenantId: scarletTenant.id },
  });
  if (!srAdmin) {
    await prisma.user.create({
      data: {
        name: "Scarlet Rose Admin",
        idNumber: "admin",
        password: await bcrypt.hash("admin123", 10),
        role: "admin",
        tenantId: scarletTenant.id,
      },
    });
    console.log("✅ Scarlet Rose admin created (ID: admin / Pass: admin123)");
  } else {
    console.log("ℹ️  Scarlet Rose admin already exists");
  }

  // ═══════════════════════════════════════
  // 4. SYSTEM TENANT (superadmin portal theme)
  //    active=false so it doesn't show as login option
  // ═══════════════════════════════════════
  let sysTenant = await prisma.tenant.findUnique({ where: { slug: "_system" } });
  if (!sysTenant) {
    await prisma.tenant.create({
      data: {
        slug: "_system",
        name: "Onyx Digital",
        tagline: "Super Admin Portal",
        logoUrl: "",
        colorPrimary: "#1a1a2e",
        colorSecondary: "#16213e",
        colorAccent: "#e94560",
        fontHeading: "Montserrat",
        fontBody: "Nunito",
        colorBgDark: "#0a0a14",
        active: false,
      },
    });
    console.log("✅ System theme created");
  } else {
    console.log("ℹ️  System theme already exists");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
