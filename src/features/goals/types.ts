import type { SavingsCurrency } from "../../lib/currency";

export type Goal = {
  id: string;
  user_id: string;
  mode: "solo" | "shared";
  name: string;
  currency_code: SavingsCurrency;
  target_cents: number;
  saved_cents: number;
  verified_cents: number;
  emoji: string | null;
  color: string | null;
  deadline_date: string | null;
  contribution_rule: "flexible" | "equal" | "custom" | "proportional" | "matched";
  status: "active" | "achieved" | "archived";
  created_at: string;
  updated_at: string;
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
  mode?: "solo" | "shared";
  name: string;
  targetCents: number;
  emoji?: string;
  color?: string;
  deadlineDate?: string | null;
  contributionRule?: "flexible" | "equal" | "custom" | "proportional" | "matched";
  privacyMode?: "exact" | "on_track_only" | "organizer_only" | "private";
};

export type DepositInput = {
  goal: Goal;
  savingsHomeId: string;
  amountCents: number;
  note?: string;
};

export type SavingsHome = {
  id: string;
  user_id: string;
  label: string;
  provider_name: string | null;
  account_hint: string | null;
  connection_status: "manual" | "connected" | "consent_expired" | "disconnected";
  reported_balance_cents: number | null;
  verified_balance_cents: number | null;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateSavingsHomeInput = {
  userId: string;
  label: string;
  providerName?: string | null;
  accountHint?: string | null;
  reportedBalanceCents?: number | null;
};

export type UpdateSavingsHomeInput = Omit<CreateSavingsHomeInput, "userId"> & {
  id: string;
};

export type PactPrivacyMode = "exact" | "on_track_only" | "organizer_only" | "private";

export type PactMembership = {
  pact_id: string;
  user_id: string;
  role: "owner" | "member";
  display_name: string;
  commitment_cents: number | null;
  privacy_mode: PactPrivacyMode;
  status: "active" | "left";
  joined_at: string;
  left_at: string | null;
};

export type PactMemberSummary = PactMembership & {
  reported_cents: number | null;
  verified_cents: number | null;
  amount_visible: boolean;
  on_track: boolean | null;
};

export type PactEntry = {
  id: string;
  pact_id: string;
  member_user_id: string;
  entry_type: "commitment" | "pending" | "allocation" | "withdrawal" | "reversal";
  delta_cents: number;
  verification_state: "reported" | "verified" | "reversed";
  note: string | null;
  created_at: string;
};

export type PactActivity = {
  activity_id: string;
  actor_user_id: string;
  actor_display_name: string;
  activity_kind: "save" | "verified_save" | "adjustment";
  amount_cents: number | null;
  amount_visible: boolean;
  occurred_at: string;
};

export type PactActivityCheer = {
  activity_id: string;
  cheer_count: number;
  cheered_by_me: boolean;
};
