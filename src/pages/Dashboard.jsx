// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import {
  Typography,
  Box,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Stack,
  Alert,
  Chip,
} from "@mui/material";
import { getProfile } from "../firebase/firestoreHelper";
import { useNavigate } from "react-router-dom";

function getPlanLabel(profile) {
  const override = profile?.accessOverride || "none";

  if (override === "tester") return "Tester Full Access";
  if (override === "comped") return "Comped Full Access";

  const subscription = profile?.subscription;

  if (
    subscription?.status === "active" &&
    !subscription?.cancel_at_period_end
  ) {
    return subscription?.planName
      ? subscription.planName.charAt(0).toUpperCase() +
          subscription.planName.slice(1)
      : "Paid";
  }

  const tier = profile?.tier || "free";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function hasFullAccess(profile) {
  const override = profile?.accessOverride || "none";
  const subscription = profile?.subscription;

  return (
    override === "tester" ||
    override === "comped" ||
    profile?.tier === "unlimited" ||
    (subscription?.status === "active" && !subscription?.cancel_at_period_end)
  );
}

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        const userProfile = await getProfile();

        if (!mounted) return;

        setProfile(userProfile);
      } catch (err) {
        console.error("Error loading dashboard:", err);

        if (mounted) {
          setError("Failed to load dashboard.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, []);

  const handleUpgrade = () => navigate("/upgrade-plan");
  const handleNewNote = () => navigate("/new-note");

  if (loading) {
    return (
      <Box textAlign="center" mt={4}>
        <CircularProgress />
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          Loading dashboard...
        </Typography>
      </Box>
    );
  }

  const displayName = profile?.preferredName || profile?.firstName || "User";
  const licenseType = profile?.licenseType || "Not set";
  const planLabel = getPlanLabel(profile);
  const fullAccess = hasFullAccess(profile);

  return (
    <Box maxWidth={760} mx="auto" mt={{ xs: 2, sm: 4 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            Welcome, {displayName}.
          </Typography>

          <Typography variant="body1" color="text.secondary">
            License: {licenseType}
          </Typography>
        </Box>

        <Chip label={planLabel} color={fullAccess ? "success" : "default"} />
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Alert severity="info" sx={{ mb: 3 }}>
        Notes generated are assistive drafts. Always review and finalize before
        clinical use.
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6">Your Plan</Typography>

          <Typography variant="h5" sx={{ fontWeight: "bold", mb: 1 }}>
            {planLabel}
          </Typography>

          {fullAccess ? (
            <Typography color="text.secondary">
              Full note access is active.
            </Typography>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                Free access includes limited note creation. Usage limits are
                checked when saving a note.
              </Typography>

              <Button variant="contained" sx={{ mt: 2 }} onClick={handleUpgrade}>
                Upgrade Plan
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Stack spacing={2}>
        <Button variant="contained" size="large" onClick={handleNewNote}>
          Create New Note
        </Button>

        <Button variant="outlined" onClick={() => navigate("/my-notes")}>
          View My Notes
        </Button>

        <Button variant="text" onClick={() => navigate("/my-account")}>
          Manage Account
        </Button>
      </Stack>
    </Box>
  );
}