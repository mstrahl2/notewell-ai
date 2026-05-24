// src/components/Layout.jsx
import React, { useEffect, useState } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase/firebaseConfig";
import { signOut } from "firebase/auth";
import {
  Box,
  Button,
  AppBar,
  Toolbar,
  Link,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Chip,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import NoteIcon from "@mui/icons-material/Note";
import { getProfile } from "../firebase/firestoreHelper";

const tabRoutes = ["/dashboard", "/new-note", "/my-notes"];

function formatTier(profile) {
  const override = profile?.accessOverride || "none";

  if (override === "tester") return "TESTER";
  if (override === "comped") return "COMPED";

  const subscription = profile?.subscription;

  if (subscription?.status === "active" && !subscription?.cancel_at_period_end) {
    return (subscription?.planName || profile?.tier || "paid").toUpperCase();
  }

  return (profile?.tier || "free").toUpperCase();
}

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentIdx = tabRoutes.findIndex((route) =>
    location.pathname.startsWith(route)
  );

  const [tabVal, setTabVal] = useState(currentIdx >= 0 ? currentIdx : 0);
  const [tier, setTier] = useState("FREE");

  useEffect(() => {
    const idx = tabRoutes.findIndex((route) =>
      location.pathname.startsWith(route)
    );

    if (idx >= 0 && idx !== tabVal) {
      setTabVal(idx);
    }
  }, [location.pathname, tabVal]);

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await getProfile();
        setTier(formatTier(profile));
      } catch (err) {
        console.error("Failed to load profile in Layout:", err);
      }
    }

    loadProfile();
  }, []);

  const handleTab = (_, newVal) => {
    setTabVal(newVal);
    navigate(tabRoutes[newVal]);
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#F6F4EE",
        display: "flex",
        flexDirection: "column",
        pb: "86px",
      }}
    >
      <AppBar
        position="static"
        sx={{
          bgcolor: "#ffffff",
          color: "#2F3437",
          borderBottom: "1px solid #e5e7eb",
        }}
        elevation={0}
      >
        <Toolbar sx={{ justifyContent: "space-between", gap: 2 }}>
        <Box
  component={NavLink}
  to="/dashboard"
  sx={{
    textDecoration: "none",
    display: "flex",
    alignItems: "center",
    minWidth: 0,
  }}
>
  <Box
    sx={{
      fontSize: { xs: "1.55rem", sm: "2rem" },
      fontWeight: 700,
      letterSpacing: "-0.045em",
      color: "#2F3437",
      lineHeight: 1,
      whiteSpace: "nowrap",
    }}
  >
    Note<span style={{ color: "#6CAAA5" }}>Well</span> AI
  </Box>
</Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              label={tier}
              size="small"
              color={tier === "FREE" ? "default" : "success"}
              sx={{
                fontWeight: 600,
                display: { xs: "none", sm: "inline-flex" },
              }}
            />

            <Link
              component={NavLink}
              to="/my-account"
              color="inherit"
              underline="none"
              sx={{
                display: "inline" ,
                fontWeight: 600,
              }}
            >
              Account
            </Link>

            <Button
              variant="outlined"
              onClick={handleLogout}
              sx={{
                borderColor: "#d1d5db",
                color: "#2F3437",
                textTransform: "none",
              }}
            >
              Logout
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, p: { xs: 2, sm: 3 }, overflowY: "auto" }}>
        <Outlet />
      </Box>

      <Paper
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          bgcolor: "#fff",
          borderTop: "1px solid #e5e7eb",
          zIndex: (theme) => theme.zIndex.appBar,
        }}
        elevation={8}
      >
        <BottomNavigation value={tabVal} onChange={handleTab} showLabels>
          <BottomNavigationAction label="Dashboard" icon={<DashboardIcon />} />
          <BottomNavigationAction label="New Note" icon={<AddCircleIcon />} />
          <BottomNavigationAction label="My Notes" icon={<NoteIcon />} />
        </BottomNavigation>

        <Box
          sx={{
            fontSize: "0.72rem",
            color: "text.secondary",
            py: 0.6,
            px: 2,
            width: "100%",
            textAlign: "center",
            borderTop: "1px solid #e5e7eb",
          }}
        >
          © {new Date().getFullYear()} NoteWell AI. Clinician review required.
          &nbsp;|&nbsp;
          <Link component={NavLink} to="/dashboard" underline="hover">
            Dashboard
          </Link>
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
      </Paper>
    </Box>
  );
}