// src/pages/UpgradePlan.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase/firebaseConfig";
import {
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  CircularProgress,
  Chip,
  Box,
  Alert,
  Stack,
  Divider,
} from "@mui/material";
import { getProfile, hasActiveSubscription } from "../firebase/firestoreHelper";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    description: "Try NoteWell AI with basic access.",
    features: ["15 notes per month", "Voice dictation", "Save notes", "Copy SOAP notes"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$9/mo",
    description: "Best for regular documentation needs.",
    features: ["100 notes per month", "Voice-to-SOAP workflow", "Client note history", "Clean copy + editing"],
    popular: true,
  },
  {
    id: "unlimited",
    name: "Unlimited",
    price: "$19/mo",
    description: "Best for high-volume clinicians.",
    features: ["Unlimited notes", "All Pro features", "Priority product improvements", "Best value for daily use"],
  },
];

function normalizeTier(value) {
  return (value || "free").toString().toLowerCase();
}

export default function UpgradePlan() {
  const [profile, setProfile] = useState(null);
  const [hasSub, setHasSub] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const p = await getProfile();
        const sub = await hasActiveSubscription();

        setProfile(p);
        setHasSub(sub);
      } catch (err) {
        console.error("Failed to load upgrade page:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleUpgrade = async (plan) => {
    try {
      setProcessingPlan(plan);

      const token = await auth.currentUser.getIdToken();

      const priceMap = {
        pro: import.meta.env.VITE_STRIPE_PRICE_PRO,
        unlimited: import.meta.env.VITE_STRIPE_PRICE_UNLIMITED,
      };

      if (!priceMap[plan]) {
        alert("This plan is not configured yet.");
        setProcessingPlan("");
        return;
      }

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId: priceMap[plan],
          planName: plan,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upgrade failed");
      }

      window.location.href = data.url;
    } catch (err) {
      console.error(err);
      alert(err.message || "Upgrade failed.");
      setProcessingPlan("");
    }
  };

  if (loading) {
    return (
      <Box sx={{ mt: 6, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  const tier = normalizeTier(profile?.tier || profile?.subscription?.planName);
  const override = profile?.accessOverride || "none";
  const isTesterOrComped = override === "tester" || override === "comped";
  const currentPlan = isTesterOrComped || hasSub ? tier : tier || "free";

  return (
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Box textAlign="center" sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Choose the plan that fits your workflow
        </Typography>

        <Typography color="text.secondary">
          NoteWell AI helps turn typed or dictated session notes into clean,
          review-ready SOAP documentation.
        </Typography>
      </Box>

      {isTesterOrComped && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Your account currently has no-cost full access as a{" "}
          <strong>{override}</strong> user.
        </Alert>
      )}

      {hasSub && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Your paid subscription is active.
        </Alert>
      )}

      <Grid container spacing={3}>
        {plans.map((plan) => {
          const isCurrent =
            plan.id === "free"
              ? currentPlan === "free" && !hasSub && !isTesterOrComped
              : currentPlan === plan.id;

          const disabled =
            isCurrent ||
            processingPlan ||
            plan.id === "free" ||
            isTesterOrComped;

          return (
            <Grid item xs={12} md={4} key={plan.id}>
              <Card
                sx={{
                  height: "100%",
                  border: plan.popular ? "2px solid #1976d2" : "1px solid #e5e7eb",
                  boxShadow: plan.popular ? 4 : 1,
                  borderRadius: 3,
                }}
              >
                <CardContent>
                  <Stack spacing={2}>
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="h6" fontWeight={700}>
                          {plan.name}
                        </Typography>

                        {plan.popular && (
                          <Chip label="Most Popular" color="primary" size="small" />
                        )}

                        {isCurrent && (
                          <Chip label="Current" color="success" size="small" />
                        )}
                      </Stack>

                      <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
                        {plan.price}
                      </Typography>

                      <Typography color="text.secondary" sx={{ mt: 1 }}>
                        {plan.description}
                      </Typography>
                    </Box>

                    <Divider />

                    <Stack spacing={1}>
                      {plan.features.map((feature) => (
                        <Typography key={feature} variant="body2">
                          ✓ {feature}
                        </Typography>
                      ))}
                    </Stack>

                    <Button
                      fullWidth
                      variant={plan.popular ? "contained" : "outlined"}
                      disabled={disabled}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      {isCurrent
                        ? "Current Plan"
                        : plan.id === "free"
                        ? "Included"
                        : processingPlan === plan.id
                        ? "Opening Checkout..."
                        : `Upgrade to ${plan.name}`}
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Box textAlign="center" sx={{ mt: 4 }}>
        <Typography variant="body2" color="text.secondary">
          All generated documentation must be reviewed and approved by the clinician before use.
        </Typography>

        <Button sx={{ mt: 2 }} onClick={() => navigate("/my-account")}>
          Back to My Account
        </Button>
      </Box>
    </Container>
  );
}