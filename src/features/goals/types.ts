export type Goal = {
  id: string;
  user_id: string;
  name: string;
  target_cents: number;
  saved_cents: number;
  emoji: string | null;
  color: string | null;
  deadline_date: string | null;
  created_at: string;
};

export type GoalEvent = {
  id: string;
  user_id: string;
  goal_id: string;
  delta_cents: number;
  note: string | null;
  created_at: string;
};

export type CreateGoalInput = {
  userId: string;
  name: string;
  targetCents: number;
  emoji?: string;
  color?: string;
  deadlineDate?: string | null;
};

export type DepositInput = {
  userId: string;
  goal: Goal;
  amountCents: number;
  note?: string;
};
