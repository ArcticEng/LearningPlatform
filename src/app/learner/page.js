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
  const [progress, setProgress] = useState([]);
  const [playerSidebar, setPlayerSidebar] = useState(true);

  useEffect(() => {
    if (sidebarOpen) document.body.classList.add("sidebar-open");
    else document.body.classList.remove("sidebar-open");
    return () => document.body.classList.remove("sidebar-open");
  }, [sidebarOpen]);

  const loadData = useCallback(async () => {
    const [c, r, p] = await Promise.all([api.get("/api/courses"), api.get("/api/results"), api.get("/api/progress")]);
    setCourses(c.courses || []);
    setResults(r.results || []);
    setProgress(p.progress || []);
  }, []);

  useEffect(() => {
    api.get("/api/auth").then(d => {
      if (!d.user || d.user.role !== "learner") { router.push("/"); return; }
      setUser(d.user);
      if (d.tenant) setTenant(d.tenant);
      loadData();
    });
  }, [router, loadData]);

  // Auto-hide sidebar on mobile
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) setPlayerSidebar(false);
  }, [activeCourse]);

  // Track progress when module changes
  useEffect(() => {
    if (activeModule && tenant?.featureContinue) {
      fetch("/api/progress", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ moduleId: activeModule.id }) }).catch(() => {});
    }
  }, [activeModule?.id, tenant?.featureContinue]);

  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantSlug: tenant?.slug }) });
    router.push(tenant?.slug ? `/${tenant.slug}` : "/");
  };

  const navigate = (key) => { setView(key); setSidebarOpen(false); };

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

  // Helper: convert video URL to embed
  const toEmbedUrl = (url) => {
    if (!url) return "";
    let u = url;
    const yt = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    const vim = u.match(/vimeo\.com\/([0-9]+)/);
    if (vim && !u.includes("player.vimeo.com")) return `https://player.vimeo.com/video/${vim[1]}`;
    return u;
  };

  if (!user) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", color: "var(--text-muted)" }}>Loading…</div>;

  const theme = <ThemeProvider tenant={tenant} />;

  // ══════════════════════════════════════
  // TAKING TEST
  // ══════════════════════════════════════
  if (takingTest) {
    const test = takingTest.test;
    const allAnswered = test.questions.every((_, i) => testAnswers[i] !== undefined);
    return (
      <>{theme}
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
                  <span style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${testAnswers[qi] === oi ? "var(--accent)" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 13, fontWeight: 700 }}>
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
      </>
    );
  }

  // ══════════════════════════════════════
  // TEST RESULT
  // ══════════════════════════════════════
  if (testResult) {
    const passed = testResult.percentage >= 70;
    return (
      <>{theme}
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "60px 20px", textAlign: "center", position: "relative" }}>
        <div style={{ position: "absolute", top: 20, right: 20 }}><ThemeToggle /></div>
        <div style={{ width: 96, height: 96, borderRadius: "50%", margin: "0 auto 24px", background: passed ? "var(--success-soft)" : "var(--danger-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: passed ? "var(--success)" : "var(--danger)" }}>
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
          <button className="btn btn-primary" style={{ padding: "12px 32px" }} onClick={() => { setTestResult(null); }}>
            <Icon name="back" size={16}/> Back to Course
          </button>
        </div>
      </div>
      </>
    );
  }

  // ══════════════════════════════════════
  // COURSE PLAYER (Teachable-style)
  // ══════════════════════════════════════
  if (activeCourse) {
    const modules = activeCourse.modules || [];
    const currentModule = activeModule || modules[0] || null;
    const currentIdx = currentModule ? modules.findIndex(m => m.id === currentModule.id) : -1;
    const nextMod = currentIdx >= 0 && currentIdx < modules.length - 1 ? modules[currentIdx + 1] : null;
    const completedCount = modules.filter(m => results.some(r => r.moduleId === m.id && r.percentage >= 50)).length;
    const progressPct = modules.length > 0 ? Math.round((completedCount / modules.length) * 100) : 0;
    const embedUrl = currentModule ? toEmbedUrl(currentModule.videoUrl) : "";
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

    const goToModule = (m) => {
      setActiveModule(m);
      if (isMobile) setPlayerSidebar(false);
    };

    return (
      <>{theme}
      <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", background: "var(--bg)" }}>

        {/* ─── Top Bar ─── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px", height: 52, borderBottom: "1px solid var(--border)", background: "var(--surface)", flexShrink: 0 }}>
          <button onClick={() => { setActiveCourse(null); setActiveModule(null); }} title="Back to courses"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 6, display: "flex" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </button>
          <button onClick={() => setPlayerSidebar(!playerSidebar)} title="Toggle curriculum"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 6, display: "flex" }}>
            <Icon name="menu" size={20}/>
          </button>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 8 }}>
            <div style={{ width: 100, height: 4, borderRadius: 2, background: "var(--border)" }}>
              <div style={{ width: `${progressPct}%`, height: "100%", borderRadius: 2, background: "var(--accent)", transition: "width 0.3s" }}/>
            </div>
            <span style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{completedCount}/{modules.length}</span>
          </div>
          {nextMod && (
            <button className="btn btn-primary" style={{ padding: "8px 20px", fontSize: 13, borderRadius: 6 }} onClick={() => goToModule(nextMod)}>
              Complete and Continue ›
            </button>
          )}
          <ThemeToggle />
        </div>

        {/* ─── Body ─── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>

          {/* Sidebar overlay for mobile */}
          {playerSidebar && isMobile && (
            <div onClick={() => setPlayerSidebar(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 5 }} />
          )}

          {/* ─── Sidebar: Curriculum ─── */}
          {playerSidebar && (
            <div style={{
              width: isMobile ? "85vw" : 300, maxWidth: 320, flexShrink: 0, borderRight: "1px solid var(--border)",
              background: "var(--surface)", overflowY: "auto", overflowX: "hidden",
              position: isMobile ? "absolute" : "relative",
              left: 0, top: 0, bottom: 0, zIndex: 10,
              boxShadow: isMobile ? "4px 0 20px rgba(0,0,0,0.2)" : "none",
            }}>
              <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{activeCourse.title}</div>
                {activeCourse.description && <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{activeCourse.description}</div>}
              </div>
              {modules.map((m, i) => {
                const isActive = currentModule && m.id === currentModule.id;
                const isCompleted = results.some(r => r.moduleId === m.id && r.percentage >= 50);
                return (
                  <div key={m.id} onClick={() => goToModule(m)}
                    style={{
                      padding: "14px 16px", cursor: "pointer",
                      display: "flex", alignItems: "flex-start", gap: 12,
                      background: isActive ? "var(--accent-soft)" : "transparent",
                      borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                      borderBottom: "1px solid var(--border)",
                      transition: "background 0.15s",
                    }}>
                    {/* Completion circle */}
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%", flexShrink: 0, marginTop: 1,
                      border: isCompleted ? "none" : `2px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                      background: isCompleted ? "var(--accent)" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", transition: "0.2s",
                    }}>
                      {isCompleted && <Icon name="check" size={12}/>}
                      {isActive && !isCompleted && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent)" }}/>}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: "var(--text)", lineHeight: 1.4 }}>{m.title}</div>
                      <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
                        {m.pdfPath && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>📄 PDF</span>}
                        {m.videoUrl && <span style={{ fontSize: 10, color: "#8b5cf6" }}>▶ Video</span>}
                        {m.test && <span style={{ fontSize: 10, color: "var(--text-muted)" }}>📝 {m.test.questions.length}Q</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── Main Content ─── */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {currentModule ? (
              <>
                {/* Module title bar */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0, flexWrap: "wrap", gap: 8 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
                      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/>
                    </svg>
                    {currentModule.title}
                  </h2>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    {currentModule.test && (
                      <button className="btn btn-sm btn-primary" style={{ fontSize: 12, padding: "6px 14px" }}
                        onClick={() => { setTakingTest(currentModule); setTestAnswers({}); }}>
                        <Icon name="clip" size={13}/> Take Test ({currentModule.test.questions.length}Q)
                      </button>
                    )}
                    {(() => {
                      const best = results.filter(r => r.moduleId === currentModule.id);
                      if (best.length === 0) return null;
                      const top = Math.max(...best.map(r => r.percentage));
                      return <span className={`badge ${top >= 50 ? "badge-success" : "badge-warn"}`} style={{ fontSize: 11 }}>Best: {top}%</span>;
                    })()}
                    <a href={currentModule.pdfPath || "#"} target="_blank" rel="noopener" style={{ fontSize: 12, color: "var(--text-muted)", textDecoration: "none", display: currentModule.pdfPath ? "inline" : "none" }}>↗</a>
                  </div>
                </div>

                {/* Full-screen content area */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

                  {/* Video — if video exists, show it in aspect ratio */}
                  {embedUrl && (
                    <div style={{ width: "100%", aspectRatio: "16/9", maxHeight: currentModule.pdfPath ? "50%" : undefined, flexShrink: 0, overflow: "hidden", borderBottom: "1px solid var(--border)" }}>
                      <iframe src={embedUrl} title={currentModule.title} style={{ width: "100%", height: "100%", border: "none" }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                    </div>
                  )}

                  {/* PDF — fills ALL remaining vertical space */}
                  {currentModule.pdfPath && (
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <iframe src={currentModule.pdfPath} title={currentModule.pdfName}
                        style={{ width: "100%", height: "100%", border: "none", background: "#fff", display: "block" }}/>
                    </div>
                  )}

                  {/* No content */}
                  {!embedUrl && !currentModule.pdfPath && (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                      <p style={{ fontSize: 16 }}>No content uploaded for this module yet.</p>
                    </div>
                  )}

                  {/* Video only (no PDF) — show test + continue below video */}
                  {embedUrl && !currentModule.pdfPath && (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
                      {currentModule.test && (
                        <button className="btn btn-primary" style={{ padding: "14px 40px", fontSize: 16 }}
                          onClick={() => { setTakingTest(currentModule); setTestAnswers({}); }}>
                          <Icon name="clip" size={18}/> Take Test ({currentModule.test.questions.length} questions)
                        </button>
                      )}
                      {nextMod && (
                        <button className="btn btn-secondary" style={{ padding: "12px 32px", fontSize: 15 }} onClick={() => goToModule(nextMod)}>
                          Complete and Continue ›
                        </button>
                      )}
                      {!nextMod && tenant?.featureCertificates && (() => {
                        const modsWithTests = modules.filter(m => m.test);
                        const allPassed = modsWithTests.length > 0 && modsWithTests.every(m => results.some(r => r.moduleId === m.id && r.percentage >= 50));
                        if (!allPassed) return null;
                        return (
                          <button className="btn btn-primary" style={{ padding: "14px 32px", fontSize: 15 }}
                            onClick={() => window.open(`/api/certificates?courseId=${activeCourse.id}&format=html`, "_blank")}>
                            <Icon name="award" size={18}/> Download Certificate
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                <p>Select a module from the curriculum to begin.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      </>
    );
  }

  // ══════════════════════════════════════
  // LEARNER HOME (sidebar + content)
  // ══════════════════════════════════════
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
        <div style={{ padding: "0 24px 24px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>{Brand}</div>
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
        <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Icon name="menu" size={22}/></button>
        {Brand}
        <ThemeToggle />
      </div>

      <div className="main-content">
        {view === "my-courses" && (
          <div>
            <h1 className="page-title">Courses</h1>

            {/* Continue where you left off */}
            {tenant?.featureContinue && progress.length > 0 && (() => {
              const lastProgress = progress[0];
              const mod = lastProgress?.module;
              if (!mod) return null;
              const course = courses.find(c => c.id === mod.courseId);
              if (!course) return null;
              const courseModule = course.modules.find(m => m.id === mod.id);
              if (!courseModule) return null;
              return (
                <div className="card" style={{ marginBottom: 20, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, cursor: "pointer", borderLeft: "4px solid var(--accent)" }}
                  onClick={() => { setActiveCourse(course); setActiveModule(courseModule); }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, marginBottom: 4 }}>Continue where you left off</div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{mod.title}</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{course.title}</div>
                  </div>
                  <Icon name="chevron" size={18}/>
                </div>
              );
            })()}

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
                      onClick={() => { setActiveCourse(c); setActiveModule(c.modules[0] || null); }}
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

      {/* WhatsApp floating button */}
      {tenant?.featureWhatsapp && tenant?.whatsappNumber && (
        <a href={`https://wa.me/${tenant.whatsappNumber}`} target="_blank" rel="noopener noreferrer"
          style={{
            position: "fixed", bottom: 24, right: 24, width: 56, height: 56, borderRadius: "50%",
            background: "#25D366", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(37,211,102,0.4)", zIndex: 1000, textDecoration: "none",
            transition: "transform 0.2s",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </a>
      )}
    </div>
  );
}
