"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

export default function HomePage() {
  const router = useRouter();
  const [idNumber, setIdNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idNumber, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Invalid credentials");
        setLoading(false);
        return;
      }
      if (data.user.role === "superadmin") router.push("/superadmin");
      else router.push("/admin");
    } catch {
      setError("Connection error.");
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "32px 20px", position: "relative" }}>
      <div style={{ position: "absolute", top: 20, right: 20 }}><ThemeToggle /></div>

      <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: "linear-gradient(135deg, #111, #333)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
            color: "#fff", fontWeight: 800, fontSize: 14, letterSpacing: "-0.02em",
          }}>
            ONYX
          </div>
          <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 24, fontWeight: 800, margin: 0 }}>
            Platform Admin
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "6px 0 0" }}>
            Onyx Digital — Super Admin Access
          </p>
        </div>

        <div className="card" style={{ textAlign: "left" }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 18 }}>
              <label className="label">Admin ID</label>
              <input className="input" value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="Enter admin ID" autoFocus autoComplete="username" />
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
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "13px 20px", background: "#333", boxShadow: "none" }}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 24, lineHeight: 1.6 }}>
          Organizations access their training portal at their dedicated URL.
        </p>
      </div>
    </div>
  );
}
