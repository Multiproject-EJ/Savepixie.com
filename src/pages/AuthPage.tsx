import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../app/AuthProvider";
import { friendlyAuthError } from "../lib/authErrors";

type AuthView = "sign-in" | "sign-up" | "reset" | "update-password";

type LocationState = {
  from?: string;
};

function AuthPage() {
  const {
    user,
    recoveryMode,
    signInWithPassword,
    signUpWithPassword,
    resetPassword,
    updatePassword,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hashView = location.hash.replace("#", "");
  const initialView: AuthView =
    hashView === "sign-up" || hashView === "reset" ? hashView : "sign-in";
  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const heading =
    view === "update-password"
      ? "Choose a new password"
      : view === "sign-up"
        ? "Create your SavePixie account"
        : view === "reset"
          ? "Reset your password"
          : "Welcome back";

  const introduction =
    view === "update-password"
      ? "Make it memorable, private, and at least eight characters long."
      : view === "sign-up"
        ? "Start with one meaningful goal and one tiny saving action."
        : view === "reset"
          ? "Enter your email and we’ll send you a secure reset link."
          : "Your goals and your Pixie are right where you left them.";

  const redirectTo = useMemo(() => {
    const state = location.state as LocationState | null;
    return state?.from || "/app";
  }, [location.state]);

  useEffect(() => {
    if (user && !recoveryMode) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, recoveryMode, redirectTo, user]);

  useEffect(() => {
    if (recoveryMode) {
      setView("update-password");
    }
  }, [recoveryMode]);

  useEffect(() => {
    setError(null);
    setMessage(null);
    setPassword("");
    setPasswordConfirmation("");
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
      setError(friendlyAuthError(cause, "We couldn’t sign you in. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignUp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError("Use at least eight characters for your password.");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("The two passwords do not match yet.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signUpWithPassword(email, password, {
        displayName: displayName || null,
        username: username || null,
      });
      setMessage(
        result.requiresEmailConfirmation
          ? "Almost there! Check your inbox, confirm your email, then come back to meet your Pixie."
          : "Your account is ready. Opening your SavePixie space…"
      );
    } catch (cause) {
      setError(friendlyAuthError(cause, "We couldn’t create your account. Please try again."));
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
      setError(friendlyAuthError(cause, "We couldn’t send the reset email. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (password.length < 8) {
      setError("Use at least eight characters for your new password.");
      return;
    }

    if (password !== passwordConfirmation) {
      setError("The two passwords do not match yet.");
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(password);
    } catch (cause) {
      setError(friendlyAuthError(cause, "We couldn’t update your password. Please try again."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="card auth-card">
      <header>
        <h1>{heading}</h1>
        <p>{introduction}</p>
      </header>

      {view !== "update-password" ? (
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
      ) : null}

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
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <label className="form-control">
            <span>Confirm password</span>
            <input
              type="password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              required
              minLength={8}
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
            <button
              className="link-button"
              type="button"
              onClick={() => handleViewChange("sign-in")}
            >
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
            <button
              className="link-button"
              type="button"
              onClick={() => handleViewChange("sign-in")}
            >
              Return to sign in
            </button>
          </p>
        </form>
      )}

      {view === "update-password" && (
        <form className="form" onSubmit={handlePasswordUpdate}>
          <label className="form-control">
            <span>New password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <label className="form-control">
            <span>Confirm new password</span>
            <input
              type="password"
              value={passwordConfirmation}
              onChange={(event) => setPasswordConfirmation(event.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <button className="button primary" type="submit" disabled={submitting}>
            {submitting ? "Updating password…" : "Save new password"}
          </button>
        </form>
      )}

      <p className="fine-print">
        By continuing you agree to the SavePixie <Link to="/legal/terms">Terms</Link> and{" "}
        <Link to="/legal/privacy">Privacy Policy</Link>.
      </p>
    </section>
  );
}

export default AuthPage;
