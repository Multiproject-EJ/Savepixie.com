import { FormEvent, useEffect, useState } from "react";
import { useSavings } from "../app/SavingsProvider";
import type { SavingsMove } from "../data/savingsMoves";
import type { DailyMoveResult } from "../features/daily-loop/api";
import { gentleHaptic } from "../lib/feedback";
import { formatMoney } from "../lib/format";
import { useModalDialog } from "../lib/useModalDialog";
import PixieMark from "./PixieMark";

type DailyMoveDialogProps = {
  open: boolean;
  move: SavingsMove;
  onClose: () => void;
  onCompleted: (result: DailyMoveResult) => void;
};

export function DailyMoveDialog({ open, move, onClose, onCompleted }: DailyMoveDialogProps) {
  const { goals, savingsHomes, completeDailyMove } = useSavings();
  const [goalId, setGoalId] = useState("");
  const [amount, setAmount] = useState(String(move.suggestedCents / 100));
  const [reflection, setReflection] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useModalDialog<HTMLElement>(open, onClose, !submitting);
  const isSave = move.completionKind === "save";

  useEffect(() => {
    if (!open) return;
    setGoalId(goals[0]?.id || "");
    setAmount(String(move.suggestedCents / 100));
    setReflection("");
    setError(null);
  }, [goals, move.id, move.suggestedCents, open]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amountValue = Number.parseFloat(amount);

    if (isSave && !goalId) {
      setError("Choose the Pact this Move should grow.");
      return;
    }

    if (isSave && (!Number.isFinite(amountValue) || amountValue <= 0)) {
      setError("Choose a small positive amount that feels comfortable.");
      return;
    }

    if (isSave && !savingsHomes[0]) {
      setError("Set up your Savings Home before recording a saving Move.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const result = await completeDailyMove({
        moveId: move.id,
        completionKind: move.completionKind,
        ...(isSave
          ? {
              pactId: goalId,
              savingsHomeId: savingsHomes[0].id,
              savedCents: Math.round(amountValue * 100),
            }
          : {}),
        reflection,
      });
      gentleHaptic("success");
      onCompleted(result);
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "We couldn't complete today's Savings Move."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop daily-move-backdrop"
      onMouseDown={() => !submitting && onClose()}
    >
      <section
        ref={dialogRef}
        className="pixie-modal daily-move-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-move-title"
        tabIndex={-1}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="daily-move-modal__hero">
          <button
            className="icon-button daily-move-modal__close"
            type="button"
            onClick={onClose}
            aria-label="Close today's Savings Move"
            disabled={submitting}
          >
            ×
          </button>
          <div className="daily-move-modal__pixie">
            <span className="pixie-glow" />
            <PixieMark size="large" mood="curious" />
          </div>
          <span className="eyebrow">Today&apos;s Savings Move · {move.emoji}</span>
          <h2 id="daily-move-title">{move.headline}</h2>
          <p>{move.description}</p>
          <span className="daily-move-reward">✦ {isSave ? 35 : 25} Stardust when complete</span>
        </header>

        <form className="form daily-move-form" onSubmit={handleSubmit}>
          {error ? <p className="alert error">{error}</p> : null}

          {isSave ? (
            <>
              <label className="form-control">
                <span>Grow this Pact</span>
                <select value={goalId} onChange={(event) => setGoalId(event.target.value)}>
                  {goals.map((goal) => (
                    <option key={goal.id} value={goal.id}>
                      {goal.emoji || "✨"} {goal.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-control amount-control">
                <span>A comfortable amount</span>
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
                {[20, 50, 100, 200].map((value) => (
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
              <div className="pending-save-note" role="note">
                <span aria-hidden="true">⌂</span>
                <div>
                  <strong>{savingsHomes[0]?.label || "Savings Home required"}</strong>
                  <small>
                    Move {formatMoney(Math.max(0, Math.round((Number(amount) || 0) * 100)))} in your
                    bank, then confirm it here. SavePixie records it as pending.
                  </small>
                </div>
              </div>
            </>
          ) : (
            <div className="daily-action-check">
              <span aria-hidden="true">✓</span>
              <div>
                <strong>No money needs to move for this one.</strong>
                <small>Doing the useful action is the win.</small>
              </div>
            </div>
          )}

          <label className="form-control">
            <span>
              {move.reflectionPrompt} <em>optional</em>
            </span>
            <textarea
              value={reflection}
              maxLength={280}
              rows={3}
              onChange={(event) => setReflection(event.target.value)}
              placeholder="A few words help the technique stick…"
              autoFocus={!isSave}
            />
          </label>

          <button
            className="button primary daily-move-complete"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Saving your progress…" : `${move.actionLabel} · Complete`}
          </button>
          <small className="daily-move-kindness">Tiny counts. No perfect day required.</small>
        </form>
      </section>
    </div>
  );
}

export default DailyMoveDialog;
