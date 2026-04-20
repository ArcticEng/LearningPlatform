"use client";
import { useState, useEffect } from "react";

function getSlug() {
  try {
    const seg = window.location.pathname.split("/").filter(Boolean)[0] || "_root";
    return ["admin", "learner", "superadmin", "api", "_next"].includes(seg) ? "_root" : seg;
  } catch { return "_root"; }
}

function getKey() {
  return `lp-theme-${getSlug()}`;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const key = getKey();
    const saved = localStorage.getItem(key);
    if (saved) {
      setTheme(saved);
      document.documentElement.dataset.theme = saved;
    } else {
      setTheme(document.documentElement.dataset.theme || "dark");
    }
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(getKey(), next); } catch {}
  };

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}
