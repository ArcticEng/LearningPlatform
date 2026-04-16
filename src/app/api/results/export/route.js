import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

// Escape a value for CSV (handle commas, quotes, newlines)
function csvCell(val) {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (/[",\n\r]/.test(str)) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// GET /api/results/export?courseId=&moduleId=&userId=&detailed=1
export async function GET(req) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const courseId = searchParams.get("courseId");
  const moduleId = searchParams.get("moduleId");
  const userId = searchParams.get("userId");
  const detailed = searchParams.get("detailed") === "1";

  const where = {};
  if (courseId) where.courseId = courseId;
  if (moduleId) where.moduleId = moduleId;
  if (userId) where.userId = userId;

  const results = await prisma.result.findMany({
    where,
    include: {
      user: { select: { name: true, idNumber: true } },
      course: { select: { title: true } },
      module: {
        select: {
          title: true,
          test: detailed ? { include: { questions: { orderBy: { order: "asc" } } } } : false,
        },
      },
    },
    orderBy: [{ completedAt: "desc" }],
  });

  let csv;

  if (detailed) {
    // One row per question per attempt
    const headers = [
      "Learner Name", "ID Number", "Course", "Module",
      "Attempt Date", "Attempt Time", "Overall Score", "Overall %",
      "Question #", "Question", "Learner Answer", "Correct Answer", "Correct?",
    ];
    const rows = [headers.map(csvCell).join(",")];

    for (const r of results) {
      const answers = JSON.parse(r.answers || "{}");
      const questions = r.module.test?.questions || [];
      const date = new Date(r.completedAt);

      if (questions.length === 0) {
        rows.push([
          r.user.name, r.user.idNumber, r.course.title, r.module.title,
          date.toLocaleDateString("en-ZA"), date.toLocaleTimeString("en-ZA"),
          `${r.score}/${r.total}`, `${r.percentage}%`,
          "", "", "", "", "",
        ].map(csvCell).join(","));
      } else {
        questions.forEach((q, i) => {
          const opts = [q.optionA, q.optionB, q.optionC, q.optionD];
          const chosenIdx = answers[i];
          const learnerAns = chosenIdx !== undefined ? `${String.fromCharCode(65 + chosenIdx)}. ${opts[chosenIdx]}` : "No answer";
          const correctAns = `${String.fromCharCode(65 + q.correct)}. ${opts[q.correct]}`;
          const isCorrect = chosenIdx === q.correct ? "Yes" : "No";

          rows.push([
            r.user.name, r.user.idNumber, r.course.title, r.module.title,
            date.toLocaleDateString("en-ZA"), date.toLocaleTimeString("en-ZA"),
            `${r.score}/${r.total}`, `${r.percentage}%`,
            i + 1, q.text, learnerAns, correctAns, isCorrect,
          ].map(csvCell).join(","));
        });
      }
    }
    csv = rows.join("\n");
  } else {
    // Summary: one row per attempt
    const headers = [
      "Learner Name", "ID Number", "Course", "Module",
      "Score", "Total", "Percentage", "Result", "Date", "Time",
    ];
    const rows = [headers.map(csvCell).join(",")];

    for (const r of results) {
      const date = new Date(r.completedAt);
      rows.push([
        r.user.name, r.user.idNumber, r.course.title, r.module.title,
        r.score, r.total, `${r.percentage}%`,
        r.percentage >= 70 ? "Pass" : "Fail",
        date.toLocaleDateString("en-ZA"), date.toLocaleTimeString("en-ZA"),
      ].map(csvCell).join(","));
    }
    csv = rows.join("\n");
  }

  // Build filename reflecting active filters
  const parts = ["results"];
  if (results.length > 0) {
    if (userId) parts.push(results[0].user.idNumber);
    if (courseId) parts.push(results[0].course.title.replace(/[^a-zA-Z0-9]+/g, "_"));
    if (moduleId) parts.push(results[0].module.title.replace(/[^a-zA-Z0-9]+/g, "_"));
  }
  if (detailed) parts.push("detailed");
  parts.push(new Date().toISOString().split("T")[0]);
  const filename = parts.join("_") + ".csv";

  // Prepend BOM for Excel UTF-8 compatibility
  return new NextResponse("\uFEFF" + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
