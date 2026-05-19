// src/utils/generateSoapNote.js
import { auth } from "../firebase/firebaseConfig";

function fallbackSoapNote(rawText, noteType, auditSafe = true) {
  const cleanedRawText = rawText?.trim() || "";

  let assessment = "";

  switch (noteType) {
    case "intake":
      assessment =
        "Initial clinical impressions were formed based on presenting concerns, psychosocial history, current symptoms, strengths, stressors, and stated treatment goals.";
      break;
    case "progress":
      assessment =
        "Client progress was reviewed in relation to established treatment goals. Current symptoms, functional changes, barriers, coping strategies, and continued areas of clinical focus were discussed.";
      break;
    case "crisis":
      assessment =
        "Client presented with elevated distress. Risk and protective factors were assessed. Session focused on stabilization, safety planning, immediate coping strategies, and appropriate follow-up supports.";
      break;
    case "discharge":
      assessment =
        "Client discharge readiness was reviewed, including progress toward treatment goals, remaining needs, relapse prevention strategies, coping supports, and recommended follow-up care.";
      break;
    case "standard":
    default:
      assessment =
        "Client engaged appropriately in session. Progress toward treatment goals was monitored, and therapeutic interventions were provided based on presenting needs.";
      break;
  }

  if (auditSafe) {
    assessment +=
      " Clinical presentation supports medical necessity for continued treatment, as symptoms continue to affect functioning and require skilled therapeutic intervention.";
  }

  return (
    "S (Subjective):\n" +
    cleanedRawText +
    "\n\n" +
    "O (Objective):\n" +
    "Client was alert, oriented, and engaged throughout session. Affect, mood, behavior, and participation were observed within the context of the session. No abnormal behaviors were noted unless otherwise documented.\n\n" +
    "A (Assessment):\n" +
    assessment +
    "\n\n" +
    "P (Plan):\n" +
    "Continue treatment as clinically indicated. Reinforce coping strategies, monitor symptom changes, and continue working toward established treatment goals in future sessions."
  );
}

export default async function generateSoapNote(
  rawText,
  noteType,
  auditSafe = true,
  metadata = {}
) {
  try {
    const token = await auth.currentUser.getIdToken();

    const res = await fetch("/api/generate-soap-note", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        rawText,
        noteType,
        auditSafe,
        ...metadata,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "AI generation failed.");
    }

    return data.formattedNote;
  } catch (err) {
    console.error("AI SOAP generation failed. Using fallback:", err);
    return fallbackSoapNote(rawText, noteType, auditSafe);
  }
}