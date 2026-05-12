"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import ThemeProvider from "@/components/ThemeProvider";
import Logo from "@/components/Logo";

export default function CourseCatalogPage() {
  const { slug } = useParams();
  const [tenant, setTenant] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [form, setForm] = useState({ email: "", name: "", idNumber: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    fetch(`/api/tenant?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json()).then(d => setTenant(d.tenant)).catch(() => {});
    fetch(`/api/public-courses?slug=${encodeURIComponent(slug)}`)
      .then(r => r.json()).then(d => setCourses(d.courses || [])).catch(() => {});
  }, [slug]);

  const formatPrice = (cents, currency = "ZAR") => {
    const amount = (cents / 100).toFixed(2);
    return currency === "ZAR" ? `R ${amount}` : `${currency} ${amount}`;
  };

  const selectCourse = (c) => {
    if (c.maxEnrollment > 0 && c.enrolledCount >= c.maxEnrollment) return;
    setSelectedCourse(c); setError(""); setSelectedSlot(null);
    if (tenant?.featureBookings) {
      fetch(`/api/booking-slots?slug=${encodeURIComponent(slug)}&future=true&courseId=${c.id}`)
        .then(r => r.json()).then(d => setAvailableSlots(d.slots || [])).catch(() => setAvailableSlots([]));
    }
    // Scroll to form on mobile
    setTimeout(() => {
      const el = document.getElementById("enroll-form");
      if (el && window.innerWidth < 768) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handlePurchase = async () => {
    if (!selectedCourse || !form.email || !form.name || !form.idNumber) {
      setError("All fields are required");
      return;
    }
    if (tenant?.featureBookings && availableSlots.length > 0 && !selectedSlot) {
      setError("Please select a training date");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantSlug: slug,
          courseId: selectedCourse.id,
          email: form.email,
          name: form.name,
          idNumber: form.idNumber,
          phone: form.phone,
          bookingSlotId: selectedSlot?.id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Payment failed");
        setLoading(false);
        return;
      }
      window.location.href = data.authorizationUrl;
    } catch {
      setError("Connection error. Please try again.");
      setLoading(false);
    }
  };

  if (!tenant) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "var(--text-muted)" }}>Loading...</div>;
  }

  return (
    <>
      <ThemeProvider tenant={tenant} />
      <div style={{ minHeight: "100vh", padding: "32px 20px", position: "relative" }}>
        <div style={{ position: "absolute", top: 20, right: 20 }}><ThemeToggle /></div>

        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            {tenant.logoUrl && (
              <div style={{ margin: "0 auto 16px", display: "inline-flex" }}>
                <Logo size={80} src={tenant.logoUrl} />
              </div>
            )}
            <h1 style={{ fontFamily: `'${tenant.fontHeading}', sans-serif`, fontSize: 32, fontWeight: 800, margin: "0 0 4px" }}>
              {tenant.name}
            </h1>
            {tenant.tagline && (
              <p style={{ fontFamily: `'${tenant.fontHeading}', sans-serif`, fontSize: 18, color: "var(--text-muted)", margin: "0 0 8px", fontWeight: 500 }}>
                {tenant.tagline}
              </p>
            )}
            <p style={{ color: "var(--text-muted)", fontSize: 16 }}>Available Courses</p>
          </div>

          {/* Course cards */}
          {courses.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
              <p style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>No courses available</p>
              <p>Check back soon for new courses.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20, marginBottom: 40 }}>
              {courses.map(c => {
                const isFull = c.maxEnrollment > 0 && c.enrolledCount >= c.maxEnrollment;
                const isSelected = selectedCourse?.id === c.id;
                return (
                <div key={c.id} className="card" style={{
                  cursor: isFull ? "not-allowed" : "pointer", transition: "border-color 0.2s, transform 0.2s, box-shadow 0.2s",
                  border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border)",
                  opacity: isFull ? 0.6 : 1, padding: 0, overflow: "hidden",
                  boxShadow: isSelected ? "0 4px 20px rgba(0,0,0,0.1)" : "none",
                }}
                  onClick={() => selectCourse(c)}
                  onMouseEnter={e => !isFull && (e.currentTarget.style.transform = "translateY(-2px)")}
                  onMouseLeave={e => e.currentTarget.style.transform = "none"}>

                  {/* Image with promo overlay */}
                  {c.imageUrl ? (
                    <div style={{ position: "relative", overflow: "hidden" }}>
                      <img src={c.imageUrl} alt="" style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
                      {c.promoLabel && (
                        <div style={{
                          position: "absolute", top: 12, left: 12,
                          background: "linear-gradient(135deg, var(--accent), var(--brand-primary))",
                          color: "#fff", padding: "6px 14px", borderRadius: 8,
                          fontSize: 12, fontWeight: 700, boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                          display: "flex", alignItems: "center", gap: 6,
                        }}>
                          🏷️ {c.promoLabel}
                        </div>
                      )}
                      {isFull && (
                        <div style={{
                          position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{ color: "#fff", fontWeight: 800, fontSize: 18 }}>FULLY ENROLLED</span>
                        </div>
                      )}
                    </div>
                  ) : c.promoLabel ? (
                    <div style={{ padding: "10px 20px 0" }}>
                      <div style={{
                        background: "linear-gradient(135deg, var(--accent), var(--brand-primary))",
                        color: "#fff", padding: "6px 14px", borderRadius: 8,
                        fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 6,
                      }}>
                        🏷️ {c.promoLabel}
                      </div>
                    </div>
                  ) : null}

                  {/* Content */}
                  <div style={{ padding: "16px 20px 20px" }}>
                    <h3 style={{ margin: "0 0 8px", fontSize: 20, fontWeight: 700 }}>{c.title}</h3>
                    <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 16px", minHeight: 40, lineHeight: 1.5 }}>
                      {c.description || "No description"}
                    </p>

                    {/* Badges */}
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
                      <span className="badge badge-accent">{c._count.modules} MODULES</span>
                      {c.isBundle && <span className="badge" style={{ background: "#8b5cf640", color: "#8b5cf6", fontWeight: 700 }}>📦 BUNDLE</span>}
                      {c.maxEnrollment > 0 && !isFull && (
                        <span className="badge badge-success">{c.maxEnrollment - c.enrolledCount} SPOT{c.maxEnrollment - c.enrolledCount !== 1 ? "S" : ""} LEFT</span>
                      )}
                    </div>

                    {/* Price button */}
                    <button
                      disabled={isFull}
                      style={{
                        width: "100%", padding: "14px 20px", borderRadius: 10, border: "none", cursor: isFull ? "not-allowed" : "pointer",
                        background: isFull ? "var(--border)" : "linear-gradient(135deg, var(--accent), var(--brand-primary))",
                        color: "#fff", fontSize: 17, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        transition: "transform 0.15s, box-shadow 0.15s",
                        boxShadow: isFull ? "none" : "0 3px 12px rgba(0,0,0,0.15)",
                      }}
                      onMouseEnter={e => !isFull && (e.currentTarget.style.transform = "scale(1.02)")}
                      onMouseLeave={e => e.currentTarget.style.transform = "none"}
                      onClick={e => { e.stopPropagation(); selectCourse(c); }}
                    >
                      🛒 {formatPrice(c.price, c.currency)} – BUY NOW
                    </button>

                    {/* Promo text under button */}
                    {c.promoLabel && (
                      <div style={{ textAlign: "center", marginTop: 8, fontSize: 12, color: "var(--accent)", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        ⏰ {c.promoLabel}
                      </div>
                    )}
                  </div>
                </div>
                );
              })}
            </div>
          )}

          {/* Enrollment form */}
          {selectedCourse && (
            <div id="enroll-form" style={{ maxWidth: 480, margin: "0 auto" }}>
              <div className="card">
                <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 700 }}>Enroll in: {selectedCourse.title}</h2>
                <p style={{ color: "var(--accent)", fontSize: 22, fontWeight: 800, margin: "0 0 20px" }}>
                  {formatPrice(selectedCourse.price, selectedCourse.currency)}
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <label className="label">Full Name</label>
                    <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your full name" />
                  </div>
                  <div>
                    <label className="label">Email Address</label>
                    <input className="input" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="you@email.com" />
                  </div>
                  <div>
                    <label className="label">ID Number</label>
                    <input className="input" value={form.idNumber} onChange={e => setForm(p => ({ ...p, idNumber: e.target.value }))} placeholder="Your ID number (becomes your login)" />
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>This will be your login username</div>
                  </div>
                  {tenant?.featureBookings && (
                    <div>
                      <label className="label">Phone Number</label>
                      <input className="input" type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="e.g. 079 123 4567" />
                    </div>
                  )}

                  {/* Booking date selection */}
                  {tenant?.featureBookings && availableSlots.length > 0 && (
                    <div>
                      <label className="label">Select Training Date</label>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto", padding: 2 }}>
                        {availableSlots.map(s => {
                          const dateStr = new Date(s.date).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
                          const isSelected = selectedSlot?.id === s.id;
                          return (
                            <div key={s.id} onClick={() => setSelectedSlot(s)}
                              style={{
                                padding: "12px 16px", borderRadius: 10, cursor: "pointer", transition: "0.15s",
                                border: isSelected ? "2px solid var(--accent)" : "1px solid var(--border)",
                                background: isSelected ? "var(--accent-soft)" : "var(--surface-alt)",
                              }}>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{dateStr}</div>
                              <div style={{ display: "flex", gap: 12, marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>
                                {s.startTime && <span>🕒 {s.startTime}{s.endTime ? ` – ${s.endTime}` : ""}</span>}
                                {s.location && <span>📍 {s.location}</span>}
                                <span>{s.spotsLeft} spot{s.spotsLeft !== 1 ? "s" : ""} left</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {error && (
                    <div style={{ color: "var(--danger)", fontSize: 13, padding: "10px 14px", background: "var(--danger-soft)", borderRadius: 8 }}>
                      {error}
                    </div>
                  )}

                  <button className="btn btn-primary" disabled={loading}
                    style={{ width: "100%", justifyContent: "center", padding: "14px 20px", fontSize: 16 }}
                    onClick={handlePurchase}>
                    {loading ? "Processing..." : `Pay ${formatPrice(selectedCourse.price, selectedCourse.currency)} & Enroll`}
                  </button>

                  <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", margin: 0 }}>
                    Secure payment processed by Paystack
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Back to login link */}
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <a href={`/${slug}`} style={{ color: "var(--text-muted)", fontSize: 14, textDecoration: "none" }}>
              Already enrolled? Sign in →
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
