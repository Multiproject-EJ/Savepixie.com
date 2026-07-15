import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createGoal, fetchGoals, recordDeposit } from "../features/goals/api";
import type { Goal } from "../features/goals/types";
import { fetchProfile, type ProfileRow } from "../features/profile/api";
import { useAuth } from "./AuthProvider";

export type NewGoalInput = {
  name: string;
  targetCents: number;
  emoji?: string;
  color?: string;
  deadlineDate?: string | null;
};

type SavingsContextValue = {
  profile: ProfileRow | null;
  goals: Goal[];
  loading: boolean;
  error: string | null;
  displayName: string;
  refresh: () => Promise<void>;
  addGoal: (input: NewGoalInput) => Promise<Goal>;
  startFirstGoal: (
    input: NewGoalInput & { initialDepositCents: number }
  ) => Promise<{ goal: Goal; initialSaveRecorded: boolean }>;
  deposit: (goalId: string, amountCents: number, note?: string) => Promise<Goal>;
};

const SavingsContext = createContext<SavingsContextValue | undefined>(undefined);

function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error ? cause.message : fallback;
}

export function SavingsProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setGoals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [nextProfile, nextGoals] = await Promise.all([
        fetchProfile(user.id),
        fetchGoals(user.id),
      ]);
      setProfile(nextProfile);
      setGoals(nextGoals);
    } catch (cause) {
      setError(errorMessage(cause, "We couldn't load your SavePixie space."));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addGoal = useCallback(
    async (input: NewGoalInput) => {
      if (!user?.id) throw new Error("Sign in before creating a goal.");

      const goal = await createGoal({
        userId: user.id,
        name: input.name,
        targetCents: input.targetCents,
        emoji: input.emoji,
        color: input.color,
        deadlineDate: input.deadlineDate,
      });

      setGoals((current) => [...current, goal]);
      return goal;
    },
    [user?.id]
  );

  const startFirstGoal = useCallback(
    async (input: NewGoalInput & { initialDepositCents: number }) => {
      if (!user?.id) throw new Error("Sign in before starting your first goal.");

      const createdGoal = await createGoal({
        userId: user.id,
        name: input.name,
        targetCents: input.targetCents,
        emoji: input.emoji,
        color: input.color,
        deadlineDate: input.deadlineDate,
      });

      let goal = createdGoal;
      let initialSaveRecorded = input.initialDepositCents <= 0;

      if (input.initialDepositCents > 0) {
        try {
          goal = await recordDeposit({
            userId: user.id,
            goal: createdGoal,
            amountCents: input.initialDepositCents,
            note: "My first tiny win",
          });
          initialSaveRecorded = true;
        } catch {
          initialSaveRecorded = false;
        }
      }

      setGoals((current) => [...current, goal]);
      return { goal, initialSaveRecorded };
    },
    [user?.id]
  );

  const deposit = useCallback(
    async (goalId: string, amountCents: number, note?: string) => {
      if (!user?.id) throw new Error("Sign in before recording a save.");

      const goal = goals.find((item) => item.id === goalId);
      if (!goal) throw new Error("Choose a goal for this save.");

      const optimistic = { ...goal, saved_cents: goal.saved_cents + amountCents };
      setGoals((current) => current.map((item) => (item.id === goalId ? optimistic : item)));

      try {
        const updated = await recordDeposit({
          userId: user.id,
          goal,
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
    [goals, user?.id]
  );

  const displayName = profile?.display_name?.trim() || user?.email?.split("@")[0] || "Saver";

  const value = useMemo<SavingsContextValue>(
    () => ({
      profile,
      goals,
      loading,
      error,
      displayName,
      refresh,
      addGoal,
      startFirstGoal,
      deposit,
    }),
    [addGoal, deposit, displayName, error, goals, loading, profile, refresh, startFirstGoal]
  );

  return <SavingsContext.Provider value={value}>{children}</SavingsContext.Provider>;
}

export function useSavings() {
  const context = useContext(SavingsContext);
  if (!context) throw new Error("useSavings must be used within SavingsProvider");
  return context;
}
