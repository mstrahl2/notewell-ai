// api/generate-soap-note.js
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

  initializeApp({
    credential: cert(serviceAccount),
  });
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

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content:
              "You are an assistant that drafts mental health SOAP notes. You do not diagnose, invent facts, or add unsupported clinical details. You produce concise, professional documentation that must be reviewed by a licensed clinician before use.",
          },
          {
            role: "user",
            content: `
Create a professional SOAP note from the session information below.

Rules:
- Use only the information provided.
- Do not invent symptoms, diagnoses, medications, treatment history, or risk details.
- If something is not provided, keep language general.
- Write in professional clinical documentation style.
- Keep it concise and editable.
- If auditSafe is true, include medical-necessity-supportive language without exaggerating.
- Risk level: ${riskLevel}
- Note type: ${noteType}
- Audit-safe mode: ${auditSafe ? "true" : "false"}
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

    const text =
      data.output_text ||
      data.output?.[0]?.content?.[0]?.text ||
      "";

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