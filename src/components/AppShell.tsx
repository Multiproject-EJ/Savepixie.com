import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSavings } from "../app/SavingsProvider";
import { gentleHaptic } from "../lib/feedback";
import PixieMark from "./PixieMark";
import QuickSaveDialog from "./QuickSaveDialog";

export type AppShellOutletContext = {
  openQuickSave: (goalId?: string) => void;
  basePath: "/app" | "/preview/app";
};

const navItems = [
  { path: "today", label: "Today", icon: "home" },
  { path: "goals", label: "Goals", icon: "goal" },
  { path: "plan", label: "Plan", icon: "plan" },
  { path: "journey", label: "Journey", icon: "journey" },
] as const;

type AppShellProps = {
  basePath?: "/app" | "/preview/app";
};

export function AppShell({ basePath = "/app" }: AppShellProps) {
  const { displayName } = useSavings();
  const navigate = useNavigate();
  const location = useLocation();
  const [quickSaveOpen, setQuickSaveOpen] = useState(false);
  const [quickSaveGoalId, setQuickSaveGoalId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saveMoment, setSaveMoment] = useState(0);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(null), 4400);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    if (!saveMoment) return;
    const timeout = window.setTimeout(() => setSaveMoment(0), 1700);
    return () => window.clearTimeout(timeout);
  }, [saveMoment]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  const openQuickSave = (goalId?: string) => {
    gentleHaptic();
    setQuickSaveGoalId(goalId || null);
    setQuickSaveOpen(true);
  };

  const handleSaved = (message: string) => {
    setNotice(message);
    setSaveMoment((current) => current + 1);
    gentleHaptic("success");
  };

  const openSettings = () => navigate(`${basePath}/settings`);

  const outletContext: AppShellOutletContext = { openQuickSave, basePath };

  return (
    <div className="app-shell">
      <aside className="desktop-rail">
        <NavLink to={`${basePath}/today`} className="app-brand" aria-label="SavePixie Today">
          <PixieMark size="small" mood="happy" />
          <span>SavePixie</span>
        </NavLink>

        <nav className="desktop-nav" aria-label="Main app navigation">
          {navItems.map(({ path, ...item }) => (
            <AppNavLink key={path} to={`${basePath}/${path}`} {...item} />
          ))}
        </nav>

        <div className="desktop-rail__footer">
          <button className="profile-chip" type="button" onClick={openSettings}>
            <span className="profile-avatar">{displayName.slice(0, 1).toUpperCase()}</span>
            <span>
              <strong>{displayName}</strong>
              <small>Account &amp; settings</small>
            </span>
          </button>
        </div>
      </aside>

      <section className="app-stage">
        <header className="mobile-app-header">
          <NavLink to={`${basePath}/today`} className="app-brand">
            <PixieMark size="small" mood="happy" />
            <span>SavePixie</span>
          </NavLink>
          <button
            className="profile-avatar"
            type="button"
            onClick={openSettings}
            aria-label="Open account and settings"
          >
            {displayName.slice(0, 1).toUpperCase()}
          </button>
        </header>

        {notice ? (
          <div className="save-notice" role="status">
            <span>✦</span>
            <p>{notice}</p>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message">
              ×
            </button>
          </div>
        ) : null}

        <main className="app-content">
          <div className="app-route" key={location.pathname}>
            <Outlet context={outletContext} />
          </div>
        </main>

        <button className="quick-save-fab" type="button" onClick={() => openQuickSave()}>
          <span aria-hidden="true">✦</span>
          <strong>Quick Save</strong>
        </button>

        <nav className="mobile-bottom-nav" aria-label="Main app navigation">
          {navItems.map(({ path, ...item }) => (
            <AppNavLink key={path} to={`${basePath}/${path}`} {...item} />
          ))}
        </nav>
      </section>

      {saveMoment ? (
        <div className="save-celebration" key={saveMoment} role="status" aria-live="polite">
          <div className="save-celebration__halo" />
          <div className="save-celebration__sparks" aria-hidden="true">
            {Array.from({ length: 10 }, (_, index) => (
              <span key={index}>✦</span>
            ))}
          </div>
          <PixieMark size="medium" mood="happy" />
          <strong>Goal glowing!</strong>
          <small>Your tiny save made real progress.</small>
        </div>
      ) : null}

      <QuickSaveDialog
        open={quickSaveOpen}
        initialGoalId={quickSaveGoalId}
        onClose={() => setQuickSaveOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}

function AppNavLink({
  to,
  label,
  icon,
}: {
  to: string;
  label: string;
  icon: (typeof navItems)[number]["icon"];
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => (isActive ? "app-nav-link active" : "app-nav-link")}
      onClick={() => gentleHaptic()}
    >
      <span className="app-nav-icon">
        <NavIcon name={icon} />
        <span className="app-nav-spark" aria-hidden="true">
          ✦
        </span>
      </span>
      <span>{label}</span>
    </NavLink>
  );
}

function NavIcon({ name }: { name: (typeof navItems)[number]["icon"] }) {
  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 10.8 12 3.7l8.5 7.1v8.6a1.6 1.6 0 0 1-1.6 1.6H5.1a1.6 1.6 0 0 1-1.6-1.6v-8.6Z" />
        <path d="M9 21v-6.5h6V21" />
      </svg>
    );
  }

  if (name === "goal") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="4.5" />
        <path d="m15.5 8.5 5-5m0 0v4m0-4h-4" />
      </svg>
    );
  }

  if (name === "plan") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5.5" width="16" height="15" rx="2.5" />
        <path d="M8 3v5M16 3v5M4 10h16M8 14h2M14 14h2M8 17h2" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2 1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2Z" />
      <path d="m19 14 .9 2.8L23 18l-3.1 1.2L19 22l-.9-2.8L15 18l3.1-1.2L19 14Z" />
      <path d="M4 14.5 4.8 17 7 18l-2.2 1L4 21.5 3.2 19 1 18l2.2-1L4 14.5Z" />
    </svg>
  );
}

export default AppShell;
