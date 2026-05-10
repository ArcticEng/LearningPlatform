"use client";
import { useState, useMemo } from "react";

// ───────────────────────────── helpers ─────────────────────────────
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const sameYMD = (a, b) => ymd(a) === ymd(b);
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function buildGrid(year, month) {
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = startWeekday; i > 0; i--) cells.push({ date: new Date(year, month, 1 - i), inMonth: false });
  for (let i = 1; i <= daysInMonth; i++) cells.push({ date: new Date(year, month, i), inMonth: true });
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const d = new Date(last); d.setDate(d.getDate() + 1);
    cells.push({ date: d, inMonth: false });
  }
  return cells;
}

// ───────────────────────────── component ─────────────────────────────
export default function AdminBookingCalendar({
  slots = [],
  courses = [],
  onCreateOnDate,
  onEditSlot,
  onDeleteSlot,
  onCancelBooking,
}) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);

  const slotsByDay = useMemo(() => {
    const m = {};
    for (const s of slots) {
      const k = ymd(new Date(s.date));
      (m[k] ||= []).push(s);
    }
    // Sort within each day by start time
    for (const k of Object.keys(m)) {
      m[k].sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    }
    return m;
  }, [slots]);

  const grid = useMemo(() => buildGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const monthLabel = `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
  const selectedKey = selectedDate ? ymd(selectedDate) : null;
  const selectedSlots = selectedKey ? (slotsByDay[selectedKey] || []) : [];

  const goPrev = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const goNext = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  const goToday = () => { setCursor(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(today); };

  // ── Cell renderer ──
  const renderCell = ({ date, inMonth }) => {
    const k = ymd(date);
    const isToday = sameYMD(date, today);
    const isSelected = selectedDate && sameYMD(date, selectedDate);
    const isPast = startOfDay(date) < today;
    const daySlots = slotsByDay[k] || [];
    const hasSlots = daySlots.length > 0;
    const totalBooked = daySlots.reduce((sum, s) => sum + (s.bookedCount || 0), 0);
    const totalCapacity = daySlots.reduce((sum, s) => sum + (s.capacity || 0), 0);
    const allFull = hasSlots && daySlots.every(s => (s.bookedCount || 0) >= s.capacity);

    let bg = "transparent";
    let color = "var(--text)";
    let border = "1px solid transparent";
    if (!inMonth) color = "var(--text-muted)";
    if (hasSlots) {
      bg = allFull ? "var(--danger-soft, #fee)" : "var(--accent-soft)";
      color = allFull ? "var(--danger)" : "var(--accent)";
    }
    if (isSelected) border = "2px solid var(--accent)";
    if (isToday && !isSelected) border = "1px dashed var(--accent)";

    return (
      <button
        key={k}
        type="button"
        onClick={() => inMonth && setSelectedDate(date)}
        disabled={!inMonth}
        style={{
          aspectRatio: "1",
          background: bg, color, border,
          borderRadius: 8,
          fontSize: 13,
          fontWeight: hasSlots || isSelected ? 700 : 500,
          opacity: !inMonth ? 0.4 : (isPast ? 0.7 : 1),
          cursor: inMonth ? "pointer" : "default",
          padding: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 1,
          transition: "background 0.15s, border 0.15s",
        }}
      >
        <span>{date.getDate()}</span>
        {hasSlots && (
          <span style={{ fontSize: 9, fontWeight: 700, lineHeight: 1 }}>
            {daySlots.length}{daySlots.length === 1 ? " slot" : " slots"}
          </span>
        )}
        {hasSlots && totalCapacity > 0 && (
          <span style={{ fontSize: 9, opacity: 0.8, lineHeight: 1 }}>
            {totalBooked}/{totalCapacity}
          </span>
        )}
      </button>
    );
  };

  // ── Detail panel ──
  const renderDetail = () => {
    if (!selectedDate) {
      return <div style={{ padding: 20, color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>Select a date.</div>;
    }
    const dateLabel = selectedDate.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return (
      <div style={{ padding: "16px 4px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{dateLabel}</div>
          <button className="btn btn-primary btn-sm" style={{ fontSize: 12, padding: "6px 12px" }}
            onClick={() => onCreateOnDate?.(ymd(selectedDate))}>
            + Add slot
          </button>
        </div>

        {selectedSlots.length === 0 ? (
          <div style={{ padding: 20, color: "var(--text-muted)", fontSize: 13, textAlign: "center", border: "1px dashed var(--border)", borderRadius: 8 }}>
            No slots on this date.
          </div>
        ) : (
          selectedSlots.map(slot => {
            const course = slot.courseId ? courses.find(c => c.id === slot.courseId) : null;
            const isFull = (slot.bookedCount || 0) >= slot.capacity;
            const slotBookings = slot.bookings || [];
            return (
              <div key={slot.id} className="card" style={{ marginBottom: 12, padding: 14, borderLeft: `4px solid ${isFull ? "var(--danger)" : "var(--accent)"}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{slot.title || course?.title || "Training session"}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {(slot.startTime || slot.endTime) && <span>🕒 {slot.startTime}{slot.endTime ? `–${slot.endTime}` : ""}</span>}
                      {slot.location && <span>📍 {slot.location}</span>}
                      {course && <span>📚 {course.title}</span>}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <span className={`badge ${isFull ? "badge-danger" : "badge-success"}`} style={{ fontSize: 11 }}>
                        {slot.bookedCount || 0}/{slot.capacity} booked
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button className="btn btn-sm btn-secondary" style={{ fontSize: 11, padding: "5px 10px" }}
                      onClick={() => onEditSlot?.(slot)}>Edit</button>
                    <button className="btn btn-sm btn-danger" style={{ fontSize: 11, padding: "5px 10px" }}
                      onClick={() => onDeleteSlot?.(slot.id)}>Delete</button>
                  </div>
                </div>

                {/* Booked students */}
                {slotBookings.length > 0 && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                      Booked ({slotBookings.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {slotBookings.map(b => (
                        <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 8px", background: "var(--surface-alt)", borderRadius: 6, fontSize: 12 }}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ fontWeight: 600 }}>{b.studentName}</div>
                            <div style={{ color: "var(--text-muted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.studentEmail}</div>
                          </div>
                          {onCancelBooking && (
                            <button className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "3px 8px", color: "var(--danger)", flexShrink: 0 }}
                              onClick={() => onCancelBooking(b.id)}>Cancel</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8 }}>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 14, padding: "6px 10px" }} onClick={goPrev} aria-label="Previous month">‹</button>
        <div style={{ flex: 1, textAlign: "center", fontWeight: 700, fontSize: 16 }}>{monthLabel}</div>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "6px 10px" }} onClick={goToday}>Today</button>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 14, padding: "6px 10px" }} onClick={goNext} aria-label="Next month">›</button>
      </div>

      {/* Day-of-week header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", padding: "4px 0" }}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {grid.map(renderCell)}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 11, color: "var(--text-muted)", flexWrap: "wrap" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--accent-soft)" }} />
          Has slots
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--danger-soft, #fee)" }} />
          Fully booked
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, border: "1px dashed var(--accent)" }} />
          Today
        </span>
      </div>

      {/* Detail panel */}
      <div style={{ marginTop: 18, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
        {renderDetail()}
      </div>
    </div>
  );
}
