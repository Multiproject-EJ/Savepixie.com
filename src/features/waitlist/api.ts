import { supabase } from "../../lib/supabase";

export type WaitlistDream = "travel" | "safety" | "home" | "something";

type JoinWaitlistInput = {
  email: string;
  dream: WaitlistDream | null;
  honeypot: string;
  source: string;
  medium: string | null;
  campaign: string | null;
};

function cleanAttribution(value: string | null, fallback: string | null = null) {
  const cleaned = value?.trim().slice(0, 120);
  return cleaned || fallback;
}

export async function joinWaitlist(input: JoinWaitlistInput): Promise<void> {
  if (input.honeypot) {
    return;
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  const { error } = await supabase.from("savepixie_waitlist").insert({
    email: normalizedEmail,
    dream_category: input.dream,
    source: cleanAttribution(input.source, "savepixie-landing")!,
    utm_medium: cleanAttribution(input.medium),
    utm_campaign: cleanAttribution(input.campaign),
    landing_variant: "dream-habit-v1",
  });

  if (!error) return;

  // A simultaneous duplicate can still reach the unique index between the
  // trigger check and insert. Treat it exactly like any other successful join.
  if (error.code === "23505") return;

  throw new Error("We couldn’t save your spot just now. Please try again.");
}
