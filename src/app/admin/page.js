"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const api = {
  get: (url) => fetch(url).then(r => r.json()),
  post: (url, body) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
  postForm: (url, form) => fetch(url, { method: "POST", body: form }).then(r => r.json()),
  put: (url, body) => fetch(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
  del: (url, body) => fetch(url, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
};

function Icon({ name, size = 20 }) {
  const d = {
    home: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
    users: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2",
    book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z",
    chart: "M12 20V10M18 20V4M6 20v-4",
    plus: "M12 5v14M5 12h14",
    trash: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    lock: "M7 11V7a5 5 0 0 1 10 0v4",
    out: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",
    x: "M18 6L6 18M6 6l12 12",
    check: "M20 6L9 17l-5-5",
    upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",
    file: "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z",
    clip: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
    award: "M12 1l3.09 6.26L22 8.27l-5 4.87 1.18 6.88L12 16.77l-6.18 3.25L7 13.14 2 8.27l6.91-1.01z",
    back: "M19 12H5M12 19l-7-7 7-7",
    menu: "M3 12h18M3 6h18M3 18h18",
    download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d[name] || ""}/>
      {name === "users" && <><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></>}
      {name === "out" && <><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>}
      {name === "upload" && <><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>}
      {name === "file" && <polyline points="13 2 13 9 20 9"/>}
      {name === "clip" && <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>}
      {name === "lock" && <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>}
    </svg>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{title}</h2>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: 4 }}><Icon name="x" size={18}/></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [view, setView] = useState("dashboard");
  const [learners, setLearners] = useState([]);
  const [courses, setCourses] = useState([]);
  const [results, setResults] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modals
  const [showAddLearner, setShowAddLearner] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddModule, setShowAddModule] = useState(false);
  const [showTestBuilder, setShowTestBuilder] = useState(false);
  const [showResetPass, setShowResetPass] = useState(null);

  // Forms
  const [learnerForm, setLearnerForm] = useState({ name: "", idNumber: "", password: "" });
  const [courseForm, setCourseForm] = useState({ title: "", description: "" });
  const [moduleForm, setModuleForm] = useState({ title: "", pdf: null, pdfName: "" });
  const [testModule, setTestModule] = useState(null);
  const [testForm, setTestForm] = useState({ questions: [{ question: "", options: ["", "", "", ""], correct: 0 }] });
  const [newPass, setNewPass] = useState("");

  // Report filters
  const [filterCourse, setFilterCourse] = useState("");
  const [filterModule, setFilterModule] = useState("");
  const [filterUser, setFilterUser] = useState("");

  // Reset module filter when course changes to avoid stale selection
  useEffect(() => { setFilterModule(""); }, [filterCourse]);

  const fileRef = useRef(null);

  // Toggle body class for sidebar overlay
  useEffect(() => {
    if (sidebarOpen) document.body.classList.add("sidebar-open");
    else document.body.classList.remove("sidebar-open");
    return () => document.body.classList.remove("sidebar-open");
  }, [sidebarOpen]);

  const loadData = useCallback(async () => {
    const [l, c, r] = await Promise.all([
      api.get("/api/learners"),
      api.get("/api/courses"),
      api.get("/api/results"),
    ]);
    setLearners(l.learners || []);
    setCourses(c.courses || []);
    setResults(r.results || []);
  }, []);

  useEffect(() => {
    api.get("/api/auth").then(d => {
      if (!d.user || d.user.role !== "admin") { router.push("/"); return; }
      setUser(d.user);
      loadData();
    });
  }, [router, loadData]);

  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
  };

  useEffect(() => {
    if (selectedCourse) {
      const updated = courses.find(c => c.id === selectedCourse.id);
      if (updated) setSelectedCourse(updated);
    }
  }, [courses]); // eslint-disable-line

  const navigate = (key) => {
    setView(key);
    setSelectedCourse(null);
    setSidebarOpen(false);
  };

  // ── Learner CRUD ──
  const addLearner = async () => {
    if (!learnerForm.name || !learnerForm.idNumber || !learnerForm.password) return;
    const res = await api.post("/api/learners", learnerForm);
    if (res.error) return alert(res.error);
    setLearnerForm({ name: "", idNumber: "", password: "" });
    setShowAddLearner(false);
    loadData();
  };

  const deleteLearner = async (id) => {
    if (!confirm("Remove this learner?")) return;
    await api.del("/api/learners", { id });
    loadData();
  };

  const resetPassword = async () => {
    if (!showResetPass || !newPass) return;
    await api.put("/api/learners", { id: showResetPass.id, password: newPass });
    setShowResetPass(null);
    setNewPass("");
  };

  // ── Course CRUD ──
  const addCourse = async () => {
    if (!courseForm.title) return;
    await api.post("/api/courses", courseForm);
    setCourseForm({ title: "", description: "" });
    setShowAddCourse(false);
    loadData();
  };

  const deleteCourse = async (id) => {
    if (!confirm("Delete this course and all modules?")) return;
    await api.del("/api/courses", { id });
    loadData();
  };

  // ── Module ──
  const addModule = async () => {
    if (!moduleForm.title || !selectedCourse) return;
    const form = new FormData();
    form.append("title", moduleForm.title);
    form.append("courseId", selectedCourse.id);
    if (moduleForm.pdf) form.append("pdf", moduleForm.pdf);
    await api.postForm("/api/modules", form);
    setModuleForm({ title: "", pdf: null, pdfName: "" });
    setShowAddModule(false);
    loadData();
  };

  const deleteModule = async (id) => {
    if (!confirm("Delete this module?")) return;
    await api.del("/api/modules", { id });
    loadData();
  };

  // ── Test Builder ──
  const openTestBuilder = (mod) => {
    setTestModule(mod);
    if (mod.test) {
      setTestForm({
        questions: mod.test.questions.map(q => ({
          question: q.text,
          options: [q.optionA, q.optionB, q.optionC, q.optionD],
          correct: q.correct,
        })),
      });
    } else {
      setTestForm({ questions: [{ question: "", options: ["", "", "", ""], correct: 0 }] });
    }
    setShowTestBuilder(true);
  };

  const addQuestion = () => {
    setTestForm(p => ({ questions: [...p.questions, { question: "", options: ["", "", "", ""], correct: 0 }] }));
  };

  const updateQ = (qi, field, val) => {
    setTestForm(p => {
      const qs = [...p.questions];
      qs[qi] = { ...qs[qi], [field]: val };
      return { questions: qs };
    });
  };

  const updateOpt = (qi, oi, val) => {
    setTestForm(p => {
      const qs = [...p.questions];
      const opts = [...qs[qi].options];
      opts[oi] = val;
      qs[qi] = { ...qs[qi], options: opts };
      return { questions: qs };
    });
  };

  const removeQ = (qi) => {
    setTestForm(p => ({ questions: p.questions.filter((_, i) => i !== qi) }));
  };

  const saveTest = async () => {
    if (!testModule) return;
    const valid = testForm.questions.every(q => q.question && q.options.every(o => o));
    if (!valid) return alert("Fill in all questions and options.");
    await api.post("/api/tests", { moduleId: testModule.id, questions: testForm.questions });
    setShowTestBuilder(false);
    setTestModule(null);
    loadData();
  };

  if (!user) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "var(--text-muted)" }}>Loading…</div>;

  const nav = [
    { icon: "home", label: "Dashboard", key: "dashboard" },
    { icon: "users", label: "Learners", key: "learners" },
    { icon: "book", label: "Courses", key: "courses" },
    { icon: "chart", label: "Results", key: "results" },
  ];

  const Brand = (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        background: "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 800, fontSize: 13, letterSpacing: "-0.04em",
        fontFamily: "'Montserrat', sans-serif",
        boxShadow: "0 2px 8px rgba(13, 115, 119, 0.25)",
      }}>
        ACT
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-0.02em", fontFamily: "'Montserrat', sans-serif" }}>ACT Academy</div>
        <div style={{ fontSize: 10, color: "var(--brand-accent)", fontWeight: 700, letterSpacing: "0.1em" }}>ADMIN PORTAL</div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Sidebar overlay (mobile) */}
      <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}/>

      {/* Sidebar */}
      <div className="sidebar">
        <div style={{ padding: "0 24px 24px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
          {Brand}
        </div>
        {nav.map(n => (
          <button key={n.key} className={`sidebar-item ${view === n.key ? "active" : ""}`} onClick={() => navigate(n.key)}>
            <Icon name={n.icon} size={18}/> {n.label}
          </button>
        ))}
        <div style={{ marginTop: "auto", padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
          <button className="btn btn-ghost" style={{ color: "var(--danger)", flex: 1, justifyContent: "flex-start" }} onClick={logout}>
            <Icon name="out" size={16}/> Sign Out
          </button>
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
          <Icon name="menu" size={22}/>
        </button>
        {Brand}
        <ThemeToggle />
      </div>

      {/* Main */}
      <div className="main-content">

        {/* DASHBOARD */}
        {view === "dashboard" && (
          <div>
            <h1 className="page-title">Dashboard</h1>
            <div className="stat-grid">
              {[
                { label: "Learners", value: learners.length, icon: "users", color: "var(--brand-primary)" },
                { label: "Courses", value: courses.length, icon: "book", color: "var(--brand-secondary)" },
                { label: "Tests Completed", value: results.length, icon: "clip", color: "var(--success)" },
                { label: "Avg Score", value: results.length ? Math.round(results.reduce((a, r) => a + r.percentage, 0) / results.length) + "%" : "—", icon: "award", color: "var(--brand-accent)" },
              ].map((s, i) => (
                <div key={i} className="card stat-card" style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div className="stat-icon" style={{ width: 48, height: 48, borderRadius: 12, background: `${s.color}18`, display: "flex", alignItems: "center", justifyContent: "center", color: s.color, flexShrink: 0 }}>
                    <Icon name={s.icon} size={22}/>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="stat-card-value" style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {results.length > 0 && (
              <div className="card">
                <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700 }}>Recent Results</h3>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Learner</th><th>Course</th><th>Module</th><th>Score</th><th>Date</th></tr></thead>
                    <tbody>
                      {results.slice(0, 10).map(r => (
                        <tr key={r.id}>
                          <td><strong>{r.user.name}</strong> <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{r.user.idNumber}</span></td>
                          <td>{r.course.title}</td>
                          <td>{r.module.title}</td>
                          <td><span className={`badge ${r.percentage >= 70 ? "badge-success" : r.percentage >= 50 ? "badge-warn" : "badge-danger"}`}>{r.score}/{r.total} ({r.percentage}%)</span></td>
                          <td style={{ color: "var(--text-muted)", fontSize: 13, whiteSpace: "nowrap" }}>{new Date(r.completedAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LEARNERS */}
        {view === "learners" && (
          <div>
            <div className="page-header">
              <h1 className="page-title" style={{ margin: 0 }}>Learners</h1>
              <button className="btn btn-primary" onClick={() => setShowAddLearner(true)}><Icon name="plus" size={16}/> Add Learner</button>
            </div>

            {learners.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
                <p style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>No learners yet</p>
                <p>Add learners to get started</p>
              </div>
            ) : (
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Name</th><th>ID Number</th><th>Tests</th><th>Actions</th></tr></thead>
                    <tbody>
                      {learners.map(l => (
                        <tr key={l.id}>
                          <td style={{ fontWeight: 600 }}>{l.name}</td>
                          <td><code style={{ background: "var(--surface-alt)", padding: "2px 8px", borderRadius: 4, fontSize: 13 }}>{l.idNumber}</code></td>
                          <td>{results.filter(r => r.userId === l.id).length}</td>
                          <td>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button className="btn btn-sm" style={{ background: "var(--accent-soft)", color: "var(--accent)" }} onClick={() => { setShowResetPass(l); setNewPass(""); }}><Icon name="lock" size={14}/> Reset</button>
                              <button className="btn btn-sm btn-danger" onClick={() => deleteLearner(l.id)}><Icon name="trash" size={14}/></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <Modal open={showAddLearner} onClose={() => setShowAddLearner(false)} title="Add Learner">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div><label className="label">Full Name</label><input className="input" value={learnerForm.name} onChange={e => setLearnerForm(p => ({ ...p, name: e.target.value }))}/></div>
                <div><label className="label">ID Number (Username)</label><input className="input" value={learnerForm.idNumber} onChange={e => setLearnerForm(p => ({ ...p, idNumber: e.target.value }))}/></div>
                <div><label className="label">Password</label><input className="input" value={learnerForm.password} onChange={e => setLearnerForm(p => ({ ...p, password: e.target.value }))}/></div>
                <button className="btn btn-primary" style={{ justifyContent: "center" }} onClick={addLearner}><Icon name="plus" size={16}/> Add Learner</button>
              </div>
            </Modal>

            <Modal open={!!showResetPass} onClose={() => setShowResetPass(null)} title="Reset Password">
              {showResetPass && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <p style={{ color: "var(--text-muted)", margin: 0 }}>Resetting password for <strong style={{ color: "var(--text)" }}>{showResetPass.name}</strong> ({showResetPass.idNumber})</p>
                  <div><label className="label">New Password</label><input className="input" value={newPass} onChange={e => setNewPass(e.target.value)}/></div>
                  <button className="btn btn-primary" style={{ justifyContent: "center" }} onClick={resetPassword}>Update Password</button>
                </div>
              )}
            </Modal>
          </div>
        )}

        {/* COURSES LIST */}
        {view === "courses" && !selectedCourse && (
          <div>
            <div className="page-header">
              <h1 className="page-title" style={{ margin: 0 }}>Courses</h1>
              <button className="btn btn-primary" onClick={() => setShowAddCourse(true)}><Icon name="plus" size={16}/> New Course</button>
            </div>

            {courses.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
                <p style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>No courses yet</p>
                <p>Create your first course</p>
              </div>
            ) : (
              <div className="responsive-grid">
                {courses.map(c => (
                  <div key={c.id} className="card" style={{ cursor: "pointer", transition: "border-color 0.2s" }}
                    onClick={() => setSelectedCourse(c)}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                    <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>{c.title}</h3>
                    <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 16px" }}>{c.description || "No description"}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="badge badge-accent">{c.modules.length} modules</span>
                      <button className="btn btn-sm btn-danger" onClick={e => { e.stopPropagation(); deleteCourse(c.id); }}><Icon name="trash" size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Modal open={showAddCourse} onClose={() => setShowAddCourse(false)} title="New Course">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div><label className="label">Course Title</label><input className="input" value={courseForm.title} onChange={e => setCourseForm(p => ({ ...p, title: e.target.value }))}/></div>
                <div><label className="label">Description</label><textarea className="input" style={{ minHeight: 80 }} value={courseForm.description} onChange={e => setCourseForm(p => ({ ...p, description: e.target.value }))}/></div>
                <button className="btn btn-primary" style={{ justifyContent: "center" }} onClick={addCourse}><Icon name="plus" size={16}/> Create Course</button>
              </div>
            </Modal>
          </div>
        )}

        {/* COURSE DETAIL */}
        {view === "courses" && selectedCourse && (
          <div>
            <button className="btn btn-ghost" style={{ color: "var(--accent)", marginBottom: 16 }} onClick={() => setSelectedCourse(null)}>
              <Icon name="back" size={16}/> Back to Courses
            </button>
            <div className="page-header">
              <div>
                <h1 className="page-title" style={{ margin: 0 }}>{selectedCourse.title}</h1>
                <p style={{ color: "var(--text-muted)", margin: "6px 0 0", fontSize: 14 }}>{selectedCourse.description}</p>
              </div>
              <button className="btn btn-primary" onClick={() => { setModuleForm({ title: "", pdf: null, pdfName: "" }); setShowAddModule(true); }}>
                <Icon name="plus" size={16}/> Add Module
              </button>
            </div>

            {selectedCourse.modules.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
                <p style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>No modules</p>
                <p>Add learning modules with PDFs and tests</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {selectedCourse.modules.map((m, mi) => (
                  <div key={m.id} className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0, flex: "1 1 240px" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--surface-alt)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--accent)", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                        {mi + 1}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 16, wordBreak: "break-word" }}>{m.title}</div>
                        <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                          {m.pdfPath && <span className="badge badge-accent" style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>PDF: {m.pdfName}</span>}
                          {m.test ? <span className="badge badge-success">{m.test.questions.length} questions</span> : <span className="badge badge-warn">No test</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button className="btn btn-sm" style={{ background: "var(--accent-soft)", color: "var(--accent)" }} onClick={() => openTestBuilder(m)}>
                        <Icon name="clip" size={14}/> {m.test ? "Edit Test" : "Add Test"}
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteModule(m.id)}><Icon name="trash" size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Modal open={showAddModule} onClose={() => setShowAddModule(false)} title="Add Module">
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div><label className="label">Module Title</label><input className="input" value={moduleForm.title} onChange={e => setModuleForm(p => ({ ...p, title: e.target.value }))}/></div>
                <div>
                  <label className="label">Upload PDF</label>
                  <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={e => {
                    const f = e.target.files[0];
                    if (f) setModuleForm(p => ({ ...p, pdf: f, pdfName: f.name }));
                  }}/>
                  <button className="btn btn-secondary" style={{ width: "100%" }} onClick={() => fileRef.current?.click()}>
                    <Icon name="upload" size={16}/> {moduleForm.pdfName || "Choose PDF file"}
                  </button>
                </div>
                <button className="btn btn-primary" style={{ justifyContent: "center" }} onClick={addModule}><Icon name="plus" size={16}/> Add Module</button>
              </div>
            </Modal>

            <Modal open={showTestBuilder} onClose={() => { setShowTestBuilder(false); setTestModule(null); }} title={`Test: ${testModule?.title || ""}`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {testForm.questions.map((q, qi) => (
                  <div key={qi} style={{ background: "var(--surface-alt)", borderRadius: 12, padding: 16, border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>Question {qi + 1}</span>
                      {testForm.questions.length > 1 && <button className="btn btn-ghost" onClick={() => removeQ(qi)}><Icon name="x" size={14}/></button>}
                    </div>
                    <input className="input" style={{ marginBottom: 12 }} placeholder="Question text…" value={q.question} onChange={e => updateQ(qi, "question", e.target.value)}/>
                    {q.options.map((opt, oi) => (
                      <div key={oi} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <button style={{
                          width: 28, height: 28, borderRadius: "50%", border: `2px solid ${q.correct === oi ? "var(--success)" : "var(--border)"}`,
                          background: q.correct === oi ? "var(--success-soft)" : "transparent", cursor: "pointer",
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--success)",
                        }} onClick={() => updateQ(qi, "correct", oi)}>
                          {q.correct === oi && <Icon name="check" size={14}/>}
                        </button>
                        <input className="input" style={{ flex: 1 }} placeholder={`Option ${String.fromCharCode(65 + oi)}`} value={opt} onChange={e => updateOpt(qi, oi, e.target.value)}/>
                      </div>
                    ))}
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Tap circle to mark correct answer</div>
                  </div>
                ))}
                <button className="btn btn-secondary" style={{ justifyContent: "center" }} onClick={addQuestion}><Icon name="plus" size={16}/> Add Question</button>
                <button className="btn btn-primary" style={{ justifyContent: "center" }} onClick={saveTest}><Icon name="check" size={16}/> Save Test</button>
              </div>
            </Modal>
          </div>
        )}

        {/* RESULTS */}
        {view === "results" && (() => {
          // Derived data
          const allModules = courses.flatMap(c => c.modules.map(m => ({ id: m.id, title: m.title, courseId: c.id, courseTitle: c.title })));
          const availableModules = filterCourse ? allModules.filter(m => m.courseId === filterCourse) : allModules;

          const filtered = results.filter(r => {
            if (filterCourse && r.courseId !== filterCourse) return false;
            if (filterModule && r.moduleId !== filterModule) return false;
            if (filterUser && r.userId !== filterUser) return false;
            return true;
          });

          // Stats on filtered set
          const uniqueLearners = new Set(filtered.map(r => r.userId)).size;
          const avgScore = filtered.length ? Math.round(filtered.reduce((a, r) => a + r.percentage, 0) / filtered.length) : 0;
          const passCount = filtered.filter(r => r.percentage >= 70).length;
          const passRate = filtered.length ? Math.round((passCount / filtered.length) * 100) : 0;

          const hasFilters = filterCourse || filterModule || filterUser;

          const buildQuery = (extra = {}) => {
            const p = new URLSearchParams();
            if (filterCourse) p.append("courseId", filterCourse);
            if (filterModule) p.append("moduleId", filterModule);
            if (filterUser) p.append("userId", filterUser);
            Object.entries(extra).forEach(([k, v]) => p.append(k, v));
            return p.toString();
          };

          const exportCsv = (detailed = false) => {
            const q = buildQuery(detailed ? { detailed: "1" } : {});
            window.location.href = `/api/results/export${q ? "?" + q : ""}`;
          };

          const clearFilters = () => { setFilterCourse(""); setFilterModule(""); setFilterUser(""); };

          return (
            <div>
              <div className="page-header">
                <h1 className="page-title" style={{ margin: 0 }}>Test Results</h1>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btn-secondary" onClick={() => exportCsv(true)} disabled={filtered.length === 0}>
                    <Icon name="download" size={16}/> Detailed CSV
                  </button>
                  <button className="btn btn-primary" onClick={() => exportCsv(false)} disabled={filtered.length === 0}>
                    <Icon name="download" size={16}/> Export CSV
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>Filter Results</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                  <div>
                    <label className="label">Course</label>
                    <select className="input" value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
                      <option value="">All courses</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Module</label>
                    <select className="input" value={filterModule} onChange={e => setFilterModule(e.target.value)} disabled={availableModules.length === 0}>
                      <option value="">All modules</option>
                      {availableModules.map(m => <option key={m.id} value={m.id}>{filterCourse ? m.title : `${m.courseTitle} — ${m.title}`}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Learner</label>
                    <select className="input" value={filterUser} onChange={e => setFilterUser(e.target.value)}>
                      <option value="">All learners</option>
                      {learners.map(l => <option key={l.id} value={l.id}>{l.name} ({l.idNumber})</option>)}
                    </select>
                  </div>
                </div>
                {hasFilters && (
                  <div style={{ marginTop: 12 }}>
                    <button className="btn btn-ghost" onClick={clearFilters}><Icon name="x" size={14}/> Clear filters</button>
                  </div>
                )}
              </div>

              {/* Stats */}
              {filtered.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
                  <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{filtered.length}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Attempts</div>
                  </div>
                  <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{uniqueLearners}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Unique learners</div>
                  </div>
                  <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: avgScore >= 70 ? "var(--success)" : avgScore >= 50 ? "var(--warn)" : "var(--danger)" }}>{avgScore}%</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Average score</div>
                  </div>
                  <div className="card" style={{ padding: 16 }}>
                    <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: passRate >= 70 ? "var(--success)" : "var(--warn)" }}>{passRate}%</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Pass rate ({passCount}/{filtered.length})</div>
                  </div>
                </div>
              )}

              {/* Table */}
              {filtered.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
                  <p style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>{hasFilters ? "No results match these filters" : "No results yet"}</p>
                  <p>{hasFilters ? "Try clearing filters to see all results" : "Results appear here when learners complete tests"}</p>
                </div>
              ) : (
                <div className="card">
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Learner</th><th>ID</th><th>Course</th><th>Module</th><th>Score</th><th>%</th><th>Date</th></tr></thead>
                      <tbody>
                        {filtered.map(r => (
                          <tr key={r.id}>
                            <td style={{ fontWeight: 600 }}>{r.user.name}</td>
                            <td style={{ fontSize: 13, color: "var(--text-muted)" }}>{r.user.idNumber}</td>
                            <td>{r.course.title}</td>
                            <td>{r.module.title}</td>
                            <td>{r.score}/{r.total}</td>
                            <td><span className={`badge ${r.percentage >= 70 ? "badge-success" : r.percentage >= 50 ? "badge-warn" : "badge-danger"}`}>{r.percentage}%</span></td>
                            <td style={{ color: "var(--text-muted)", fontSize: 13, whiteSpace: "nowrap" }}>{new Date(r.completedAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
