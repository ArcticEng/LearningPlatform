import { spawn } from "child_process";
import { unlink, stat, rename } from "fs/promises";
import { existsSync } from "fs";

let gsAvailable = null;

/** Lazily check (once per process) whether `gs` is on PATH. */
async function checkGhostscript() {
  if (gsAvailable !== null) return gsAvailable;
  return new Promise((resolve) => {
    const proc = spawn("gs", ["--version"], { stdio: "ignore" });
    proc.on("error", () => { gsAvailable = false; resolve(false); });
    proc.on("close", (code) => { gsAvailable = code === 0; resolve(code === 0); });
  });
}

/**
 * Compress a PDF in place using Ghostscript.
 * - If gs isn't installed (e.g. local dev), no-op and return.
 * - If compression doesn't reduce file size (already-optimised PDFs), keep original.
 * - 60s timeout safeguard.
 *
 * @param {string} inputPath - absolute path to PDF on disk; will be replaced if smaller version produced
 * @returns {Promise<{compressed: boolean, originalSize?: number, compressedSize?: number, ratio?: number, reason?: string}>}
 */
export async function compressPdf(inputPath) {
  if (!(await checkGhostscript())) {
    return { compressed: false, reason: "ghostscript not available" };
  }

  const outputPath = inputPath.replace(/\.pdf$/i, ".compressed.pdf");

  return new Promise((resolve) => {
    const proc = spawn("gs", [
      "-sDEVICE=pdfwrite",
      "-dCompatibilityLevel=1.4",
      "-dPDFSETTINGS=/ebook",          // 150dpi images — balanced quality for screen viewing
      "-dNOPAUSE",
      "-dQUIET",
      "-dBATCH",
      "-dDetectDuplicateImages=true",
      "-dCompressFonts=true",
      "-dSubsetFonts=true",
      `-sOutputFile=${outputPath}`,
      inputPath,
    ]);

    let stderr = "";
    proc.stderr.on("data", (d) => { stderr += d.toString(); });

    // Hard 60s timeout — large PDFs shouldn't take longer than this with /ebook preset
    const timeout = setTimeout(() => {
      try { proc.kill("SIGKILL"); } catch {}
    }, 60_000);

    proc.on("error", async (err) => {
      clearTimeout(timeout);
      try { if (existsSync(outputPath)) await unlink(outputPath); } catch {}
      resolve({ compressed: false, reason: err.message });
    });

    proc.on("close", async (code) => {
      clearTimeout(timeout);
      if (code !== 0 || !existsSync(outputPath)) {
        try { if (existsSync(outputPath)) await unlink(outputPath); } catch {}
        return resolve({ compressed: false, reason: stderr.trim() || `gs exited with code ${code}` });
      }
      try {
        const [origStat, compStat] = await Promise.all([stat(inputPath), stat(outputPath)]);
        if (compStat.size >= origStat.size) {
          // Compressed version isn't actually smaller — discard it, keep original
          await unlink(outputPath);
          return resolve({ compressed: false, reason: "no size benefit", originalSize: origStat.size });
        }
        // Replace original with compressed version
        await unlink(inputPath);
        await rename(outputPath, inputPath);
        return resolve({
          compressed: true,
          originalSize: origStat.size,
          compressedSize: compStat.size,
          ratio: compStat.size / origStat.size,
        });
      } catch (err) {
        try { if (existsSync(outputPath)) await unlink(outputPath); } catch {}
        return resolve({ compressed: false, reason: err.message });
      }
    });
  });
}
