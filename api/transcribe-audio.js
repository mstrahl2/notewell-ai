// api/transcribe-audio.js
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  initializeApp({ credential: cert(serviceAccount) });
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

    const { audioBase64, mimeType = "audio/webm", fileName = "dictation.webm" } =
      req.body || {};

    if (!audioBase64) {
      return res.status(400).json({ error: "Missing audio data." });
    }

    const audioBuffer = Buffer.from(audioBase64, "base64");
    const audioBlob = new Blob([audioBuffer], { type: mimeType });

    const formData = new FormData();
    formData.append("file", audioBlob, fileName);
    formData.append("model", "gpt-4o-mini-transcribe");

    const openaiRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    const data = await openaiRes.json();

    if (!openaiRes.ok) {
      console.error("OpenAI transcription error:", data);
      return res.status(500).json({
        error: data?.error?.message || "Failed to transcribe audio.",
      });
    }

    return res.status(200).json({
      transcript: data.text || "",
    });
  } catch (err) {
    console.error("Transcription endpoint error:", err);
    return res.status(500).json({
      error: err.message || "Failed to transcribe audio.",
    });
  }
}