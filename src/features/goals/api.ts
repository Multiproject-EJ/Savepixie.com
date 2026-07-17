import { supabase } from "../../lib/supabase";
import type { Tables } from "../../types/database";
import type { CreateGoalInput, DepositInput, Goal } from "./types";

type GoalRow = Tables<"goals">;

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

  return data?.map((row) => normalizeGoal(row)) ?? [];
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

  return normalizeGoal(data);
}

export async function recordDeposit(input: DepositInput): Promise<Goal> {
  const { goal, amountCents, note, userId } = input;

  if (goal.user_id !== userId) {
    throw new Error("Choose one of your own goals for this save.");
  }

  const { data, error } = await supabase.rpc("record_goal_deposit", {
    p_goal_id: goal.id,
    p_amount_cents: amountCents,
    ...(note ? { p_note: note } : {}),
  });

  if (error || !data) {
    throw error ?? new Error("Failed to record deposit");
  }

  const updatedGoal = Array.isArray(data) ? data[0] : data;
  if (!updatedGoal) {
    throw new Error("The deposit was recorded, but the updated goal was not returned.");
  }

  return normalizeGoal(updatedGoal);
}
