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
  //    Dementia care training
  //    Navy + Lime green
  // ═══════════════════════════════════════
  let actTenant = await prisma.tenant.findUnique({ where: { slug: "act" } });
  if (!actTenant) {
    actTenant = await prisma.tenant.create({
      data: {
        slug: "act",
        name: "Aloe Care Trainify",
        tagline: "Dementia Care Training Platform",
        logoUrl: "/logo.jpg",
        colorPrimary: "#1A2E6B",   // deep navy
        colorSecondary: "#2A4AA8", // lighter navy
        colorAccent: "#C3E234",    // lime green
        fontHeading: "Montserrat",
        fontBody: "Nunito",
      },
    });
    console.log("✅ Tenant 'act' created (Aloe Care Trainify)");
  } else {
    console.log("ℹ️  Tenant 'act' already exists");
  }

  // ACT admin
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
  //    Nail technician training
  //    Deep rose + blush pink + rose gold
  // ═══════════════════════════════════════
  let scarletTenant = await prisma.tenant.findUnique({ where: { slug: "scarletrose" } });
  if (!scarletTenant) {
    scarletTenant = await prisma.tenant.create({
      data: {
        slug: "scarletrose",
        name: "Scarlet Rose Beauty",
        tagline: "Nail Technician Training Academy",
        logoUrl: "",  // can be set later via superadmin
        colorPrimary: "#8B1A4A",   // deep scarlet rose
        colorSecondary: "#C75B7A", // soft rose / blush
        colorAccent: "#D4A574",    // rose gold
        fontHeading: "Playfair Display",
        fontBody: "Quicksand",
      },
    });
    console.log("✅ Tenant 'scarletrose' created (Scarlet Rose Beauty)");
  } else {
    console.log("ℹ️  Tenant 'scarletrose' already exists");
  }

  // Scarlet Rose admin
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
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
