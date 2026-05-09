"use client";
import { useState, useMemo } from "react";

// ───────────────────────────── helpers ─────────────────────────────
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const sameYMD = (a, b) => ymd(a) === ymd(b);
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Build a 6×7 grid (Monday-first) for a given month/year.
function buildGrid(year, month) {
  const first = new Date(year, month, 1);
  const startWeekday = (first.getDay() + 6) % 7; // 0=Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = startWeekday; i > 0; i--) {
    cells.push({ date: new Date(year, month, 1 - i), inMonth: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ date: new Date(year, month, i), inMonth: true });
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    const d = new Date(last); d.setDate(d.getDate() + 1);
    cells.push({ date: d, inMonth: false });
  }
  return cells;
}

// ───────────────────────────── component ─────────────────────────────
export default function BookingCalendar({ myBookings = [], availableSlots = [], courses = [], onBook, onCancel, onReschedule }) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(today);
  const [rescheduleId, setRescheduleId] = useState(null);
  const [busy, setBusy] = useState(false);

  // Map YYYY-MM-DD → array of slots / bookings for fast cell lookups
  const slotsByDay = useMemo(() => {
    const m = {};
    for (const s of availableSlots) {
      const k = ymd(new Date(s.date));
      (m[k] ||= []).push(s);
    }
    return m;
  }, [availableSlots]);

  const bookingsByDay = useMemo(() => {
    const m = {};
    for (const b of myBookings) {
      if (!b.slot) continue;
      const k = ymd(new Date(b.slot.date));
      (m[k] ||= []).push(b);
    }
    return m;
  }, [myBookings]);

  const bookedSlotIds = useMemo(() => new Set(myBookings.map(b => b.slotId)), [myBookings]);

  const grid = useMemo(() => buildGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const monthLabel = `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`;
  const selectedKey = selectedDate ? ymd(selectedDate) : null;
  const selectedSlots = selectedKey ? (slotsByDay[selectedKey] || []).filter(s => !bookedSlotIds.has(s.id)) : [];
  const selectedBookings = selectedKey ? (bookingsByDay[selectedKey] || []) : [];

  const goPrev = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const goNext = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  const goToday = () => { setCursor(new Date(today.getFullYear(), today.getMonth(), 1)); setSelectedDate(today); };

  const handleBook = async (slot) => {
    if (!onBook || busy) return;
    setBusy(true);
    try { await onBook(slot); } finally { setBusy(false); }
  };

  const handleCancel = async (bookingId) => {
    if (!onCancel || busy) return;
    setBusy(true);
    try { await onCancel(bookingId); } finally { setBusy(false); }
  };

  const handleReschedulePick = async (newSlot) => {
    if (!onReschedule || !rescheduleId || busy) return;
    setBusy(true);
    try {
      await onReschedule(rescheduleId, newSlot);
      setRescheduleId(null);
    } finally { setBusy(false); }
  };

  const startReschedule = (bookingId) => {
    setRescheduleId(bookingId);
    setSelectedDate(null); // force user to pick a fresh date
  };

  // ── Cell renderer ──
  const renderCell = ({ date, inMonth }) => {
    const k = ymd(date);
    const isToday = sameYMD(date, today);
    const isSelected = selectedDate && sameYMD(date, selectedDate);
    const isPast = startOfDay(date) < today;
    const slots = slotsByDay[k] || [];
    const bookings = bookingsByDay[k] || [];
    const hasOpenSlot = slots.some(s => !bookedSlotIds.has(s.id));
    const hasMyBooking = bookings.length > 0;
    const clickable = inMonth && !isPast && (hasOpenSlot || hasMyBooking);

    let bg = "transparent";
    let color = "var(--text)";
    let border = "1px solid transparent";
    if (!inMonth) color = "var(--text-muted)";
    if (isPast) color = "var(--text-muted)";
    if (hasMyBooking) { bg = "var(--accent)"; color = "#fff"; }
    if (isSelected && !hasMyBooking) { border = "2px solid var(--accent)"; }
    if (isToday && !hasMyBooking && !isSelected) { border = "1px dashed var(--accent)"; }

    return (
      <button
        key={k}
        type="button"
        onClick={() => clickable && setSelectedDate(date)}
        disabled={!clickable}
        style={{
          aspectRatio: "1",
          background: bg, color, border,
          borderRadius: 8,
          fontSize: 13,
          fontWeight: hasMyBooking || isSelected ? 700 : 500,
          opacity: !inMonth || isPast ? 0.4 : 1,
          cursor: clickable ? "pointer" : "default",
          padding: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 2,
          transition: "background 0.15s, border 0.15s",
          position: "relative",
        }}
      >
        <span>{date.getDate()}</span>
        {hasOpenSlot && !hasMyBooking && (
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)" }} />
        )}
      </button>
    );
  };

  // ── Detail panel for the selected date ──
  const renderDetail = () => {
    if (!selectedDate) {
      return (
        <div style={{ padding: 20, color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>
          {rescheduleId ? "Pick a new date with available slots." : "Select a date to see details."}
        </div>
      );
    }
    const dateLabel = selectedDate.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return (
      <div style={{ padding: "16px 4px" }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>{dateLabel}</div>

        {/* Existing bookings on this date — only show in normal mode */}
        {!rescheduleId && selectedBookings.map(bk => {
          const slot = bk.slot;
          const course = courses.find(c => c.id === bk.courseId);
          return (
            <div key={bk.id} className="card" style={{ marginBottom: 10, padding: 12, borderLeft: "4px solid var(--accent)" }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{slot.title || course?.title || "Booked session"}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(slot.startTime || slot.endTime) && <span>🕒 {slot.startTime}{slot.endTime ? `–${slot.endTime}` : ""}</span>}
                {slot.location && <span>📍 {slot.location}</span>}
                <span style={{ background: "var(--accent-soft)", color: "var(--accent)", padding: "2px 8px", borderRadius: 10, fontWeight: 600 }}>Booked</span>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "5px 10px" }} disabled={busy} onClick={() => startReschedule(bk.id)}>
                  Reschedule
                </button>
                <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "5px 10px", color: "var(--danger)" }} disabled={busy} onClick={() => handleCancel(bk.id)}>
                  Cancel
                </button>
              </div>
            </div>
          );
        })}

        {/* Open slots on this date */}
        {selectedSlots.length === 0 ? (
          selectedBookings.length === 0 && (
            <div style={{ padding: 16, color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>
              No open slots on this date.
            </div>
          )
        ) : (
          selectedSlots.map(slot => {
            const course = slot.courseId ? courses.find(c => c.id === slot.courseId) : null;
            const spots = slot.spotsLeft ?? (slot.capacity - slot.bookedCount);
            return (
              <div key={slot.id} className="card" style={{ marginBottom: 10, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{slot.title || course?.title || "Training session"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {(slot.startTime || slot.endTime) && <span>🕒 {slot.startTime}{slot.endTime ? `–${slot.endTime}` : ""}</span>}
                    {slot.location && <span>📍 {slot.location}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: spots <= 2 ? "var(--danger)" : "var(--text-muted)", marginTop: 4, fontWeight: 600 }}>
                    {spots} spot{spots === 1 ? "" : "s"} left
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: 12, padding: "8px 14px", flexShrink: 0 }}
                  disabled={busy}
                  onClick={() => rescheduleId ? handleReschedulePick(slot) : handleBook(slot)}
                >
                  {rescheduleId ? "Pick this" : "Book"}
                </button>
              </div>
            );
          })
        )}
      </div>
    );
  };

  return (
    <div>
      {rescheduleId && (
        <div style={{ background: "var(--accent-soft)", color: "var(--accent)", padding: "10px 14px", borderRadius: 8, marginBottom: 16, fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span><strong>Rescheduling.</strong> Pick a new date below.</span>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => setRescheduleId(null)}>Cancel</button>
        </div>
      )}

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
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent)" }} />
          Your booking
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)" }} />
          Slots available
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
