import type { Goal } from "./types";

const DAY_MS = 86_400_000;

export type PactMilestone = {
  percent: number;
  targetCents: number;
  reached: boolean;
};

export function pactMilestones(goal: Goal): PactMilestone[] {
  return [25, 50, 75, 100].map((percent) => {
    const targetCents = Math.ceil((goal.target_cents * percent) / 100);
    return {
      percent,
      targetCents,
      reached: goal.saved_cents >= targetCents,
    };
  });
}

export function nextPactMilestone(goal: Goal): PactMilestone | null {
  return pactMilestones(goal).find((milestone) => !milestone.reached) ?? null;
}

export function weeklyPactPace(goal: Goal, now = new Date()): number | null {
  if (!goal.deadline_date) return null;
  const remainingCents = Math.max(0, goal.target_cents - goal.saved_cents);
  if (!remainingCents) return 0;

  const deadline = new Date(`${goal.deadline_date}T12:00:00`);
  if (!Number.isFinite(deadline.getTime())) return null;
  const weeksRemaining = Math.max(1, Math.ceil((deadline.getTime() - now.getTime()) / DAY_MS / 7));
  return Math.ceil(remainingCents / weeksRemaining);
}
