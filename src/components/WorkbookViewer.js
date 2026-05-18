"use client";
import { useState, useEffect, useCallback } from "react";

/**
 * WorkbookViewer — renders structured workbook sections as an interactive form.
 * Supports: heading, instruction, text, textarea, table, checklist
 * 
 * Props:
 *   workbook: { id, title, sections: [...], submission?: { answers, status, feedback, score } }
 *   onSave: (answers) => void
 *   onSubmit: (answers) => void
 *   readOnly: boolean (for admin review)
 */
export default function WorkbookViewer({ workbook, onSave, onSubmit, readOnly = false }) {
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  useEffect(() => {
    if (workbook?.submission?.answers) {
      setAnswers(workbook.submission.answers);
    }
  }, [workbook]);

  const setAnswer = (id, value) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  const setTableAnswer = (tableId, rowIdx, colIdx, value) => {
    setAnswers(prev => {
      const table = prev[tableId] || {};
      const key = `${rowIdx}_${colIdx}`;
      return { ...prev, [tableId]: { ...table, [key]: value } };
    });
  };

  const setChecklistAnswer = (checklistId, itemId, field, value) => {
    setAnswers(prev => {
      const checklist = prev[checklistId] || {};
      const item = checklist[itemId] || {};
      return { ...prev, [checklistId]: { ...checklist, [itemId]: { ...item, [field]: value } } };
    });
  };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    await onSave(answers);
    setSaving(false);
    setLastSaved(new Date());
  };

  const handleSubmit = async () => {
    if (!onSubmit) return;
    if (!confirm("Are you sure you want to submit this workbook? You won't be able to edit it after submission.")) return;
    setSaving(true);
    await onSubmit(answers);
    setSaving(false);
  };

  const isSubmitted = workbook?.submission?.status === "submitted" || workbook?.submission?.status === "reviewed";
  const isReturned = workbook?.submission?.status === "returned";
  const disabled = readOnly || isSubmitted;

  if (!workbook) return null;

  const sections = workbook.sections || [];

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 16px" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>{workbook.title || "Practical Skills Workbook"}</h2>
        {workbook.submission && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
            <span className={`badge ${
              workbook.submission.status === "submitted" ? "badge-accent" :
              workbook.submission.status === "reviewed" ? "badge-success" :
              workbook.submission.status === "returned" ? "badge-warn" : ""
            }`}>
              {workbook.submission.status === "draft" ? "📝 Draft" :
               workbook.submission.status === "submitted" ? "📤 Submitted" :
               workbook.submission.status === "reviewed" ? "✅ Reviewed" :
               workbook.submission.status === "returned" ? "🔄 Returned for editing" : workbook.submission.status}
            </span>
            {workbook.submission.score && (
              <span className="badge badge-accent">Score: {workbook.submission.score}</span>
            )}
          </div>
        )}
        {workbook.submission?.feedback && (
          <div style={{ marginTop: 12, padding: 16, background: "var(--accent-soft)", borderRadius: 10, borderLeft: "4px solid var(--accent)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", marginBottom: 4, textTransform: "uppercase" }}>Facilitator Feedback</div>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>{workbook.submission.feedback}</p>
          </div>
        )}
      </div>

      {/* Sections */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {sections.map((section, si) => {
          switch (section.type) {
            case "heading":
              return (
                <h3 key={si} style={{ fontSize: 18, fontWeight: 700, borderBottom: "2px solid var(--border)", paddingBottom: 8, marginTop: si > 0 ? 12 : 0 }}>
                  {section.text}
                </h3>
              );

            case "instruction":
              return (
                <div key={si} style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-muted)", padding: "12px 16px", background: "var(--surface-alt)", borderRadius: 10, borderLeft: "3px solid var(--border)" }}>
                  {section.text}
                </div>
              );

            case "text":
              return (
                <div key={si}>
                  <label className="label">{section.label}</label>
                  <input
                    className="input"
                    value={answers[section.id] || ""}
                    onChange={e => setAnswer(section.id, e.target.value)}
                    placeholder={section.placeholder || ""}
                    disabled={disabled}
                  />
                </div>
              );

            case "textarea":
              return (
                <div key={si}>
                  <label className="label">{section.label}</label>
                  <textarea
                    className="input"
                    value={answers[section.id] || ""}
                    onChange={e => setAnswer(section.id, e.target.value)}
                    placeholder={section.placeholder || ""}
                    rows={section.rows || 4}
                    disabled={disabled}
                    style={{ minHeight: (section.rows || 4) * 28, resize: "vertical" }}
                  />
                </div>
              );

            case "table": {
              const tableAnswers = answers[section.id] || {};
              return (
                <div key={si}>
                  {section.title && <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{section.title}</div>}
                  <div className="workbook-table-wrap" style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--border)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr>
                          {(section.columns || []).map((col, ci) => (
                            <th key={ci} style={{ padding: "10px 12px", textAlign: ci === 0 ? "left" : "center", background: "var(--surface-alt)", borderBottom: "2px solid var(--border)", fontWeight: 700, fontSize: 12, whiteSpace: "nowrap" }}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(section.rows || []).map((row, ri) => (
                          <tr key={ri} style={{ borderBottom: "1px solid var(--border)" }}>
                            {(section.columns || []).map((col, ci) => (
                              <td key={ci} style={{ padding: "8px 12px", textAlign: ci === 0 ? "left" : "center" }}>
                                {ci === 0 ? (
                                  <span style={{ fontWeight: 500, fontSize: 13 }}>{row}</span>
                                ) : section.inputType === "radio" ? (
                                  <input
                                    type="radio"
                                    name={`${section.id}_${ri}`}
                                    checked={tableAnswers[`${ri}_col`] === String(ci)}
                                    onChange={() => setTableAnswer(section.id, ri, "col", String(ci))}
                                    disabled={disabled}
                                    style={{ width: 18, height: 18, accentColor: "var(--accent)" }}
                                  />
                                ) : (
                                  <input
                                    className="input"
                                    value={tableAnswers[`${ri}_${ci}`] || ""}
                                    onChange={e => setTableAnswer(section.id, ri, ci, e.target.value)}
                                    disabled={disabled}
                                    style={{ padding: "4px 8px", fontSize: 12, textAlign: "center", minWidth: 80 }}
                                  />
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            }

            case "checklist": {
              const checkAnswers = answers[section.id] || {};
              return (
                <div key={si}>
                  {section.title && <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>{section.title}</div>}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(section.items || []).map((item) => {
                      const itemAns = checkAnswers[item.id] || {};
                      return (
                        <div key={item.id} style={{ padding: "10px 14px", background: "var(--surface-alt)", borderRadius: 8, border: "1px solid var(--border)" }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                            <input
                              type="checkbox"
                              checked={itemAns.checked || false}
                              onChange={e => setChecklistAnswer(section.id, item.id, "checked", e.target.checked)}
                              disabled={disabled}
                              style={{ width: 20, height: 20, marginTop: 2, accentColor: "var(--accent)", flexShrink: 0 }}
                            />
                            <div style={{ flex: 1, fontSize: 13, lineHeight: 1.5 }}>{item.text}</div>
                          </div>
                          <input
                            className="input"
                            value={itemAns.comment || ""}
                            onChange={e => setChecklistAnswer(section.id, item.id, "comment", e.target.value)}
                            placeholder="Comment / evidence..."
                            disabled={disabled}
                            style={{ marginTop: 8, fontSize: 12 }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            default:
              return null;
          }
        })}
      </div>

      {/* Actions */}
      {!readOnly && (
        <div style={{ display: "flex", gap: 12, marginTop: 32, paddingTop: 20, borderTop: "2px solid var(--border)", flexWrap: "wrap" }}>
          {!isSubmitted && (
            <>
              <button className="btn btn-secondary" onClick={handleSave} disabled={saving} style={{ flex: 1, justifyContent: "center", minWidth: 120 }}>
                {saving ? "Saving..." : "💾 Save Draft"}
              </button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving} style={{ flex: 1, justifyContent: "center", minWidth: 120 }}>
                {saving ? "Submitting..." : "📤 Submit Workbook"}
              </button>
            </>
          )}
          {isSubmitted && !readOnly && (
            <div style={{ textAlign: "center", width: "100%", padding: 20, color: "var(--text-muted)" }}>
              ✅ This workbook has been submitted. Your facilitator will review it.
            </div>
          )}
          {lastSaved && !isSubmitted && (
            <div style={{ width: "100%", textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              Draft saved at {lastSaved.toLocaleTimeString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
