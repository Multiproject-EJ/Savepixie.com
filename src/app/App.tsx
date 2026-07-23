import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import PixieMark from "../components/PixieMark";
import { useAuth } from "./AuthProvider";

export function App() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutMessage, setSignOutMessage] = useState<string | null>(null);

  const handleSignOut = async () => {
    setSigningOut(true);
    setSignOutMessage(null);
    try {
      await signOut();
      navigate("/");
    } catch {
      setSignOutMessage("We couldn’t sign you out. Check your connection and try again.");
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="marketing-shell">
      <header className="site-header">
        <Link to="/" className="app-brand">
          <PixieMark size="small" mood="happy" />
          <span>SavePixie</span>
        </Link>
        <nav className="nav-links" aria-label="Website navigation">
          <a href="/#how-it-works">How it works</a>
          <a href="/#your-dream">Your dream</a>
          <a href="/#early-access">Early access</a>
        </nav>
        <div className="auth-summary">
          {loading ? (
            <span className="badge">One moment…</span>
          ) : user ? (
            <>
              <Link className="button secondary compact-button" to="/app">
                Open app
              </Link>
              <button className="link-button" onClick={handleSignOut} disabled={signingOut}>
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </>
          ) : (
            <>
              <Link className="link-button" to="/auth">
                Sign in
              </Link>
              <a className="button compact-button" href="/#join-waitlist">
                Join waitlist
              </a>
            </>
          )}
          {signOutMessage ? (
            <span className="auth-summary__error" role="alert">
              {signOutMessage}
            </span>
          ) : null}
        </div>
      </header>
      <main className="marketing-content">
        <Outlet />
      </main>
      <footer className="site-footer">
        <Link to="/" className="app-brand">
          <PixieMark size="small" />
          <span>SavePixie</span>
        </Link>
        <p>Small choices today. Brighter tomorrows.</p>
        <nav className="footer-legal-links" aria-label="Legal and support">
          <Link to="/legal/terms">Terms</Link>
          <Link to="/legal/privacy">Privacy</Link>
          <a href="mailto:support@savepixie.com">Support</a>
        </nav>
      </footer>
    </div>
  );
}

export default App;
