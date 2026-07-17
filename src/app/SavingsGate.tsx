import type { PropsWithChildren } from "react";
import PixieMark from "../components/PixieMark";
import { useSavings } from "./SavingsProvider";

export function SavingsGate({ children }: PropsWithChildren) {
  const { ready, loading, error, refresh } = useSavings();

  if (!ready && loading) {
    return (
      <main className="entry-loader" aria-live="polite">
        <PixieMark size="large" mood="curious" />
        <span className="eyebrow">Gathering your sparkles</span>
        <h1>Opening your SavePixie space…</h1>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="entry-loader" role="alert">
        <PixieMark size="large" mood="calm" />
        <span className="eyebrow">A tiny wobble</span>
        <h1>We couldn’t open your savings space.</h1>
        <p>{error || "Check your connection and try once more."}</p>
        <button className="button primary" type="button" onClick={() => void refresh()}>
          Try again
        </button>
      </main>
    );
  }

  return children;
}

export default SavingsGate;
