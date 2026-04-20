import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import mammoth from "mammoth";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Extract text from uploaded file
async function extractText(file) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = (file.name || "").toLowerCase();

  if (ext.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (ext.endsWith(".pdf")) {
    // Dynamic import for pdf-parse (CJS module)
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text;
  }

  // Fallback: treat as plain text
  return buffer.toString("utf-8");
}

// Call Claude to extract questions
async function extractQuestions(text) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const prompt = `You are a test question extractor for a healthcare training platform (Aloe Care Trainify — dementia care training).

Analyze the following document text and extract ALL questions that can be used as multiple-choice test questions. 

There are TWO scenarios:

**Scenario A — The document already contains multiple-choice questions:**
Extract them as-is. Identify the question text, all answer options (A, B, C, D), and which one is the correct answer. If the correct answer is marked (with ✓, *, "correct", bold, etc.), use that. If not marked, use your expert healthcare knowledge to determine the correct answer.

**Scenario B — The document contains educational content, checklists, rubrics, or assessment criteria but NOT explicit MCQs:**
Generate high-quality multiple-choice test questions BASED ON the content. Create questions that test the learner's understanding of the key concepts, procedures, and criteria described. Each question should have 4 options (A-D) with one correct answer.

For scenario B, aim for 8-15 questions covering the key learning outcomes in the document.

RESPOND WITH ONLY valid JSON in this exact format — no markdown, no backticks, no preamble:
{
  "source": "extracted" or "generated",
  "questions": [
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0
    }
  ]
}

The "correct" field is the zero-based index: 0=A, 1=B, 2=C, 3=D.

IMPORTANT: Every question must have EXACTLY 4 options. The correct answer index must be valid (0-3).

Here is the document text:

${text.slice(0, 30000)}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Claude API error:", err);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const text_response = data.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  // Clean and parse JSON
  const clean = text_response.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// POST /api/tests/import
export async function POST(req) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured. Add it to your environment variables." },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const name = file.name || "";
    const validExt = [".docx", ".pdf", ".txt"].some((ext) => name.toLowerCase().endsWith(ext));
    if (!validExt) {
      return NextResponse.json(
        { error: "Unsupported file type. Upload .docx, .pdf, or .txt" },
        { status: 400 }
      );
    }

    // 1. Extract text
    const text = await extractText(file);

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: "Could not extract enough text from the document. Try a different format." },
        { status: 400 }
      );
    }

    // 2. Send to Claude to extract/generate questions
    const result = await extractQuestions(text);

    if (!result.questions || result.questions.length === 0) {
      return NextResponse.json(
        { error: "No questions could be extracted from this document." },
        { status: 400 }
      );
    }

    // 3. Validate structure
    const validated = result.questions
      .filter((q) => q.question && Array.isArray(q.options) && q.options.length === 4)
      .map((q) => ({
        question: q.question,
        options: q.options.map(String),
        correct: typeof q.correct === "number" && q.correct >= 0 && q.correct <= 3 ? q.correct : 0,
      }));

    return NextResponse.json({
      source: result.source || "unknown",
      questions: validated,
      documentName: name,
      totalExtracted: validated.length,
    });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process document" },
      { status: 500 }
    );
  }
}
