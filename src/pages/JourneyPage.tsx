import { useMemo } from "react";
import { useSavings } from "../app/SavingsProvider";
import PixieMark from "../components/PixieMark";
import { savingsMoves } from "../data/savingsMoves";
import { localDateKey } from "../features/daily-loop/api";
import {
  effectiveCurrentStreak,
  recentMoveDays,
  saverLevel,
} from "../features/daily-loop/progression";
import { formatMoney } from "../lib/format";

export function JourneyPage() {
  const { goals, dailyProgress, dailyCompletions } = useSavings();
  const totalSaved = useMemo(
    () => goals.reduce((total, goal) => total + goal.saved_cents, 0),
    [goals]
  );
  const level = saverLevel(dailyProgress?.stardust_total ?? 0);
  const currentStreak = effectiveCurrentStreak(dailyProgress);
  const recentDays = recentMoveDays(dailyCompletions);
  const todayComplete = dailyCompletions.some(
    (completion) => completion.local_date === localDateKey()
  );
  const moveCounts = useMemo(
    () =>
      dailyCompletions.reduce<Record<string, number>>((counts, completion) => {
        counts[completion.move_id] = (counts[completion.move_id] ?? 0) + 1;
        return counts;
      }, {}),
    [dailyCompletions]
  );

  const milestones = [
    { title: "Meet your Pixie", detail: "Your account is ready.", complete: true },
    {
      title: "Plant a goal seed",
      detail: "Create your first meaningful savings goal.",
      complete: goals.length > 0,
    },
    {
      title: "Make the first save",
      detail: "Move any amount toward a goal.",
      complete: totalSaved > 0,
    },
    {
      title: "Build a gentle week",
      detail: "Complete three useful Savings Moves.",
      complete: (dailyProgress?.completed_moves ?? 0) >= 3,
    },
  ];
  const completed = milestones.filter((item) => item.complete).length;

  return (
    <div className="app-page journey-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Proof that small actions add up</span>
          <h1>Your journey</h1>
          <p>Real progress first. Stardust and badges stay supporting characters.</p>
        </div>
      </header>

      <section className="journey-hero">
        <div className="journey-hero__pixie">
          <PixieMark size="large" mood={totalSaved > 0 ? "happy" : "calm"} />
        </div>
        <div className="journey-hero__copy">
          <span className="level-chip">
            LEVEL {level.level} · {level.name.toUpperCase()}
          </span>
          <h2>{totalSaved > 0 ? "Your goal seed is glowing" : "Every journey starts tiny"}</h2>
          <p>
            {totalSaved > 0
              ? `${formatMoney(totalSaved)} of real progress is already part of your story.`
              : "Create a goal and make one save to light the first step."}
          </p>
          <div className="stardust-progress">
            <span style={{ width: `${level.progressPercent}%` }} />
          </div>
          <small>
            {level.currentStardust} of {level.nextLevelStardust} Stardust to the next level
          </small>
        </div>
      </section>

      <section className="journey-rhythm surface-card">
        <header className="section-heading">
          <div>
            <span className="eyebrow">Your gentle rhythm</span>
            <h2>
              {currentStreak
                ? `${currentStreak} useful days in a row`
                : "Your first streak starts with one Move"}
            </h2>
          </div>
          <span className={todayComplete ? "rhythm-today complete" : "rhythm-today"}>
            {todayComplete ? "Today complete ✓" : "Today is still open"}
          </span>
        </header>
        <div className="rhythm-week" aria-label="Seven day Savings Move history">
          {recentDays.map((day) => (
            <div className={day.complete ? "rhythm-day complete" : "rhythm-day"} key={day.key}>
              <span>{day.complete ? "✦" : "·"}</span>
              <small>{day.label}</small>
            </div>
          ))}
        </div>
        <div className="journey-stat-grid">
          <div>
            <strong>{dailyProgress?.stardust_total ?? 0}</strong>
            <span>Stardust earned</span>
          </div>
          <div>
            <strong>{dailyProgress?.completed_moves ?? 0}</strong>
            <span>Useful Moves</span>
          </div>
          <div>
            <strong>{dailyProgress?.best_streak ?? 0}</strong>
            <span>Best gentle streak</span>
          </div>
          <div>
            <strong>
              {completed}/{milestones.length}
            </strong>
            <span>Chapter milestones</span>
          </div>
        </div>
      </section>

      <section className="journey-path surface-card">
        <header className="section-heading">
          <div>
            <span className="eyebrow">Your first chapter</span>
            <h2>The path ahead</h2>
          </div>
        </header>
        <ol>
          {milestones.map((milestone, index) => (
            <li className={milestone.complete ? "complete" : ""} key={milestone.title}>
              <span className="journey-step">{milestone.complete ? "✓" : index + 1}</span>
              <span>
                <strong>{milestone.title}</strong>
                <small>{milestone.detail}</small>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="technique-library surface-card">
        <header className="section-heading">
          <div>
            <span className="eyebrow">Savings toolkit</span>
            <h2>Small techniques, ready when you need them</h2>
          </div>
          <span className="library-count">{savingsMoves.length} moves</span>
        </header>
        <div className="technique-grid">
          {savingsMoves.map((move, index) => {
            const timesUsed = moveCounts[move.id] ?? 0;
            return (
              <article
                className={
                  timesUsed
                    ? "technique-card mastered"
                    : index === 0
                      ? "technique-card featured"
                      : "technique-card"
                }
                key={move.id}
              >
                <span className="technique-card__emoji" aria-hidden="true">
                  {move.emoji}
                </span>
                <div>
                  <span>
                    {timesUsed
                      ? `Used ${timesUsed} ${timesUsed === 1 ? "time" : "times"}`
                      : index === 0
                        ? "Try today"
                        : "Ready in your toolkit"}
                  </span>
                  <h3>{move.name}</h3>
                  <p>{move.principle}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {dailyCompletions.length ? (
        <section className="move-history surface-card">
          <header className="section-heading">
            <div>
              <span className="eyebrow">Proof you showed up</span>
              <h2>Your latest Savings Moves</h2>
            </div>
          </header>
          <ol>
            {dailyCompletions.slice(0, 8).map((completion) => {
              const move = savingsMoves.find((item) => item.id === completion.move_id);
              return (
                <li key={completion.id}>
                  <span className="move-history__icon" aria-hidden="true">
                    {move?.emoji || "✦"}
                  </span>
                  <div>
                    <strong>{move?.name || "Savings Move"}</strong>
                    <small>
                      {new Intl.DateTimeFormat(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      }).format(new Date(`${completion.local_date}T12:00:00`))}
                      {completion.saved_cents > 0
                        ? ` · ${formatMoney(completion.saved_cents)} saved`
                        : " · useful action"}
                    </small>
                    {completion.reflection ? <p>{completion.reflection}</p> : null}
                  </div>
                  <span className="move-history__reward">+{completion.stardust_awarded} ✦</span>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

export default JourneyPage;
