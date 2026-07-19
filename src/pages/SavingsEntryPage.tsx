import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useSavings } from "../app/SavingsProvider";
import PixieMark from "../components/PixieMark";

export function SavingsEntryPage() {
  const { goals, loading, error, refresh, joinSharedPact } = useSavings();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const attemptedInvite = useRef(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinAttempt, setJoinAttempt] = useState(0);
  const inviteToken = searchParams.get("join");

  useEffect(() => {
    if (loading || error || !inviteToken || attemptedInvite.current) return;
    attemptedInvite.current = true;
    void joinSharedPact(inviteToken)
      .then(() => navigate("/app/goals", { replace: true }))
      .catch((cause) => {
        setJoinError(
          cause instanceof Error ? cause.message : "This Pact invitation could not be joined."
        );
      });
  }, [error, inviteToken, joinAttempt, joinSharedPact, loading, navigate]);

  const retryInvite = () => {
    attemptedInvite.current = false;
    setJoinError(null);
    setJoinAttempt((attempt) => attempt + 1);
  };

  if (loading) {
    return (
      <main className="entry-loader" aria-live="polite">
        <PixieMark size="large" mood="curious" />
        <span className="eyebrow">Gathering your sparkles</span>
        <h1>Opening your SavePixie space…</h1>
      </main>
    );
  }

  if (error || joinError) {
    return (
      <main className="entry-loader">
        <PixieMark size="large" mood="calm" />
        <span className="eyebrow">A tiny wobble</span>
        <h1>We couldn&apos;t open your savings space.</h1>
        <p>{joinError || error}</p>
        <button
          className="button primary"
          type="button"
          onClick={joinError ? retryInvite : () => void refresh()}
        >
          {joinError ? "Try invitation again" : "Try again"}
        </button>
      </main>
    );
  }

  if (inviteToken) {
    return (
      <main className="entry-loader" aria-live="polite">
        <PixieMark size="large" mood="curious" />
        <span className="eyebrow">Joining your Circle</span>
        <h1>Opening this shared Savings Pact…</h1>
      </main>
    );
  }

  return <Navigate to={goals.length > 0 ? "/app/today" : "/app/onboarding"} replace />;
}

export default SavingsEntryPage;
