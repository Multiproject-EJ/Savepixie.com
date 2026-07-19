import { supabase } from "../../lib/supabase";

const EXPORT_VERSION = 1;

export async function createAccountExport(userId: string) {
  const [profile, homes, pacts, memberships, entries, weeklyPlans, legacyGoals, legacyEvents] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("savings_homes").select("*").eq("user_id", userId),
      supabase.from("savings_pacts").select("*").order("created_at", { ascending: true }),
      supabase.from("savings_pact_members").select("*").eq("user_id", userId),
      supabase
        .from("savings_pact_entries")
        .select("*")
        .eq("member_user_id", userId)
        .order("created_at", { ascending: true }),
      supabase
        .from("weekly_plans")
        .select("*")
        .eq("user_id", userId)
        .order("week_start", { ascending: true }),
      supabase.from("goals").select("*").eq("user_id", userId),
      supabase
        .from("goal_events")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
    ]);

  const results = [
    profile,
    homes,
    pacts,
    memberships,
    entries,
    weeklyPlans,
    legacyGoals,
    legacyEvents,
  ];
  const failure = results.find((result) => result.error)?.error;
  if (failure) throw failure;

  return {
    exportVersion: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    accountId: userId,
    profile: profile.data,
    savingsHomes: homes.data ?? [],
    savingsPacts: pacts.data ?? [],
    pactMemberships: memberships.data ?? [],
    ownPactEntries: entries.data ?? [],
    weeklyPlans: weeklyPlans.data ?? [],
    legacyGoals: legacyGoals.data ?? [],
    legacyGoalEvents: legacyEvents.data ?? [],
  };
}

export function downloadAccountExport(data: Awaited<ReturnType<typeof createAccountExport>>) {
  const date = new Date().toISOString().slice(0, 10);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `savepixie-export-${date}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
