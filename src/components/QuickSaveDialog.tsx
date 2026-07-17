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
  const { goals, savingsHomes, deposit } = useSavings();
  const [goalId, setGoalId] = useState("");
  const [amount, setAmount] = useState("50");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setGoalId(initialGoalId || goals[0]?.id || "");
    setAmount("50");
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
      setError("Create or choose a Pact first.");
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
      onSaved(`${formatMoney(cents)} recorded as pending for ${goal?.name || "your Pact"}.`);
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
            <h3>Create a Savings Pact first</h3>
            <p>Your Pixie needs somewhere meaningful to send this save.</p>
            <button className="button secondary" type="button" onClick={onClose}>
              Back to goals
            </button>
          </div>
        ) : (
          <form className="form" onSubmit={handleSubmit}>
            {error ? <p className="alert error">{error}</p> : null}
            <label className="form-control">
              <span>Savings Pact</span>
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
                <strong>kr</strong>
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
              {[50, 100, 200, 500].map((value) => (
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
                  {value} kr
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
            <div className="pending-save-note" role="note">
              <span aria-hidden="true">⌂</span>
              <div>
                <strong>{savingsHomes[0]?.label || "Savings Home required"}</strong>
                <small>
                  Move the money in your bank, then record it here. It stays pending—not
                  verified—until a bank connection confirms it.
                </small>
              </div>
            </div>
            <button className="button primary" type="submit" disabled={submitting}>
              {submitting ? "Recording…" : "Record pending save"}
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
