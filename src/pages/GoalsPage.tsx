import { FormEvent, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useSavings } from "../app/SavingsProvider";
import type { AppShellOutletContext } from "../components/AppShell";
import { goalIdeas, type GoalIdea } from "../data/savingsMoves";
import { formatMoney, formatShortDate, goalProgress } from "../lib/format";

export function GoalsPage() {
  const { goals, loading, error, addGoal } = useSavings();
  const { openQuickSave } = useOutletContext<AppShellOutletContext>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<GoalIdea | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const openGoalDialog = (idea: GoalIdea | null = null) => {
    setSelectedIdea(idea);
    setDialogOpen(true);
  };

  return (
    <div className="app-page goals-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Make it feel real</span>
          <h1>Your goals</h1>
          <p>Give every small save somewhere meaningful to go.</p>
        </div>
        <button className="button secondary" type="button" onClick={() => openGoalDialog()}>
          <span aria-hidden="true">＋</span> New goal
        </button>
      </header>

      {error ? <p className="alert error">{error}</p> : null}
      {notice ? <p className="alert success">{notice}</p> : null}

      {loading ? (
        <div className="goal-gallery">
          <div className="skeleton-card" />
          <div className="skeleton-card" />
        </div>
      ) : goals.length === 0 ? (
        <section className="empty-state goals-empty">
          <span className="empty-state__seed" aria-hidden="true">
            ◆
          </span>
          <span className="eyebrow">Plant your first goal</span>
          <h2>What would make future-you smile?</h2>
          <p>A trip, an emergency cushion, a new laptop—start with one thing you genuinely want.</p>
          <button className="button primary" type="button" onClick={() => openGoalDialog()}>
            Create my first goal
          </button>
        </section>
      ) : (
        <section className="goal-gallery">
          {goals.map((goal, index) => {
            const progress = goalProgress(goal.saved_cents, goal.target_cents);
            return (
              <article
                className={`savings-goal-card ${index === 0 ? "featured" : ""}`}
                key={goal.id}
              >
                <header>
                  <span
                    className="goal-icon"
                    style={{ background: `${goal.color || "#7b3fff"}22` }}
                  >
                    {goal.emoji || "✨"}
                  </span>
                  <span className="goal-deadline">{formatShortDate(goal.deadline_date)}</span>
                </header>
                <div>
                  <span className="eyebrow">{index === 0 ? "Primary goal" : "Savings goal"}</span>
                  <h2>{goal.name}</h2>
                </div>
                <div className="goal-amount-line">
                  <strong>{formatMoney(goal.saved_cents)}</strong>
                  <span>of {formatMoney(goal.target_cents)}</span>
                </div>
                <div className="progress-track" aria-label={`${progress}% saved`}>
                  <span style={{ width: `${progress}%`, background: goal.color || "#7b3fff" }} />
                </div>
                <footer>
                  <span>{progress}% complete</span>
                  <button type="button" onClick={() => openQuickSave(goal.id)}>
                    Add money
                  </button>
                </footer>
              </article>
            );
          })}
          <button className="add-goal-card" type="button" onClick={() => openGoalDialog()}>
            <span aria-hidden="true">＋</span>
            <strong>Add another goal</strong>
            <small>Keep secondary goals quiet and focused.</small>
          </button>
        </section>
      )}

      <section className="dream-library surface-card">
        <header className="section-heading">
          <div>
            <span className="eyebrow">Dream Library</span>
            <h2>Find something worth growing</h2>
          </div>
          <span className="library-count">{goalIdeas.length} starters</span>
        </header>
        <p className="support-copy">
          Pick an idea to pre-fill a realistic starting target. Make it yours before saving.
        </p>
        <div className="dream-library__grid">
          {goalIdeas.map((idea) => (
            <button
              className="dream-card"
              type="button"
              key={idea.id}
              onClick={() => openGoalDialog(idea)}
            >
              <span className="dream-card__emoji" aria-hidden="true">
                {idea.emoji}
              </span>
              <span>
                <small>{idea.category}</small>
                <strong>{idea.name}</strong>
                <em>{formatMoney(idea.targetCents)} starter goal</em>
              </span>
              <span className="dream-card__arrow" aria-hidden="true">
                →
              </span>
            </button>
          ))}
        </div>
      </section>

      <NewGoalDialog
        open={dialogOpen}
        idea={selectedIdea}
        onClose={() => {
          setDialogOpen(false);
          setSelectedIdea(null);
        }}
        onCreate={async (values) => {
          const goal = await addGoal(values);
          setNotice(`${goal.name} is ready for its first save.`);
          setDialogOpen(false);
        }}
      />
    </div>
  );
}

type NewGoalDialogProps = {
  open: boolean;
  idea?: GoalIdea | null;
  onClose: () => void;
  onCreate: (values: {
    name: string;
    targetCents: number;
    emoji?: string;
    color?: string;
    deadlineDate?: string | null;
  }) => Promise<void>;
};

function NewGoalDialog({ open, idea, onClose, onCreate }: NewGoalDialogProps) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [emoji, setEmoji] = useState("✈️");
  const [deadline, setDeadline] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !idea) return;
    setName(idea.name);
    setTarget(String(idea.targetCents / 100));
    setEmoji(idea.emoji);
    setError(null);
  }, [idea, open]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const targetValue = Number.parseFloat(target);
    if (!name.trim()) {
      setError("Give your goal a name.");
      return;
    }
    if (!Number.isFinite(targetValue) || targetValue <= 0) {
      setError("Choose a target greater than zero.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onCreate({
        name: name.trim(),
        targetCents: Math.round(targetValue * 100),
        emoji: emoji.trim() || "✨",
        color: "#7b3fff",
        deadlineDate: deadline || null,
      });
      setName("");
      setTarget("");
      setDeadline("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't create that goal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="pixie-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-goal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="pixie-modal__header">
          <div>
            <span className="eyebrow">{idea ? idea.category : "Plant a goal seed"}</span>
            <h2 id="new-goal-title">What are you saving for?</h2>
            {idea ? <p className="dialog-motivation">{idea.motivation}</p> : null}
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <form className="form" onSubmit={handleSubmit}>
          {error ? <p className="alert error">{error}</p> : null}
          <label className="form-control">
            <span>Goal name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Japan trip"
              autoFocus
            />
          </label>
          <div className="form-row two-columns">
            <label className="form-control emoji-control">
              <span>Icon</span>
              <input
                value={emoji}
                onChange={(event) => setEmoji(event.target.value)}
                maxLength={4}
              />
            </label>
            <label className="form-control amount-control">
              <span>Target</span>
              <span className="amount-input">
                <strong>£</strong>
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="decimal"
                  value={target}
                  onChange={(event) => setTarget(event.target.value)}
                  placeholder="1,200"
                />
              </span>
            </label>
          </div>
          <label className="form-control">
            <span>
              Dream date <em>optional</em>
            </span>
            <input
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
          </label>
          <button className="button primary" type="submit" disabled={submitting}>
            {submitting ? "Planting…" : "Create goal"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default GoalsPage;
