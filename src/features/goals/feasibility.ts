const DAY_MS = 86_400_000;
const AVERAGE_MONTH_DAYS = 365.2425 / 12;
const MAX_AUTOMATIC_EXTENSION_MONTHS = 120;

export type GoalFeasibilityStatus = "comfortable" | "workable" | "over_budget" | "invalid";

export type GoalFeasibility = {
  status: GoalFeasibilityStatus;
  monthsRemaining: number;
  requiredMonthlyCents: number;
  monthlyCapacityCents: number;
  reachableTargetCents: number;
  suggestedDeadline: string | null;
};

type GoalFeasibilityInput = {
  targetCents: number;
  deadlineDate: string;
  monthlyCapacityCents: number;
  alreadySavedCents?: number;
  now?: Date;
};

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function assessGoalFeasibility({
  targetCents,
  deadlineDate,
  monthlyCapacityCents,
  alreadySavedCents = 0,
  now = new Date(),
}: GoalFeasibilityInput): GoalFeasibility {
  const deadline = new Date(`${deadlineDate}T12:00:00`);
  const remainingCents = Math.max(0, targetCents - alreadySavedCents);

  if (
    !Number.isFinite(deadline.getTime()) ||
    deadline.getTime() <= now.getTime() ||
    targetCents <= 0 ||
    monthlyCapacityCents <= 0
  ) {
    return {
      status: "invalid",
      monthsRemaining: 0,
      requiredMonthlyCents: 0,
      monthlyCapacityCents,
      reachableTargetCents: 0,
      suggestedDeadline: null,
    };
  }

  const daysRemaining = Math.max(1, (deadline.getTime() - now.getTime()) / DAY_MS);
  const monthsRemaining = Math.max(1, Math.ceil(daysRemaining / AVERAGE_MONTH_DAYS));
  const requiredMonthlyCents = Math.ceil(remainingCents / monthsRemaining);
  const reachableTargetCents = alreadySavedCents + monthlyCapacityCents * monthsRemaining;
  const monthsNeeded = Math.max(1, Math.ceil(remainingCents / monthlyCapacityCents));
  const suggested = new Date(now);
  suggested.setMonth(suggested.getMonth() + monthsNeeded);

  return {
    status:
      requiredMonthlyCents <= monthlyCapacityCents * 0.8
        ? "comfortable"
        : requiredMonthlyCents <= monthlyCapacityCents
          ? "workable"
          : "over_budget",
    monthsRemaining,
    requiredMonthlyCents,
    monthlyCapacityCents,
    reachableTargetCents,
    suggestedDeadline: monthsNeeded <= MAX_AUTOMATIC_EXTENSION_MONTHS ? isoDate(suggested) : null,
  };
}
