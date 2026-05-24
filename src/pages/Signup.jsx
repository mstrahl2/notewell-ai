// src/pages/Signup.jsx
import React, { useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  Box,
  Button,
  TextField,
  Typography,
  Link,
  Checkbox,
  FormControlLabel,
  Alert,
  Stack,
  Divider,
} from "@mui/material";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";
import { createUserProfile } from "../firebase/firestoreHelper";

const AGREEMENT_VERSION = "1.0";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    if (!agreeToTerms) {
      setError("Please review and accept the required terms before continuing.");
      return;
    }

    try {
      setSaving(true);

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const user = userCredential.user;

      await createUserProfile(user.uid, {
        email: user.email,
        tier: "free",
        role: "free",
        accessOverride: "none",
        agreementAccepted: true,
        agreementAcceptedAt: new Date().toISOString(),
        agreementVersion: AGREEMENT_VERSION,
        createdAt: new Date().toISOString(),
      });

      navigate("/profile-update");
    } catch (err) {
      console.error("Signup error:", err);
      setError(err.message || "Failed to create account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Create your account
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Start turning typed or dictated session notes into organized clinical
        documentation.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleSignup} noValidate>
        <Stack spacing={2}>
          <TextField
            label="Email"
            fullWidth
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <TextField
            label="Password"
            fullWidth
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            helperText="Use a secure password you do not use elsewhere."
          />

          <Box
            sx={{
              border: "1px solid #E5E7EB",
              borderRadius: 2,
              p: 2,
              maxHeight: 190,
              overflowY: "auto",
              bgcolor: "#FAFAFA",
            }}
          >
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Important use notice
            </Typography>

            <Typography variant="body2" paragraph>
              NoteWell AI provides assistive clinical documentation tools for
              mental health professionals. Generated content is a draft and must
              be reviewed, edited, and approved by the clinician before use.
            </Typography>

            <Typography variant="body2" paragraph>
              NoteWell AI does not replace clinical judgment, supervision,
              professional standards, payer requirements, employer policies, or
              legal/compliance guidance.
            </Typography>

            <Typography variant="body2" paragraph>
              Do not enter unnecessary sensitive information. You are responsible
              for ensuring your use of this tool complies with applicable privacy,
              documentation, and professional obligations.
            </Typography>

            <Typography variant="body2">
              By creating an account, you agree to the Terms of Service, Privacy
              Policy, and Disclaimer.
            </Typography>
          </Box>

          <FormControlLabel
            sx={{ alignItems: "flex-start" }}
            control={
              <Checkbox
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                sx={{ mt: -0.5 }}
              />
            }
            label={
              <Typography variant="body2">
                I have read and agree to the{" "}
                <Link component={RouterLink} to="/terms-of-service">
                  Terms
                </Link>
                ,{" "}
                <Link component={RouterLink} to="/privacy-policy">
                  Privacy Policy
                </Link>
                , and{" "}
                <Link component={RouterLink} to="/disclaimer">
                  Disclaimer
                </Link>
                .
              </Typography>
            }
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={!agreeToTerms || saving}
            sx={{
              py: 1.25,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            {saving ? "Creating Account..." : "Create Account"}
          </Button>
        </Stack>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography variant="body2" textAlign="center">
        Already have an account?{" "}
        <Link component={RouterLink} to="/login" fontWeight={700}>
          Log in
        </Link>
      </Typography>
    </Box>
  );
}