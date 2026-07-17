import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import App from "./app/App";
import { AuthProvider, useAuth } from "./app/AuthProvider";
import ProtectedRoute from "./app/ProtectedRoute";
import SavingsGate from "./app/SavingsGate";
import { SavingsPreviewProvider, SavingsProvider } from "./app/SavingsProvider";
import AppShell from "./components/AppShell";
import AppErrorBoundary from "./components/AppErrorBoundary";
import NetworkStatus from "./components/NetworkStatus";
import AccountCheckPage from "./pages/AccountCheckPage";
import AuthPage from "./pages/AuthPage";
import GoalsPage from "./pages/GoalsPage";
import HomePage from "./pages/HomePage";
import JourneyPage from "./pages/JourneyPage";
import LegalPage from "./pages/LegalPage";
import OnboardingPage from "./pages/OnboardingPage";
import PactDetailPage from "./pages/PactDetailPage";
import PlanPage from "./pages/PlanPage";
import SavingsEntryPage from "./pages/SavingsEntryPage";
import SettingsPage from "./pages/SettingsPage";
import TodayPage from "./pages/TodayPage";
import "./styles/global.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "auth",
        element: <AuthPage />,
      },
      {
        path: "legal/:document",
        element: <LegalPage />,
      },
    ],
  },
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <AuthenticatedSavingsArea />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <SavingsEntryPage /> },
      { path: "onboarding", element: <OnboardingPage /> },
      {
        element: <AppShell />,
        children: [
          { path: "today", element: <TodayPage /> },
          { path: "goals", element: <GoalsPage /> },
          { path: "goals/:pactId", element: <PactDetailPage /> },
          { path: "plan", element: <PlanPage /> },
          { path: "plan/account-check", element: <AccountCheckPage /> },
          { path: "journey", element: <JourneyPage /> },
          { path: "settings", element: <SettingsPage /> },
        ],
      },
    ],
  },
  {
    path: "/dashboard",
    element: <Navigate to="/app" replace />,
  },
  ...(import.meta.env.DEV
    ? [
        {
          path: "/preview/onboarding",
          element: (
            <SavingsProvider>
              <OnboardingPage />
            </SavingsProvider>
          ),
        },
        {
          path: "/preview/app",
          element: (
            <SavingsPreviewProvider>
              <AppShell basePath="/preview/app" />
            </SavingsPreviewProvider>
          ),
          children: [
            { index: true, element: <Navigate to="today" replace /> },
            { path: "today", element: <TodayPage /> },
            { path: "goals", element: <GoalsPage /> },
            { path: "goals/:pactId", element: <PactDetailPage /> },
            { path: "plan", element: <PlanPage /> },
            { path: "plan/account-check", element: <AccountCheckPage /> },
            { path: "journey", element: <JourneyPage /> },
            { path: "settings", element: <SettingsPage /> },
          ],
        },
      ]
    : []),
  { path: "*", element: <Navigate to="/" replace /> },
]);

function AuthenticatedSavingsArea() {
  const { user } = useAuth();

  return (
    <SavingsProvider key={user?.id}>
      <SavingsGate>
        <Outlet />
      </SavingsGate>
    </SavingsProvider>
  );
}

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((error) => console.error("Service worker registration failed", error));
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <AuthProvider>
        <NetworkStatus />
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </AuthProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);
