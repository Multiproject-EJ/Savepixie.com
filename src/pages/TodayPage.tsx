import { useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { useSavings } from "../app/SavingsProvider";
import type { AppShellOutletContext } from "../components/AppShell";
import DailyMoveDialog from "../components/DailyMoveDialog";
import PixieMark from "../components/PixieMark";
import { getDailySavingsMove } from "../data/savingsMoves";
import { localDateKey, type DailyMoveResult } from "../features/daily-loop/api";
import { completedToday, effectiveCurrentStreak } from "../features/daily-loop/progression";
import { starterCentsFromNok } from "../lib/currency";
import { formatMoney, goalProgress } from "../lib/format";

export function TodayPage() {
  const { goals, savingsHomes, dailyProgress, dailyCompletions, loading, error, displayName } =
    useSavings();
  const { basePath } = useOutletContext<AppShellOutletContext>();
  const [moveOpen, setMoveOpen] = useState(false);
  const [celebration, setCelebration] = useState<DailyMoveResult | null>(null);
  const featuredGoal = goals[0] ?? null;
  const savingMove = getDailySavingsMove();
  const todayCompletion = completedToday(dailyCompletions, localDateKey());
  const currentStreak = effectiveCurrentStreak(dailyProgress);
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
        <div
          className={currentStreak ? "streak-pill active" : "streak-pill"}
          aria-label={currentStreak + " day streak"}
        >
          <span>✦</span>
          <strong>{currentStreak ? currentStreak + " day streak" : "Start today"}</strong>
        </div>
      </header>

      {error ? <p className="alert error">{error}</p> : null}

      <section className="daily-quest-card">
        <div className="quest-copy">
          <span className="quest-kicker">
            {todayCompletion ? "Completed today" : "Today's Savings Move"} · {savingMove.name}
          </span>
          <h2>
            {todayCompletion
              ? "Your useful choice is glowing"
              : featuredGoal
                ? savingMove.headline
                : "Choose something worth saving for"}
          </h2>
          <p>
            {todayCompletion
              ? "You earned " +
                todayCompletion.stardust_awarded +
                " Stardust. Come back tomorrow for another tiny Move."
              : featuredGoal
                ? savingMove.description
                : "Your Pixie works best when every small action points toward something meaningful."}
          </p>
          {todayCompletion ? (
            <Link className="button secondary quest-action" to={basePath + "/journey"}>
              See my growing Journey <span aria-hidden="true">✦</span>
            </Link>
          ) : featuredGoal ? (
            <button
              className="button primary quest-action"
              type="button"
              onClick={() => setMoveOpen(true)}
            >
              {savingMove.actionLabel}
              {savingMove.completionKind === "save"
                ? " · " +
                  formatMoney(
                    starterCentsFromNok(savingMove.suggestedCents, featuredGoal.currency_code),
                    featuredGoal.currency_code
                  )
                : ""}{" "}
              <span aria-hidden="true">✦</span>
            </button>
          ) : (
            <Link className="button primary quest-action" to={`${basePath}/goals`}>
              Create my first goal
            </Link>
          )}
        </div>
        <div className="quest-pixie-wrap">
          <span className="pixie-glow" />
          <PixieMark
            size="large"
            mood={todayCompletion ? "happy" : featuredGoal ? "curious" : "calm"}
          />
          <span className="pixie-message">
            {todayCompletion
              ? "That counted. Tiny always counts."
              : featuredGoal
                ? savingMove.principle
                : "What are we growing?"}
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
                <strong>{formatMoney(featuredGoal.saved_cents, featuredGoal.currency_code)}</strong>
                <span>of {formatMoney(featuredGoal.target_cents, featuredGoal.currency_code)}</span>
                <em>{progress}%</em>
              </div>
              <div className="progress-track" aria-label={`${progress}% saved`}>
                <span style={{ width: `${progress}%` }} />
              </div>
              <p className="support-copy">
                {featuredGoal.emoji || "✨"}{" "}
                {formatMoney(
                  Math.max(0, featuredGoal.target_cents - featuredGoal.saved_cents),
                  featuredGoal.currency_code
                )}{" "}
                left to grow ·{" "}
                {formatMoney(featuredGoal.verified_cents, featuredGoal.currency_code)}{" "}
                bank-verified.
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

      <DailyMoveDialog
        open={moveOpen}
        move={savingMove}
        onClose={() => setMoveOpen(false)}
        onCompleted={(result) => {
          setCelebration(result);
          window.setTimeout(() => setCelebration(null), 2600);
        }}
      />

      {celebration ? (
        <div className="daily-move-celebration" role="status" aria-live="polite">
          <div className="daily-move-celebration__sparkles" aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => (
              <span key={index}>✦</span>
            ))}
          </div>
          <PixieMark size="large" mood="happy" />
          <span className="eyebrow">Move complete</span>
          <strong>+{celebration.stardustAwarded} Stardust</strong>
          <small>
            {celebration.currentStreak} day streak · {celebration.completedMoves} useful Moves
          </small>
        </div>
      ) : null}
    </div>
  );
}

export default TodayPage;
