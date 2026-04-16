/* Logo component — uses the real Aloe Care Trainify logo from /public/logo.jpg */
export default function Logo({ size = 36 }) {
  return (
    <div style={{
      width: size, height: size,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <img
        src="/logo.jpg"
        alt="Aloe Care Trainify"
        width={size}
        height={size}
        style={{
          width: size, height: size,
          objectFit: "contain",
          borderRadius: size > 48 ? 0 : 8,
        }}
      />
    </div>
  );
}
