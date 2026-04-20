"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import ThemeProvider from "@/components/ThemeProvider";
import Logo from "@/components/Logo";

const api = {
  get: (url) => fetch(url).then(r => r.json()),
  post: (url, body) => fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json()),
};

function Icon({ name, size = 20 }) {
  const d = {
    book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z",
    award: "M12 1l3.09 6.26L22 8.27l-5 4.87 1.18 6.88L12 16.77l-6.18 3.25L7 13.14 2 8.27l6.91-1.01z",
    out: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4",
    back: "M19 12H5M12 19l-7-7 7-7",
    check: "M20 6L9 17l-5-5",
    x: "M18 6L6 18M6 6l12 12",
    clip: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
    file: "M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z",
    menu: "M3 12h18M3 6h18M3 18h18",
    chevron: "M9 18l6-6-6-6",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={d[name] || ""}/>
      {name === "out" && <><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></>}
      {name === "file" && <polyline points="13 2 13 9 20 9"/>}
      {name === "clip" && <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>}
    </svg>
  );
}

export default function LearnerPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [view, setView] = useState("my-courses");
  const [courses, setCourses] = useState([]);
  const [results, setResults] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tenant, setTenant] = useState(null);

  const [activeCourse, setActiveCourse] = useState(null);
  const [activeModule, setActiveModule] = useState(null);
  const [takingTest, setTakingTest] = useState(null);
  const [testAnswers, setTestAnswers] = useState({});
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    if (sidebarOpen) document.body.classList.add("sidebar-open");
    else document.body.classList.remove("sidebar-open");
    return () => document.body.classList.remove("sidebar-open");
  }, [sidebarOpen]);

  const loadData = useCallback(async () => {
    const [c, r] = await Promise.all([api.get("/api/courses"), api.get("/api/results")]);
    setCourses(c.courses || []);
    setResults(r.results || []);
  }, []);

  useEffect(() => {
    api.get("/api/auth").then(d => {
      if (!d.user || d.user.role !== "learner") { router.push("/"); return; }
      setUser(d.user);
      if (d.tenant) setTenant(d.tenant);
      loadData();
    });
  }, [router, loadData]);

  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/");
  };

  const navigate = (key) => {
    setView(key);
    setSidebarOpen(false);
  };

  const submitTest = async () => {
    if (!takingTest || !activeCourse) return;
    const res = await api.post("/api/results", {
      moduleId: takingTest.id,
      courseId: activeCourse.id,
      answers: testAnswers,
    });
    if (res.result) {
      setTestResult(res.result);
      setTakingTest(null);
      setTestAnswers({});
      loadData();
    }
  };

  if (!user) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "var(--text-muted)" }}>Loading…</div>;

  // ── TAKING TEST ──
  if (takingTest) {
    const test = takingTest.test;
    const allAnswered = test.questions.every((_, i) => testAnswers[i] !== undefined);
    return (
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <button className="btn btn-ghost" style={{ color: "var(--accent)" }} onClick={() => { setTakingTest(null); setTestAnswers({}); }}>
            <Icon name="back" size={16}/> Cancel Test
          </button>
          <ThemeToggle />
        </div>
        <h1 className="page-title" style={{ marginBottom: 8 }}>Test: {takingTest.title}</h1>
        <p style={{ color: "var(--text-muted)", margin: "0 0 24px", fontSize: 14 }}>{test.questions.length} questions — select the best answer</p>

        {test.questions.map((q, qi) => (
          <div key={qi} className="card" style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>
              <span style={{ color: "var(--accent)" }}>Q{qi + 1}.</span> {q.text}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[q.optionA, q.optionB, q.optionC, q.optionD].map((opt, oi) => (
                <button key={oi} className={`test-option ${testAnswers[qi] === oi ? "selected" : ""}`} onClick={() => setTestAnswers(p => ({ ...p, [qi]: oi }))}>
                  <span style={{
                    width: 28, height: 28, borderRadius: "50%",
                    border: `2px solid ${testAnswers[qi] === oi ? "var(--accent)" : "var(--border)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    fontSize: 13, fontWeight: 700,
                  }}>
                    {String.fromCharCode(65 + oi)}
                  </span>
                  <span style={{ flex: 1 }}>{opt}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        <button className="btn btn-primary" disabled={!allAnswered} onClick={submitTest}
          style={{ width: "100%", justifyContent: "center", padding: "14px 20px", fontSize: 16, opacity: allAnswered ? 1 : 0.5, marginTop: 12 }}>
          <Icon name="check" size={18}/> Submit Test
        </button>
      </div>
    );
  }

  // ── TEST RESULT ──
  if (testResult) {
    const passed = testResult.percentage >= 70;
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "60px 20px", textAlign: "center", position: "relative" }}>
        <div style={{ position: "absolute", top: 20, right: 20 }}>
          <ThemeToggle />
        </div>
        <div style={{
          width: 96, height: 96, borderRadius: "50%", margin: "0 auto 24px",
          background: passed ? "var(--success-soft)" : "var(--danger-soft)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: passed ? "var(--success)" : "var(--danger)",
        }}>
          <Icon name={passed ? "award" : "x"} size={44}/>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px", color: passed ? "var(--success)" : "var(--danger)" }}>
          {passed ? "Well Done!" : "Keep Trying!"}
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 16, margin: "0 0 32px" }}>{testResult.module.title}</p>
        <div className="card" style={{ display: "inline-flex", gap: 40, padding: "24px 48px" }}>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, color: passed ? "var(--success)" : "var(--danger)" }}>{testResult.percentage}%</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Score</div>
          </div>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800 }}>{testResult.score}/{testResult.total}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Correct</div>
          </div>
        </div>
        <div style={{ marginTop: 32 }}>
          <button className="btn btn-primary" style={{ padding: "12px 32px" }} onClick={() => { setTestResult(null); setActiveModule(null); }}>
            <Icon name="back" size={16}/> Back to Course
          </button>
        </div>
      </div>
    );
  }

  // ── VIEW MODULE (PDF + Test button) ──
  if (activeModule) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <button className="btn btn-ghost" style={{ color: "var(--accent)" }} onClick={() => setActiveModule(null)}>
            <Icon name="back" size={16}/> Back to Modules
          </button>
          <ThemeToggle />
        </div>
        <h1 className="page-title" style={{ marginBottom: 8 }}>{activeModule.title}</h1>

        {activeModule.pdfPath ? (
          <>
            <p style={{ color: "var(--text-muted)", margin: "0 0 16px", fontSize: 14 }}>Study the material below, then take the test when ready.</p>
            <div style={{ width: "100%", height: "65vh", minHeight: 400, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
              <iframe src={activeModule.pdfPath} title={activeModule.pdfName} style={{ width: "100%", height: "100%", border: "none", background: "#fff" }}/>
            </div>
            <div style={{ marginTop: 8, textAlign: "center" }}>
              <a href={activeModule.pdfPath} target="_blank" rel="noopener" style={{ fontSize: 13, color: "var(--accent)" }}>
                Open PDF in new tab ↗
              </a>
            </div>
          </>
        ) : (
          <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
            No PDF content uploaded for this module yet.
          </div>
        )}

        {activeModule.test && (
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <button className="btn btn-primary" style={{ padding: "14px 40px", fontSize: 16 }}
              onClick={() => { setTakingTest(activeModule); setTestAnswers({}); }}>
              <Icon name="clip" size={18}/> Take Test ({activeModule.test.questions.length} questions)
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── COURSE MODULES LIST ──
  if (activeCourse) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <button className="btn btn-ghost" style={{ color: "var(--accent)" }} onClick={() => setActiveCourse(null)}>
            <Icon name="back" size={16}/> All Courses
          </button>
          <ThemeToggle />
        </div>
        <h1 className="page-title" style={{ marginBottom: 8 }}>{activeCourse.title}</h1>
        <p style={{ color: "var(--text-muted)", margin: "0 0 24px", fontSize: 15 }}>{activeCourse.description}</p>

        {activeCourse.modules.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
            <p style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>No modules yet</p>
            <p>The admin hasn&apos;t added modules to this course yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {activeCourse.modules.map((m, mi) => {
              const moduleResults = results.filter(r => r.moduleId === m.id);
              const bestScore = moduleResults.length > 0 ? Math.max(...moduleResults.map(r => r.percentage)) : null;
              const passed = bestScore !== null && bestScore >= 70;
              return (
                <div key={m.id} className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", transition: "border-color 0.2s", gap: 12 }}
                  onClick={() => setActiveModule(m)}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: passed ? "var(--success-soft)" : "var(--surface-alt)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: passed ? "var(--success)" : "var(--accent)", fontWeight: 800, fontSize: 16, flexShrink: 0,
                    }}>
                      {passed ? <Icon name="check" size={20}/> : mi + 1}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, wordBreak: "break-word" }}>{m.title}</div>
                      <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center", flexWrap: "wrap" }}>
                        {m.pdfPath && <span className="badge badge-accent" style={{ fontSize: 10 }}>PDF</span>}
                        {m.test && <span className="badge" style={{ fontSize: 10, background: "rgba(124,58,237,0.12)", color: "#7c3aed" }}>{m.test.questions.length}Q TEST</span>}
                        {bestScore !== null && <span className={`badge ${passed ? "badge-success" : "badge-warn"}`}>Best: {bestScore}%</span>}
                      </div>
                    </div>
                  </div>
                  <Icon name="chevron" size={18}/>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── LEARNER HOME (sidebar + content) ──
  const navItems = [
    { icon: "book", label: "My Courses", key: "my-courses" },
    { icon: "award", label: "My Results", key: "my-results" },
  ];

  const Brand = (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Logo size={40} src={tenant?.logoUrl}/>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "-0.02em", fontFamily: "'Montserrat', sans-serif", lineHeight: 1.15 }}>{tenant?.name || "Learning Platform"}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginTop: 2 }}>{user.name}</div>
      </div>
    </div>
  );

  return (
    <div>
      <ThemeProvider tenant={tenant} />
      <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}/>

      <div className="sidebar">
        <div style={{ padding: "0 24px 24px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
          {Brand}
        </div>
        {navItems.map(n => (
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

      <div className="mobile-topbar">
        <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
          <Icon name="menu" size={22}/>
        </button>
        {Brand}
        <ThemeToggle />
      </div>

      <div className="main-content">
        {view === "my-courses" && (
          <div>
            <h1 className="page-title">Courses</h1>
            {courses.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
                <p style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>No courses available</p>
                <p>Check back later for new courses</p>
              </div>
            ) : (
              <div className="responsive-grid">
                {courses.map(c => {
                  const totalMods = c.modules.length;
                  const completedMods = c.modules.filter(m => results.some(r => r.moduleId === m.id && r.percentage >= 70)).length;
                  return (
                    <div key={c.id} className="card" style={{ cursor: "pointer", transition: "border-color 0.2s" }}
                      onClick={() => setActiveCourse(c)}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}>
                      <h3 style={{ margin: "0 0 8px", fontSize: 18, fontWeight: 700 }}>{c.title}</h3>
                      <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "0 0 16px" }}>{c.description || "No description"}</p>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <span className="badge badge-accent">{totalMods} modules</span>
                        {totalMods > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 80, height: 6, borderRadius: 3, background: "var(--surface-alt)", overflow: "hidden" }}>
                              <div style={{ width: `${(completedMods / totalMods) * 100}%`, height: "100%", background: "var(--success)", borderRadius: 3 }}/>
                            </div>
                            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{completedMods}/{totalMods}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {view === "my-results" && (
          <div>
            <h1 className="page-title">My Results</h1>
            {results.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>
                <p style={{ fontSize: 18, fontWeight: 600, color: "var(--text)" }}>No results yet</p>
                <p>Complete tests to see your results here</p>
              </div>
            ) : (
              <div className="card">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Course</th><th>Module</th><th>Score</th><th>%</th><th>Date</th></tr></thead>
                    <tbody>
                      {results.map(r => (
                        <tr key={r.id}>
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
        )}
      </div>
    </div>
  );
}
