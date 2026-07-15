import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import App from "./app/App";
import { AuthProvider } from "./app/AuthProvider";
import ProtectedRoute from "./app/ProtectedRoute";
import { SavingsPreviewProvider, SavingsProvider } from "./app/SavingsProvider";
import AppShell from "./components/AppShell";
import AuthPage from "./pages/AuthPage";
import GoalsPage from "./pages/GoalsPage";
import HomePage from "./pages/HomePage";
import JourneyPage from "./pages/JourneyPage";
import OnboardingPage from "./pages/OnboardingPage";
import PlanPage from "./pages/PlanPage";
import SavingsEntryPage from "./pages/SavingsEntryPage";
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
    ],
  },
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <SavingsProvider>
          <Outlet />
        </SavingsProvider>
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
          { path: "plan", element: <PlanPage /> },
          { path: "journey", element: <JourneyPage /> },
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
            { path: "plan", element: <PlanPage /> },
            { path: "journey", element: <JourneyPage /> },
          ],
        },
      ]
    : []),
  { path: "*", element: <Navigate to="/" replace /> },
]);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((error) => console.error("Service worker registration failed", error));
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);
