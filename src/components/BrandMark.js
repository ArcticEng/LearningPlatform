export default function BrandMark({ subtitle, size = 36 }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{
        width: size, height: size, borderRadius: 10,
        background: "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 800, fontSize: size * 0.38,
        letterSpacing: "-0.04em", flexShrink: 0,
        boxShadow: "0 2px 8px rgba(13, 115, 119, 0.25)",
      }}>
        ACT
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.02em" }}>ACT Academy</div>
        {subtitle && (
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
}
