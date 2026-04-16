"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import Logo from "@/components/Logo";

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
      <div style={{ position: "absolute", top: 20, right: 20 }}><ThemeToggle /></div>

      <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ margin: "0 auto 16px", display: "inline-flex" }}>
            <Logo size={140}/>
          </div>
          <div className="login-hero">We Empower · We Innovate · We Care</div>
          <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: "-0.03em" }}>
            Aloe Care Trainify
          </h1>
          <p className="login-tag">Dementia Care Training Platform</p>
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
          Need access? Contact your training facilitator.
        </p>
      </div>
    </div>
  );
}
