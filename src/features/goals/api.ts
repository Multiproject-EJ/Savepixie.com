import { supabase } from "../../lib/supabase";
import type { CreateGoalInput, DepositInput, Goal } from "./types";

type GoalRow = {
  id: string;
  user_id: string;
  name: string;
  target_cents: number | string;
  saved_cents: number | string;
  emoji: string | null;
  color: string | null;
  deadline_date: string | null;
  created_at: string;
};

function normalizeGoal(row: GoalRow): Goal {
  const target = typeof row.target_cents === "string" ? Number(row.target_cents) : row.target_cents;
  const saved = typeof row.saved_cents === "string" ? Number(row.saved_cents) : row.saved_cents;

  return {
    ...row,
    target_cents: Number.isFinite(target) ? target : 0,
    saved_cents: Number.isFinite(saved) ? saved : 0,
  };
}

export async function fetchGoals(userId: string): Promise<Goal[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("id, user_id, name, target_cents, saved_cents, emoji, color, deadline_date, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return (data as GoalRow[] | null)?.map((row) => normalizeGoal(row)) ?? [];
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const payload = {
    user_id: input.userId,
    name: input.name,
    target_cents: input.targetCents,
    emoji: input.emoji ?? "🏦",
    color: input.color ?? "#7C3AED",
    deadline_date: input.deadlineDate ?? null,
  };

  const { data, error } = await supabase
    .from("goals")
    .insert(payload)
    .select("id, user_id, name, target_cents, saved_cents, emoji, color, deadline_date, created_at")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to create goal");
  }

  return normalizeGoal(data as GoalRow);
}

export async function recordDeposit(input: DepositInput): Promise<Goal> {
  const { goal, amountCents, note, userId } = input;

  const { error: eventError } = await supabase.from("goal_events").insert({
    user_id: userId,
    goal_id: goal.id,
    delta_cents: amountCents,
    note: note ?? null,
  });

  if (eventError) {
    throw eventError;
  }

  const newSavedCents = goal.saved_cents + amountCents;

  const { data: updatedGoal, error: goalError } = await supabase
    .from("goals")
    .update({ saved_cents: newSavedCents })
    .eq("id", goal.id)
    .eq("user_id", userId)
    .select("id, user_id, name, target_cents, saved_cents, emoji, color, deadline_date, created_at")
    .single();

  if (goalError || !updatedGoal) {
    throw goalError ?? new Error("Failed to update goal after deposit");
  }

  return normalizeGoal(updatedGoal as GoalRow);
}
