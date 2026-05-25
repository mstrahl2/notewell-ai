// api/generate-soap-note.js
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  initializeApp({
    credential: cert(serviceAccount),
  });
}

function getNoteTypeGuidance(noteType) {
  switch (noteType) {
    case "intake":
      return "Intake note: briefly capture presenting concern, relevant history if provided, initial impression, and initial plan. Do not over-expand.";
    case "progress":
      return "Progress note: briefly capture current update, intervention or skill discussed, clinical impression, and next step.";
    case "crisis":
      return "Crisis note: briefly capture stated risk/protective factors, stabilization steps, safety planning, and follow-up only if provided. Do not invent risk details.";
    case "discharge":
      return "Discharge note: briefly capture progress, discharge readiness, remaining needs, relapse prevention, and follow-up only if provided.";
    case "standard":
    default:
      return "Standard session note: briefly capture client report, session presentation, clinical impression, and next step.";
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY" });
    }

    const idToken = authHeader.split("Bearer ")[1];
    await getAuth().verifyIdToken(idToken);

    const {
      rawText,
      noteType = "standard",
      auditSafe = true,
      clientName = "",
      sessionDate = "",
      sessionLength = "",
      riskLevel = "none",
    } = req.body || {};

    if (!rawText?.trim()) {
      return res.status(400).json({ error: "Missing raw note text." });
    }

    const noteTypeGuidance = getNoteTypeGuidance(noteType);

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        temperature: 0.25,
        input: [
          {
            role: "system",
            content:
              "You draft concise mental health SOAP notes for licensed clinicians. Your job is to summarize clinically relevant information, not rewrite the entire dictation. Do not diagnose, invent facts, add unsupported symptoms, add unsupported risk, add medications, or include details not provided. The result is a draft that requires clinician review.",
          },
          {
            role: "user",
            content: `
Create a concise mental health SOAP note from the clinician's raw note.

Primary goal:
Summarize only clinically relevant information without repeating the same content across sections.

Strict style rules:
- Be brief.
- Use short, direct clinical sentences.
- Prefer 1 to 3 short sentences per SOAP section.
- Do not restate the full dictation.
- Do not paraphrase the same idea multiple times.
- Do not repeat symptoms/stressors in S, A, and P.
- Do not use filler or boilerplate.
- Do not write long paragraphs.
- Do not over-explain.
- Do not add generic clinical language unless it is needed.
- Do not say the same thing in different words.
- Do not invent interventions, symptoms, diagnoses, medications, risk, or progress.

SOAP section rules:
S: Client-reported concerns, symptoms, stressors, or updates only.
O: Observable/session facts only. Do not repeat subjective symptoms from S.
A: Brief clinical impression, progress/barrier, or treatment relevance. Do not repeat S or O.
P: Brief next step(s). Do not repeat A.

DBT/modality language:
Use DBT terms only if clearly supported by the raw note.
Examples: mindfulness, distress tolerance, emotion regulation, interpersonal effectiveness, validation, chain analysis, diary card, behavioral targets.

Risk:
- If risk is denied in the raw note, document it briefly.
- If risk is not mentioned, do not add risk content.
- If risk is present, only document what was provided.

Audit-safe mode:
${
  auditSafe
    ? "If symptoms/functioning support continued care, include only one brief treatment-relevance statement. Do not exaggerate medical necessity."
    : "Do not add medical-necessity language."
}

Note type guidance:
${noteTypeGuidance}

Metadata:
- Note type: ${noteType}
- Risk level selected: ${riskLevel}
- Client name: ${clientName || "Not listed"}
- Session date: ${sessionDate || "Not listed"}
- Session length: ${sessionLength || "Not listed"} minutes

Raw clinician note:
${rawText}
            `,
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "soap_note",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                subjective: { type: "string" },
                objective: { type: "string" },
                assessment: { type: "string" },
                plan: { type: "string" },
              },
              required: ["subjective", "objective", "assessment", "plan"],
            },
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API Error:", data);
      return res.status(500).json({
        error: data?.error?.message || "Failed to generate SOAP note.",
      });
    }

    const text = data.output_text || data.output?.[0]?.content?.[0]?.text || "";
    const parsed = JSON.parse(text);

    const formattedNote =
      `S (Subjective):\n${parsed.subjective}\n\n` +
      `O (Objective):\n${parsed.objective}\n\n` +
      `A (Assessment):\n${parsed.assessment}\n\n` +
      `P (Plan):\n${parsed.plan}`;

    return res.status(200).json({ formattedNote });
  } catch (err) {
    console.error("Generate SOAP Note Error:", err);
    return res.status(500).json({
      error: err.message || "Failed to generate SOAP note.",
    });
  }
}