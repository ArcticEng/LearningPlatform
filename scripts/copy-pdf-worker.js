// Copies the PDF.js worker out of node_modules into public/ so it can be
// served same-origin. Runs automatically on `npm install` via postinstall.
const fs = require("fs");
const path = require("path");

const src = path.join("node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const destDir = "public";
const dest = path.join(destDir, "pdf.worker.min.mjs");

try {
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  if (!fs.existsSync(src)) {
    console.warn("⚠  pdfjs-dist not found at", src, "— skipping PDF worker copy.");
    process.exit(0);
  }
  fs.copyFileSync(src, dest);
  const sizeKB = (fs.statSync(dest).size / 1024).toFixed(1);
  console.log(`✓ PDF.js worker copied to ${dest} (${sizeKB} KB)`);
} catch (err) {
  console.warn("⚠  Could not copy PDF.js worker:", err.message);
}
