import { supabase } from "../../lib/supabase";
import type { Tables } from "../../types/database";

type WeeklyPlanRow = Tables<"weekly_plans">;

export type WeeklyPlan = {
  weekStart: string;
  availableCents: number;
  committedCents: number;
  savingCents: number;
  updatedAt: string | null;
};

export type WeeklyPlanInput = Omit<WeeklyPlan, "updatedAt">;

function normalizePlan(row: WeeklyPlanRow): WeeklyPlan {
  return {
    weekStart: row.week_start,
    availableCents: Number(row.available_cents),
    committedCents: Number(row.committed_cents),
    savingCents: Number(row.saving_cents),
    updatedAt: row.updated_at,
  };
}

export function currentWeekStart(date = new Date()): string {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceMonday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - daysSinceMonday);

  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, "0");
  const day = String(monday.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function fetchWeeklyPlan(
  userId: string,
  weekStart: string
): Promise<WeeklyPlan | null> {
  const { data, error } = await supabase
    .from("weekly_plans")
    .select(
      "user_id, week_start, available_cents, committed_cents, saving_cents, created_at, updated_at"
    )
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizePlan(data) : null;
}

export async function saveWeeklyPlan(userId: string, plan: WeeklyPlanInput): Promise<WeeklyPlan> {
  const { data, error } = await supabase
    .from("weekly_plans")
    .upsert(
      {
        user_id: userId,
        week_start: plan.weekStart,
        available_cents: plan.availableCents,
        committed_cents: plan.committedCents,
        saving_cents: plan.savingCents,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,week_start" }
    )
    .select(
      "user_id, week_start, available_cents, committed_cents, saving_cents, created_at, updated_at"
    )
    .single();

  if (error || !data) throw error ?? new Error("We couldn't save this week's plan.");
  return normalizePlan(data);
}
