"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import ThemeProvider from "@/components/ThemeProvider";

function VerifyContent() {
  const router = useRouter();
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") || searchParams.get("reference") || searchParams.get("trxref");
  const [status, setStatus] = useState("verifying"); // verifying | success | failed
  const [message, setMessage] = useState("Verifying your payment...");
  const [tenant, setTenant] = useState(null);

  useEffect(() => {
    fetch(`/api/tenant?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(d => setTenant(d.tenant))
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!ref) { setStatus("failed"); setMessage("No payment reference found"); return; }

    fetch(`/api/payments?ref=${encodeURIComponent(ref)}`)
      .then(r => r.json())
      .then(data => {
        if (data.status === "success") {
          setStatus("success");
          setMessage("Payment successful! Redirecting to your courses...");
          setTimeout(() => router.push(`/${slug}/learner`), 2000);
        } else {
          setStatus("failed");
          setMessage(data.message || "Payment verification failed. Please contact support.");
        }
      })
      .catch(() => {
        setStatus("failed");
        setMessage("Could not verify payment. Please try again.");
      });
  }, [ref, slug, router]);

  return (
    <>
      <ThemeProvider tenant={tenant} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 20 }}>
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%", margin: "0 auto 24px",
            background: status === "success" ? "var(--success-soft)" : status === "failed" ? "var(--danger-soft)" : "var(--surface-alt)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {status === "verifying" && (
              <div style={{ width: 32, height: 32, border: "3px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
            )}
            {status === "success" && (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            )}
            {status === "failed" && (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            )}
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>
            {status === "verifying" ? "Processing Payment" : status === "success" ? "Payment Confirmed!" : "Payment Issue"}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 16, marginBottom: 24 }}>{message}</p>

          {status === "failed" && (
            <button className="btn btn-primary" style={{ padding: "12px 32px" }}
              onClick={() => router.push(`/${slug}`)}>
              Back to Login
            </button>
          )}
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "var(--text-muted)" }}>Loading...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
