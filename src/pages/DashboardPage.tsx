import { FormEvent, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Goal } from "../features/goals/types";
import { createGoal, fetchGoals, recordDeposit } from "../features/goals/api";
import { fetchProfile, type ProfileRow } from "../features/profile/api";
import { useAuth } from "../app/AuthProvider";

type NewGoalValues = {
  name: string;
  target: string;
  emoji: string;
  color: string;
  deadline: string;
};

type DepositValues = {
  amount: string;
  note: string;
};

type CurrencyFormatter = (cents: number) => string;

function formatDisplayName(profile: ProfileRow | null, fallback: string | null): string {
  if (profile?.display_name) {
    return profile.display_name;
  }

  if (fallback) {
    return fallback.split("@")[0];
  }

  return "there";
}

function formatDate(value: string | null): string {
  if (!value) return "Flexible";

  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  } catch (error) {
    console.warn("Unable to format date", error);
    return value;
  }
}

function DashboardPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(true);
  const [goalsError, setGoalsError] = useState<string | null>(null);

  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [creatingGoal, setCreatingGoal] = useState(false);

  const [depositGoal, setDepositGoal] = useState<Goal | null>(null);
  const [depositingGoalId, setDepositingGoalId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      setGoals([]);
      setGoalsLoading(false);
      return;
    }

    let active = true;
    setGoalsLoading(true);
    setGoalsError(null);

    fetchGoals(user.id)
      .then((result) => {
        if (!active) return;
        setGoals(result);
      })
      .catch((cause) => {
        if (!active) return;
        const message =
          cause instanceof Error ? cause.message : "We couldn't load your goals just yet.";
        setGoalsError(message);
      })
      .finally(() => {
        if (!active) return;
        setGoalsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      return;
    }

    let active = true;
    fetchProfile(user.id)
      .then((result) => {
        if (!active) return;
        setProfile(result);
      })
      .catch((error) => {
        console.warn("Unable to load profile", error);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  const greeting = useMemo(
    () => formatDisplayName(profile, user?.email ?? null),
    [profile, user?.email]
  );

  const currencyFormatter: CurrencyFormatter = useMemo(() => {
    const formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return (cents: number) => formatter.format(cents / 100);
  }, []);

  const summary = useMemo(() => {
    const totals = goals.reduce(
      (acc, goal) => {
        acc.saved += goal.saved_cents;
        acc.target += goal.target_cents;
        if (goal.deadline_date) {
          const timestamp = new Date(goal.deadline_date).getTime();
          if (!Number.isNaN(timestamp) && (!acc.nextDeadline || timestamp < acc.nextDeadline)) {
            acc.nextDeadline = timestamp;
          }
        }
        return acc;
      },
      { saved: 0, target: 0, nextDeadline: null as number | null }
    );

    const completion = totals.target > 0 ? Math.round((totals.saved / totals.target) * 100) : 0;

    return {
      totalSaved: totals.saved,
      totalTarget: totals.target,
      completion: Math.min(100, completion),
      nextDeadline: totals.nextDeadline ? new Date(totals.nextDeadline) : null,
    };
  }, [goals]);

  const openDepositModal = (goal: Goal) => {
    setDepositGoal(goal);
    setBannerError(null);
    setBannerSuccess(null);
  };

  const handleCreateGoal = async (values: {
    name: string;
    targetCents: number;
    emoji: string;
    color: string;
    deadlineDate: string | null;
  }) => {
    if (!user?.id) {
      throw new Error("You need to be signed in to create a goal.");
    }

    setCreatingGoal(true);
    setBannerError(null);
    setBannerSuccess(null);

    try {
      const goal = await createGoal({
        userId: user.id,
        name: values.name,
        targetCents: values.targetCents,
        emoji: values.emoji,
        color: values.color,
        deadlineDate: values.deadlineDate,
      });

      setGoals((previous) => [...previous, goal].sort((a, b) => a.created_at.localeCompare(b.created_at)));
      setBannerSuccess(`New goal "${goal.name}" added!`);
      setNewGoalOpen(false);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "We couldn't save that goal right now.";
      setBannerError(message);
      throw new Error(message);
    } finally {
      setCreatingGoal(false);
    }
  };

  const handleDeposit = async (values: { amountCents: number; note?: string }) => {
    if (!user?.id) {
      throw new Error("You need to be signed in to record a deposit.");
    }

    if (!depositGoal) {
      throw new Error("Choose a goal before recording a deposit.");
    }

    const currentGoal = goals.find((goal) => goal.id === depositGoal.id);
    if (!currentGoal) {
      throw new Error("We couldn't find that goal anymore.");
    }

    setDepositingGoalId(currentGoal.id);
    setBannerError(null);
    setBannerSuccess(null);

    const optimisticGoal: Goal = {
      ...currentGoal,
      saved_cents: currentGoal.saved_cents + values.amountCents,
    };

    setGoals((previous) => previous.map((goal) => (goal.id === optimisticGoal.id ? optimisticGoal : goal)));

    try {
      const updated = await recordDeposit({
        userId: user.id,
        goal: currentGoal,
        amountCents: values.amountCents,
        note: values.note,
      });

      setGoals((previous) =>
        previous.map((goal) => (goal.id === updated.id ? updated : goal))
      );
      setBannerSuccess(
        `Deposited ${currencyFormatter(values.amountCents)} toward "${currentGoal.name}".`
      );
      setDepositGoal(null);
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "We couldn't record that deposit.";
      setGoals((previous) =>
        previous.map((goal) => (goal.id === currentGoal.id ? currentGoal : goal))
      );
      setBannerError(message);
      throw new Error(message);
    } finally {
      setDepositingGoalId(null);
    }
  };

  return (
    <section className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>Welcome back, {greeting}!</h1>
          <p className="dashboard-subtitle">
            Create focused savings goals, track deposits, and celebrate your momentum.
          </p>
        </div>
        <button className="button" type="button" onClick={() => setNewGoalOpen(true)}>
          New goal
        </button>
      </header>

      {bannerError ? <div className="alert error">{bannerError}</div> : null}
      {bannerSuccess ? <div className="alert success">{bannerSuccess}</div> : null}
      {goalsError ? <div className="alert error">{goalsError}</div> : null}

      <section className="dashboard-summary">
        <div>
          <span className="summary-label">Total saved</span>
          <span className="summary-value">{currencyFormatter(summary.totalSaved)}</span>
        </div>
        <div>
          <span className="summary-label">Active goals</span>
          <span className="summary-value">{goals.length}</span>
        </div>
        <div>
          <span className="summary-label">Average completion</span>
          <span className="summary-value">{summary.completion}%</span>
        </div>
        <div>
          <span className="summary-label">Next deadline</span>
          <span className="summary-value">
            {summary.nextDeadline ? formatDate(summary.nextDeadline.toISOString()) : "None yet"}
          </span>
        </div>
      </section>

      {goalsLoading ? (
        <p className="muted">Loading your goals…</p>
      ) : goals.length === 0 ? (
        <div className="empty-state">
          <h2>Let&apos;s make your first goal</h2>
          <p className="muted">
            Name your goal, set a target amount, and pick colors or an emoji that make saving fun.
          </p>
          <button className="button" type="button" onClick={() => setNewGoalOpen(true)}>
            Start a goal
          </button>
        </div>
      ) : (
        <div className="goal-grid">
          {goals.map((goal) => {
            const progress = goal.target_cents > 0
              ? Math.min(100, Math.round((goal.saved_cents / goal.target_cents) * 100))
              : 0;
            const remaining = Math.max(goal.target_cents - goal.saved_cents, 0);

            return (
              <article key={goal.id} className="goal-card">
                <div className="goal-progress">
                  <div
                    className="goal-progress-ring"
                    style={{
                      "--progress": String(progress),
                      "--ring-color": goal.color ?? "#7C3AED",
                    } as CSSProperties}
                  >
                    <span>{progress}%</span>
                  </div>
                  <div className="goal-details">
                    <header>
                      <h3>
                        <span className="goal-emoji" aria-hidden="true">
                          {goal.emoji ?? "🏦"}
                        </span>{" "}
                        {goal.name}
                      </h3>
                      <p className="goal-balance">{currencyFormatter(goal.saved_cents)}</p>
                    </header>
                    <dl>
                      <div>
                        <dt>Target</dt>
                        <dd>{currencyFormatter(goal.target_cents)}</dd>
                      </div>
                      <div>
                        <dt>Remaining</dt>
                        <dd>{currencyFormatter(remaining)}</dd>
                      </div>
                      <div>
                        <dt>Deadline</dt>
                        <dd>{formatDate(goal.deadline_date)}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
                <footer>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => openDepositModal(goal)}
                    disabled={depositingGoalId === goal.id}
                  >
                    {depositingGoalId === goal.id ? "Saving…" : "Record deposit"}
                  </button>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      {newGoalOpen ? (
        <NewGoalModal
          onClose={() => setNewGoalOpen(false)}
          onSubmit={handleCreateGoal}
          submitting={creatingGoal}
        />
      ) : null}

      {depositGoal ? (
        <DepositModal
          goal={depositGoal}
          onClose={() => setDepositGoal(null)}
          onSubmit={handleDeposit}
          submitting={depositingGoalId === depositGoal.id}
          currencyFormatter={currencyFormatter}
        />
      ) : null}

    </section>
  );
}

type NewGoalModalProps = {
  onClose: () => void;
  onSubmit: (values: {
    name: string;
    targetCents: number;
    emoji: string;
    color: string;
    deadlineDate: string | null;
  }) => Promise<void>;
  submitting: boolean;
};

function NewGoalModal({ onClose, onSubmit, submitting }: NewGoalModalProps) {
  const [form, setForm] = useState<NewGoalValues>({
    name: "",
    target: "",
    emoji: "🏦",
    color: "#7C3AED",
    deadline: "",
  });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError("Give your goal a name.");
      return;
    }

    const targetValue = Number.parseFloat(form.target);
    if (!Number.isFinite(targetValue) || targetValue <= 0) {
      setError("Enter a target amount greater than zero.");
      return;
    }

    const targetCents = Math.round(targetValue * 100);

    try {
      setError(null);
      await onSubmit({
        name: trimmedName,
        targetCents,
        emoji: form.emoji || "🏦",
        color: form.color || "#7C3AED",
        deadlineDate: form.deadline ? form.deadline : null,
      });
      setForm({ name: "", target: "", emoji: "🏦", color: "#7C3AED", deadline: "" });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to create the goal.";
      setError(message);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <header className="modal-header">
          <h2>Create a goal</h2>
          <button className="link-button" type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="modal-body">
          {error ? <div className="alert error">{error}</div> : null}
          <form className="form" onSubmit={handleSubmit}>
            <label className="form-control">
              <span>Goal name</span>
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, name: event.target.value }))
                }
                placeholder="Emergency fund"
                maxLength={120}
                disabled={submitting}
              />
            </label>
            <label className="form-control">
              <span>Target amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.target}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, target: event.target.value }))
                }
                placeholder="500.00"
                disabled={submitting}
              />
            </label>
            <div className="form-row">
              <label className="form-control">
                <span>Emoji</span>
                <input
                  value={form.emoji}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, emoji: event.target.value }))
                  }
                  maxLength={4}
                  disabled={submitting}
                />
              </label>
              <label className="form-control">
                <span>Accent color</span>
                <input
                  type="color"
                  value={form.color}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, color: event.target.value }))
                  }
                  disabled={submitting}
                />
              </label>
            </div>
            <label className="form-control">
              <span>Deadline (optional)</span>
              <input
                type="date"
                value={form.deadline}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, deadline: event.target.value }))
                }
                disabled={submitting}
              />
            </label>
            <div className="modal-actions">
              <button className="button secondary" type="button" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button className="button primary" type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Save goal"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

type DepositModalProps = {
  goal: Goal;
  onClose: () => void;
  onSubmit: (values: { amountCents: number; note?: string }) => Promise<void>;
  submitting: boolean;
  currencyFormatter: CurrencyFormatter;
};

function DepositModal({ goal, onClose, onSubmit, submitting, currencyFormatter }: DepositModalProps) {
  const [form, setForm] = useState<DepositValues>({ amount: "", note: "" });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const amountValue = Number.parseFloat(form.amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setError("Enter a positive deposit amount.");
      return;
    }

    const amountCents = Math.round(amountValue * 100);

    try {
      setError(null);
      await onSubmit({
        amountCents,
        note: form.note.trim() ? form.note.trim() : undefined,
      });
      setForm({ amount: "", note: "" });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to record the deposit.";
      setError(message);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <header className="modal-header">
          <h2>Record deposit</h2>
          <button className="link-button" type="button" onClick={onClose}>
            Close
          </button>
        </header>
        <div className="modal-body">
          <p className="muted">
            {goal.emoji ?? "🏦"} {goal.name}: {currencyFormatter(goal.saved_cents)} saved of
            {" "}
            {currencyFormatter(goal.target_cents)} target.
          </p>
          {error ? <div className="alert error">{error}</div> : null}
          <form className="form" onSubmit={handleSubmit}>
            <label className="form-control">
              <span>Deposit amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, amount: event.target.value }))
                }
                placeholder="50.00"
                disabled={submitting}
              />
            </label>
            <label className="form-control">
              <span>Note (optional)</span>
              <input
                value={form.note}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, note: event.target.value }))
                }
                placeholder="Paycheck top-up"
                maxLength={120}
                disabled={submitting}
              />
            </label>
            <div className="modal-actions">
              <button className="button secondary" type="button" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button className="button primary" type="submit" disabled={submitting}>
                {submitting ? "Saving…" : "Record deposit"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
