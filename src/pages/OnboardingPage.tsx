import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSavings } from "../app/SavingsProvider";
import PixieMark from "../components/PixieMark";
import { formatMoney } from "../lib/format";

type GoalIdea = {
  id: string;
  label: string;
  detail: string;
  name: string;
  emoji: string;
  color: string;
  target: number;
};

const goalIdeas: GoalIdea[] = [
  {
    id: "cushion",
    label: "Breathing room",
    detail: "A calm little safety cushion",
    name: "My safety cushion",
    emoji: "🛟",
    color: "#38dfc6",
    target: 500,
  },
  {
    id: "trip",
    label: "An adventure",
    detail: "A trip worth looking forward to",
    name: "My next adventure",
    emoji: "✈️",
    color: "#7b3fff",
    target: 1200,
  },
  {
    id: "treat",
    label: "Something brilliant",
    detail: "A laptop, bike or joyful upgrade",
    name: "Something brilliant",
    emoji: "✨",
    color: "#ffc857",
    target: 800,
  },
  {
    id: "future",
    label: "Future me",
    detail: "A flexible pot with no pressure",
    name: "Future me fund",
    emoji: "🌱",
    color: "#8aa4ff",
    target: 1000,
  },
];

const targetSuggestions = [250, 500, 1000, 2000];
const firstSaveOptions = [0, 100, 300, 500, 1000];

export function OnboardingPage() {
  const { goals, loading, displayName, startFirstGoal } = useSavings();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [ideaId, setIdeaId] = useState(goalIdeas[0].id);
  const [goalName, setGoalName] = useState(goalIdeas[0].name);
  const [target, setTarget] = useState(String(goalIdeas[0].target));
  const [firstSave, setFirstSave] = useState(300);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdGoalName, setCreatedGoalName] = useState<string | null>(null);
  const [initialSaveRecorded, setInitialSaveRecorded] = useState(true);

  const selectedIdea = useMemo(
    () => goalIdeas.find((idea) => idea.id === ideaId) ?? goalIdeas[0],
    [ideaId]
  );

  useEffect(() => {
    if (!loading && goals.length > 0 && !createdGoalName) {
      navigate("/app/today", { replace: true });
    }
  }, [createdGoalName, goals.length, loading, navigate]);

  const chooseIdea = (idea: GoalIdea) => {
    setIdeaId(idea.id);
    setGoalName(idea.name);
    setTarget(String(idea.target));
  };

  const moveToGoalDetails = () => {
    setError(null);
    setStep(2);
  };

  const handleGoalDetails = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const targetValue = Number.parseFloat(target);

    if (!goalName.trim()) {
      setError("Give your goal a name that makes you smile.");
      return;
    }

    if (!Number.isFinite(targetValue) || targetValue <= 0) {
      setError("Choose a target greater than zero.");
      return;
    }

    setError(null);
    setStep(3);
  };

  const finishOnboarding = async () => {
    const targetValue = Number.parseFloat(target);
    if (!Number.isFinite(targetValue) || targetValue <= 0 || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const result = await startFirstGoal({
        name: goalName.trim(),
        targetCents: Math.round(targetValue * 100),
        emoji: selectedIdea.emoji,
        color: selectedIdea.color,
        deadlineDate: null,
        initialDepositCents: firstSave,
      });
      setCreatedGoalName(result.goal.name);
      setInitialSaveRecorded(result.initialSaveRecorded);
      setStep(4);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't plant that goal just yet.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="entry-loader">
        <PixieMark size="large" mood="curious" />
        <h1>Making a little room for your Pixie…</h1>
      </main>
    );
  }

  return (
    <main className="onboarding-shell">
      <header className="onboarding-topbar">
        <div className="onboarding-brand">
          <PixieMark size="small" mood="happy" />
          <strong>SavePixie</strong>
        </div>
        {step > 0 && step < 4 ? (
          <div className="onboarding-progress" aria-label={`Step ${step} of 3`}>
            {[1, 2, 3].map((progressStep) => (
              <span className={progressStep <= step ? "active" : ""} key={progressStep} />
            ))}
          </div>
        ) : (
          <span className="onboarding-topbar__aside">A tiny start is enough</span>
        )}
      </header>

      <section className={`onboarding-card onboarding-card--step-${step}`}>
        {step > 0 && step < 4 ? (
          <button
            className="onboarding-back"
            type="button"
            onClick={() => {
              setError(null);
              setStep((current) => Math.max(0, current - 1));
            }}
            aria-label="Go back"
          >
            ←
          </button>
        ) : null}

        {step === 0 ? (
          <WelcomeStep displayName={displayName} onContinue={() => setStep(1)} />
        ) : null}

        {step === 1 ? (
          <section className="onboarding-step">
            <StepIntro
              kicker="First, choose a spark"
              title="What should your tiny saves grow into?"
              body="Pick the feeling that fits. You can change every detail next."
            />
            <div className="idea-grid">
              {goalIdeas.map((idea) => (
                <button
                  className={idea.id === ideaId ? "idea-card selected" : "idea-card"}
                  type="button"
                  key={idea.id}
                  onClick={() => chooseIdea(idea)}
                  aria-pressed={idea.id === ideaId}
                  style={{ "--idea-color": idea.color } as React.CSSProperties}
                >
                  <span className="idea-card__emoji">{idea.emoji}</span>
                  <span>
                    <strong>{idea.label}</strong>
                    <small>{idea.detail}</small>
                  </span>
                  <span className="idea-card__check">✓</span>
                </button>
              ))}
            </div>
            <button
              className="button primary onboarding-next"
              type="button"
              onClick={moveToGoalDetails}
            >
              This feels right <span aria-hidden="true">→</span>
            </button>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="onboarding-step">
            <StepIntro
              kicker="Make it yours"
              title="Give your goal a little personality."
              body="A clear, meaningful goal is easier to come back to."
            />
            <form className="onboarding-form" onSubmit={handleGoalDetails}>
              {error ? <p className="alert error">{error}</p> : null}
              <label className="form-control">
                <span>Goal name</span>
                <div className="onboarding-name-input">
                  <span>{selectedIdea.emoji}</span>
                  <input
                    value={goalName}
                    onChange={(event) => setGoalName(event.target.value)}
                    maxLength={48}
                    autoFocus
                  />
                </div>
              </label>
              <label className="form-control">
                <span>Dream target</span>
                <span className="amount-input onboarding-amount-input">
                  <strong>£</strong>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="decimal"
                    value={target}
                    onChange={(event) => setTarget(event.target.value)}
                  />
                </span>
              </label>
              <div className="target-suggestions" aria-label="Suggested targets">
                {targetSuggestions.map((amount) => (
                  <button
                    className={Number(target) === amount ? "selected" : ""}
                    type="button"
                    key={amount}
                    onClick={() => setTarget(String(amount))}
                  >
                    £{amount.toLocaleString("en-GB")}
                  </button>
                ))}
              </div>
              <button className="button primary onboarding-next" type="submit">
                Build my goal <span aria-hidden="true">→</span>
              </button>
            </form>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="onboarding-step onboarding-step--first-save">
            <div className="onboarding-pixie-moment">
              <span className="pixie-glow" />
              <PixieMark size="large" mood="happy" />
              <span className="pixie-message">Let&apos;s make it real.</span>
            </div>
            <StepIntro
              kicker="One tiny win"
              title={`What feels easy to put toward ${goalName}?`}
              body="This records a manual save—no bank connection and no money is moved."
            />
            {error ? <p className="alert error">{error}</p> : null}
            <div className="first-save-grid">
              {firstSaveOptions.map((amount) => (
                <button
                  className={firstSave === amount ? "selected" : ""}
                  type="button"
                  key={amount}
                  onClick={() => setFirstSave(amount)}
                  aria-pressed={firstSave === amount}
                >
                  <strong>{amount === 0 ? "Later" : formatMoney(amount)}</strong>
                  <small>
                    {amount === 0 ? "Goal only" : amount <= 300 ? "Tiny start" : "Bright start"}
                  </small>
                </button>
              ))}
            </div>
            <button
              className="button primary onboarding-next"
              type="button"
              onClick={() => void finishOnboarding()}
              disabled={submitting}
            >
              {submitting ? "Planting your goal…" : "Start my journey"}
              {!submitting ? <span aria-hidden="true">✦</span> : null}
            </button>
          </section>
        ) : null}

        {step === 4 ? (
          <CelebrationStep
            goalName={createdGoalName || goalName}
            firstSave={firstSave}
            initialSaveRecorded={initialSaveRecorded}
            onContinue={() => navigate("/app/today", { replace: true })}
          />
        ) : null}
      </section>
    </main>
  );
}

function WelcomeStep({ displayName, onContinue }: { displayName: string; onContinue: () => void }) {
  return (
    <section className="onboarding-welcome">
      <div className="onboarding-welcome__visual">
        <span className="onboarding-orbit onboarding-orbit--one" />
        <span className="onboarding-orbit onboarding-orbit--two" />
        <span className="pixie-glow" />
        <PixieMark size="large" mood="happy" />
        <span className="welcome-spark welcome-spark--one">✦</span>
        <span className="welcome-spark welcome-spark--two">◆</span>
        <span className="welcome-spark welcome-spark--three">✦</span>
      </div>
      <div className="onboarding-welcome__copy">
        <span className="eyebrow">Your first minute</span>
        <h1>Hi {displayName}. Meet your tiny savings sidekick.</h1>
        <p>
          We&apos;ll create one meaningful goal and one easy first win. No spreadsheets, no bank
          connection, no judgement.
        </p>
        <div className="onboarding-promise-row">
          <span>1 goal</span>
          <span>3 easy choices</span>
          <span>about 60 seconds</span>
        </div>
        <button className="button primary onboarding-next" type="button" onClick={onContinue}>
          Let&apos;s grow something <span aria-hidden="true">✦</span>
        </button>
      </div>
    </section>
  );
}

function StepIntro({ kicker, title, body }: { kicker: string; title: string; body: string }) {
  return (
    <header className="onboarding-step__intro">
      <span className="eyebrow">{kicker}</span>
      <h1>{title}</h1>
      <p>{body}</p>
    </header>
  );
}

function CelebrationStep({
  goalName,
  firstSave,
  initialSaveRecorded,
  onContinue,
}: {
  goalName: string;
  firstSave: number;
  initialSaveRecorded: boolean;
  onContinue: () => void;
}) {
  return (
    <section className="onboarding-celebration">
      <div className="confetti" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <span key={index} />
        ))}
      </div>
      <div className="celebration-pixie">
        <span className="pixie-glow" />
        <PixieMark size="large" mood="happy" />
      </div>
      <span className="eyebrow">Your first glow-up</span>
      <h1>{goalName} is officially growing.</h1>
      <p>
        {firstSave > 0 && initialSaveRecorded
          ? `${formatMoney(firstSave)} is already lighting up your progress.`
          : firstSave > 0
            ? "Your goal is ready. The first save can be added again from Today."
            : "Your goal is ready whenever your first tiny save feels right."}
      </p>
      <div className="celebration-badge">
        <span>✦</span>
        <div>
          <strong>Journey started</strong>
          <small>One meaningful goal. Zero overwhelm.</small>
        </div>
      </div>
      <button className="button primary onboarding-next" type="button" onClick={onContinue}>
        Show me Today <span aria-hidden="true">→</span>
      </button>
    </section>
  );
}

export default OnboardingPage;
