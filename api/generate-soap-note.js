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
      return "Prioritize presenting concerns, relevant history stated by the clinician, initial clinical impressions, strengths, barriers, and treatment goals.";
    case "progress":
      return "Prioritize movement toward goals, symptom/functioning changes, skills practiced, barriers, client response, and next clinical focus.";
    case "crisis":
      return "Prioritize risk/protective factors explicitly provided, stabilization, safety planning, supports, follow-up, and do not invent risk details.";
    case "discharge":
      return "Prioritize progress toward goals, discharge readiness, remaining needs, relapse prevention, supports, and follow-up recommendations.";
    case "standard":
    default:
      return "Prioritize current symptoms/functioning, interventions used, client response, progress toward goals, and next steps.";
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
        temperature: 0.55,
        input: [
          {
            role: "system",
            content:
              "You draft mental health SOAP notes for licensed clinicians. Write like an experienced outpatient therapist, not like a template. Use only the information provided. Do not diagnose, invent facts, add unsupported risk, add medications, or make claims not present in the raw note. The result is a draft that requires clinician review.",
          },
          {
            role: "user",
            content: `
Create a professional mental health SOAP note from the session information below.

Clinical writing goals:
- Make the note sound natural and clinician-written, not repetitive or canned.
- Vary phrasing across sections.
- Avoid generic repeated phrases such as "client engaged appropriately" unless clearly supported.
- Do not use the exact same wording for Assessment or Plan every time.
- Keep the note concise, specific, and editable.
- Use DBT-informed language only when supported by the raw note, such as mindfulness, distress tolerance, emotion regulation, interpersonal effectiveness, validation, chain analysis, skills practice, diary card, or behavioral targets.
- Include interventions only if they are mentioned or reasonably implied by the clinician's raw note.
- Do not overstate progress, risk, medical necessity, or symptom severity.
- If risk is not provided, do not add new risk content.
- If risk is denied in the raw note, document it plainly.
- If information is missing, keep wording general rather than inventing details.

SOAP expectations:
S: Client-reported concerns, symptoms, stressors, goals, subjective experience, or relevant updates.
O: Observable/session-based facts only. Include participation, affect/mood/behavior only if supported or state generally that presentation was observed during session.
A: Clinical interpretation of the provided content, progress/barriers, skill use, functional impact, and treatment relevance. Avoid diagnosis unless provided.
P: Concrete next steps based on provided session content. Include continued therapy, skills practice, monitoring, homework, follow-up, or safety plan only if appropriate.

Audit-safe mode:
${
  auditSafe
    ? "- Include modest medical-necessity-supportive language only when supported by symptoms/functioning described. Do not exaggerate."
    : "- Do not add medical-necessity language unless clearly present."
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