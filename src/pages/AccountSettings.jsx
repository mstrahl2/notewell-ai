// src/pages/AccountSettings.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Button,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Paper,
  Divider,
  Stack,
  Chip,
} from "@mui/material";
import { auth } from "../firebase/firebaseConfig";
import { getProfile } from "../firebase/firestoreHelper";
import dayjs from "dayjs";

export default function AccountSettings() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const navigate = useNavigate();

  const fetchProfile = async () => {
    try {
      const prof = await getProfile();
      setProfile(prof);
    } catch (err) {
      console.error("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const formatDate = (timestamp) => {
    if (!timestamp) return "-";

    const date =
      typeof timestamp === "object" && timestamp.seconds
        ? dayjs.unix(timestamp.seconds)
        : dayjs(timestamp);

    return date.format("MMMM D, YYYY");
  };

  const handleManageBilling = async () => {
    try {
      setBillingLoading(true);
      setStatus(null);

      const token = await auth.currentUser.getIdToken();

      const res = await fetch("/api/create-portal-session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to open billing portal.");
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("Billing portal error:", err);
      setStatus("portal-error");
      setBillingLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setStatus(null);
    setConfirmOpen(false);

    try {
      const token = await auth.currentUser.getIdToken();

      const res = await fetch("/api/cancel-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel subscription");
      }

      setStatus("success");
      await fetchProfile();
    } catch (err) {
      console.error("Cancel error:", err);
      setStatus("error");
    }
  };

  if (loading) {
    return (
      <Box sx={{ mt: 6, display: "flex", justifyContent: "center" }}>
        <CircularProgress />
      </Box>
    );
  }

  const subscription = profile?.subscription || {};
  const override = profile?.accessOverride || "none";
  const tier = profile?.tier || "free";

  const hasStripeCustomer = !!subscription?.stripeCustomerId;

  const hasPaidSubscription =
    subscription?.stripeSubscriptionId &&
    subscription?.status === "active" &&
    !subscription?.cancel_at_period_end;

  const hasFullOverride = override === "tester" || override === "comped";

  const displayPlan = hasFullOverride
    ? override === "tester"
      ? "Tester Full Access"
      : "Comped Full Access"
    : hasPaidSubscription
    ? subscription.planName || tier
    : tier;

  const displayStatus = hasFullOverride
    ? "Full access override"
    : subscription?.cancel_at_period_end
    ? "Cancels at period end"
    : subscription?.status || "Free";

  return (
    <Container maxWidth="sm" sx={{ mt: 5, mb: 6 }}>
      <Typography variant="h4" gutterBottom>
        My Account
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Manage your profile, plan, and billing settings.
      </Typography>

      <Stack spacing={2}>
        <Button
          fullWidth
          variant="contained"
          onClick={() => navigate("/profile-update")}
        >
          Update Profile
        </Button>

        <Button
          fullWidth
          variant="contained"
          color="secondary"
          onClick={() => navigate("/upgrade-plan")}
        >
          View Plans
        </Button>
      </Stack>

      <Paper elevation={3} sx={{ p: 3, mt: 4 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={2}
        >
          <Typography variant="h6">Billing Summary</Typography>

          <Chip
            label={displayStatus}
            color={
              hasPaidSubscription || hasFullOverride
                ? "success"
                : subscription?.cancel_at_period_end
                ? "warning"
                : "default"
            }
            size="small"
          />
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Typography sx={{ mb: 1 }}>
          <strong>Plan:</strong>{" "}
          {displayPlan.charAt(0).toUpperCase() + displayPlan.slice(1)}
        </Typography>

        <Typography sx={{ mb: 1 }}>
          <strong>Status:</strong> {displayStatus}
        </Typography>

        {subscription?.current_period_end && (
          <Typography sx={{ mb: 1 }}>
            <strong>Current Period Ends:</strong>{" "}
            {formatDate(subscription.current_period_end)}
          </Typography>
        )}

        {subscription?.cancel_at_period_end && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Your subscription is scheduled to end on{" "}
            <strong>{formatDate(subscription.current_period_end)}</strong>. You
            will keep access until then.
          </Alert>
        )}

        {hasFullOverride && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Your account currently has no-cost full access.
          </Alert>
        )}

        {hasStripeCustomer && (
          <Button
            fullWidth
            variant="contained"
            sx={{ mt: 3 }}
            onClick={handleManageBilling}
            disabled={billingLoading}
          >
            {billingLoading ? "Opening Billing Portal..." : "Manage Billing"}
          </Button>
        )}

        {hasPaidSubscription && (
          <Button
            fullWidth
            variant="outlined"
            color="error"
            sx={{ mt: 2 }}
            onClick={() => setConfirmOpen(true)}
          >
            Cancel Subscription
          </Button>
        )}
      </Paper>

      {status === "success" && (
        <Alert severity="success" sx={{ mt: 3 }}>
          Cancellation request submitted. Your access will remain active until
          the end of the billing period.
        </Alert>
      )}

      {status === "error" && (
        <Alert severity="error" sx={{ mt: 3 }}>
          Failed to cancel subscription. Please try again or contact support.
        </Alert>
      )}

      {status === "portal-error" && (
        <Alert severity="error" sx={{ mt: 3 }}>
          Failed to open billing portal. Please try again.
        </Alert>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Confirm Cancellation</DialogTitle>
        <DialogContent>
          Are you sure you want to cancel your subscription? You’ll still have
          access until the end of your billing cycle.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Keep Subscription</Button>
          <Button onClick={handleCancelSubscription} color="error">
            Confirm Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}