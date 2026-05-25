// src/utils/generateSoapNote.js
import { auth } from "../firebase/firebaseConfig";

function fallbackSoapNote(rawText, noteType, auditSafe = true) {
  const cleanedRawText = rawText?.trim() || "";

  let assessment = "";

  switch (noteType) {
    case "intake":
      assessment =
        "Initial impressions were documented from the information provided during intake, including presenting concerns, relevant history, current functioning, and stated treatment goals.";
      break;
    case "progress":
      assessment =
        "Session content reflected ongoing work toward treatment goals, including review of current stressors, coping responses, barriers, and areas requiring continued clinical attention.";
      break;
    case "crisis":
      assessment =
        "Session focused on elevated distress and immediate clinical needs as described. Risk-related content should be reviewed carefully and edited to match the clinician's full assessment.";
      break;
    case "discharge":
      assessment =
        "Discharge-related content was reviewed, including progress, remaining needs, coping supports, and recommended follow-up based on the information provided.";
      break;
    case "standard":
    default:
      assessment =
        "The session addressed current concerns, functioning, coping strategies, and treatment-related needs based on the information provided.";
      break;
  }

  if (auditSafe) {
    assessment +=
      " Continued treatment may be clinically appropriate when symptoms or functional concerns remain present and require skilled intervention.";
  }

  return (
    "S (Subjective):\n" +
    cleanedRawText +
    "\n\n" +
    "O (Objective):\n" +
    "Session presentation and participation should be reviewed and edited by the clinician to reflect observed behavior, affect, engagement, and relevant clinical observations.\n\n" +
    "A (Assessment):\n" +
    assessment +
    "\n\n" +
    "P (Plan):\n" +
    "Continue care as clinically indicated. Review goals, reinforce relevant coping strategies, monitor symptoms and functioning, and update the treatment plan as needed."
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