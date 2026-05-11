// src/App.jsx
import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase/firebaseConfig";

import { getProfile } from "./firebase/firestoreHelper";

import Layout from "./components/Layout";
import PublicLayout from "./components/PublicLayout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import MyNotes from "./pages/MyNotes";
import NewNote from "./pages/NewNote";
import ProfileUpdate from "./pages/ProfileUpdate";
import Profile from "./pages/Profile";
import AccountSettings from "./pages/AccountSettings";
import EditNote from "./pages/EditNote";
import NoteDetail from "./pages/NoteDetail";
import AdminPanel from "./pages/AdminPanel";
import UpgradePlan from "./pages/UpgradePlan";
import UpgradeSuccess from "./pages/UpgradeSuccess";
import UpgradeCancelled from "./pages/UpgradeCancelled";
import CancelSubscription from "./pages/CancelSubscription";

import ErrorBoundary from "./components/ErrorBoundary";
import RequireProfileComplete from "./components/RequireProfileComplete";

// Legal pages
import PrivacyPolicy from "./pages/PolicyPage";
import TermsOfService from "./pages/TermsOfService";
import Disclaimer from "./pages/Disclaimer";

function RequireAuth({ user, children }) {
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ profile, children }) {
  if (!profile || profile.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function UpgradeRoute({ user }) {
  return (
    <RequireAuth user={user}>
      <ErrorBoundary>
        <UpgradePlan />
      </ErrorBoundary>
    </RequireAuth>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const prof = await getProfile();
          setProfile(prof);
        } catch (err) {
          console.error("Failed to fetch profile:", err);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }

      setAuthChecked(true);
    });

    return () => unsubscribe();
  }, []);

  if (!authChecked) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "1.2rem",
          color: "#555",
        }}
      >
        Checking authentication...
      </div>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<PublicLayout />}>
        <Route
          path="login"
          element={!user ? <Login /> : <Navigate to="/dashboard" replace />}
        />

        <Route
          path="signup"
          element={!user ? <Signup /> : <Navigate to="/dashboard" replace />}
        />

        <Route path="privacy-policy" element={<PrivacyPolicy />} />
        <Route path="terms-of-service" element={<TermsOfService />} />
        <Route path="disclaimer" element={<Disclaimer />} />
      </Route>

      {/* Protected routes */}
      <Route path="/" element={<Layout />}>
        <Route
          path="dashboard"
          element={
            <RequireAuth user={user}>
              <RequireProfileComplete>
                <Dashboard />
              </RequireProfileComplete>
            </RequireAuth>
          }
        />

        <Route
          path="new-note"
          element={
            <RequireAuth user={user}>
              <ErrorBoundary>
                <NewNote />
              </ErrorBoundary>
            </RequireAuth>
          }
        />

        <Route
          path="my-notes"
          element={
            <RequireAuth user={user}>
              <ErrorBoundary>
                <MyNotes />
              </ErrorBoundary>
            </RequireAuth>
          }
        />

        <Route
          path="edit-note/:id"
          element={
            <RequireAuth user={user}>
              <ErrorBoundary>
                <EditNote />
              </ErrorBoundary>
            </RequireAuth>
          }
        />

        <Route
          path="note-detail/:id"
          element={
            <RequireAuth user={user}>
              <ErrorBoundary>
                <NoteDetail />
              </ErrorBoundary>
            </RequireAuth>
          }
        />

        <Route
          path="profile-update"
          element={
            <RequireAuth user={user}>
              <ErrorBoundary>
                <ProfileUpdate />
              </ErrorBoundary>
            </RequireAuth>
          }
        />

        <Route
          path="profile"
          element={
            <RequireAuth user={user}>
              <ErrorBoundary>
                <Profile />
              </ErrorBoundary>
            </RequireAuth>
          }
        />

        <Route
          path="my-account"
          element={
            <RequireAuth user={user}>
              <ErrorBoundary>
                <AccountSettings />
              </ErrorBoundary>
            </RequireAuth>
          }
        />

        <Route
          path="cancel-subscription"
          element={
            <RequireAuth user={user}>
              <ErrorBoundary>
                <CancelSubscription />
              </ErrorBoundary>
            </RequireAuth>
          }
        />

        <Route
          path="admin"
          element={
            <RequireAuth user={user}>
              <RequireAdmin profile={profile}>
                <ErrorBoundary>
                  <AdminPanel />
                </ErrorBoundary>
              </RequireAdmin>
            </RequireAuth>
          }
        />

        {/* Support both route names so old and new buttons work */}
        <Route path="upgrade" element={<UpgradeRoute user={user} />} />
        <Route path="upgrade-plan" element={<UpgradeRoute user={user} />} />

        <Route
          path="upgrade-success"
          element={
            <RequireAuth user={user}>
              <ErrorBoundary>
                <UpgradeSuccess />
              </ErrorBoundary>
            </RequireAuth>
          }
        />

        <Route
          path="upgrade-cancelled"
          element={
            <RequireAuth user={user}>
              <ErrorBoundary>
                <UpgradeCancelled />
              </ErrorBoundary>
            </RequireAuth>
          }
        />

        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* Catch-all */}
      <Route
        path="*"
        element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
      />
    </Routes>
  );
}