import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const ANTHROPIC_KEY = () => process.env.ANTHROPIC_API_KEY;

// POST /api/workbooks/import — AI converts PDF text into workbook sections
export async function POST(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ANTHROPIC_KEY()) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
  }

  const { text, title } = await req.json();
  if (!text) return NextResponse.json({ error: "Text content required" }, { status: 400 });

  const systemPrompt = `You are a workbook structure parser. Convert the provided training workbook text into a structured JSON array of sections that will render as an interactive online form.

Available section types:
- { "type": "heading", "text": "Section Title" } — section heading
- { "type": "instruction", "text": "Read-only text..." } — instructions/descriptions the learner reads
- { "type": "text", "id": "unique_id", "label": "Field Label", "placeholder": "hint text" } — single-line text input
- { "type": "textarea", "id": "unique_id", "label": "Field Label", "placeholder": "hint text", "rows": 4 } — multi-line text area
- { "type": "table", "id": "unique_id", "title": "Table Title", "columns": ["Column1", "Column2", "Column3"], "rows": ["Row1", "Row2"], "inputType": "radio" } — assessment table (radio = select one column per row, text = freetext per cell)
- { "type": "checklist", "id": "unique_id", "title": "Checklist Title", "items": [{ "id": "item1", "text": "Item description" }] } — checklist with checkboxes and optional comment field

Rules:
- Generate unique IDs for each field (use snake_case, e.g. "patient_name", "adl_bathing")
- Preserve all content from the original document
- Where the document has blank spaces or lines for answers, create text or textarea fields
- Where the document has tables with checkboxes or radio-style columns, create table sections
- Where the document has observation checklists, create checklist sections
- Include all instructional text as instruction sections
- Keep the logical structure and ordering of the original document

Respond with ONLY the JSON array, no markdown, no explanation.`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_KEY(),
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8000,
        system: systemPrompt,
        messages: [{ role: "user", content: `Parse this workbook into structured sections:\n\nTitle: ${title || "Practical Skills Workbook"}\n\n${text}` }],
      }),
    });

    const data = await res.json();
    if (!data.content?.[0]?.text) {
      return NextResponse.json({ error: "AI returned empty response" }, { status: 500 });
    }

    const raw = data.content[0].text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const sections = JSON.parse(raw);

    return NextResponse.json({ sections, title: title || "Practical Skills Workbook" });
  } catch (err) {
    console.error("[WORKBOOK IMPORT]", err);
    return NextResponse.json({ error: "Failed to parse workbook: " + err.message }, { status: 500 });
  }
}
