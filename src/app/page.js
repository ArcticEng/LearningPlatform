"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import ThemeProvider from "@/components/ThemeProvider";
import Logo from "@/components/Logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [idNumber, setIdNumber] = useState("");
  const [password, setPassword] = useState("");
  const [orgCode, setOrgCode] = useState(searchParams.get("org") || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tenant, setTenant] = useState(null);

  // Load tenant branding when org code changes
  useEffect(() => {
    if (!orgCode || orgCode.length < 2) { setTenant(null); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/tenant?slug=${encodeURIComponent(orgCode)}`);
        if (res.ok) {
          const data = await res.json();
          setTenant(data.tenant);
        } else {
          setTenant(null);
        }
      } catch { setTenant(null); }
    }, 400);
    return () => clearTimeout(t);
  }, [orgCode]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idNumber, password, tenantSlug: orgCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
      if (data.user.role === "superadmin") router.push("/superadmin");
      else if (data.user.role === "admin") router.push("/admin");
      else router.push("/learner");
    } catch {
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  };

  const brandName = tenant?.name || "Learning Platform";
  const brandTagline = tenant?.tagline || "Online Training & Assessment";

  return (
    <>
      <ThemeProvider tenant={tenant} />
      <div className="login-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "32px 20px", position: "relative" }}>
        <div style={{ position: "absolute", top: 20, right: 20 }}><ThemeToggle /></div>

        <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
          <div style={{ marginBottom: 32 }}>
            {tenant?.logoUrl ? (
              <div style={{ margin: "0 auto 16px", display: "inline-flex" }}>
                <Logo size={120} src={tenant.logoUrl} />
              </div>
            ) : (
              <div style={{
                width: 72, height: 72, borderRadius: 18,
                background: "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px", boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                color: "#fff", fontWeight: 800, fontSize: 22,
              }}>
                LMS
              </div>
            )}
            <div className="login-hero">We Empower · We Innovate · We Care</div>
            <h1 style={{ fontFamily: "var(--brand-heading, 'Montserrat'), sans-serif", fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: "-0.03em" }}>
              {brandName}
            </h1>
            <p className="login-tag">{brandTagline}</p>
          </div>

          <div className="card" style={{ textAlign: "left" }}>
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 18 }}>
                <label className="label">Organization Code</label>
                <input className="input" value={orgCode} onChange={e => setOrgCode(e.target.value.toLowerCase().replace(/\s/g, ""))} placeholder="e.g. act" autoComplete="organization" style={{ letterSpacing: "0.05em" }} />
                {tenant && <div style={{ fontSize: 12, color: "var(--brand-accent, var(--success))", marginTop: 6, fontWeight: 600 }}>{tenant.name}</div>}
              </div>
              <div style={{ marginBottom: 18 }}>
                <label className="label">ID Number</label>
                <input className="input" value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="Enter your ID number" autoComplete="username" inputMode="text" />
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "var(--text-muted)" }}>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
