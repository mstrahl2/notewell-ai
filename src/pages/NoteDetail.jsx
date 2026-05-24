// src/pages/NoteDetail.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Snackbar,
  Paper,
  Divider,
  Chip,
} from "@mui/material";
import {
  PictureAsPdf,
  ContentCopy,
  Edit,
  Share,
  ArrowBack,
  Description,
  Print,
} from "@mui/icons-material";

import jsPDF from "jspdf";

import { getNoteById } from "../firebase/firestoreHelper";

const noteTypeLabels = {
  intake: "Intake",
  standard: "SOAP Session",
  progress: "Progress",
  crisis: "Crisis / Risk",
  discharge: "Discharge",
};

function getCleanNoteText(text) {
  if (!text) return "";

  return text
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/#{1,6}\s?/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export default function NoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [copied, setCopied] = useState(false);
  const [copiedClean, setCopiedClean] = useState(false);
  const [shareError, setShareError] = useState("");

  useEffect(() => {
    async function fetchNote() {
      try {
        setLoading(true);
        setError("");

        const foundNote = await getNoteById(id);

        if (foundNote) {
          setNote(foundNote);
        } else {
          setError("Note not found.");
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load note.");
      } finally {
        setLoading(false);
      }
    }

    fetchNote();
  }, [id]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(note?.formattedNote || "");
      setCopied(true);
    } catch (err) {
      setShareError("Unable to copy to clipboard.");
    }
  };

  const handleCopyClean = async () => {
    try {
      const cleanText = getCleanNoteText(note?.formattedNote || "");
      await navigator.clipboard.writeText(cleanText);
      setCopiedClean(true);
    } catch (err) {
      setShareError("Unable to copy clean note.");
    }
  };

  const handleExportTXT = () => {
    if (!note) return;

    const cleanText = getCleanNoteText(note.formattedNote || "");

    const blob = new Blob([cleanText], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = `${note.title || "soap-note"}.txt`;

    link.click();

    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!note) return;

    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();

    let y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);

    doc.text("NoteWell AI", pageWidth / 2, y, {
      align: "center",
    });

    y += 12;

    doc.setFontSize(16);

    doc.text(note.title || "SOAP Note", 20, y);

    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    if (note.clientName) {
      doc.text(`Client: ${note.clientName}`, 20, y);
      y += 7;
    }

    if (note.sessionDate) {
      doc.text(`Session Date: ${note.sessionDate}`, 20, y);
      y += 7;
    }

    if (note.sessionLength) {
      doc.text(`Session Length: ${note.sessionLength} minutes`, 20, y);
      y += 7;
    }

    y += 5;

    doc.setFont("helvetica", "bold");
    doc.text("SOAP Note", 20, y);

    y += 10;

    doc.setFont("helvetica", "normal");

    const cleanText = getCleanNoteText(note.formattedNote || "");

    const splitText = doc.splitTextToSize(cleanText, 170);

    doc.text(splitText, 20, y);

    doc.save(`${note.title || "soap-note"}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    if (!note) return;

    const cleanText = getCleanNoteText(note.formattedNote || "");

    if (navigator.share) {
      try {
        await navigator.share({
          title: note.title || "SOAP Note",
          text: cleanText,
        });
      } catch (error) {
        console.error(error);
        setShareError("Sharing was cancelled or failed.");
      }
    } else {
      handleCopyClean();
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>

        <Button onClick={() => navigate("/my-notes")} sx={{ mt: 2 }}>
          Back to My Notes
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={1} sx={{ mb: 2 }}>
        <Typography variant="h4">
          {note.title || "Untitled Note"}
        </Typography>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Chip
            label={
              noteTypeLabels[note.noteType] ||
              note.noteType ||
              "N/A"
            }
            size="small"
          />

          {note.auditSafe && (
            <Chip
              label="Audit-Safe"
              color="success"
              size="small"
              variant="outlined"
            />
          )}

          {note.clientName && (
            <Chip
              label={`Client: ${note.clientName}`}
              size="small"
            />
          )}

          {note.sessionDate && (
            <Chip
              label={`Date: ${note.sessionDate}`}
              size="small"
            />
          )}

          {note.sessionLength && (
            <Chip
              label={`${note.sessionLength} min`}
              size="small"
            />
          )}

          {note.riskLevel &&
            note.riskLevel !== "none" && (
              <Chip
                label={`Risk: ${note.riskLevel}`}
                size="small"
              />
            )}
        </Stack>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Paper sx={{ p: 2, mb: 2 }} elevation={2}>
        <Typography variant="subtitle2" gutterBottom>
          Raw Note
        </Typography>

        <Typography sx={{ whiteSpace: "pre-wrap" }}>
          {note.rawNote || "No raw note available."}
        </Typography>
      </Paper>

      <Paper sx={{ p: 2, mb: 4 }} elevation={2}>
        <Typography variant="subtitle2" gutterBottom>
          Formatted SOAP Note
        </Typography>

        <Typography sx={{ whiteSpace: "pre-wrap" }}>
          {note.formattedNote || "No formatted note available."}
        </Typography>
      </Paper>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        flexWrap="wrap"
      >
        <Button
          variant="contained"
          startIcon={<Edit />}
          onClick={() => navigate(`/edit-note/${id}`)}
        >
          Edit
        </Button>

        <Button
          variant="outlined"
          startIcon={<ContentCopy />}
          onClick={handleCopy}
        >
          Copy
        </Button>

        <Button
          variant="outlined"
          startIcon={<Description />}
          onClick={handleCopyClean}
        >
          Copy Clean
        </Button>

        <Button
          variant="outlined"
          startIcon={<PictureAsPdf />}
          onClick={handleExportPDF}
        >
          Export PDF
        </Button>

        <Button
          variant="outlined"
          onClick={handleExportTXT}
        >
          Export TXT
        </Button>

        <Button
          variant="outlined"
          startIcon={<Print />}
          onClick={handlePrint}
        >
          Print
        </Button>

        <Button
          variant="outlined"
          startIcon={<Share />}
          onClick={handleShare}
        >
          Share
        </Button>

        <Button
          variant="text"
          startIcon={<ArrowBack />}
          onClick={() => navigate("/my-notes")}
        >
          Back
        </Button>
      </Stack>

      <Snackbar
        open={copied}
        autoHideDuration={3000}
        onClose={() => setCopied(false)}
        message="Note copied with formatting!"
      />

      <Snackbar
        open={copiedClean}
        autoHideDuration={3000}
        onClose={() => setCopiedClean(false)}
        message="Clean note copied!"
      />

      <Snackbar
        open={!!shareError}
        autoHideDuration={3000}
        onClose={() => setShareError("")}
        message={shareError}
      />
    </Box>
  );
}