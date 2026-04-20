"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import ThemeProvider from "@/components/ThemeProvider";
import Logo from "@/components/Logo";

export default function TenantLoginPage() {
  const router = useRouter();
  const { slug } = useParams();
  const [idNumber, setIdNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tenant, setTenant] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/tenant?slug=${encodeURIComponent(slug)}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setTenant(d.tenant))
      .catch(() => setNotFound(true));
  }, [slug]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idNumber, password, tenantSlug: slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
      router.push(data.user.role === "admin" ? "/admin" : "/learner");
    } catch {
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  };

  if (notFound) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", textAlign: "center", padding: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Organization not found</h1>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>No organization matches the code "{slug}"</p>
          <a href="/" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>Go to homepage</a>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "var(--text-muted)" }}>
        Loading...
      </div>
    );
  }

  return (
    <>
      <ThemeProvider tenant={tenant} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "32px 20px", position: "relative" }}>
        <div style={{ position: "absolute", top: 20, right: 20 }}><ThemeToggle /></div>

        <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
          <div style={{ marginBottom: 32 }}>
            {tenant.logoUrl ? (
              <div style={{ margin: "0 auto 16px", display: "inline-flex" }}>
                <Logo size={120} src={tenant.logoUrl} />
              </div>
            ) : (
              <div style={{
                width: 80, height: 80, borderRadius: 20,
                background: `linear-gradient(135deg, ${tenant.colorPrimary}, ${tenant.colorSecondary})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
                boxShadow: `0 10px 40px ${tenant.colorPrimary}40`,
                color: "#fff", fontWeight: 800, fontSize: 18,
              }}>
                {tenant.name.split(" ").map(w => w[0]).join("").slice(0, 3)}
              </div>
            )}
            <h1 style={{
              fontFamily: `'${tenant.fontHeading}', 'Montserrat', sans-serif`,
              fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: "-0.03em",
            }}>
              {tenant.name}
            </h1>
            {tenant.tagline && (
              <p style={{ color: "var(--text-muted)", fontSize: 14, fontStyle: "italic", margin: "8px 0 0" }}>
                {tenant.tagline}
              </p>
            )}
          </div>

          <div className="card" style={{ textAlign: "left" }}>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 18 }}>
                <label className="label">ID Number</label>
                <input className="input" value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="Enter your ID number" autoFocus autoComplete="username" />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label className="label">Password</label>
                <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" autoComplete="current-password" />
              </div>
              {error && (
                <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 16, padding: "10px 14px", background: "var(--danger-soft)", borderRadius: 8 }}>
                  {error}
                </div>
              )}
              <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "13px 20px" }}>
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          </div>

          <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 24 }}>
            Contact your training facilitator for access.
          </p>
        </div>
      </div>
    </>
  );
}
