"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

export default function LoginPage() {
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

  return (
    <div className="login-wrap" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "32px 20px", position: "relative" }}>
      <div style={{ position: "absolute", top: 20, right: 20 }}>
        <ThemeToggle />
      </div>

      <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: "linear-gradient(135deg, var(--accent), #7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px", boxShadow: "0 8px 32px rgba(79,140,255,0.3)",
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>LearnPulse</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 15, margin: "8px 0 0" }}>Online Course Platform</p>
        </div>

        <div className="card" style={{ textAlign: "left" }}>
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 20 }}>
              <label className="label">ID Number</label>
              <input className="input" value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder="Enter your ID number" autoFocus autoComplete="username" inputMode="text"/>
            </div>
            <div style={{ marginBottom: 24 }}>
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" autoComplete="current-password"/>
            </div>
            {error && (
              <div style={{ color: "var(--danger)", fontSize: 13, marginBottom: 16, padding: "8px 12px", background: "var(--danger-soft)", borderRadius: 8 }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "12px 20px" }}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 20 }}>
          Admin: ID &quot;admin&quot; / Password &quot;admin123&quot;
        </p>
      </div>
    </div>
  );
}
