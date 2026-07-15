import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";
import { useSavings } from "../app/SavingsProvider";
import PixieMark from "./PixieMark";
import QuickSaveDialog from "./QuickSaveDialog";

export type AppShellOutletContext = {
  openQuickSave: (goalId?: string) => void;
};

const navItems = [
  { to: "/app/today", label: "Today", icon: "home" },
  { to: "/app/goals", label: "Goals", icon: "goal" },
  { to: "/app/plan", label: "Plan", icon: "plan" },
  { to: "/app/journey", label: "Journey", icon: "journey" },
] as const;

export function AppShell() {
  const { signOut } = useAuth();
  const { displayName } = useSavings();
  const navigate = useNavigate();
  const [quickSaveOpen, setQuickSaveOpen] = useState(false);
  const [quickSaveGoalId, setQuickSaveGoalId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const openQuickSave = (goalId?: string) => {
    setQuickSaveGoalId(goalId || null);
    setQuickSaveOpen(true);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const outletContext: AppShellOutletContext = { openQuickSave };

  return (
    <div className="app-shell">
      <aside className="desktop-rail">
        <NavLink to="/app/today" className="app-brand" aria-label="SavePixie Today">
          <PixieMark size="small" mood="happy" />
          <span>SavePixie</span>
        </NavLink>

        <nav className="desktop-nav" aria-label="Main app navigation">
          {navItems.map((item) => (
            <AppNavLink key={item.to} {...item} />
          ))}
        </nav>

        <div className="desktop-rail__footer">
          <button className="profile-chip" type="button" onClick={handleSignOut}>
            <span className="profile-avatar">{displayName.slice(0, 1).toUpperCase()}</span>
            <span>
              <strong>{displayName}</strong>
              <small>Sign out</small>
            </span>
          </button>
        </div>
      </aside>

      <section className="app-stage">
        <header className="mobile-app-header">
          <NavLink to="/app/today" className="app-brand">
            <PixieMark size="small" mood="happy" />
            <span>SavePixie</span>
          </NavLink>
          <button
            className="profile-avatar"
            type="button"
            onClick={handleSignOut}
            aria-label="Sign out"
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
          <Outlet context={outletContext} />
        </main>

        <button className="quick-save-fab" type="button" onClick={() => openQuickSave()}>
          <span aria-hidden="true">✦</span>
          <strong>Quick Save</strong>
        </button>

        <nav className="mobile-bottom-nav" aria-label="Main app navigation">
          {navItems.map((item) => (
            <AppNavLink key={item.to} {...item} />
          ))}
        </nav>
      </section>

      <QuickSaveDialog
        open={quickSaveOpen}
        initialGoalId={quickSaveGoalId}
        onClose={() => setQuickSaveOpen(false)}
        onSaved={(message) => setNotice(message)}
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
    >
      <NavIcon name={icon} />
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
