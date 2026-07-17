import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";
import PixieMark from "../components/PixieMark";
import { useAuth } from "./AuthProvider";

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { user, loading, sessionError, retrySession } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <main className="entry-loader" aria-live="polite">
        <PixieMark size="large" mood="curious" />
        <span className="eyebrow">Checking your key</span>
        <h1>Opening your private savings space…</h1>
      </main>
    );
  }

  if (sessionError) {
    return (
      <main className="entry-loader" role="alert">
        <PixieMark size="large" mood="calm" />
        <span className="eyebrow">A connection wobble</span>
        <h1>We couldn’t check your session.</h1>
        <p>{sessionError}</p>
        <button className="button primary" type="button" onClick={() => void retrySession()}>
          Try again
        </button>
      </main>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{ from: `${location.pathname}${location.search}${location.hash}` }}
      />
    );
  }

  return <>{children}</>;
}

export default ProtectedRoute;
