import { Link, useOutletContext } from "react-router-dom";
import { useSavings } from "../app/SavingsProvider";
import type { AppShellOutletContext } from "../components/AppShell";
import PixieMark from "../components/PixieMark";
import { getDailySavingsMove } from "../data/savingsMoves";
import { formatMoney, goalProgress } from "../lib/format";

export function TodayPage() {
  const { goals, savingsHomes, loading, error, displayName } = useSavings();
  const { openQuickSave, basePath } = useOutletContext<AppShellOutletContext>();
  const featuredGoal = goals[0] ?? null;
  const savingMove = getDailySavingsMove();
  const progress = featuredGoal
    ? goalProgress(featuredGoal.saved_cents, featuredGoal.target_cents)
    : 0;

  return (
    <div className="app-page today-page">
      <header className="page-heading page-heading--today">
        <div>
          <span className="eyebrow">Your calm money moment</span>
          <h1>Hi {displayName},</h1>
          <p>One tiny choice is enough for today.</p>
        </div>
        <div className="streak-pill" aria-label="New streak">
          <span>✦</span>
          <strong>Start today</strong>
        </div>
      </header>

      {error ? <p className="alert error">{error}</p> : null}

      <section className="daily-quest-card">
        <div className="quest-copy">
          <span className="quest-kicker">Today&apos;s Savings Move · {savingMove.name}</span>
          <h2>{featuredGoal ? savingMove.headline : "Choose something worth saving for"}</h2>
          <p>
            {featuredGoal
              ? savingMove.description
              : "Your Pixie works best when every small action points toward something meaningful."}
          </p>
          {featuredGoal ? (
            <button
              className="button primary quest-action"
              type="button"
              onClick={() => openQuickSave(featuredGoal.id)}
            >
              Try it with {formatMoney(savingMove.suggestedCents)} <span aria-hidden="true">✦</span>
            </button>
          ) : (
            <Link className="button primary quest-action" to={`${basePath}/goals`}>
              Create my first goal
            </Link>
          )}
        </div>
        <div className="quest-pixie-wrap">
          <span className="pixie-glow" />
          <PixieMark size="large" mood={featuredGoal ? "curious" : "calm"} />
          <span className="pixie-message">
            {featuredGoal ? savingMove.principle : "What are we growing?"}
          </span>
        </div>
      </section>

      <div className="today-grid">
        <section className="surface-card goal-spotlight">
          <header className="section-heading">
            <div>
              <span className="eyebrow">Your featured Pact</span>
              <h2>{featuredGoal?.name || "Your first adventure"}</h2>
            </div>
            <Link to={`${basePath}/goals`}>View goals</Link>
          </header>

          {loading ? (
            <div className="skeleton-block" />
          ) : featuredGoal ? (
            <>
              <div className="goal-spotlight__numbers">
                <strong>{formatMoney(featuredGoal.saved_cents)}</strong>
                <span>of {formatMoney(featuredGoal.target_cents)}</span>
                <em>{progress}%</em>
              </div>
              <div className="progress-track" aria-label={`${progress}% saved`}>
                <span style={{ width: `${progress}%` }} />
              </div>
              <p className="support-copy">
                {featuredGoal.emoji || "✨"}{" "}
                {formatMoney(Math.max(0, featuredGoal.target_cents - featuredGoal.saved_cents))}{" "}
                left to grow · {formatMoney(featuredGoal.verified_cents)} bank-verified.
              </p>
            </>
          ) : (
            <p className="support-copy">Create a goal and your progress will live here.</p>
          )}
        </section>

        <section className="surface-card weekly-signal">
          <header className="section-heading">
            <div>
              <span className="eyebrow">This week</span>
              <h2>{savingsHomes[0]?.label || "Choose a Savings Home"}</h2>
            </div>
            <Link to={`${basePath}/plan`}>Open plan</Link>
          </header>
          <div className="weekly-signal__value">
            <span aria-hidden="true">◎</span>
            <div>
              <strong>
                {savingsHomes[0]?.connection_status === "connected"
                  ? "Connected and verified"
                  : "Manual Savings Home"}
              </strong>
              <p>
                {savingsHomes[0]
                  ? "Your bank holds the money. SavePixie keeps reported and verified progress visibly separate."
                  : "Set up the real account where every Pact contribution will live."}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default TodayPage;
