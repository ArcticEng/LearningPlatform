"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import ThemeProvider from "@/components/ThemeProvider";
import Logo from "@/components/Logo";

export default function TenantLoginPage() {
  const router = useRouter();
  const { slug } = useParams();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [idNumber, setIdNumber] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tenant, setTenant] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/tenant?slug=${encodeURIComponent(slug)}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => {
        setTenant(d.tenant);
        // Load courses if payments enabled
        if (d.tenant?.featurePayments) {
          fetch(`/api/public-courses?slug=${encodeURIComponent(slug)}`)
            .then(r => r.json()).then(cd => setCourses(cd.courses || [])).catch(() => {});
        }
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  const formatPrice = (cents, currency = "ZAR") => {
    const amount = (cents / 100).toFixed(2);
    return currency === "ZAR" ? `R ${amount}` : `${currency} ${amount}`;
  };

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
      if (!res.ok) { setError(data.error || "Login failed"); setLoading(false); return; }
      router.push(data.user.role === "admin" ? `/${slug}/admin` : `/${slug}/learner`);
    } catch { setError("Connection error."); setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (!name || !idNumber || !password || !accessCode || !email) {
      setError("Please fill in all required fields"); return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, idNumber, password, accessCode, tenantSlug: slug, email, phone }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Registration failed"); setLoading(false); return; }
      router.push(`/${slug}/learner`);
    } catch { setError("Connection error."); setLoading(false); }
  };

  const switchMode = (m) => {
    setMode(m); setError(""); setIdNumber(""); setPassword(""); setName(""); setAccessCode(""); setEmail(""); setPhone("");
  };

  if (notFound) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", textAlign: "center", padding: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Organization not found</h1>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>No organization matches &ldquo;{slug}&rdquo;</p>
          <a href="/" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>Go to homepage</a>
        </div>
      </div>
    );
  }

  if (!tenant) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "var(--text-muted)" }}>Loading...</div>;

  const showRegister = tenant.featureSelfRegister;
  const showCourses = tenant.featurePayments && courses.length > 0;

  return (
    <>
      <ThemeProvider tenant={tenant} />
      <div style={{ minHeight: "100vh", padding: "32px 20px", position: "relative" }}>
        <div style={{ position: "absolute", top: 20, right: 20 }}><ThemeToggle /></div>

        <div style={{ maxWidth: showCourses ? 960 : 440, margin: "0 auto" }}>
          {/* ── Header ── */}
          <div style={{ textAlign: "center", marginBottom: showCourses ? 40 : 32 }}>
            {tenant.logoUrl ? (
              <div style={{ margin: "0 auto 16px", display: "inline-flex" }}>
                <Logo size={showCourses ? 100 : 120} src={tenant.logoUrl} />
              </div>
            ) : (
              <div style={{
                width: 80, height: 80, borderRadius: 20,
                background: `linear-gradient(135deg, ${tenant.colorPrimary}, ${tenant.colorSecondary})`,
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px", boxShadow: `0 10px 40px ${tenant.colorPrimary}40`,
                color: "#fff", fontWeight: 800, fontSize: 18,
              }}>
                {tenant.name.split(" ").map(w => w[0]).join("").slice(0, 3)}
              </div>
            )}
            <h1 style={{ fontFamily: `'${tenant.fontHeading}', sans-serif`, fontSize: showCourses ? 34 : 28, fontWeight: 800, margin: "0 0 4px", letterSpacing: "-0.03em" }}>
              {tenant.name}
            </h1>
            {tenant.tagline && (
              <p style={{ fontFamily: `'${tenant.fontHeading}', sans-serif`, color: "var(--text-muted)", fontSize: 16, margin: "4px 0 0", fontWeight: 500 }}>
                {tenant.tagline}
              </p>
            )}
          </div>

          {/* ── Courses Section (hero when payments enabled) ── */}
          {showCourses && (
            <>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <h2 style={{ fontFamily: `'${tenant.fontHeading}', sans-serif`, fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>Available Courses</h2>
                <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Select a course to purchase and start learning</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20, marginBottom: 48 }}>
                {courses.map(c => {
                  const isFull = c.maxEnrollment > 0 && c.enrolledCount >= c.maxEnrollment;
                  return (
                    <div key={c.id} className="card" style={{
                      padding: 0, overflow: "hidden", transition: "transform 0.2s, box-shadow 0.2s",
                      cursor: isFull ? "not-allowed" : "pointer", opacity: isFull ? 0.6 : 1,
                    }}
                      onClick={() => !isFull && router.push(`/${slug}/courses`)}
                      onMouseEnter={e => !isFull && (e.currentTarget.style.transform = "translateY(-3px)", e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.12)")}
                      onMouseLeave={e => (e.currentTarget.style.transform = "none", e.currentTarget.style.boxShadow = "none")}>
                      {/* Image with promo */}
                      {c.imageUrl ? (
                        <div style={{ position: "relative" }}>
                          <img src={c.imageUrl} alt="" style={{ width: "100%", height: 180, objectFit: "cover", display: "block" }} />
                          {c.promoLabel && (
                            <div style={{
                              position: "absolute", top: 12, left: 12,
                              background: "linear-gradient(135deg, var(--accent), var(--brand-primary))",
                              color: "#fff", padding: "5px 12px", borderRadius: 8,
                              fontSize: 11, fontWeight: 700, boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                            }}>
                              🏷️ {c.promoLabel}
                            </div>
                          )}
                          {isFull && (
                            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>FULLY ENROLLED</span>
                            </div>
                          )}
                        </div>
                      ) : null}

                      <div style={{ padding: "16px 20px 20px" }}>
                        <h3 style={{ margin: "0 0 6px", fontSize: 18, fontWeight: 700 }}>{c.title}</h3>
                        <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 14px", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {c.description || ""}
                        </p>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
                          <span className="badge badge-accent">{c._count.modules} MODULES</span>
                          {c.isBundle && <span className="badge" style={{ background: "#8b5cf640", color: "#8b5cf6", fontWeight: 700 }}>📦 BUNDLE</span>}
                          {c.maxEnrollment > 0 && !isFull && (
                            <span className="badge badge-success">{c.maxEnrollment - c.enrolledCount} SPOT{c.maxEnrollment - c.enrolledCount !== 1 ? "S" : ""} LEFT</span>
                          )}
                        </div>
                        <button disabled={isFull} style={{
                          width: "100%", padding: "12px 16px", borderRadius: 10, border: "none",
                          cursor: isFull ? "not-allowed" : "pointer",
                          background: isFull ? "var(--border)" : "linear-gradient(135deg, var(--accent), var(--brand-primary))",
                          color: "#fff", fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                          boxShadow: isFull ? "none" : "0 3px 12px rgba(0,0,0,0.15)",
                        }}>
                          🛒 {formatPrice(c.price, c.currency)} – BUY NOW
                        </button>
                        {c.promoLabel && (
                          <div style={{ textAlign: "center", marginTop: 6, fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>
                            ⏰ {c.promoLabel}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                <span style={{ color: "var(--text-muted)", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap" }}>Already enrolled?</span>
                <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
              </div>
            </>
          )}

          {/* ── Login / Register ── */}
          <div style={{ maxWidth: 440, margin: "0 auto" }}>
            {showRegister && (
              <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "var(--surface-alt)", borderRadius: 10, padding: 4 }}>
                <button onClick={() => switchMode("login")} style={{
                  flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontWeight: 600, fontSize: 14, transition: "0.2s",
                  background: mode === "login" ? "var(--surface)" : "transparent",
                  color: mode === "login" ? "var(--text)" : "var(--text-muted)",
                  boxShadow: mode === "login" ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                }}>Sign In</button>
                <button onClick={() => switchMode("register")} style={{
                  flex: 1, padding: "10px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                  fontWeight: 600, fontSize: 14, transition: "0.2s",
                  background: mode === "register" ? "var(--surface)" : "transparent",
                  color: mode === "register" ? "var(--text)" : "var(--text-muted)",
                  boxShadow: mode === "register" ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                }}>Register</button>
              </div>
            )}

            <div className="card" style={{ textAlign: "left" }}>
              {mode === "login" ? (
                <form onSubmit={handleLogin}>
                  <div style={{ marginBottom: 18 }}>
                    <label className="label">ID Number</label>
                    <input className="input" value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="Enter your ID number" autoFocus autoComplete="username" />
                  </div>
                  <div style={{ marginBottom: 24 }}>
                    <label className="label">Password</label>
                    <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" autoComplete="current-password" />
                  </div>
                  {error && <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 16, padding: "10px 14px", background: "var(--danger-soft)", borderRadius: 8 }}>{error}</div>}
                  <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "13px 20px" }}>
                    {loading ? "Signing in\u2026" : "Sign In"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister}>
                  <div style={{ marginBottom: 14 }}>
                    <label className="label">Access Code</label>
                    <input className="input" value={accessCode} onChange={e => setAccessCode(e.target.value.toUpperCase())}
                      placeholder="e.g. SRB-NAILS-2026" autoFocus
                      style={{ fontFamily: "monospace", letterSpacing: "0.08em", textTransform: "uppercase" }} />
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Enter the code provided by your instructor</div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label className="label">Full Name</label>
                    <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" autoComplete="name" />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label className="label">ID Number</label>
                    <input className="input" value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="Your ID number" autoComplete="username" />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label className="label">Email</label>
                    <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label className="label">Phone <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(optional)</span></label>
                    <input className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 071 234 5678" autoComplete="tel" />
                  </div>
                  <div style={{ marginBottom: 24 }}>
                    <label className="label">Create Password</label>
                    <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Choose a password" autoComplete="new-password" />
                  </div>
                  {error && <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 16, padding: "10px 14px", background: "var(--danger-soft)", borderRadius: 8 }}>{error}</div>}
                  <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "13px 20px" }}>
                    {loading ? "Creating account\u2026" : "Register & Start Learning"}
                  </button>
                </form>
              )}
            </div>

            <p style={{ color: "var(--text-muted)", fontSize: 12, textAlign: "center", marginTop: 16 }}>
              {mode === "login"
                ? (showRegister ? "Don\u2019t have an account? Click Register above." : "Contact your training facilitator for access.")
                : "Already have an account? Click Sign In above."
              }
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
