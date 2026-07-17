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
import { fetchProfile, type ProfileRow } from "../features/profile/api";
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
  loading: boolean;
  error: string | null;
  displayName: string;
  refresh: () => Promise<void>;
  addGoal: (input: NewGoalInput) => Promise<Goal>;
  startFirstGoal: (
    input: NewGoalInput & {
      initialDepositCents: number;
      savingsHome: SavingsHomeInput;
    }
  ) => Promise<{ goal: Goal; initialSaveRecorded: boolean }>;
  deposit: (goalId: string, amountCents: number, note?: string) => Promise<Goal>;
  createInvite: (pactId: string) => Promise<string>;
  joinSharedPact: (inviteToken: string) => Promise<Goal>;
  updateHome: (input: SavingsHomeInput & { id: string }) => Promise<SavingsHome>;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setGoals([]);
      setSavingsHomes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [nextProfile, nextGoals, nextHomes] = await Promise.all([
        fetchProfile(user.id),
        fetchGoals(),
        fetchSavingsHomes(user.id),
      ]);
      setProfile(nextProfile);
      setGoals(nextGoals);
      setSavingsHomes(nextHomes);
    } catch (cause) {
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
        setGoals((current) => current.map((item) => (item.id === goalId ? goal : item)));
        throw cause;
      }
    },
    [goals, savingsHomes]
  );

  const createInvite = useCallback((pactId: string) => createPactInvite(pactId), []);

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

  const displayName = profile?.display_name?.trim() || user?.email?.split("@")[0] || "Saver";

  const value = useMemo<SavingsContextValue>(
    () => ({
      profile,
      goals,
      savingsHomes,
      loading,
      error,
      displayName,
      refresh,
      addGoal,
      startFirstGoal,
      deposit,
      createInvite,
      joinSharedPact,
      updateHome,
    }),
    [
      addGoal,
      createInvite,
      deposit,
      displayName,
      error,
      goals,
      joinSharedPact,
      loading,
      profile,
      refresh,
      savingsHomes,
      startFirstGoal,
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

export function SavingsPreviewProvider({ children }: PropsWithChildren) {
  const [goals, setGoals] = useState(previewGoals);

  const refresh = useCallback(async () => undefined, []);

  const addGoal = useCallback(async (input: NewGoalInput) => {
    const now = new Date().toISOString();
    const goal: Goal = {
      id: `preview-${Date.now()}`,
      user_id: previewProfile.id,
      mode: input.mode ?? "solo",
      name: input.name,
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
  }, []);

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
        user_id: previewProfile.id,
        mode: input.mode ?? "solo",
        name: input.name,
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
    []
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

  const value = useMemo<SavingsContextValue>(
    () => ({
      profile: previewProfile,
      goals,
      savingsHomes: [previewHome],
      loading: false,
      error: null,
      displayName: previewProfile.display_name || "Saver",
      refresh,
      addGoal,
      startFirstGoal,
      deposit,
      createInvite,
      joinSharedPact,
      updateHome,
    }),
    [addGoal, createInvite, deposit, goals, joinSharedPact, refresh, startFirstGoal, updateHome]
  );

  return <SavingsContext.Provider value={value}>{children}</SavingsContext.Provider>;
}

export function useSavings() {
  const context = useContext(SavingsContext);
  if (!context) throw new Error("useSavings must be used within SavingsProvider");
  return context;
}
