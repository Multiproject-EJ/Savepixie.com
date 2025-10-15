import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";

type AuthView = "sign-in" | "sign-up" | "reset";

type LocationState = {
  from?: string;
};

function AuthPage() {
  const { user, signInWithPassword, signUpWithPassword, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const initialView: AuthView = (location.hash.replace("#", "") as AuthView) || "sign-in";
  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = useMemo(() => {
    const state = location.state as LocationState | null;
    return state?.from || "/dashboard";
  }, [location.state]);

  useEffect(() => {
    if (user) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, user]);

  useEffect(() => {
    setError(null);
    setMessage(null);
    setPassword("");
  }, [view]);

  const handleViewChange = (next: AuthView) => {
    setView(next);
    if (next === "sign-in") {
      window.history.replaceState(null, "", "#sign-in");
    } else if (next === "sign-up") {
      window.history.replaceState(null, "", "#sign-up");
    } else {
      window.history.replaceState(null, "", "#reset");
    }
  };

  const handleSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await signInWithPassword(email, password);
      navigate(redirectTo, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await signUpWithPassword(email, password, {
        displayName: displayName || null,
        username: username || null,
      });
      setMessage("Almost there! Check your inbox for a confirmation email.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign up. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await resetPassword(email);
      setMessage("Password reset email sent. Check your inbox.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send reset email.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card auth-card">
      <header>
        <h1>{view === "sign-up" ? "Create your SavePixie account" : "Welcome back"}</h1>
        <p>
          SavePixie uses password-based authentication with Supabase. {" "}
          {view === "sign-in" && "Sign in to reach your savings goals."}
          {view === "sign-up" && "Sign up to start tracking your savings journey."}
          {view === "reset" && "Request a password reset link."}
        </p>
      </header>

      <div className="tab-group">
        <button
          className={view === "sign-in" ? "tab active" : "tab"}
          onClick={() => handleViewChange("sign-in")}
          type="button"
        >
          Sign in
        </button>
        <button
          className={view === "sign-up" ? "tab active" : "tab"}
          onClick={() => handleViewChange("sign-up")}
          type="button"
        >
          Sign up
        </button>
        <button
          className={view === "reset" ? "tab active" : "tab"}
          onClick={() => handleViewChange("reset")}
          type="button"
        >
          Reset password
        </button>
      </div>

      {error && <p className="alert error">{error}</p>}
      {message && <p className="alert success">{message}</p>}

      {view === "sign-in" && (
        <form className="form" onSubmit={handleSignIn}>
          <label className="form-control">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          <label className="form-control">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <button className="button primary" type="submit" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
          <p className="form-footnote">
            <button className="link-button" type="button" onClick={() => handleViewChange("reset")}>
              Forgot your password?
            </button>
          </p>
        </form>
      )}

      {view === "sign-up" && (
        <form className="form" onSubmit={handleSignUp}>
          <label className="form-control">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          <label className="form-control">
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </label>
          <label className="form-control">
            <span>Display name</span>
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Pixie Pal"
            />
          </label>
          <label className="form-control">
            <span>Username</span>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="pixiepal"
            />
          </label>
          <button className="button primary" type="submit" disabled={submitting}>
            {submitting ? "Creating account…" : "Create account"}
          </button>
          <p className="form-footnote">
            Already have an account?{" "}
            <button className="link-button" type="button" onClick={() => handleViewChange("sign-in")}>
              Sign in
            </button>
          </p>
        </form>
      )}

      {view === "reset" && (
        <form className="form" onSubmit={handleReset}>
          <label className="form-control">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          <button className="button primary" type="submit" disabled={submitting}>
            {submitting ? "Sending reset link…" : "Send reset link"}
          </button>
          <p className="form-footnote">
            Remembered your password?{" "}
            <button className="link-button" type="button" onClick={() => handleViewChange("sign-in")}>
              Return to sign in
            </button>
          </p>
        </form>
      )}

      <p className="fine-print">
        By continuing you agree to the SavePixie {" "}
        <Link to="/legal/terms">Terms</Link> and <Link to="/legal/privacy">Privacy Policy</Link>.
      </p>
    </section>
  );
}

export default AuthPage;
