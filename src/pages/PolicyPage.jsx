// src/pages/PrivacyPolicy.jsx
import React from "react";
import { Box, Typography, Container } from "@mui/material";

export default function PrivacyPolicy() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Privacy Policy
      </Typography>
      <Typography variant="body1" paragraph>
        Effective Date: May 10, 2026
      </Typography>

      <Typography variant="h6" gutterBottom>
        Information We Collect
      </Typography>
      <Typography variant="body1" paragraph>
        - Personal Information: When you create an account, we collect your name, email, and other profile details. <br />
        - Session Data: Notes and voice input you provide through the app. <br />
        - Usage Data: Information about how you use the app.
      </Typography>

      <Typography variant="h6" gutterBottom>
        How We Use Your Information
      </Typography>
      <Typography variant="body1" paragraph>
        We use your data to provide and improve our services, personalize your experience, and communicate updates or support.
      </Typography>

      <Typography variant="h6" gutterBottom>
        How We Protect Your Information
      </Typography>
      <Typography variant="body1" paragraph>
        We use secure technologies including Firebase Authentication and Firestore. Data is encrypted during transmission.
      </Typography>

      <Typography variant="h6" gutterBottom>
        Third-Party Services
      </Typography>
      <Typography variant="body1" paragraph>
        We use Firebase and other services to operate our app. These tools may collect data in accordance with their own privacy policies.
      </Typography>

      <Typography variant="h6" gutterBottom>
        Your Choices
      </Typography>
      <Typography variant="body1" paragraph>
        You may update or delete your profile at any time by logging into your account. You can request data deletion by contacting us.
      </Typography>

      <Typography variant="h6" gutterBottom>
        Contact
      </Typography>
      <Typography variant="body1">
        If you have any questions, contact us at support@notwellai.com.
      </Typography>
    </Container>
  );
}
