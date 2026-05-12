// src/pages/UpgradeSuccess.jsx
import React from "react";
import { Box, Container, Typography, Button, Alert } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function UpgradeSuccess() {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ py: 6, textAlign: "center" }}>
      <Typography variant="h4" gutterBottom>
        Upgrade Successful
      </Typography>

      <Alert severity="success" sx={{ my: 3, textAlign: "left" }}>
        Your subscription was created successfully. It may take a moment for your
        billing status to refresh in your account.
      </Alert>

      <Typography sx={{ mb: 3 }}>
        You can now continue creating documentation with your upgraded access.
      </Typography>

      <Button
        variant="contained"
        size="large"
        onClick={() => navigate("/new-note")}
      >
        Create Your Next Note
      </Button>

      <Box sx={{ mt: 2 }}>
        <Button onClick={() => navigate("/my-account")}>View My Account</Button>
      </Box>

      <Box sx={{ mt: 1 }}>
        <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
      </Box>
    </Container>
  );
}