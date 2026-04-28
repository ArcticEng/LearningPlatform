#!/usr/bin/env node
const { execSync } = require("child_process");

// Try normal push first. If schema conflicts with existing data,
// fall back to force-reset (wipes DB). Seed script recreates essential data.

try {
  console.log("📦 Pushing database schema...");
  execSync("npx prisma db push --skip-generate --accept-data-loss", { stdio: "inherit" });
  console.log("✅ Schema pushed successfully");
} catch {
  console.log("⚠️  Schema push failed — force-resetting database...");
  try {
    execSync("npx prisma db push --skip-generate --force-reset", { stdio: "inherit" });
    console.log("✅ Database reset and schema created");
  } catch (err2) {
    console.error("❌ Database setup failed:", err2.message);
    process.exit(1);
  }
}

// Run seed (idempotent — skips records that already exist)
try {
  console.log("🌱 Seeding...");
  execSync("node prisma/seed.js", { stdio: "inherit" });
  console.log("🌱 Seeding SRB demo...");
  execSync("node prisma/seed-srb-demo.js", { stdio: "inherit" });
} catch (err) {
  console.error("⚠️  Seed warning:", err.message);
}
