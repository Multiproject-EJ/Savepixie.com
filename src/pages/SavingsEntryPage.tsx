import { Navigate } from "react-router-dom";
import { useSavings } from "../app/SavingsProvider";
import PixieMark from "../components/PixieMark";

export function SavingsEntryPage() {
  const { goals, loading, error, refresh } = useSavings();

  if (loading) {
    return (
      <main className="entry-loader" aria-live="polite">
        <PixieMark size="large" mood="curious" />
        <span className="eyebrow">Gathering your sparkles</span>
        <h1>Opening your SavePixie space…</h1>
      </main>
    );
  }

  if (error) {
    return (
      <main className="entry-loader">
        <PixieMark size="large" mood="calm" />
        <span className="eyebrow">A tiny wobble</span>
        <h1>We couldn&apos;t open your savings space.</h1>
        <p>{error}</p>
        <button className="button primary" type="button" onClick={() => void refresh()}>
          Try again
        </button>
      </main>
    );
  }

  return <Navigate to={goals.length > 0 ? "/app/today" : "/app/onboarding"} replace />;
}

export default SavingsEntryPage;
