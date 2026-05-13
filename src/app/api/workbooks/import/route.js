import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const ANTHROPIC_KEY = () => process.env.ANTHROPIC_API_KEY;

const systemPrompt = `You are a workbook structure parser. Convert the provided training workbook into a structured JSON array of sections that will render as an interactive online form.

Available section types:
- { "type": "heading", "text": "Section Title" } — section heading
- { "type": "instruction", "text": "Read-only text..." } — instructions/descriptions the learner reads
- { "type": "text", "id": "unique_id", "label": "Field Label", "placeholder": "hint text" } — single-line text input
- { "type": "textarea", "id": "unique_id", "label": "Field Label", "placeholder": "hint text", "rows": 4 } — multi-line text area
- { "type": "table", "id": "unique_id", "title": "Table Title", "columns": ["Column1", "Column2", "Column3"], "rows": ["Row1", "Row2"], "inputType": "radio" } — assessment table (radio = select one column per row, text = freetext per cell)
- { "type": "checklist", "id": "unique_id", "title": "Checklist Title", "items": [{ "id": "item1", "text": "Item description" }] } — checklist with checkboxes and optional comment field

Rules:
- Generate unique IDs for each field (use snake_case, e.g. "patient_name", "adl_bathing")
- Preserve ALL content from the original document
- Where the document has blank spaces or lines for answers, create text or textarea fields
- Where the document has tables with checkboxes or radio-style columns, create table sections
- Where the document has observation checklists, create checklist sections
- Include all instructional text as instruction sections
- Keep the logical structure and ordering of the original document
- For the cover page fields (Name, Address, Cellular, Email), create text inputs
- For assessment worksheets with tables, create table sections with radio inputs
- For observation checklists, create checklist sections with checkbox + comment for each item
- For notes sections, create textarea fields

Respond with ONLY the JSON array, no markdown, no explanation.`;

// POST /api/workbooks/import — accepts either JSON {text, title} or FormData {file, title}
export async function POST(req) {
  const user = await getSession();
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ANTHROPIC_KEY()) {
    return NextResponse.json({ error: "AI service not configured" }, { status: 500 });
  }

  let messages;
  let title = "Practical Skills Workbook";

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    // File upload — send PDF directly to Claude as document
    const formData = await req.formData();
    const file = formData.get("file");
    title = formData.get("title") || title;

    if (!file) return NextResponse.json({ error: "File required" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mediaType = file.type || "application/pdf";

    messages = [{
      role: "user",
      content: [
        {
          type: "document",
          source: { type: "base64", media_type: mediaType, data: base64 },
        },
        {
          type: "text",
          text: `Parse this workbook PDF into structured interactive sections. Title: ${title}`,
        },
      ],
    }];
  } else {
    // JSON text input (legacy / paste)
    const { text, title: t } = await req.json();
    if (!text) return NextResponse.json({ error: "Text content required" }, { status: 400 });
    if (t) title = t;

    messages = [{
      role: "user",
      content: `Parse this workbook into structured sections:\n\nTitle: ${title}\n\n${text}`,
    }];
  }

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
        messages,
      }),
    });

    const data = await res.json();
    if (!data.content?.[0]?.text) {
      console.error("[WORKBOOK IMPORT] AI response:", JSON.stringify(data));
      return NextResponse.json({ error: data.error?.message || "AI returned empty response" }, { status: 500 });
    }

    const raw = data.content[0].text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const sections = JSON.parse(raw);

    return NextResponse.json({ sections, title });
  } catch (err) {
    console.error("[WORKBOOK IMPORT]", err);
    return NextResponse.json({ error: "Failed to parse workbook: " + err.message }, { status: 500 });
  }
}
