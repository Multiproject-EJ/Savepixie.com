import { Link, Outlet, useNavigate } from "react-router-dom";
import PixieMark from "../components/PixieMark";
import { useAuth } from "./AuthProvider";

export function App() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Failed to sign out", error);
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
          <a href="#how-it-works">How it works</a>
          <a href="#why-savepixie">Why SavePixie</a>
        </nav>
        <div className="auth-summary">
          {loading ? (
            <span className="badge">One moment…</span>
          ) : user ? (
            <>
              <Link className="button secondary compact-button" to="/app">
                Open app
              </Link>
              <button className="link-button" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link className="link-button" to="/auth">
                Sign in
              </Link>
              <Link className="button compact-button" to="/auth#sign-up">
                Start saving
              </Link>
            </>
          )}
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
