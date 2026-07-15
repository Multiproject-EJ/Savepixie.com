import { useMemo } from "react";
import { useSavings } from "../app/SavingsProvider";
import PixieMark from "../components/PixieMark";
import { formatMoney } from "../lib/format";

export function JourneyPage() {
  const { goals } = useSavings();
  const totalSaved = useMemo(
    () => goals.reduce((total, goal) => total + goal.saved_cents, 0),
    [goals]
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
      detail: "Return to your plan and protect a saving amount.",
      complete: false,
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
          <span className="level-chip">LEVEL 1 · SEEDLING</span>
          <h2>{totalSaved > 0 ? "Your goal seed is glowing" : "Every journey starts tiny"}</h2>
          <p>
            {totalSaved > 0
              ? `${formatMoney(totalSaved)} of real progress is already part of your story.`
              : "Create a goal and make one save to light the first step."}
          </p>
          <div className="stardust-progress">
            <span style={{ width: `${(completed / milestones.length) * 100}%` }} />
          </div>
          <small>
            {completed} of {milestones.length} first steps complete
          </small>
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
    </div>
  );
}

export default JourneyPage;
