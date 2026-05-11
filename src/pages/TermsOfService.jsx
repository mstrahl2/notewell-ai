// src/pages/TermsOfService.jsx
import React from "react";
import { Box, Typography, Container } from "@mui/material";

export default function TermsOfService() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Terms of Service
      </Typography>

      <Typography paragraph>
        By accessing or using the NoteWell AI App (“Service”), you agree to be bound by
        these Terms. If you do not agree, do not use the Service.
      </Typography>

      <Typography variant="h6">1. Use of Service</Typography>
      <Typography paragraph>
        The Service is intended to assist users in generating professional-style
        SOAP notes. It is not a substitute for clinical judgment, supervision, or
        documentation requirements of your profession or employer.
      </Typography>

      <Typography variant="h6">2. No Medical Advice</Typography>
      <Typography paragraph>
        The Service does not provide medical or clinical advice. Generated notes
        are not reviewed or validated by licensed professionals. You are solely
        responsible for reviewing and ensuring all content meets your legal and
        ethical obligations.
      </Typography>

      <Typography variant="h6">3. Accounts</Typography>
      <Typography paragraph>
        You are responsible for maintaining the confidentiality of your login
        credentials. You may not share your account with others.
      </Typography>

      <Typography variant="h6">4. Termination</Typography>
      <Typography paragraph>
        We may suspend or terminate your access at any time for any reason,
        including misuse of the Service or violation of these Terms.
      </Typography>

      <Typography variant="h6">5. Modifications</Typography>
      <Typography paragraph>
        We may update these Terms at any time. Continued use of the Service
        constitutes acceptance of the new Terms.
      </Typography>

      <Typography variant="body2" mt={4}>
        Last updated: {new Date().toLocaleDateString()}
      </Typography>
    </Container>
  );
}
