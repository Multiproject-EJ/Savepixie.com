import { type CSSProperties, type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { useAuth } from "../app/AuthProvider";
import { createGoal, fetchGoals, recordDeposit } from "../features/goals/api";
import type { Goal } from "../features/goals/types";

const emojiOptions = ["🏦", "🎯", "🪄", "✈️", "🏡", "🚗", "🎉"];
const colorOptions = ["#7C3AED", "#38BDF8", "#F97316", "#F43F5E", "#22C55E", "#EAB308"];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function formatCurrency(cents: number) {
  return currencyFormatter.format(cents / 100);
}

function calculateProgress(goal: Goal) {
  if (!goal.target_cents) return 0;
  return Math.min(100, Math.round((goal.saved_cents / goal.target_cents) * 100));
}

type CreateGoalFormState = {
  name: string;
  target: string;
  emoji: string;
  color: string;
  deadline: string;
};

type DepositFormState = {
  amount: string;
  note: string;
};

function GoalCard({ goal, onDeposit }: { goal: Goal; onDeposit: (goal: Goal) => void }) {
  const progress = calculateProgress(goal);
  const ringStyle = {
    "--progress": progress,
    "--ring-color": goal.color ?? "#7C3AED",
  } as CSSProperties;

  const deadline = goal.deadline_date ? new Date(goal.deadline_date).toLocaleDateString() : null;

  return (
    <article className="goal-card">
      <div className="goal-progress">
        <div className="goal-progress-ring" style={ringStyle}>
          <span>{progress}%</span>
        </div>
        <div className="goal-emoji" aria-hidden>
          {goal.emoji ?? "🏦"}
        </div>
      </div>
      <div className="goal-details">
        <header>
          <h3>{goal.name}</h3>
          <p className="goal-balance">{formatCurrency(goal.saved_cents)}</p>
        </header>
        <dl>
          <div>
            <dt>Target</dt>
            <dd>{formatCurrency(goal.target_cents)}</dd>
          </div>
          <div>
            <dt>Remaining</dt>
            <dd>{formatCurrency(Math.max(goal.target_cents - goal.saved_cents, 0))}</dd>
          </div>
          {deadline ? (
            <div>
              <dt>Deadline</dt>
              <dd>{deadline}</dd>
            </div>
          ) : null}
        </dl>
      </div>
      <footer>
        <button className="button secondary" type="button" onClick={() => onDeposit(goal)}>
          Deposit
        </button>
      </footer>
    </article>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <header className="modal-header">
          <h2>{title}</h2>
          <button type="button" className="link-button" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState<CreateGoalFormState>({
    name: "",
    target: "",
    emoji: emojiOptions[0],
    color: colorOptions[0],
    deadline: "",
  });
  const [depositGoal, setDepositGoal] = useState<Goal | null>(null);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [isDepositSubmitting, setIsDepositSubmitting] = useState(false);
  const [depositForm, setDepositForm] = useState<DepositFormState>({ amount: "", note: "" });

  useEffect(() => {
    if (!user) return;

    let active = true;
    setLoading(true);
    setError(null);

    fetchGoals(user.id)
      .then((items) => {
        if (!active) return;
        setGoals(items);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message ?? "Unable to load goals");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  const totals = useMemo(() => {
    const summary = goals.reduce(
      (acc, goal) => {
        acc.saved += goal.saved_cents;
        acc.target += goal.target_cents;
        return acc;
      },
      { saved: 0, target: 0 }
    );

    const completion = summary.target > 0 ? Math.round((summary.saved / summary.target) * 100) : 0;

    return {
      savedLabel: formatCurrency(summary.saved),
      targetLabel: formatCurrency(summary.target),
      completion,
    };
  }, [goals]);

  const handleOpenCreate = () => {
    setCreateForm({ name: "", target: "", emoji: emojiOptions[0], color: colorOptions[0], deadline: "" });
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    setCreateError(null);
    setCreateForm({ name: "", target: "", emoji: emojiOptions[0], color: colorOptions[0], deadline: "" });
  };

  const handleCreateGoal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;

    setCreateError(null);
    setIsCreateSubmitting(true);

    const name = createForm.name.trim();
    if (!name) {
      setCreateError("Please enter a goal name.");
      setIsCreateSubmitting(false);
      return;
    }

    const targetValue = Number(createForm.target);
    if (!Number.isFinite(targetValue) || targetValue <= 0) {
      setCreateError("Target amount must be a positive number.");
      setIsCreateSubmitting(false);
      return;
    }

    const targetCents = Math.round(targetValue * 100);

    try {
      const newGoal = await createGoal({
        userId: user.id,
        name,
        targetCents,
        emoji: createForm.emoji,
        color: createForm.color,
        deadlineDate: createForm.deadline ? createForm.deadline : null,
      });

      setGoals((prev) => [...prev, newGoal]);
      setIsCreateOpen(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create goal.");
    } finally {
      setIsCreateSubmitting(false);
    }
  };

  const handleDeposit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || !depositGoal) return;

    setDepositError(null);
    setIsDepositSubmitting(true);

    const amountValue = Number(depositForm.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setDepositError("Deposit must be greater than zero.");
      setIsDepositSubmitting(false);
      return;
    }

    const amountCents = Math.round(amountValue * 100);

    const previousGoals = goals.map((goal) => ({ ...goal }));
    const optimistic = goals.map((goal) =>
      goal.id === depositGoal.id ? { ...goal, saved_cents: goal.saved_cents + amountCents } : goal
    );
    setGoals(optimistic);

    try {
      const updatedGoal = await recordDeposit({
        userId: user.id,
        goal: depositGoal,
        amountCents,
        note: depositForm.note.trim() ? depositForm.note.trim() : undefined,
      });

      setGoals((current) => current.map((goal) => (goal.id === updatedGoal.id ? updatedGoal : goal)));
      setDepositGoal(null);
    } catch (err) {
      setGoals(previousGoals);
      setDepositError(err instanceof Error ? err.message : "Failed to record deposit.");
    } finally {
      setIsDepositSubmitting(false);
    }
  };

  const hasGoals = goals.length > 0;

  return (
    <section className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Your savings goals</h1>
          <p className="dashboard-subtitle">
            Track progress across every goal and celebrate each deposit you make.
          </p>
        </div>
        <button type="button" className="button" onClick={handleOpenCreate}>
          New goal
        </button>
      </header>

      {error ? <div className="alert error">{error}</div> : null}

      <section className="dashboard-summary">
        <div>
          <span className="summary-label">Total saved</span>
          <strong className="summary-value">{totals.savedLabel}</strong>
        </div>
        <div>
          <span className="summary-label">Combined target</span>
          <strong className="summary-value">{totals.targetLabel}</strong>
        </div>
        <div>
          <span className="summary-label">Overall progress</span>
          <strong className="summary-value">{totals.completion}%</strong>
        </div>
      </section>

      {loading ? (
        <p className="muted">Loading goals…</p>
      ) : hasGoals ? (
        <div className="goal-grid">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onDeposit={(selected) => {
              setDepositGoal(selected);
              setDepositForm({ amount: "", note: "" });
              setDepositError(null);
            }} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>No goals yet. Create your first savings goal to get started!</p>
          <button type="button" className="button secondary" onClick={handleOpenCreate}>
            Create a goal
          </button>
        </div>
      )}

      <p className="fine-print">Deposits update instantly and sync to Supabase so you never lose momentum.</p>

      {isCreateOpen ? (
        <Modal title="Create a savings goal" onClose={handleCloseCreate}>
          {createError ? <div className="alert error">{createError}</div> : null}
          <form className="form" onSubmit={handleCreateGoal}>
            <div className="form-control">
              <span>Goal name</span>
              <input
                name="name"
                required
                placeholder="Emergency fund"
                value={createForm.name}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div className="form-control">
              <span>Target amount (USD)</span>
              <input
                name="target"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="1000"
                value={createForm.target}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, target: event.target.value }))}
              />
            </div>
            <div className="form-row">
              <div className="form-control">
                <span>Emoji</span>
                <select
                  name="emoji"
                  value={createForm.emoji}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, emoji: event.target.value }))}
                >
                  {emojiOptions.map((emoji) => (
                    <option key={emoji} value={emoji}>
                      {emoji}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <span>Accent color</span>
                <input
                  type="color"
                  name="color"
                  value={createForm.color}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, color: event.target.value }))}
                />
              </div>
            </div>
            <div className="form-control">
              <span>Deadline (optional)</span>
              <input
                type="date"
                name="deadline"
                value={createForm.deadline}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, deadline: event.target.value }))}
              />
            </div>
            <div className="modal-actions">
              <button type="submit" className="button primary" disabled={isCreateSubmitting}>
                {isCreateSubmitting ? "Creating…" : "Create goal"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}

      {depositGoal ? (
        <Modal
          title={`Deposit to ${depositGoal.name}`}
          onClose={() => {
            setDepositGoal(null);
            setDepositError(null);
            setDepositForm({ amount: "", note: "" });
          }}
        >
          {depositError ? <div className="alert error">{depositError}</div> : null}
          <form className="form" onSubmit={handleDeposit}>
            <div className="form-control">
              <span>Deposit amount (USD)</span>
              <input
                name="amount"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="50"
                value={depositForm.amount}
                onChange={(event) => setDepositForm((prev) => ({ ...prev, amount: event.target.value }))}
              />
            </div>
            <div className="form-control">
              <span>Note (optional)</span>
              <input
                name="note"
                placeholder="Paycheck boost"
                value={depositForm.note}
                onChange={(event) => setDepositForm((prev) => ({ ...prev, note: event.target.value }))}
              />
            </div>
            <div className="modal-actions">
              <button type="submit" className="button primary" disabled={isDepositSubmitting}>
                {isDepositSubmitting ? "Saving…" : "Record deposit"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}

export default DashboardPage;
