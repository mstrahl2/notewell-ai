// src/pages/NewNote.jsx
import React, { useState, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  MenuItem,
  Stack,
  Alert,
  Paper,
  Chip,
  LinearProgress,
  Divider,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SaveIcon from "@mui/icons-material/Save";
import { addNote as saveNote, getLastNote } from "../firebase/firestoreHelper";
import generateSoapNote from "../utils/generateSoapNote";

const noteTypes = [
  { value: "intake", label: "Intake" },
  { value: "standard", label: "SOAP Session" },
  { value: "progress", label: "Progress" },
  { value: "crisis", label: "Crisis / Risk" },
  { value: "discharge", label: "Discharge" },
];

const templates = [
  {
    name: "Intake",
    noteType: "intake",
    rawNote:
      "Client presented for intake session. Reviewed history, symptoms, current concerns, strengths, stressors, and goals for treatment.",
  },
  {
    name: "Session",
    noteType: "standard",
    rawNote:
      "Client discussed current symptoms, recent stressors, emotional functioning, coping skills, and progress toward treatment goals.",
  },
  {
    name: "Progress",
    noteType: "progress",
    rawNote:
      "Reviewed progress toward treatment goals, current functioning, symptom changes, barriers, and continued areas of clinical focus.",
  },
  {
    name: "Crisis",
    noteType: "crisis",
    rawNote:
      "Client presented with elevated distress. Risk and protective factors were assessed. Session focused on stabilization, safety planning, and immediate coping strategies.",
  },
  {
    name: "Discharge",
    noteType: "discharge",
    rawNote:
      "Reviewed discharge readiness, progress toward goals, remaining needs, coping supports, relapse prevention strategies, and recommended follow-up care.",
  },
];

function cleanDictationText(text) {
  if (!text) return "";

  let cleaned = text
    .replace(/\s+/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/\bi\b/g, "I")
    .replace(/\bclient\b/g, "Client")
    .trim();

  if (cleaned && !/[.!?]$/.test(cleaned)) cleaned += ".";

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export default function NewNote() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [sessionLength, setSessionLength] = useState("50");
  const [riskLevel, setRiskLevel] = useState("none");
  const [noteType, setNoteType] = useState("standard");

  const [rawNote, setRawNote] = useState("");
  const [interimText, setInterimText] = useState("");
  const [formattedNote, setFormattedNote] = useState("");
  const [recording, setRecording] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [auditSafe] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const recognitionRef = useRef(null);

  const applyTemplate = (template) => {
    setTitle(template.name);
    setNoteType(template.noteType);
    setRawNote(template.rawNote);
    setFormattedNote("");
    setInterimText("");
    setError("");
    setSuccess("");
  };

  const handleUseLast = async () => {
    try {
      const last = await getLastNote();

      if (!last) {
        setError("No previous session found.");
        return;
      }

      setTitle(last.title || "");
      setClientName(last.clientName || "");
      setSessionDate("");
      setSessionLength(last.sessionLength || "50");
      setRiskLevel(last.riskLevel || "none");
      setNoteType(last.noteType || "standard");
      setRawNote(last.rawNote || "");
      setFormattedNote("");
      setInterimText("");
      setError("");
      setSuccess("Last session loaded.");
    } catch (err) {
      console.error(err);
      setError("Failed to load last session.");
    }
  };

  const setupRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        "Voice dictation is not supported on this device/browser."
      );
      return null;
    }

    const recognition = new SpeechRecognition();

    // IMPORTANT FOR IPHONE
    recognition.continuous = false;

    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setRecording(true);
      setError("");
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript.trim()) {
        setRawNote((prev) =>
          cleanDictationText(`${prev} ${finalTranscript}`)
        );
      }

      setInterimText(interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event);

      if (
        event.error === "no-speech" ||
        event.error === "aborted"
      ) {
        return;
      }

      setRecording(false);

      setError(
        "Voice dictation encountered an issue. Please try again."
      );
    };

    recognition.onend = () => {
      setInterimText("");

      // AUTO-RESTART FOR MOBILE
      if (recording) {
        try {
          recognition.start();
        } catch (err) {
          console.error("Restart failed:", err);
          setRecording(false);
        }
      }
    };

    return recognition;
  };

  const handleRecord = () => {
    setError("");
    setSuccess("");

    if (!recognitionRef.current) {
      recognitionRef.current = setupRecognition();
    }

    if (!recognitionRef.current) return;

    if (recording) {
      recognitionRef.current.stop();
      setRecording(false);
      return;
    }

    try {
      recognitionRef.current.start();
      setRecording(true);
    } catch (err) {
      console.error(err);
      setError("Unable to start voice dictation.");
    }
  };

  const handleCleanRawNote = () => {
    setRawNote((prev) => cleanDictationText(prev));
    setError("");
    setSuccess("Dictation cleaned.");
  };

  const handleClearDictation = () => {
    setRawNote("");
    setInterimText("");
    setFormattedNote("");
    setError("");
    setSuccess("");
  };

  const handleGenerate = async () => {
    const cleanedRaw = cleanDictationText(rawNote);

    if (!cleanedRaw.trim()) {
      setError("Enter or speak a note first.");
      return;
    }

    try {
      setGenerating(true);
      setRawNote(cleanedRaw);
      setError("");
      setSuccess("");

      const metadataText =
        "Client: " +
        (clientName || "Not listed") +
        "\nSession Date: " +
        (sessionDate || "Not listed") +
        "\nSession Length: " +
        (sessionLength || "Not listed") +
        " minutes\nRisk Level: " +
        riskLevel +
        "\n\nSession Summary:\n" +
        cleanedRaw;

      const formatted = await generateSoapNote(
        metadataText,
        noteType,
        auditSafe,
        {
          clientName,
          sessionDate,
          sessionLength,
          riskLevel,
        }
      );

      setFormattedNote(formatted);
      setSuccess("SOAP note generated.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate SOAP note.");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyFormatted = async () => {
    if (!formattedNote.trim()) {
      setError("Generate a SOAP note before copying.");
      return;
    }

    try {
      await navigator.clipboard.writeText(formattedNote);
      setSuccess("SOAP note copied.");
      setError("");
    } catch (err) {
      console.error(err);
      setError("Unable to copy note.");
    }
  };

  const handleSave = async () => {
    if (!formattedNote.trim()) {
      setError("Generate the SOAP note before saving.");
      return;
    }

    try {
      setSaving(true);

      await saveNote({
        title,
        noteType,
        rawNote,
        formattedNote,
        auditSafe,
        clientName,
        sessionDate,
        sessionLength,
        riskLevel,
      });

      navigate("/my-notes");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to save note.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box maxWidth={900} mx="auto" sx={{ p: { xs: 1, sm: 3 } }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Typography variant="h4">New Note</Typography>
        {recording && <Chip label="Listening" color="error" size="small" />}
      </Stack>

      {recording && <LinearProgress color="error" sx={{ mb: 2 }} />}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Voice Dictation</Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Speak naturally. NoteWell AI will clean and structure your session
          notes into professional SOAP documentation.
        </Typography>

        <Button
          fullWidth
          size="large"
          variant={recording ? "contained" : "outlined"}
          color={recording ? "error" : "primary"}
          startIcon={recording ? <StopIcon /> : <MicIcon />}
          onClick={handleRecord}
        >
          {recording ? "Stop Dictation" : "Start Dictation"}
        </Button>

        {interimText && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Hearing: {interimText}
          </Alert>
        )}
      </Paper>
    </Box>
  );
}