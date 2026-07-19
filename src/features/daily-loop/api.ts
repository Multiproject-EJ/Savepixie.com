import { supabase } from "../../lib/supabase";
import type { Tables } from "../../types/database";

export type DailyProgress = Tables<"daily_saver_progress">;
export type DailyCompletion = Tables<"daily_move_completions">;

export type DailyLoopState = {
  progress: DailyProgress | null;
  completions: DailyCompletion[];
};

export type CompleteDailyMoveInput = {
  moveId: string;
  localDate?: string;
  completionKind: "action" | "save";
  pactId?: string;
  savingsHomeId?: string;
  savedCents?: number;
  reflection?: string;
};

export type DailyMoveResult = {
  completionId: string;
  moveId: string;
  localDate: string;
  completionKind: "action" | "save";
  pactId: string | null;
  savedCents: number;
  stardustAwarded: number;
  currentStreak: number;
  bestStreak: number;
  stardustTotal: number;
  completedMoves: number;
  lastCompletedOn: string;
  wasAlreadyComplete: boolean;
};

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function fetchDailyLoop(userId: string): Promise<DailyLoopState> {
  const [progressResult, completionsResult] = await Promise.all([
    supabase.from("daily_saver_progress").select("*").eq("user_id", userId).maybeSingle(),
    supabase
      .from("daily_move_completions")
      .select("*")
      .eq("user_id", userId)
      .order("local_date", { ascending: false })
      .limit(42),
  ]);

  if (progressResult.error) throw progressResult.error;
  if (completionsResult.error) throw completionsResult.error;

  return {
    progress: progressResult.data,
    completions: completionsResult.data ?? [],
  };
}

export async function completeDailyMove(input: CompleteDailyMoveInput): Promise<DailyMoveResult> {
  const { data, error } = await supabase.rpc("complete_daily_savings_move", {
    p_move_id: input.moveId,
    p_local_date: input.localDate ?? localDateKey(),
    p_completion_kind: input.completionKind,
    ...(input.pactId ? { p_pact_id: input.pactId } : {}),
    ...(input.savingsHomeId ? { p_savings_home_id: input.savingsHomeId } : {}),
    ...(input.savedCents ? { p_saved_cents: input.savedCents } : {}),
    ...(input.reflection?.trim() ? { p_reflection: input.reflection.trim() } : {}),
  });

  if (error) throw error;
  const result = data?.[0];
  if (!result) throw new Error("SavePixie could not confirm today's Savings Move.");

  return {
    completionId: result.completion_id,
    moveId: result.move_id,
    localDate: result.local_date,
    completionKind: result.completion_kind as "action" | "save",
    pactId: result.pact_id,
    savedCents: result.saved_cents,
    stardustAwarded: result.stardust_awarded,
    currentStreak: result.current_streak,
    bestStreak: result.best_streak,
    stardustTotal: result.stardust_total,
    completedMoves: result.completed_moves,
    lastCompletedOn: result.last_completed_on,
    wasAlreadyComplete: result.was_already_complete,
  };
}
