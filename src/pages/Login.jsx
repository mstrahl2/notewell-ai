// src/pages/Login.jsx
import React, { useState } from "react";
import {
  Typography,
  Box,
  Button,
  TextField,
  Link,
  Alert,
  Divider,
  Stack,
} from "@mui/material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../firebase/firebaseConfig";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);

      await signInWithEmailAndPassword(auth, email.trim(), password);

      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Failed to log in.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");

    try {
      setLoading(true);

      const provider = new GoogleAuthProvider();

      await signInWithPopup(auth, provider);

      navigate("/dashboard");
    } catch (err) {
      console.error("Google login error:", err);
      setError(err.message || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Welcome back
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Log in to create, review, and manage your clinical documentation.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box component="form" onSubmit={handleLogin} noValidate>
        <Stack spacing={2}>
          <TextField
            label="Email"
            fullWidth
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <TextField
            label="Password"
            fullWidth
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={loading}
            sx={{
              py: 1.25,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            {loading ? "Logging in..." : "Log In"}
          </Button>
        </Stack>
      </Box>

      <Divider sx={{ my: 3 }}>or</Divider>

      <Button
        variant="outlined"
        fullWidth
        onClick={handleGoogleSignIn}
        disabled={loading}
        sx={{
          py: 1.15,
          textTransform: "none",
          fontWeight: 600,
        }}
      >
        Continue with Google
      </Button>

      <Typography variant="body2" sx={{ mt: 3, textAlign: "center" }}>
        Don&apos;t have an account?{" "}
        <Link component={RouterLink} to="/signup" fontWeight={700}>
          Create one
        </Link>
      </Typography>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          display: "block",
          mt: 2,
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        Generated notes are assistive drafts and require clinician review before
        use.
      </Typography>
    </Box>
  );
}