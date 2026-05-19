"use client";
import { useState } from "react";

/**
 * SessionCalendar — monthly calendar view showing training sessions.
 * Used by both admin and learner.
 *
 * Props:
 *   sessions: [{ id, title, date, startTime, endTime, location, attendees?, myStatus? }]
 *   onSelectDate: (date) => void — admin clicks empty date
 *   onSelectSession: (session) => void — click a session
 *   readOnly: boolean — learner view
 */
export default function SessionCalendar({ sessions = [], onSelectDate, onSelectSession, readOnly = false }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  const weeks = [];
  let week = new Array(startPad).fill(null);

  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  // Group sessions by date key
  const sessionsByDate = {};
  sessions.forEach(s => {
    const d = new Date(s.date);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (!sessionsByDate[key]) sessionsByDate[key] = [];
    sessionsByDate[key].push(s);
  });

  const monthLabel = currentMonth.toLocaleDateString("en-ZA", { month: "long", year: "numeric" });

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const goToday = () => setCurrentMonth(new Date());

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <button onClick={prevMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: "var(--text)", fontSize: 16 }}>‹</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{monthLabel}</div>
          <button onClick={goToday} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12, fontWeight: 600, marginTop: 2 }}>Today</button>
        </div>
        <button onClick={nextMonth} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: "var(--text)", fontSize: 16 }}>›</button>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, marginBottom: 2 }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", padding: "6px 0", textTransform: "uppercase", letterSpacing: "0.06em" }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {weeks.flat().map((day, i) => {
          if (day === null) return <div key={`e-${i}`} style={{ minHeight: 60, background: "var(--surface-alt)", borderRadius: 6, opacity: 0.3 }} />;

          const dateKey = `${year}-${month}-${day}`;
          const daySessions = sessionsByDate[dateKey] || [];
          const dateObj = new Date(year, month, day);
          dateObj.setHours(0, 0, 0, 0);
          const isToday = dateObj.getTime() === today.getTime();
          const isPast = dateObj < today;
          const hasSession = daySessions.length > 0;

          return (
            <div key={`d-${day}`}
              onClick={() => {
                if (hasSession && onSelectSession) {
                  onSelectSession(daySessions[0]);
                } else if (!readOnly && !isPast && onSelectDate) {
                  onSelectDate(dateObj);
                }
              }}
              style={{
                minHeight: 60, padding: "4px 6px", borderRadius: 8, cursor: hasSession || (!readOnly && !isPast) ? "pointer" : "default",
                background: isToday ? "var(--accent-soft)" : hasSession ? "var(--surface)" : "var(--surface-alt)",
                border: isToday ? "2px solid var(--accent)" : hasSession ? "1px solid var(--accent)" : "1px solid var(--border)",
                opacity: isPast && !hasSession ? 0.5 : 1,
                transition: "0.15s",
                overflow: "hidden",
              }}
              onMouseEnter={e => { if (hasSession || (!readOnly && !isPast)) e.currentTarget.style.transform = "scale(1.03)"; }}
              onMouseLeave={e => e.currentTarget.style.transform = "none"}
            >
              <div style={{ fontSize: 12, fontWeight: isToday ? 800 : 600, color: isToday ? "var(--accent)" : "var(--text)", marginBottom: 2 }}>{day}</div>
              {daySessions.map((s, si) => (
                <div key={si} style={{
                  fontSize: 10, fontWeight: 600, padding: "2px 4px", borderRadius: 4, marginBottom: 2,
                  background: "linear-gradient(135deg, var(--accent), var(--brand-primary))",
                  color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  lineHeight: 1.4,
                }}>
                  {s.startTime && <span>{s.startTime} </span>}
                  {s.title?.substring(0, 15)}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 11, color: "var(--text-muted)", flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, border: "2px solid var(--accent)", display: "inline-block" }} /> Today</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 12, height: 12, borderRadius: 3, background: "linear-gradient(135deg, var(--accent), var(--brand-primary))", display: "inline-block" }} /> Scheduled</span>
        {sessions.length > 0 && <span style={{ fontWeight: 600 }}>{sessions.length} session{sessions.length !== 1 ? "s" : ""} total</span>}
      </div>
    </div>
  );
}
