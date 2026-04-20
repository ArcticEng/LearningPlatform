"use client";
import { useEffect, useState } from "react";

function hexToHSL(hex) {
  if (!hex || hex.length < 7) return [0, 0, 50];
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
  s = Math.max(0, Math.min(100, s));
  l = Math.max(0, Math.min(100, l));
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); };
  return "#" + [f(0), f(8), f(4)].map(x => Math.round(Math.max(0, Math.min(255, x * 255))).toString(16).padStart(2, "0")).join("");
}

function hexToRGBA(hex, alpha) {
  if (!hex || hex.length < 7) return `rgba(100,100,100,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyColors(tenant, theme) {
  if (!tenant) return;
  const root = document.documentElement;
  const { colorPrimary, colorSecondary, colorAccent, colorBgDark } = tenant;

  root.style.setProperty("--brand-primary", colorPrimary);
  root.style.setProperty("--brand-secondary", colorSecondary);
  root.style.setProperty("--brand-accent", colorAccent);

  if (theme === "dark") {
    // Dark mode — derive from colorBgDark if set, otherwise from primary
    const baseHex = colorBgDark || colorPrimary;
    const [h, s, l] = hexToHSL(baseHex);
    const baseL = colorBgDark ? l : 6;
    const baseSat = colorBgDark ? s : Math.min(s, 50);

    root.style.setProperty("--bg", colorBgDark || hslToHex(h, baseSat, 6));
    root.style.setProperty("--surface", hslToHex(h, Math.min(baseSat, 45), baseL + 5));
    root.style.setProperty("--surface-alt", hslToHex(h, Math.min(baseSat, 40), baseL + 9));
    root.style.setProperty("--border", hslToHex(h, Math.min(baseSat, 35), baseL + 17));
    root.style.setProperty("--text", "#eef0f5");
    root.style.setProperty("--text-muted", hslToHex(h, Math.min(baseSat, 25), 62));
    root.style.setProperty("--accent", colorAccent);
    root.style.setProperty("--accent-hover", colorAccent);
    root.style.setProperty("--accent-soft", hexToRGBA(colorAccent, 0.14));
    root.style.setProperty("--modal-bg", "rgba(0,0,0,0.7)");
    root.style.setProperty("--shadow-card", "none");
  } else {
    // Light mode — derive from primary color
    const [h, s] = hexToHSL(colorPrimary);

    root.style.setProperty("--bg", hslToHex(h, Math.min(s, 30), 96));
    root.style.setProperty("--surface", "#ffffff");
    root.style.setProperty("--surface-alt", hslToHex(h, Math.min(s, 20), 95));
    root.style.setProperty("--border", hslToHex(h, Math.min(s, 18), 88));
    root.style.setProperty("--text", hslToHex(h, Math.min(s, 30), 10));
    root.style.setProperty("--text-muted", hslToHex(h, Math.min(s, 18), 42));
    root.style.setProperty("--accent", colorPrimary);
    root.style.setProperty("--accent-hover", colorSecondary);
    root.style.setProperty("--accent-soft", hexToRGBA(colorPrimary, 0.10));
    root.style.setProperty("--modal-bg", "rgba(0,0,0,0.45)");
    root.style.setProperty("--shadow-card", `0 1px 3px ${hexToRGBA(colorPrimary, 0.06)}`);
  }
}

export default function ThemeProvider({ tenant }) {
  const [theme, setTheme] = useState("dark");

  // Watch for theme attribute changes (from ThemeToggle)
  useEffect(() => {
    const root = document.documentElement;
    setTheme(root.dataset.theme || "dark");

    const observer = new MutationObserver(() => {
      const t = root.dataset.theme || "dark";
      setTheme(t);
    });
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  // Apply colors when tenant or theme changes
  useEffect(() => {
    if (!tenant) return;
    applyColors(tenant, theme);
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
