import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSavings } from "../app/SavingsProvider";
import PixieMark from "../components/PixieMark";
import PixieThemePicker from "../components/PixieThemePicker";
import { assessGoalFeasibility, type GoalFeasibility } from "../features/goals/feasibility";
import { rememberPixieTheme, type PixieTheme } from "../features/profile/pixieThemes";
import {
  currencySymbol,
  detectBrowserCurrency,
  savingsCurrencies,
  starterAmountFromNok,
  type SavingsCurrency,
} from "../lib/currency";
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
    target: 5000,
  },
  {
    id: "trip",
    label: "An adventure",
    detail: "A trip worth looking forward to",
    name: "My next adventure",
    emoji: "✈️",
    color: "#7b3fff",
    target: 12000,
  },
  {
    id: "treat",
    label: "Something brilliant",
    detail: "A laptop, bike or joyful upgrade",
    name: "Something brilliant",
    emoji: "✨",
    color: "#ffc857",
    target: 8000,
  },
  {
    id: "future",
    label: "Future me",
    detail: "A flexible pot with no pressure",
    name: "Future me fund",
    emoji: "🌱",
    color: "#8aa4ff",
    target: 10000,
  },
];

const targetSuggestions = [2500, 5000, 10000, 20000];
const firstSaveOptionsNok = [0, 50, 100, 200, 500];

function dateMonthsFromNow(months: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

export function OnboardingPage() {
  const {
    goals,
    loading,
    displayName,
    pixieTheme,
    startFirstGoal,
    savePlanningPreferences,
    savePixiePreference,
  } = useSavings();
  const navigate = useNavigate();
  const location = useLocation();
  const todayPath = location.pathname.startsWith("/preview/") ? "/preview/app/today" : "/app/today";
  const [step, setStep] = useState(0);
  const [selectedPixieTheme, setSelectedPixieTheme] = useState<PixieTheme>(pixieTheme);
  const [savingPixie, setSavingPixie] = useState(false);
  const [mode, setMode] = useState<"solo" | "shared">("solo");
  const [ideaId, setIdeaId] = useState(goalIdeas[0].id);
  const [goalName, setGoalName] = useState(goalIdeas[0].name);
  const [currencyCode, setCurrencyCode] = useState<SavingsCurrency>(() => detectBrowserCurrency());
  const [target, setTarget] = useState(() =>
    String(starterAmountFromNok(goalIdeas[0].target, detectBrowserCurrency()))
  );
  const [deadlineDate, setDeadlineDate] = useState(() => dateMonthsFromNow(12));
  const [monthlyCapacity, setMonthlyCapacity] = useState(() =>
    String(starterAmountFromNok(3000, detectBrowserCurrency()))
  );
  const [firstSave, setFirstSave] = useState(
    () => starterAmountFromNok(100, detectBrowserCurrency()) * 100
  );
  const [savingsHomeLabel, setSavingsHomeLabel] = useState("My dedicated savings account");
  const [providerName, setProviderName] = useState("");
  const [accountHint, setAccountHint] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdGoalName, setCreatedGoalName] = useState<string | null>(null);
  const [initialSaveRecorded, setInitialSaveRecorded] = useState(true);

  const selectedIdea = useMemo(
    () => goalIdeas.find((idea) => idea.id === ideaId) ?? goalIdeas[0],
    [ideaId]
  );
  const localizedTargetSuggestions = useMemo(
    () => targetSuggestions.map((amount) => starterAmountFromNok(amount, currencyCode)),
    [currencyCode]
  );
  const firstSaveOptions = useMemo(
    () =>
      firstSaveOptionsNok.map((amount) =>
        amount === 0 ? 0 : starterAmountFromNok(amount, currencyCode) * 100
      ),
    [currencyCode]
  );
  const targetCents = Math.round((Number.parseFloat(target) || 0) * 100);
  const monthlyCapacityCents = Math.round((Number.parseFloat(monthlyCapacity) || 0) * 100);
  const feasibility = useMemo(
    () =>
      assessGoalFeasibility({
        targetCents,
        deadlineDate,
        monthlyCapacityCents,
      }),
    [deadlineDate, monthlyCapacityCents, targetCents]
  );

  useEffect(() => {
    if (!loading && goals.length > 0 && !createdGoalName) {
      navigate(todayPath, { replace: true });
    }
  }, [createdGoalName, goals.length, loading, navigate, todayPath]);

  const chooseIdea = (idea: GoalIdea) => {
    setIdeaId(idea.id);
    setGoalName(idea.name);
    setTarget(String(starterAmountFromNok(idea.target, currencyCode)));
  };

  const chooseCurrency = (nextCurrency: SavingsCurrency) => {
    setCurrencyCode(nextCurrency);
    setTarget(String(starterAmountFromNok(selectedIdea.target, nextCurrency)));
    setMonthlyCapacity(String(starterAmountFromNok(3000, nextCurrency)));
    setFirstSave(starterAmountFromNok(100, nextCurrency) * 100);
  };

  const moveToGoalDetails = () => {
    setError(null);
    setStep(3);
  };

  const choosePixie = (theme: PixieTheme) => {
    setSelectedPixieTheme(theme);
    rememberPixieTheme(theme);
    setError(null);
  };

  const confirmPixie = async () => {
    if (savingPixie) return;
    setSavingPixie(true);
    setError(null);
    try {
      await savePixiePreference(selectedPixieTheme);
      setStep(2);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't save your Pixie just yet.");
    } finally {
      setSavingPixie(false);
    }
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

    if (!deadlineDate || feasibility.status === "invalid") {
      setError("Choose a future dream date and a comfortable monthly saving amount.");
      return;
    }

    if (feasibility.status === "over_budget") {
      setError("Let’s adjust the target or date so this first Pact can genuinely succeed.");
      return;
    }

    setError(null);
    setStep(4);
  };

  const finishOnboarding = async () => {
    const targetValue = Number.parseFloat(target);
    if (!Number.isFinite(targetValue) || targetValue <= 0 || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      await savePlanningPreferences({
        currencyCode,
        monthlySavingsCapacityCents: monthlyCapacityCents,
      });
      const result = await startFirstGoal({
        mode,
        name: goalName.trim(),
        targetCents: Math.round(targetValue * 100),
        emoji: selectedIdea.emoji,
        color: selectedIdea.color,
        deadlineDate,
        contributionRule: mode === "shared" ? "equal" : "flexible",
        privacyMode: mode === "shared" ? "on_track_only" : "private",
        initialDepositCents: firstSave,
        savingsHome: {
          label: savingsHomeLabel.trim() || "My dedicated savings account",
          providerName: providerName.trim() || null,
          accountHint: accountHint.trim() || null,
        },
      });
      setCreatedGoalName(result.goal.name);
      setInitialSaveRecorded(result.initialSaveRecorded);
      setStep(5);
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
        {step > 0 && step < 5 ? (
          <div className="onboarding-progress" aria-label={`Step ${step} of 4`}>
            {[1, 2, 3, 4].map((progressStep) => (
              <span className={progressStep <= step ? "active" : ""} key={progressStep} />
            ))}
          </div>
        ) : (
          <span className="onboarding-topbar__aside">A tiny start is enough</span>
        )}
      </header>

      <section className={`onboarding-card onboarding-card--step-${step}`}>
        {step > 0 && step < 5 ? (
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
          <section className="onboarding-step onboarding-step--pixie-choice">
            <StepIntro
              kicker="Choose your companion"
              title="Which Pixie will protect your first goal?"
              body="Your Pixie changes the colours and magical personality of your whole SavePixie space. You can change it later."
            />
            {error ? <p className="alert error">{error}</p> : null}
            <PixieThemePicker
              value={selectedPixieTheme}
              onChange={choosePixie}
              disabled={savingPixie}
            />
            <button
              className="button primary onboarding-next"
              type="button"
              onClick={() => void confirmPixie()}
              disabled={savingPixie}
            >
              {savingPixie ? "Welcoming your Pixie…" : "This is my Pixie"}
              {!savingPixie ? <span aria-hidden="true">✦</span> : null}
            </button>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="onboarding-step">
            <StepIntro
              kicker="Choose your Pact"
              title="Are you saving solo or together?"
              body="Both choices keep each person's money in their own real Savings Home."
            />
            <div className="pact-mode-grid" aria-label="Savings Pact type">
              <button
                className={mode === "solo" ? "pact-mode-card solo selected" : "pact-mode-card solo"}
                type="button"
                onClick={() => setMode("solo")}
                aria-pressed={mode === "solo"}
              >
                <span className="pact-mode-card__icon" aria-hidden="true">
                  ✦
                </span>
                <span>
                  <strong>Save solo</strong>
                  <small>A promise to future you</small>
                </span>
                <span className="pact-mode-card__check">✓</span>
              </button>
              <button
                className={
                  mode === "shared" ? "pact-mode-card shared selected" : "pact-mode-card shared"
                }
                type="button"
                onClick={() => setMode("shared")}
                aria-pressed={mode === "shared"}
              >
                <span className="pact-mode-card__icon" aria-hidden="true">
                  ◎
                </span>
                <span>
                  <strong>Save together</strong>
                  <small>Family, friends or a trusted Circle</small>
                </span>
                <span className="pact-mode-card__check">✓</span>
              </button>
            </div>
            <div className="onboarding-section-divider">
              <span>Now choose what this Pact should grow</span>
            </div>
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

        {step === 3 ? (
          <section className="onboarding-step">
            <StepIntro
              kicker="Make it yours"
              title="Make the dream fit real life."
              body="We’ll test the target against a comfortable monthly amount—without asking for your salary or bank data."
            />
            <form className="onboarding-form" onSubmit={handleGoalDetails}>
              {error ? <p className="alert error">{error}</p> : null}
              <label className="form-control">
                <span>Pact name</span>
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
              <div className="form-row onboarding-money-row">
                <label className="form-control onboarding-currency-control">
                  <span>Your currency</span>
                  <select
                    value={currencyCode}
                    onChange={(event) => chooseCurrency(event.target.value as SavingsCurrency)}
                  >
                    {savingsCurrencies.map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.code} · {currency.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-control">
                  <span>Dream target</span>
                  <span className="amount-input onboarding-amount-input">
                    <strong>{currencySymbol(currencyCode)}</strong>
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
              </div>
              <div className="target-suggestions" aria-label="Suggested targets">
                {localizedTargetSuggestions.map((amount) => (
                  <button
                    className={Number(target) === amount ? "selected" : ""}
                    type="button"
                    key={amount}
                    onClick={() => setTarget(String(amount))}
                  >
                    {formatMoney(amount * 100, currencyCode)}
                  </button>
                ))}
              </div>
              <div className="form-row onboarding-reality-row">
                <label className="form-control">
                  <span>Dream date</span>
                  <input
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={deadlineDate}
                    onChange={(event) => setDeadlineDate(event.target.value)}
                    required
                  />
                </label>
                <label className="form-control">
                  <span>Comfortable each month</span>
                  <span className="amount-input onboarding-amount-input">
                    <strong>{currencySymbol(currencyCode)}</strong>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      inputMode="decimal"
                      value={monthlyCapacity}
                      onChange={(event) => setMonthlyCapacity(event.target.value)}
                      required
                    />
                  </span>
                </label>
              </div>
              <FeasibilityCard
                currencyCode={currencyCode}
                feasibility={feasibility}
                onUseReachableTarget={() =>
                  setTarget(String(Math.max(1, Math.floor(feasibility.reachableTargetCents / 100))))
                }
                onUseSuggestedDate={() => {
                  if (feasibility.suggestedDeadline) {
                    setDeadlineDate(feasibility.suggestedDeadline);
                  }
                }}
              />
              <button
                className="button primary onboarding-next"
                type="submit"
                disabled={feasibility.status === "over_budget" || feasibility.status === "invalid"}
              >
                {feasibility.status === "over_budget" ? "Adjust my plan first" : "This can work"}{" "}
                <span aria-hidden="true">→</span>
              </button>
            </form>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="onboarding-step onboarding-step--first-save">
            <div className="onboarding-pixie-moment">
              <span className="pixie-glow" />
              <PixieMark size="large" mood="happy" />
              <span className="pixie-message">Let&apos;s make it real.</span>
            </div>
            <StepIntro
              kicker="One tiny win"
              title={`What feels easy to put toward ${goalName}?`}
              body="First give the money a real Savings Home. SavePixie records the Pact; your bank keeps the money."
            />
            {error ? <p className="alert error">{error}</p> : null}
            <div className="savings-home-setup">
              <div className="savings-home-setup__heading">
                <span aria-hidden="true">⌂</span>
                <div>
                  <strong>Your Savings Home</strong>
                  <small>
                    Use a dedicated savings account you own. We never ask for bank credentials.
                  </small>
                </div>
              </div>
              <label className="form-control">
                <span>Account nickname</span>
                <input
                  value={savingsHomeLabel}
                  onChange={(event) => setSavingsHomeLabel(event.target.value)}
                  maxLength={64}
                  placeholder="My dedicated savings account"
                />
              </label>
              <div className="form-row two-columns">
                <label className="form-control">
                  <span>
                    Bank <em>optional</em>
                  </span>
                  <input
                    value={providerName}
                    onChange={(event) => setProviderName(event.target.value)}
                    maxLength={80}
                    placeholder="Your bank"
                  />
                </label>
                <label className="form-control">
                  <span>
                    Last digits <em>optional</em>
                  </span>
                  <input
                    value={accountHint}
                    onChange={(event) => setAccountHint(event.target.value)}
                    maxLength={24}
                    placeholder="••42"
                  />
                </label>
              </div>
              <p>
                <strong>Manual for now:</strong> saves stay pending until authorised bank
                verification is available.
              </p>
            </div>
            <div className="first-save-grid">
              {firstSaveOptions.map((amount) => (
                <button
                  className={firstSave === amount ? "selected" : ""}
                  type="button"
                  key={amount}
                  onClick={() => setFirstSave(amount)}
                  aria-pressed={firstSave === amount}
                >
                  <strong>{amount === 0 ? "Later" : formatMoney(amount, currencyCode)}</strong>
                  <small>
                    {amount === 0 ? "Pact only" : amount <= 10000 ? "Tiny start" : "Bright start"}
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

        {step === 5 ? (
          <CelebrationStep
            goalName={createdGoalName || goalName}
            firstSave={firstSave}
            currencyCode={currencyCode}
            initialSaveRecorded={initialSaveRecorded}
            onContinue={() => navigate(todayPath, { replace: true })}
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
          We&apos;ll make one meaningful Savings Pact, give the money a real home, and record one
          easy first win. No spreadsheets and no bank passwords.
        </p>
        <div className="onboarding-promise-row">
          <span>1 Pact</span>
          <span>4 easy choices</span>
          <span>about 90 seconds</span>
        </div>
        <button className="button primary onboarding-next" type="button" onClick={onContinue}>
          Let&apos;s grow something <span aria-hidden="true">✦</span>
        </button>
      </div>
    </section>
  );
}

function FeasibilityCard({
  currencyCode,
  feasibility,
  onUseReachableTarget,
  onUseSuggestedDate,
}: {
  currencyCode: SavingsCurrency;
  feasibility: GoalFeasibility;
  onUseReachableTarget: () => void;
  onUseSuggestedDate: () => void;
}) {
  if (feasibility.status === "invalid") {
    return (
      <div className="feasibility-card feasibility-card--neutral" role="status">
        <span aria-hidden="true">◇</span>
        <div>
          <strong>Add a future date and a comfortable monthly amount.</strong>
          <p>Then Pixie can test the plan before you commit to it.</p>
        </div>
      </div>
    );
  }

  if (feasibility.status === "over_budget") {
    return (
      <div className="feasibility-card feasibility-card--adjust" role="alert">
        <span aria-hidden="true">↗</span>
        <div>
          <strong>This dream needs a gentler route.</strong>
          <p>
            It needs about {formatMoney(feasibility.requiredMonthlyCents, currencyCode)} each month,
            above your comfortable {formatMoney(feasibility.monthlyCapacityCents, currencyCode)}.
          </p>
          <div className="feasibility-card__actions">
            {feasibility.suggestedDeadline ? (
              <button type="button" onClick={onUseSuggestedDate}>
                Give me more time
              </button>
            ) : null}
            <button type="button" onClick={onUseReachableTarget}>
              Lower the first target
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`feasibility-card feasibility-card--${feasibility.status}`} role="status">
      <span aria-hidden="true">✓</span>
      <div>
        <strong>
          {feasibility.status === "comfortable"
            ? "This plan has breathing room."
            : "This can work."}
        </strong>
        <p>
          About {formatMoney(feasibility.requiredMonthlyCents, currencyCode)} per month reaches the
          dream in roughly {feasibility.monthsRemaining} month
          {feasibility.monthsRemaining === 1 ? "" : "s"}.
        </p>
      </div>
    </div>
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
  currencyCode,
  initialSaveRecorded,
  onContinue,
}: {
  goalName: string;
  firstSave: number;
  currencyCode: SavingsCurrency;
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
          ? `${formatMoney(firstSave, currencyCode)} is already lighting up your progress.`
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
