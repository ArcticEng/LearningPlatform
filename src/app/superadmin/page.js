"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const api = {
  get: (url) => fetch(url).then(r => r.json()),
  post: (url, body) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
  put: (url, body) => fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
  del: (url, body) => fetch(url, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
};

function Icon({ name, size = 20 }) {
  const d = {
    home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
    plus: "M12 5v14M5 12h14",
    x: "M18 6L6 18M6 6l12 12",
    check: "M20 6L9 17l-5-5",
    out: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",
    edit: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",
    trash: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    building: "M3 21h18M3 7v14M21 7v14M6 11h.01M6 15h.01M10 11h.01M10 15h.01M14 11h.01M14 15h.01M18 11h.01M18 15h.01M9 21v-4h6v4",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d[name] || ""} />
      {name === "out" && <><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>}
      {name === "edit" && <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />}
    </svg>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{title}</h2>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: 4 }}><Icon name="x" size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ColorInput({ label, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          style={{ width: 44, height: 38, border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer", padding: 2, background: "var(--surface-alt)" }} />
        <input className="input" value={value} onChange={e => onChange(e.target.value)} style={{ flex: 1, fontFamily: "monospace", fontSize: 13 }} />
      </div>
    </div>
  );
}

const FONT_OPTIONS = ["Montserrat", "Nunito", "Inter", "Poppins", "Lato", "Roboto", "Open Sans", "Raleway", "DM Sans", "Source Sans 3", "Work Sans", "Manrope", "Playfair Display", "Quicksand", "Cormorant Garamond"];

const defaultTenantForm = {
  slug: "", name: "", tagline: "", logoUrl: "",
  colorPrimary: "#1A2E6B", colorSecondary: "#2A4AA8", colorAccent: "#C3E234",
  fontHeading: "Montserrat", fontBody: "Nunito",
  adminName: "", adminIdNumber: "", adminPassword: "",
};

export default function SuperAdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(null);
  const [form, setForm] = useState({ ...defaultTenantForm });
  const [logoUploading, setLogoUploading] = useState(false);
  const logoRef = useRef(null);

  const loadData = useCallback(async () => {
    const data = await api.get("/api/superadmin/tenants");
    setTenants(data.tenants || []);
  }, []);

  useEffect(() => {
    api.get("/api/auth").then(d => {
      if (!d.user || d.user.role !== "superadmin") { router.push("/"); return; }
      setUser(d.user);
      loadData();
    });
  }, [router, loadData]);

  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
  };

  const createTenant = async () => {
    if (!form.slug || !form.name) return alert("Slug and name are required");
    const res = await api.post("/api/superadmin/tenants", form);
    if (res.error) return alert(res.error);
    setForm({ ...defaultTenantForm });
    setShowCreate(false);
    loadData();
  };

  const updateTenant = async () => {
    if (!showEdit) return;
    const res = await api.put("/api/superadmin/tenants", { id: showEdit.id, ...form });
    if (res.error) return alert(res.error);
    setShowEdit(null);
    loadData();
  };

  const deleteTenant = async (id) => {
    if (!confirm("Delete this tenant and ALL its data (users, courses, results)?")) return;
    await api.del("/api/superadmin/tenants", { id });
    loadData();
  };

  const openEdit = (t) => {
    setForm({
      name: t.name, tagline: t.tagline, logoUrl: t.logoUrl,
      colorPrimary: t.colorPrimary, colorSecondary: t.colorSecondary, colorAccent: t.colorAccent,
      fontHeading: t.fontHeading, fontBody: t.fontBody,
    });
    setShowEdit(t);
  };

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  if (!user) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "var(--text-muted)" }}>Loading…</div>;

  const totalLearners = tenants.reduce((a, t) => a + t.learnerCount, 0);
  const totalTests = tenants.reduce((a, t) => a + t.resultCount, 0);

  const BrandingFields = (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div><label className="label">Name</label><input className="input" value={form.name} onChange={e => set("name", e.target.value)} /></div>
        {showCreate && <div><label className="label">Slug (login code)</label><input className="input" value={form.slug} onChange={e => set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="e.g. act" style={{ fontFamily: "monospace" }} /></div>}
        {!showCreate && <div><label className="label">Tagline</label><input className="input" value={form.tagline} onChange={e => set("tagline", e.target.value)} /></div>}
      </div>
      {showCreate && <div><label className="label">Tagline</label><input className="input" value={form.tagline} onChange={e => set("tagline", e.target.value)} /></div>}
      <div>
        <label className="label">Logo</label>
        {form.logoUrl && (
          <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <img src={form.logoUrl} alt="Logo" style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 8, background: "var(--surface-alt)", padding: 4 }} />
            <span style={{ fontSize: 12, color: "var(--text-muted)", wordBreak: "break-all" }}>{form.logoUrl}</span>
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <input className="input" value={form.logoUrl} onChange={e => set("logoUrl", e.target.value)} placeholder="URL or upload" style={{ flex: 1 }} />
          {showEdit && (
            <>
              <input ref={logoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                const file = e.target.files[0];
                if (!file || !showEdit) return;
                setLogoUploading(true);
                const fd = new FormData();
                fd.append("logo", file);
                fd.append("tenantId", showEdit.id);
                const res = await fetch("/api/superadmin/upload-logo", { method: "POST", body: fd }).then(r => r.json());
                if (res.logoUrl) set("logoUrl", res.logoUrl);
                setLogoUploading(false);
                e.target.value = "";
              }} />
              <button className="btn btn-sm btn-secondary" onClick={() => logoRef.current?.click()} disabled={logoUploading}>
                {logoUploading ? "Uploading\u2026" : "Upload"}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ padding: 16, background: "var(--surface-alt)", borderRadius: 10, border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Brand Colors</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <ColorInput label="Primary" value={form.colorPrimary} onChange={v => set("colorPrimary", v)} />
          <ColorInput label="Secondary" value={form.colorSecondary} onChange={v => set("colorSecondary", v)} />
          <ColorInput label="Accent" value={form.colorAccent} onChange={v => set("colorAccent", v)} />
        </div>
        {/* Preview */}
        <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
          <div style={{ flex: 1, height: 36, borderRadius: 8, background: form.colorPrimary }} />
          <div style={{ flex: 1, height: 36, borderRadius: 8, background: form.colorSecondary }} />
          <div style={{ flex: 1, height: 36, borderRadius: 8, background: form.colorAccent }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label className="label">Heading Font</label>
          <select className="input" value={form.fontHeading} onChange={e => set("fontHeading", e.target.value)}>
            {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Body Font</label>
          <select className="input" value={form.fontBody} onChange={e => set("fontBody", e.target.value)}>
            {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {showCreate && (
        <div style={{ padding: 16, background: "var(--surface-alt)", borderRadius: 10, border: "1px solid var(--border)", marginTop: 4 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Admin User (optional)</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div><label className="label">Name</label><input className="input" value={form.adminName} onChange={e => set("adminName", e.target.value)} /></div>
            <div><label className="label">ID Number</label><input className="input" value={form.adminIdNumber} onChange={e => set("adminIdNumber", e.target.value)} /></div>
            <div><label className="label">Password</label><input className="input" value={form.adminPassword} onChange={e => set("adminPassword", e.target.value)} /></div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800&family=Montserrat:wght@400;500;600;700;800;900&display=swap');`}</style>

      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #111, #333)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 11, letterSpacing: "-0.02em" }}>
            ONYX
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "'Montserrat', sans-serif" }}>Super Admin</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Onyx Digital</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ThemeToggle />
          <button className="btn btn-ghost" style={{ color: "var(--danger)" }} onClick={logout}><Icon name="out" size={16} /> Sign Out</button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        <div className="page-header">
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Tenants</h1>
            <p style={{ color: "var(--text-muted)", margin: "4px 0 0", fontSize: 14 }}>
              {tenants.length} organizations · {totalLearners} total learners · {totalTests} tests completed
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => { setForm({ ...defaultTenantForm }); setShowCreate(true); }}>
            <Icon name="plus" size={16} /> New Tenant
          </button>
        </div>

        {/* Tenant cards */}
        {tenants.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
            <p style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>No tenants yet</p>
            <p>Create your first tenant to get started</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {tenants.map(t => (
              <div key={t.id} className="card" style={{ display: "flex", alignItems: "stretch", gap: 20, flexWrap: "wrap" }}>
                {/* Color preview strip */}
                <div style={{ width: 6, borderRadius: 4, background: `linear-gradient(to bottom, ${t.colorPrimary}, ${t.colorAccent})`, flexShrink: 0 }} />

                {/* Info */}
                <div style={{ flex: "1 1 250px", minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{t.name}</h3>
                    <code style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: 4, fontSize: 12, color: "var(--text-muted)" }}>{t.slug}</code>
                    {!t.active && <span className="badge badge-danger">Disabled</span>}
                  </div>
                  <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "0 0 8px" }}>{t.tagline || "No tagline"}</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span className="badge badge-accent">{t.learnerCount} learners</span>
                    <span className="badge badge-success">{t._count.courses} courses</span>
                    <span className="badge badge-warn">{t.resultCount} tests</span>
                    {t.avgScore > 0 && <span className="badge" style={{ background: "var(--surface-alt)", color: "var(--text-muted)" }}>Avg: {t.avgScore}%</span>}
                  </div>
                  {t.admins?.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
                      Admins: {t.admins.map(a => `${a.name} (${a.idNumber})`).join(", ")}
                    </div>
                  )}
                </div>

                {/* Color swatches */}
                <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: t.colorPrimary, border: "2px solid var(--border)" }} title="Primary" />
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: t.colorSecondary, border: "2px solid var(--border)" }} title="Secondary" />
                  <div style={{ width: 28, height: 28, borderRadius: 6, background: t.colorAccent, border: "2px solid var(--border)" }} title="Accent" />
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => openEdit(t)}><Icon name="edit" size={14} /> Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteTenant(t.id)}><Icon name="trash" size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Modal */}
        <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Tenant">
          {BrandingFields}
          <div style={{ marginTop: 20 }}>
            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={createTenant}>
              <Icon name="plus" size={16} /> Create Tenant
            </button>
          </div>
        </Modal>

        {/* Edit Modal */}
        <Modal open={!!showEdit} onClose={() => setShowEdit(null)} title={`Edit: ${showEdit?.name || ""}`}>
          {BrandingFields}
          <div style={{ marginTop: 20, display: "flex", gap: 12 }}>
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={updateTenant}>
              <Icon name="check" size={16} /> Save Changes
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
