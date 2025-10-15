import { Link, Outlet, useNavigate } from "react-router-dom";
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
    <div className="layout">
      <header className="site-header">
        <Link to="/" className="brand">
          SavePixie
        </Link>
        <nav className="nav-links">
          <Link to="/">Home</Link>
          {user ? <Link to="/dashboard">Dashboard</Link> : <Link to="/auth">Auth</Link>}
        </nav>
        <div className="auth-summary">
          {loading ? (
            <span className="badge">Checking session…</span>
          ) : user ? (
            <>
              <span className="badge">{user.email}</span>
              <button className="link-button" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <Link className="button" to="/auth">
              Sign in
            </Link>
          )}
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
      <footer className="site-footer">
        SavePixie is your friendly savings companion powered by Supabase.
      </footer>
    </div>
  );
}

export default App;
