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
import { getProfile, canUserCreateNote } from "../firebase/firestoreHelper";
import { useNavigate } from "react-router-dom";

function formatPlanLabel(profile, usage) {
  const override = profile?.accessOverride || "none";

  if (override === "tester") return "Tester Full Access";
  if (override === "comped") return "Comped Full Access";

  if (usage?.tier === "paid") {
    return profile?.subscription?.planName
      ? profile.subscription.planName.charAt(0).toUpperCase() +
          profile.subscription.planName.slice(1)
      : "Paid";
  }

  if (usage?.tier === "override") return "Full Access";

  const tier = profile?.tier || usage?.tier || "free";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export default function Dashboard() {
  const [profile, setProfile] = useState(null);
  const [usage, setUsage] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [usageLoading, setUsageLoading] = useState(true);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      try {
        setProfileLoading(true);
        setError("");

        const userProfile = await getProfile();

        if (!mounted) return;

        setProfile(userProfile);
        setProfileLoading(false);

        try {
          const usageData = await canUserCreateNote();

          if (!mounted) return;

          setUsage(usageData);
        } catch (usageErr) {
          console.error("Failed to load usage:", usageErr);
        } finally {
          if (mounted) setUsageLoading(false);
        }
      } catch (err) {
        console.error("Error loading dashboard:", err);

        if (mounted) {
          setError("Failed to load dashboard.");
          setProfileLoading(false);
          setUsageLoading(false);
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

  if (profileLoading) {
    return (
      <Box textAlign="center" mt={4}>
        <CircularProgress />
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          Loading your dashboard...
        </Typography>
      </Box>
    );
  }

  const displayName = profile?.preferredName || profile?.firstName || "User";
  const licenseType = profile?.licenseType || "Not set";
  const planLabel = formatPlanLabel(profile, usage);
  const unlimited = usage?.allowed === Infinity;

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

        <Chip label={planLabel} color={unlimited ? "success" : "default"} />
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

          {usageLoading ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={18} />
              <Typography variant="body2" color="text.secondary">
                Checking usage...
              </Typography>
            </Stack>
          ) : unlimited ? (
            <Typography color="text.secondary">
              Unlimited note access is active.
            </Typography>
          ) : (
            <>
              <Typography variant="body2">
                {usage?.remaining ?? 0} of {usage?.allowed ?? 15} notes
                remaining this month.
              </Typography>

              {typeof usage?.remaining === "number" && usage.remaining <= 3 && (
                <Typography color="error" mt={1}>
                  You're almost out of notes.
                </Typography>
              )}

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