import { supabase } from "../../lib/supabase";
import type { Tables } from "../../types/database";
import type {
  CreateGoalInput,
  CreateSavingsHomeInput,
  DepositInput,
  Goal,
  PactMemberSummary,
  PactMembership,
  PactPrivacyMode,
  SavingsHome,
  UpdateSavingsHomeInput,
} from "./types";

type PactRow = Tables<"savings_pacts">;
type SavingsHomeRow = Tables<"savings_homes">;

function numberValue(value: number | string | null | undefined): number {
  const normalized = typeof value === "string" ? Number(value) : value;
  return typeof normalized === "number" && Number.isFinite(normalized) ? normalized : 0;
}

function normalizeGoal(row: PactRow): Goal {
  return {
    id: row.id,
    user_id: row.created_by,
    mode: row.mode as Goal["mode"],
    name: row.name,
    target_cents: numberValue(row.target_cents),
    saved_cents: numberValue(row.reported_cents),
    verified_cents: numberValue(row.verified_cents),
    emoji: row.emoji,
    color: row.color,
    deadline_date: row.deadline_date,
    contribution_rule: row.contribution_rule as Goal["contribution_rule"],
    status: row.status as Goal["status"],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function normalizeHome(row: SavingsHomeRow): SavingsHome {
  return {
    ...row,
    connection_status: row.connection_status as SavingsHome["connection_status"],
    reported_balance_cents:
      row.reported_balance_cents === null ? null : numberValue(row.reported_balance_cents),
    verified_balance_cents:
      row.verified_balance_cents === null ? null : numberValue(row.verified_balance_cents),
  };
}

function firstRow<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function fetchGoals(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from("savings_pacts")
    .select(
      "id, created_by, mode, name, target_cents, reported_cents, verified_cents, emoji, color, deadline_date, contribution_rule, status, created_at, updated_at"
    )
    .eq("status", "active")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data?.map((row) => normalizeGoal(row)) ?? [];
}

export async function fetchSavingsHomes(userId: string): Promise<SavingsHome[]> {
  const { data, error } = await supabase
    .from("savings_homes")
    .select(
      "id, user_id, label, provider_name, account_hint, connection_status, reported_balance_cents, verified_balance_cents, last_verified_at, created_at, updated_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data?.map((row) => normalizeHome(row)) ?? [];
}

export async function createSavingsHome(input: CreateSavingsHomeInput): Promise<SavingsHome> {
  const { data, error } = await supabase
    .from("savings_homes")
    .insert({
      user_id: input.userId,
      label: input.label.trim(),
      provider_name: input.providerName?.trim() || null,
      account_hint: input.accountHint?.trim() || null,
      reported_balance_cents: input.reportedBalanceCents ?? null,
    })
    .select(
      "id, user_id, label, provider_name, account_hint, connection_status, reported_balance_cents, verified_balance_cents, last_verified_at, created_at, updated_at"
    )
    .single();

  if (error || !data) throw error ?? new Error("Failed to create a Savings Home.");
  return normalizeHome(data);
}

export async function updateSavingsHome(input: UpdateSavingsHomeInput): Promise<SavingsHome> {
  const { data, error } = await supabase
    .from("savings_homes")
    .update({
      label: input.label.trim(),
      provider_name: input.providerName?.trim() || null,
      account_hint: input.accountHint?.trim() || null,
      reported_balance_cents: input.reportedBalanceCents ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .select(
      "id, user_id, label, provider_name, account_hint, connection_status, reported_balance_cents, verified_balance_cents, last_verified_at, created_at, updated_at"
    )
    .single();

  if (error || !data) throw error ?? new Error("Failed to update this Savings Home.");
  return normalizeHome(data);
}

export async function createGoal(input: CreateGoalInput): Promise<Goal> {
  const { data, error } = await supabase.rpc("create_savings_pact", {
    p_mode: input.mode ?? "solo",
    p_name: input.name.trim(),
    p_target_cents: input.targetCents,
    p_emoji: input.emoji ?? "✨",
    p_color: input.color ?? "#7b3fff",
    p_deadline_date: input.deadlineDate ?? undefined,
    p_contribution_rule: input.contributionRule ?? "flexible",
    p_privacy_mode: input.privacyMode ?? (input.mode === "shared" ? "on_track_only" : "private"),
  });

  const row = firstRow(data);
  if (error || !row) throw error ?? new Error("Failed to create a Savings Pact.");
  return normalizeGoal(row);
}

export async function recordDeposit(input: DepositInput): Promise<Goal> {
  const { data, error } = await supabase.rpc("record_pending_pact_save", {
    p_pact_id: input.goal.id,
    p_savings_home_id: input.savingsHomeId,
    p_amount_cents: input.amountCents,
    ...(input.note ? { p_note: input.note } : {}),
  });

  const row = firstRow(data);
  if (error || !row) throw error ?? new Error("Failed to record this pending save.");
  return normalizeGoal(row);
}

export async function createPactInvite(pactId: string): Promise<string> {
  const { data, error } = await supabase.rpc("create_savings_pact_invite", {
    p_pact_id: pactId,
  });
  if (error || !data) throw error ?? new Error("Failed to create a Pact invitation.");
  return data;
}

export async function joinPact(inviteToken: string): Promise<Goal> {
  const { data, error } = await supabase.rpc("join_savings_pact", {
    p_invite_token: inviteToken,
  });
  const row = firstRow(data);
  if (error || !row) throw error ?? new Error("This Pact invitation could not be joined.");
  return normalizeGoal(row);
}

export async function fetchPactMembers(pactId: string): Promise<PactMemberSummary[]> {
  const { data, error } = await supabase.rpc("get_savings_pact_members", {
    p_pact_id: pactId,
  });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    pact_id: row.pact_id,
    user_id: row.user_id,
    role: row.role as PactMemberSummary["role"],
    display_name: row.display_name,
    commitment_cents: row.commitment_cents === null ? null : numberValue(row.commitment_cents),
    privacy_mode: row.privacy_mode as PactPrivacyMode,
    status: row.member_status as PactMemberSummary["status"],
    joined_at: row.joined_at,
    left_at: row.left_at,
    reported_cents: row.reported_cents === null ? null : numberValue(row.reported_cents),
    verified_cents: row.verified_cents === null ? null : numberValue(row.verified_cents),
    amount_visible: row.amount_visible,
    on_track: row.on_track,
  }));
}

export async function fetchOwnPactMembership(
  pactId: string,
  userId: string
): Promise<PactMembership> {
  const { data, error } = await supabase
    .from("savings_pact_members")
    .select(
      "pact_id, user_id, role, display_name, commitment_cents, privacy_mode, status, joined_at, left_at"
    )
    .eq("pact_id", pactId)
    .eq("user_id", userId)
    .single();

  if (error || !data) throw error ?? new Error("Pact membership not found.");
  return {
    ...data,
    role: data.role as PactMembership["role"],
    privacy_mode: data.privacy_mode as PactPrivacyMode,
    status: data.status as PactMembership["status"],
    commitment_cents: data.commitment_cents === null ? null : numberValue(data.commitment_cents),
  };
}

export async function updatePactMembership(input: {
  pactId: string;
  userId: string;
  commitmentCents: number | null;
  privacyMode: PactPrivacyMode;
}): Promise<PactMembership> {
  const { data, error } = await supabase
    .from("savings_pact_members")
    .update({
      commitment_cents: input.commitmentCents,
      privacy_mode: input.privacyMode,
    })
    .eq("pact_id", input.pactId)
    .eq("user_id", input.userId)
    .select(
      "pact_id, user_id, role, display_name, commitment_cents, privacy_mode, status, joined_at, left_at"
    )
    .single();

  if (error || !data) throw error ?? new Error("We couldn't update your Pact preferences.");
  return {
    ...data,
    role: data.role as PactMembership["role"],
    privacy_mode: data.privacy_mode as PactPrivacyMode,
    status: data.status as PactMembership["status"],
    commitment_cents: data.commitment_cents === null ? null : numberValue(data.commitment_cents),
  };
}

export async function leavePact(pactId: string): Promise<void> {
  const { error } = await supabase.rpc("leave_savings_pact", { p_pact_id: pactId });
  if (error) throw error;
}

export async function archivePact(pactId: string): Promise<void> {
  const { error } = await supabase
    .from("savings_pacts")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", pactId);
  if (error) throw error;
}
