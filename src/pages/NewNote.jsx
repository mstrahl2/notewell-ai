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
import { auth } from "../firebase/firebaseConfig";
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

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onloadend = () => {
      const result = reader.result || "";
      const base64 = String(result).split(",")[1];
      resolve(base64);
    };

    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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
  const [formattedNote, setFormattedNote] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [auditSafe] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  const applyTemplate = (template) => {
    setTitle(template.name);
    setNoteType(template.noteType);
    setRawNote(template.rawNote);
    setFormattedNote("");
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
      setError("");
      setSuccess("Last session loaded.");
    } catch (err) {
      console.error(err);
      setError("Failed to load last session.");
    }
  };

  const transcribeAudio = async (blob) => {
    try {
      setTranscribing(true);
      setError("");
      setSuccess("");

      const token = await auth.currentUser.getIdToken();
      const audioBase64 = await blobToBase64(blob);

      const res = await fetch("/api/transcribe-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          audioBase64,
          mimeType: blob.type || "audio/webm",
          fileName: "dictation.webm",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to transcribe audio.");
      }

      const transcript = cleanDictationText(data.transcript || "");

      if (!transcript) {
        setError("No speech was detected. Please try again.");
        return;
      }

      setRawNote((prev) => cleanDictationText(`${prev} ${transcript}`));
      setSuccess("Dictation transcribed.");
    } catch (err) {
      console.error("Transcription error:", err);
      setError(err.message || "Failed to transcribe dictation.");
    } finally {
      setTranscribing(false);
    }
  };

  const startRecording = async () => {
    try {
      setError("");
      setSuccess("");
      setFormattedNote("");

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Microphone recording is not supported on this device/browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      const preferredTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/mpeg",
      ];

      const supportedType =
        preferredTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";

      const recorder = supportedType
        ? new MediaRecorder(stream, { mimeType: supportedType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        streamRef.current?.getTracks()?.forEach((track) => track.stop());
        streamRef.current = null;

        if (blob.size < 1000) {
          setError("Recording was too short. Please try again.");
          return;
        }

        await transcribeAudio(blob);
      };

      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
      setRecording(false);

      if (err.name === "NotAllowedError" || err.name === "SecurityError") {
        setError("Microphone permission was denied. Please allow microphone access.");
      } else {
        setError("Unable to start recording. Please try again.");
      }
    }
  };

  const stopRecording = () => {
    try {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }

      setRecording(false);
    } catch (err) {
      console.error("Stop recording error:", err);
      setRecording(false);
      setError("Unable to stop recording.");
    }
  };

  const handleRecord = () => {
    if (recording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleCleanRawNote = () => {
    setRawNote((prev) => cleanDictationText(prev));
    setError("");
    setSuccess("Dictation cleaned.");
  };

  const handleClearDictation = () => {
    setRawNote("");
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

      const formatted = await generateSoapNote(metadataText, noteType, auditSafe, {
        clientName,
        sessionDate,
        sessionLength,
        riskLevel,
      });

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
        {recording && <Chip label="Recording" color="error" size="small" />}
        {transcribing && <Chip label="Transcribing" color="primary" size="small" />}
      </Stack>

      {(recording || transcribing || generating) && (
        <LinearProgress color={recording ? "error" : "primary"} sx={{ mb: 2 }} />
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">Voice Dictation</Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Tap Start, speak naturally, then tap Stop. NoteWell AI will transcribe
          your dictation into the raw note field.
        </Typography>

        <Button
          fullWidth
          size="large"
          variant={recording ? "contained" : "outlined"}
          color={recording ? "error" : "primary"}
          startIcon={recording ? <StopIcon /> : <MicIcon />}
          onClick={handleRecord}
          disabled={transcribing || generating || saving}
        >
          {recording
            ? "Stop Dictation"
            : transcribing
            ? "Transcribing..."
            : "Start Dictation"}
        </Button>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Quick Start
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="contained" onClick={handleUseLast}>
            Use Last Session
          </Button>

          {templates.map((template) => (
            <Button
              key={template.name}
              variant="outlined"
              onClick={() => applyTemplate(template)}
            >
              {template.name}
            </Button>
          ))}
        </Stack>
      </Paper>

      <Stack spacing={2}>
        <TextField label="Note Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />

        <TextField label="Client Name" value={clientName} onChange={(e) => setClientName(e.target.value)} fullWidth />

        <TextField
          label="Session Date"
          type="date"
          value={sessionDate}
          onChange={(e) => setSessionDate(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
        />

        <TextField select label="Session Length" value={sessionLength} onChange={(e) => setSessionLength(e.target.value)} fullWidth>
          {["15", "30", "45", "50", "53", "60", "90"].map((v) => (
            <MenuItem key={v} value={v}>{v} minutes</MenuItem>
          ))}
        </TextField>

        <TextField select label="Risk Level" value={riskLevel} onChange={(e) => setRiskLevel(e.target.value)} fullWidth>
          <MenuItem value="none">None / Not Assessed</MenuItem>
          <MenuItem value="low">Low Risk</MenuItem>
          <MenuItem value="moderate">Moderate Risk</MenuItem>
          <MenuItem value="high">High Risk</MenuItem>
        </TextField>

        <TextField select label="Note Type" value={noteType} onChange={(e) => setNoteType(e.target.value)} fullWidth>
          {noteTypes.map((note) => (
            <MenuItem key={note.value} value={note.value}>{note.label}</MenuItem>
          ))}
        </TextField>

        <TextField
          label="Raw Note / Dictation"
          multiline
          minRows={8}
          value={rawNote}
          onChange={(e) => setRawNote(e.target.value)}
          fullWidth
        />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button variant="outlined" onClick={handleCleanRawNote} startIcon={<AutoFixHighIcon />}>
            Clean Dictation
          </Button>

          <Button variant="outlined" color="error" onClick={handleClearDictation}>
            Clear
          </Button>
        </Stack>

        <Divider />

        <Button
          variant="contained"
          size="large"
          onClick={handleGenerate}
          disabled={generating || transcribing}
          startIcon={<AutoFixHighIcon />}
        >
          {generating ? "Generating..." : "Generate SOAP Note"}
        </Button>

        <TextField
          label="Formatted SOAP Note"
          multiline
          minRows={9}
          value={formattedNote}
          onChange={(e) => setFormattedNote(e.target.value)}
          fullWidth
        />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <Button
            variant="outlined"
            onClick={handleCopyFormatted}
            disabled={!formattedNote.trim()}
            startIcon={<ContentCopyIcon />}
          >
            Copy SOAP Note
          </Button>

          <Button
            variant="contained"
            color="success"
            onClick={handleSave}
            disabled={saving}
            startIcon={<SaveIcon />}
          >
            {saving ? "Saving..." : "Save Note"}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}