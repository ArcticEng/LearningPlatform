// Compresses every PDF in public/uploads/ in place using Ghostscript.
// Safe to re-run — already-compressed PDFs will just report "no size benefit"
// and be skipped without modification.
//
// Usage:
//   Local:    node scripts/compress-existing-pdfs.js
//   Railway:  railway run node scripts/compress-existing-pdfs.js
//             (runs against the production volume — back up first if paranoid)

const { spawn } = require("child_process");
const { readdir, stat, unlink, rename } = require("fs/promises");
const { existsSync } = require("fs");
const path = require("path");

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");

function compressOne(filepath) {
  const outputPath = filepath.replace(/\.pdf$/i, ".compressed.pdf");
  return new Promise((resolve) => {
    const proc = spawn("gs", [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      "-dPDFSETTINGS=/ebook",
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      "-dDetectDuplicateImages=true",
      "-dCompressFonts=true",
      "-dSubsetFonts=true",
      `-sOutputFile=${outputPath}`,
      filepath,
    ]);
    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d.toString(); });
    const timeout = setTimeout(() => { try { proc.kill("SIGKILL"); } catch {} }, 120_000);
    proc.on("error", async (err) => {
      clearTimeout(timeout);
      try { if (existsSync(outputPath)) await unlink(outputPath); } catch {}
      resolve({ ok: false, reason: err.message });
    });
    proc.on("close", async (code) => {
      clearTimeout(timeout);
      if (code !== 0 || !existsSync(outputPath)) {
        try { if (existsSync(outputPath)) await unlink(outputPath); } catch {}
        return resolve({ ok: false, reason: stderr.trim() || `gs exited ${code}` });
      }
      try {
        const [origStat, compStat] = await Promise.all([stat(filepath), stat(outputPath)]);
        if (compStat.size >= origStat.size) {
          await unlink(outputPath);
          return resolve({ ok: true, skipped: true, originalSize: origStat.size });
        }
        await unlink(filepath);
        await rename(outputPath, filepath);
        resolve({ ok: true, originalSize: origStat.size, compressedSize: compStat.size });
      } catch (err) {
        try { if (existsSync(outputPath)) await unlink(outputPath); } catch {}
        resolve({ ok: false, reason: err.message });
      }
    });
  });
}

(async () => {
  if (!existsSync(UPLOAD_DIR)) {
    console.error(`Upload directory not found: ${UPLOAD_DIR}`);
    process.exit(1);
  }

  // Sanity: check gs is available
  await new Promise((resolve) => {
    const proc = spawn("gs", ["--version"], { stdio: "ignore" });
    proc.on("error", () => {
      console.error("✗ Ghostscript not installed. Run: brew install ghostscript (macOS) or apt install ghostscript (Linux)");
      process.exit(1);
    });
    proc.on("close", resolve);
  });

  const entries = await readdir(UPLOAD_DIR);
  const pdfs = entries.filter((f) => f.toLowerCase().endsWith(".pdf") && !f.endsWith(".compressed.pdf"));

  console.log(`Found ${pdfs.length} PDF(s) in ${UPLOAD_DIR}\n`);

  let totalSaved = 0;
  let compressed = 0;
  let skipped = 0;
  let failed = 0;

  for (const f of pdfs) {
    const fp = path.join(UPLOAD_DIR, f);
    process.stdout.write(`  ${f.slice(0, 40).padEnd(40)} `);
    const r = await compressOne(fp);
    if (!r.ok) {
      failed++;
      console.log(`✗ ${r.reason}`);
    } else if (r.skipped) {
      skipped++;
      console.log(`= already optimised (${(r.originalSize / 1024).toFixed(0)} KB)`);
    } else {
      compressed++;
      const saved = r.originalSize - r.compressedSize;
      totalSaved += saved;
      const pct = ((1 - r.compressedSize / r.originalSize) * 100).toFixed(0);
      console.log(`✓ ${(r.originalSize / 1024).toFixed(0)} → ${(r.compressedSize / 1024).toFixed(0)} KB (-${pct}%)`);
    }
  }

  console.log(`\nDone. Compressed: ${compressed}  Skipped: ${skipped}  Failed: ${failed}  Total saved: ${(totalSaved / 1024 / 1024).toFixed(2)} MB`);
})();
