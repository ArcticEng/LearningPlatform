const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.findUnique({ where: { idNumber: "admin" } });
  if (!existing) {
    await prisma.user.create({
      data: {
        name: "Administrator",
        idNumber: "admin",
        password: await bcrypt.hash("admin123", 10),
        role: "admin",
      },
    });
    console.log("✅ Admin user created (ID: admin / Pass: admin123)");
  } else {
    console.log("ℹ️  Admin user already exists");
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
