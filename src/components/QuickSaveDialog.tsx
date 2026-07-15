import { FormEvent, useEffect, useState } from "react";
import { useSavings } from "../app/SavingsProvider";
import { gentleHaptic } from "../lib/feedback";
import { formatMoney } from "../lib/format";

type QuickSaveDialogProps = {
  open: boolean;
  initialGoalId?: string | null;
  onClose: () => void;
  onSaved: (message: string) => void;
};

export function QuickSaveDialog({ open, initialGoalId, onClose, onSaved }: QuickSaveDialogProps) {
  const { goals, deposit } = useSavings();
  const [goalId, setGoalId] = useState("");
  const [amount, setAmount] = useState("5");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setGoalId(initialGoalId || goals[0]?.id || "");
    setAmount("5");
    setNote("");
    setError(null);
  }, [goals, initialGoalId, open]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose, open]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountValue = Number.parseFloat(amount);

    if (!goalId) {
      setError("Create or choose a goal first.");
      return;
    }

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }

    const cents = Math.round(amountValue * 100);
    const goal = goals.find((item) => item.id === goalId);

    setSubmitting(true);
    setError(null);
    try {
      await deposit(goalId, cents, note.trim() || undefined);
      onSaved(`${formatMoney(cents)} moved toward ${goal?.name || "your goal"}.`);
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We couldn't record that save.");
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
        aria-labelledby="quick-save-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="pixie-modal__header">
          <div className="pixie-modal__title">
            <PixieMarkInline />
            <div>
              <span className="eyebrow">Tiny action, real progress</span>
              <h2 id="quick-save-title">Quick Save</h2>
            </div>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close Quick Save"
          >
            ×
          </button>
        </header>

        {goals.length === 0 ? (
          <div className="empty-state compact">
            <h3>Create a goal first</h3>
            <p>Your Pixie needs somewhere meaningful to send this save.</p>
            <button className="button secondary" type="button" onClick={onClose}>
              Back to goals
            </button>
          </div>
        ) : (
          <form className="form" onSubmit={handleSubmit}>
            {error ? <p className="alert error">{error}</p> : null}
            <label className="form-control">
              <span>Goal</span>
              <select value={goalId} onChange={(event) => setGoalId(event.target.value)}>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.emoji || "✨"} {goal.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-control amount-control">
              <span>Amount</span>
              <span className="amount-input">
                <strong>£</strong>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  autoFocus
                />
              </span>
            </label>
            <div className="quick-amounts" aria-label="Suggested amounts">
              {[5, 10, 20, 50].map((value) => (
                <button
                  className={amount === String(value) ? "selected" : ""}
                  key={value}
                  type="button"
                  aria-pressed={amount === String(value)}
                  onClick={() => {
                    gentleHaptic();
                    setAmount(String(value));
                  }}
                >
                  £{value}
                </button>
              ))}
            </div>
            <label className="form-control">
              <span>
                Note <em>optional</em>
              </span>
              <input
                value={note}
                maxLength={120}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Skipped takeaway"
              />
            </label>
            <button className="button primary" type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Add to goal"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}

function PixieMarkInline() {
  return (
    <span className="quick-save-spark" aria-hidden="true">
      ✦
    </span>
  );
}

export default QuickSaveDialog;
