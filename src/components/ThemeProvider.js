"use client";
import { useEffect, useState } from "react";

// ─── Color utilities ───
function hexToHSL(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); };
  return "#" + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
}

function hexToRGBA(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyTheme(tenant, theme) {
  const root = document.documentElement;
  const { colorPrimary, colorSecondary, colorAccent } = tenant;

  root.style.setProperty("--brand-primary", colorPrimary);
  root.style.setProperty("--brand-secondary", colorSecondary);
  root.style.setProperty("--brand-accent", colorAccent);

  const [h, s] = hexToHSL(colorPrimary);

  if (theme === "dark") {
    root.style.setProperty("--bg", hslToHex(h, Math.min(s, 50), 6));
    root.style.setProperty("--surface", hslToHex(h, Math.min(s, 45), 10));
    root.style.setProperty("--surface-alt", hslToHex(h, Math.min(s, 40), 14));
    root.style.setProperty("--border", hslToHex(h, Math.min(s, 35), 22));
    root.style.setProperty("--text", "#eef1fa");
    root.style.setProperty("--text-muted", hslToHex(h, Math.min(s, 25), 60));
    root.style.setProperty("--accent", colorAccent);
    root.style.setProperty("--accent-hover", colorAccent);
    root.style.setProperty("--accent-soft", hexToRGBA(colorAccent, 0.14));
    root.style.setProperty("--modal-bg", "rgba(0, 0, 0, 0.7)");
    root.style.setProperty("--shadow-card", "none");
  } else {
    root.style.setProperty("--bg", hslToHex(h, Math.min(s, 30), 96));
    root.style.setProperty("--surface", "#ffffff");
    root.style.setProperty("--surface-alt", hslToHex(h, Math.min(s, 25), 94));
    root.style.setProperty("--border", hslToHex(h, Math.min(s, 20), 88));
    root.style.setProperty("--text", "#0f172a");
    root.style.setProperty("--text-muted", hslToHex(h, Math.min(s, 20), 42));
    root.style.setProperty("--accent", colorPrimary);
    root.style.setProperty("--accent-hover", colorSecondary);
    root.style.setProperty("--accent-soft", hexToRGBA(colorPrimary, 0.10));
    root.style.setProperty("--modal-bg", "rgba(0, 0, 0, 0.5)");
    root.style.setProperty("--shadow-card", "0 1px 3px rgba(0,0,0,0.06)");
  }
}

export default function ThemeProvider({ tenant }) {
  const [theme, setTheme] = useState("dark");

  // Track the current theme from the DOM
  useEffect(() => {
    const root = document.documentElement;
    setTheme(root.dataset.theme || "dark");

    const observer = new MutationObserver(() => {
      setTheme(root.dataset.theme || "dark");
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // Apply colors whenever tenant OR theme changes
  useEffect(() => {
    if (!tenant) return;
    applyTheme(tenant, theme);

    return () => {
      const root = document.documentElement;
      const props = ["--bg", "--surface", "--surface-alt", "--border", "--text", "--text-muted",
        "--brand-primary", "--brand-secondary", "--brand-accent",
        "--accent", "--accent-hover", "--accent-soft", "--modal-bg", "--shadow-card"];
      props.forEach(p => root.style.removeProperty(p));
    };
  }, [tenant, theme]);

  // Load fonts
  useEffect(() => {
    if (!tenant) return;
    const { fontHeading, fontBody } = tenant;
    if (!fontHeading && !fontBody) return;

    const families = [fontHeading, fontBody].filter(Boolean);
    const weights = "400;500;600;700;800;900";
    const href = `https://fonts.googleapis.com/css2?${families.map(f => `family=${encodeURIComponent(f)}:wght@${weights}`).join("&")}&display=swap`;

    let link = document.getElementById("tenant-fonts");
    if (!link) {
      link = document.createElement("link");
      link.id = "tenant-fonts";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = href;
    if (fontBody) document.body.style.fontFamily = `'${fontBody}', system-ui, sans-serif`;
  }, [tenant]);

  return null;
}
