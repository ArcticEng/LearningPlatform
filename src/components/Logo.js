export default function Logo({ size = 36, src }) {
  const logoSrc = src || "/logo.jpg";
  return (
    <div style={{
      width: size, height: size,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <img
        src={logoSrc}
        alt="Logo"
        width={size}
        height={size}
        style={{
          width: size, height: size,
          objectFit: "contain",
          borderRadius: size > 48 ? 0 : 8,
        }}
        onError={(e) => {
          // Fallback to text if logo fails to load
          e.target.style.display = "none";
          e.target.parentElement.style.background = "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))";
          e.target.parentElement.style.borderRadius = "10px";
          e.target.parentElement.style.color = "#fff";
          e.target.parentElement.style.fontWeight = "800";
          e.target.parentElement.style.fontSize = `${size * 0.3}px`;
          e.target.parentElement.textContent = "LMS";
        }}
      />
    </div>
  );
}
