// src/components/PublicLayout.jsx
import React from "react";
import { Outlet, NavLink } from "react-router-dom";
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  Link,
} from "@mui/material";

export default function PublicLayout() {
  return (
    <Box
      display="flex"
      flexDirection="column"
      minHeight="100vh"
      bgcolor="#F6F4EE"
      pb="64px"
    >
      <Container maxWidth="sm" sx={{ mt: { xs: 5, sm: 8 }, flexGrow: 1 }}>
        {/* Logo + Branding */}
        <Box textAlign="center" mb={4}>
          <Box
            component="img"
            src="/branding/logo-horizontal.png"
            alt="NoteWell AI"
            sx={{
              height: { xs: 52, sm: 64 },
              width: "auto",
              objectFit: "contain",
              mb: 2,
            }}
          />

          <Typography
            color="text.secondary"
            sx={{
              fontSize: "1rem",
              maxWidth: 420,
              mx: "auto",
              lineHeight: 1.6,
            }}
          >
            AI-powered clinical documentation for mental health professionals.
          </Typography>
        </Box>

        {/* Main Auth Card */}
        <Card
          sx={{
            borderRadius: 4,
            border: "1px solid #E5E7EB",
            boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
            bgcolor: "#ffffff",
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            <Outlet />
          </CardContent>
        </Card>
      </Container>

      {/* Footer */}
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: "#ffffff",
          borderTop: "1px solid #E5E7EB",
          py: 1.2,
          px: 2,
          textAlign: "center",
          fontSize: "0.74rem",
          color: "text.secondary",
          backdropFilter: "blur(10px)",
        }}
      >
        © {new Date().getFullYear()} NoteWell AI. Clinician review required.
        &nbsp;|&nbsp;
        <Link component={NavLink} to="/privacy-policy" underline="hover">
          Privacy
        </Link>
        &nbsp;|&nbsp;
        <Link component={NavLink} to="/terms-of-service" underline="hover">
          Terms
        </Link>
        &nbsp;|&nbsp;
        <Link component={NavLink} to="/disclaimer" underline="hover">
          Disclaimer
        </Link>
      </Box>
    </Box>
  );
}