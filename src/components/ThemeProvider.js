"use client";
import { useEffect } from "react";

// Converts hex to darker/lighter variants and injects all CSS custom properties
function hexToSoft(hex, opacity = 0.14) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export default function ThemeProvider({ tenant }) {
  useEffect(() => {
    if (!tenant) return;

    const root = document.documentElement;
    const { colorPrimary, colorSecondary, colorAccent, fontHeading, fontBody } = tenant;

    // Set brand CSS vars (these override the defaults in globals.css)
    root.style.setProperty("--brand-primary", colorPrimary);
    root.style.setProperty("--brand-secondary", colorSecondary);
    root.style.setProperty("--brand-accent", colorAccent);
    root.style.setProperty("--accent-soft", hexToSoft(colorAccent));

    const theme = root.dataset.theme || "dark";
    if (theme === "dark") {
      root.style.setProperty("--accent", colorAccent);
      root.style.setProperty("--accent-hover", colorAccent);
    } else {
      root.style.setProperty("--accent", colorPrimary);
      root.style.setProperty("--accent-hover", colorSecondary);
    }

    // Fonts
    if (fontHeading || fontBody) {
      const families = [fontHeading, fontBody].filter(Boolean);
      const weights = "400;500;600;700;800;900";
      const link = document.getElementById("tenant-fonts");
      const href = `https://fonts.googleapis.com/css2?${families.map(f => `family=${encodeURIComponent(f)}:wght@${weights}`).join("&")}&display=swap`;

      if (link) {
        link.href = href;
      } else {
        const el = document.createElement("link");
        el.id = "tenant-fonts";
        el.rel = "stylesheet";
        el.href = href;
        document.head.appendChild(el);
      }

      if (fontBody) document.body.style.fontFamily = `'${fontBody}', system-ui, sans-serif`;
    }

    return () => {
      // Cleanup custom properties on unmount
      root.style.removeProperty("--brand-primary");
      root.style.removeProperty("--brand-secondary");
      root.style.removeProperty("--brand-accent");
      root.style.removeProperty("--accent-soft");
      root.style.removeProperty("--accent");
      root.style.removeProperty("--accent-hover");
    };
  }, [tenant]);

  return null; // No visual output — just side effects
}
