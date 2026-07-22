import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  completeDailyMove as completeDailyMoveRequest,
  fetchDailyLoop,
  localDateKey,
  type CompleteDailyMoveInput,
  type DailyCompletion,
  type DailyMoveResult,
  type DailyProgress,
} from "../features/daily-loop/api";
import {
  createGoal,
  createPactInvite,
  createSavingsHome,
  fetchGoals,
  fetchSavingsHomes,
  joinPact,
  recordDeposit,
  updateSavingsHome,
} from "../features/goals/api";
import type { Goal, SavingsHome } from "../features/goals/types";
import {
  fetchProfile,
  updatePlanningPreferences as updatePlanningPreferencesRequest,
  type PlanningPreferences,
  type ProfileRow,
} from "../features/profile/api";
import {
  getPreferredCurrency,
  isSavingsCurrency,
  rememberPreferredCurrency,
  type SavingsCurrency,
} from "../lib/currency";
import { reportClientError } from "../lib/telemetry";
import { useAuth } from "./AuthProvider";

export type NewGoalInput = {
  mode?: "solo" | "shared";
  name: string;
  targetCents: number;
  emoji?: string;
  color?: string;
  deadlineDate?: string | null;
  contributionRule?: Goal["contribution_rule"];
  privacyMode?: "exact" | "on_track_only" | "organizer_only" | "private";
};

export type SavingsHomeInput = {
  label: string;
  providerName?: string | null;
  accountHint?: string | null;
  reportedBalanceCents?: number | null;
};

type SavingsContextValue = {
  profile: ProfileRow | null;
  goals: Goal[];
  savingsHomes: SavingsHome[];
  dailyProgress: DailyProgress | null;
  dailyCompletions: DailyCompletion[];
  ready: boolean;
  loading: boolean;
  error: string | null;
  displayName: string;
  currencyCode: SavingsCurrency;
  monthlySavingsCapacityCents: number | null;
  refresh: () => Promise<void>;
  addGoal: (input: NewGoalInput) => Promise<Goal>;
  startFirstGoal: (
    input: NewGoalInput & {
      initialDepositCents: number;
      savingsHome: SavingsHomeInput;
    }
  ) => Promise<{ goal: Goal; initialSaveRecorded: boolean }>;
  deposit: (goalId: string, amountCents: number, note?: string) => Promise<Goal>;
  completeDailyMove: (input: CompleteDailyMoveInput) => Promise<DailyMoveResult>;
  createInvite: (pactId: string) => Promise<string>;
  joinSharedPact: (inviteToken: string) => Promise<Goal>;
  updateHome: (input: SavingsHomeInput & { id: string }) => Promise<SavingsHome>;
  savePlanningPreferences: (input: PlanningPreferences) => Promise<ProfileRow>;
};

const SavingsContext = createContext<SavingsContextValue | undefined>(undefined);

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

export function SavingsProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [savingsHomes, setSavingsHomes] = useState<SavingsHome[]>([]);
  const [dailyProgress, setDailyProgress] = useState<DailyProgress | null>(null);
  const [dailyCompletions, setDailyCompletions] = useState<DailyCompletion[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setGoals([]);
      setSavingsHomes([]);
      setDailyProgress(null);
      setDailyCompletions([]);
      setReady(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [nextProfile, nextGoals, nextHomes, nextDailyLoop] = await Promise.all([
        fetchProfile(user.id),
        fetchGoals(),
        fetchSavingsHomes(user.id),
        fetchDailyLoop(user.id),
      ]);
      setProfile(nextProfile);
      if (isSavingsCurrency(nextProfile?.currency_code)) {
        rememberPreferredCurrency(nextProfile.currency_code);
      }
      setGoals(nextGoals);
      setSavingsHomes(nextHomes);
      setDailyProgress(nextDailyLoop.progress);
      setDailyCompletions(nextDailyLoop.completions);
      setReady(true);
    } catch (cause) {
      reportClientError("private_data_load", "app");
      setError(errorMessage(cause, "We couldn't load your SavePixie space."));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addGoal = useCallback(async (input: NewGoalInput) => {
    const goal = await createGoal(input);
    setGoals((current) => [...current, goal]);
    return goal;
  }, []);

  const startFirstGoal = useCallback(
    async (
      input: NewGoalInput & {
        initialDepositCents: number;
        savingsHome: SavingsHomeInput;
      }
    ) => {
      if (!user?.id) throw new Error("Sign in before starting your first Pact.");

      let home = savingsHomes[0] ?? null;
      if (!home) {
        home = await createSavingsHome({
          userId: user.id,
          label: input.savingsHome.label,
          providerName: input.savingsHome.providerName,
          accountHint: input.savingsHome.accountHint,
          reportedBalanceCents: input.savingsHome.reportedBalanceCents,
        });
        setSavingsHomes((current) => [...current, home as SavingsHome]);
      }

      const createdGoal = await createGoal(input);
      let goal = createdGoal;
      let initialSaveRecorded = input.initialDepositCents <= 0;

      if (input.initialDepositCents > 0) {
        try {
          goal = await recordDeposit({
            goal: createdGoal,
            savingsHomeId: home.id,
            amountCents: input.initialDepositCents,
            note: "My first pending save",
          });
          initialSaveRecorded = true;
        } catch {
          reportClientError("save_action", "saving");
          initialSaveRecorded = false;
        }
      }

      setGoals((current) => [...current, goal]);
      return { goal, initialSaveRecorded };
    },
    [savingsHomes, user?.id]
  );

  const deposit = useCallback(
    async (goalId: string, amountCents: number, note?: string) => {
      const goal = goals.find((item) => item.id === goalId);
      if (!goal) throw new Error("Choose a Pact for this save.");

      const home = savingsHomes[0];
      if (!home) {
        throw new Error("Set up your Savings Home before recording a save.");
      }

      const optimistic = { ...goal, saved_cents: goal.saved_cents + amountCents };
      setGoals((current) => current.map((item) => (item.id === goalId ? optimistic : item)));

      try {
        const updated = await recordDeposit({
          goal,
          savingsHomeId: home.id,
          amountCents,
          note,
        });
        setGoals((current) => current.map((item) => (item.id === goalId ? updated : item)));
        return updated;
      } catch (cause) {
        reportClientError("save_action", "saving");
        setGoals((current) => current.map((item) => (item.id === goalId ? goal : item)));
        throw cause;
      }
    },
    [goals, savingsHomes]
  );

  const createInvite = useCallback((pactId: string) => createPactInvite(pactId), []);

  const completeDailyMove = useCallback(
    async (input: CompleteDailyMoveInput) => {
      if (!user?.id) throw new Error("Sign in before completing today's Savings Move.");

      const result = await completeDailyMoveRequest(input);
      const [nextDailyLoop, nextGoals] = await Promise.all([
        fetchDailyLoop(user.id),
        result.completionKind === "save" ? fetchGoals() : Promise.resolve(null),
      ]);

      setDailyProgress(nextDailyLoop.progress);
      setDailyCompletions(nextDailyLoop.completions);
      if (nextGoals) setGoals(nextGoals);
      return result;
    },
    [user?.id]
  );

  const joinSharedPact = useCallback(async (inviteToken: string) => {
    const joined = await joinPact(inviteToken);
    setGoals((current) =>
      current.some((goal) => goal.id === joined.id) ? current : [...current, joined]
    );
    return joined;
  }, []);

  const updateHome = useCallback(async (input: SavingsHomeInput & { id: string }) => {
    const updated = await updateSavingsHome(input);
    setSavingsHomes((current) => current.map((home) => (home.id === updated.id ? updated : home)));
    return updated;
  }, []);

  const savePlanningPreferences = useCallback(
    async (input: PlanningPreferences) => {
      if (!user?.id) throw new Error("Sign in before saving your planning preferences.");
      const updated = await updatePlanningPreferencesRequest(user.id, input);
      setProfile(updated);
      rememberPreferredCurrency(input.currencyCode);
      return updated;
    },
    [user?.id]
  );

  const displayName = profile?.display_name?.trim() || user?.email?.split("@")[0] || "Saver";
  const currencyCode = isSavingsCurrency(profile?.currency_code)
    ? profile.currency_code
    : getPreferredCurrency();
  const monthlySavingsCapacityCents = profile?.monthly_savings_capacity_cents ?? null;

  const value = useMemo<SavingsContextValue>(
    () => ({
      profile,
      goals,
      savingsHomes,
      dailyProgress,
      dailyCompletions,
      ready,
      loading,
      error,
      displayName,
      currencyCode,
      monthlySavingsCapacityCents,
      refresh,
      addGoal,
      startFirstGoal,
      deposit,
      completeDailyMove,
      createInvite,
      joinSharedPact,
      updateHome,
      savePlanningPreferences,
    }),
    [
      addGoal,
      completeDailyMove,
      createInvite,
      dailyCompletions,
      dailyProgress,
      deposit,
      displayName,
      currencyCode,
      error,
      goals,
      joinSharedPact,
      loading,
      profile,
      ready,
      refresh,
      savingsHomes,
      startFirstGoal,
      savePlanningPreferences,
      updateHome,
    ]
  );

  return <SavingsContext.Provider value={value}>{children}</SavingsContext.Provider>;
}

const previewProfile: ProfileRow = {
  id: "preview-user",
  username: "maya",
  display_name: "Maya",
  avatar_url: null,
  currency_code: "NOK",
  monthly_savings_capacity_cents: 300000,
  created_at: "2026-07-15T12:00:00.000Z",
};

const previewHome: SavingsHome = {
  id: "preview-home",
  user_id: "preview-user",
  label: "My dedicated savings account",
  provider_name: "Example Bank",
  account_hint: "••42",
  connection_status: "manual",
  reported_balance_cents: 555000,
  verified_balance_cents: null,
  last_verified_at: null,
  created_at: "2026-07-15T12:00:00.000Z",
  updated_at: "2026-07-15T12:00:00.000Z",
};

const previewGoals: Goal[] = [
  {
    id: "preview-japan",
    user_id: "preview-user",
    mode: "shared",
    name: "Japan trip",
    currency_code: "NOK",
    target_cents: 1200000,
    saved_cents: 420000,
    verified_cents: 0,
    emoji: "🌸",
    color: "#7b3fff",
    deadline_date: "2027-04-01",
    contribution_rule: "flexible",
    status: "active",
    created_at: "2026-07-15T12:00:00.000Z",
    updated_at: "2026-07-15T12:00:00.000Z",
  },
  {
    id: "preview-buffer",
    user_id: "preview-user",
    mode: "solo",
    name: "Peace-of-mind fund",
    currency_code: "NOK",
    target_cents: 500000,
    saved_cents: 135000,
    verified_cents: 0,
    emoji: "🌿",
    color: "#38dfc6",
    deadline_date: null,
    contribution_rule: "flexible",
    status: "active",
    created_at: "2026-07-15T12:00:00.000Z",
    updated_at: "2026-07-15T12:00:00.000Z",
  },
];

type SavingsPreviewProviderProps = PropsWithChildren<{
  initialGoals?: Goal[];
}>;

export function SavingsPreviewProvider({
  children,
  initialGoals = previewGoals,
}: SavingsPreviewProviderProps) {
  const initialCurrency = getPreferredCurrency();
  const [profile, setProfile] = useState<ProfileRow>(() => ({
    ...previewProfile,
    currency_code: initialCurrency,
  }));
  const [goals, setGoals] = useState<Goal[]>(() => initialGoals);
  const [dailyProgress, setDailyProgress] = useState<DailyProgress>({
    user_id: previewProfile.id,
    current_streak: 3,
    best_streak: 6,
    stardust_total: 165,
    completed_moves: 7,
    last_completed_on: previewDate(-1),
    updated_at: new Date().toISOString(),
  });
  const [dailyCompletions, setDailyCompletions] = useState<DailyCompletion[]>([
    previewCompletion("round-up-rally", -1, "save", 3000),
    previewCompletion("pause-power", -2, "action", 0),
    previewCompletion("swap-and-save", -3, "save", 5000),
  ]);
  const previewCurrencyCode = isSavingsCurrency(profile.currency_code)
    ? profile.currency_code
    : initialCurrency;

  const refresh = useCallback(async () => undefined, []);

  const addGoal = useCallback(
    async (input: NewGoalInput) => {
      const now = new Date().toISOString();
      const goal: Goal = {
        id: `preview-${Date.now()}`,
        user_id: profile.id,
        mode: input.mode ?? "solo",
        name: input.name,
        currency_code: previewCurrencyCode,
        target_cents: input.targetCents,
        saved_cents: 0,
        verified_cents: 0,
        emoji: input.emoji || "✨",
        color: input.color || "#7b3fff",
        deadline_date: input.deadlineDate || null,
        contribution_rule: input.contributionRule ?? "flexible",
        status: "active",
        created_at: now,
        updated_at: now,
      };
      setGoals((current) => [...current, goal]);
      return goal;
    },
    [previewCurrencyCode, profile.id]
  );

  const startFirstGoal = useCallback(
    async (
      input: NewGoalInput & {
        initialDepositCents: number;
        savingsHome: SavingsHomeInput;
      }
    ) => {
      const now = new Date().toISOString();
      const goal: Goal = {
        id: `preview-${Date.now()}`,
        user_id: profile.id,
        mode: input.mode ?? "solo",
        name: input.name,
        currency_code: previewCurrencyCode,
        target_cents: input.targetCents,
        saved_cents: input.initialDepositCents,
        verified_cents: 0,
        emoji: input.emoji || "✨",
        color: input.color || "#7b3fff",
        deadline_date: input.deadlineDate || null,
        contribution_rule: input.contributionRule ?? "flexible",
        status: "active",
        created_at: now,
        updated_at: now,
      };
      setGoals((current) => [...current, goal]);
      return { goal, initialSaveRecorded: true };
    },
    [previewCurrencyCode, profile.id]
  );

  const deposit = useCallback(
    async (goalId: string, amountCents: number) => {
      const goal = goals.find((item) => item.id === goalId);
      if (!goal) throw new Error("Choose a Pact for this save.");
      const updated = { ...goal, saved_cents: goal.saved_cents + amountCents };
      setGoals((current) => current.map((item) => (item.id === goalId ? updated : item)));
      return updated;
    },
    [goals]
  );

  const createInvite = useCallback(async () => "preview-invite", []);
  const completeDailyMove = useCallback(
    async (input: CompleteDailyMoveInput): Promise<DailyMoveResult> => {
      const date = input.localDate ?? localDateKey();
      const existing = dailyCompletions.find((completion) => completion.local_date === date);
      if (existing) {
        return {
          completionId: existing.id,
          moveId: existing.move_id,
          localDate: existing.local_date,
          completionKind: existing.completion_kind as "action" | "save",
          pactId: existing.pact_id,
          savedCents: existing.saved_cents,
          stardustAwarded: existing.stardust_awarded,
          currentStreak: dailyProgress.current_streak,
          bestStreak: dailyProgress.best_streak,
          stardustTotal: dailyProgress.stardust_total,
          completedMoves: dailyProgress.completed_moves,
          lastCompletedOn: dailyProgress.last_completed_on || date,
          wasAlreadyComplete: true,
        };
      }

      const stardustAwarded = input.completionKind === "save" ? 35 : 25;
      const nextStreak = dailyProgress.last_completed_on === previewDate(-1) ? 4 : 1;
      const completion: DailyCompletion = {
        id: `preview-move-${Date.now()}`,
        user_id: previewProfile.id,
        move_id: input.moveId,
        local_date: date,
        completion_kind: input.completionKind,
        pact_id: input.pactId ?? null,
        saved_cents: input.savedCents ?? 0,
        stardust_awarded: stardustAwarded,
        reflection: input.reflection?.trim() || null,
        created_at: new Date().toISOString(),
      };

      if (input.completionKind === "save" && input.pactId && input.savedCents) {
        setGoals((current) =>
          current.map((goal) =>
            goal.id === input.pactId
              ? { ...goal, saved_cents: goal.saved_cents + (input.savedCents ?? 0) }
              : goal
          )
        );
      }

      const nextProgress: DailyProgress = {
        ...dailyProgress,
        current_streak: nextStreak,
        best_streak: Math.max(dailyProgress.best_streak, nextStreak),
        stardust_total: dailyProgress.stardust_total + stardustAwarded,
        completed_moves: dailyProgress.completed_moves + 1,
        last_completed_on: date,
        updated_at: new Date().toISOString(),
      };
      setDailyCompletions((current) => [completion, ...current]);
      setDailyProgress(nextProgress);

      return {
        completionId: completion.id,
        moveId: completion.move_id,
        localDate: date,
        completionKind: input.completionKind,
        pactId: completion.pact_id,
        savedCents: completion.saved_cents,
        stardustAwarded,
        currentStreak: nextProgress.current_streak,
        bestStreak: nextProgress.best_streak,
        stardustTotal: nextProgress.stardust_total,
        completedMoves: nextProgress.completed_moves,
        lastCompletedOn: date,
        wasAlreadyComplete: false,
      };
    },
    [dailyCompletions, dailyProgress]
  );
  const joinSharedPact = useCallback(async () => previewGoals[0], []);
  const updateHome = useCallback(async (input: SavingsHomeInput & { id: string }) => {
    const now = new Date().toISOString();
    return {
      ...previewHome,
      id: input.id,
      label: input.label,
      provider_name: input.providerName ?? null,
      account_hint: input.accountHint ?? null,
      reported_balance_cents: input.reportedBalanceCents ?? null,
      updated_at: now,
    };
  }, []);
  const savePlanningPreferences = useCallback(
    async (input: PlanningPreferences) => {
      rememberPreferredCurrency(input.currencyCode);
      const updated = {
        ...profile,
        currency_code: input.currencyCode,
        monthly_savings_capacity_cents: input.monthlySavingsCapacityCents,
      };
      setProfile(updated);
      return updated;
    },
    [profile]
  );

  const value = useMemo<SavingsContextValue>(
    () => ({
      profile,
      goals,
      savingsHomes: [previewHome],
      dailyProgress,
      dailyCompletions,
      ready: true,
      loading: false,
      error: null,
      displayName: profile.display_name || "Saver",
      currencyCode: previewCurrencyCode,
      monthlySavingsCapacityCents: profile.monthly_savings_capacity_cents,
      refresh,
      addGoal,
      startFirstGoal,
      deposit,
      completeDailyMove,
      createInvite,
      joinSharedPact,
      updateHome,
      savePlanningPreferences,
    }),
    [
      addGoal,
      completeDailyMove,
      createInvite,
      dailyCompletions,
      dailyProgress,
      deposit,
      goals,
      joinSharedPact,
      profile,
      previewCurrencyCode,
      refresh,
      savePlanningPreferences,
      startFirstGoal,
      updateHome,
    ]
  );

  return <SavingsContext.Provider value={value}>{children}</SavingsContext.Provider>;
}

function previewDate(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return localDateKey(date);
}

function previewCompletion(
  moveId: string,
  offset: number,
  kind: "action" | "save",
  savedCents: number
): DailyCompletion {
  return {
    id: `preview-${moveId}-${offset}`,
    user_id: previewProfile.id,
    move_id: moveId,
    local_date: previewDate(offset),
    completion_kind: kind,
    pact_id: kind === "save" ? previewGoals[0].id : null,
    saved_cents: savedCents,
    stardust_awarded: kind === "save" ? 35 : 25,
    reflection: null,
    created_at: new Date().toISOString(),
  };
}

export function useSavings() {
  const context = useContext(SavingsContext);
  if (!context) throw new Error("useSavings must be used within SavingsProvider");
  return context;
}
