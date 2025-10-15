import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

type ProfileUpsert = {
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
};

export async function ensureProfile(user: User, overrides?: ProfileUpsert) {
  const profile: ProfileUpsert & { id: string; email?: string | null } = {
    id: user.id,
    display_name:
      overrides?.display_name ??
      (typeof user.user_metadata?.display_name === "string"
        ? user.user_metadata.display_name
        : user.user_metadata?.full_name ?? null),
    username:
      overrides?.username ??
      (typeof user.user_metadata?.username === "string"
        ? user.user_metadata.username
        : null),
    avatar_url:
      overrides?.avatar_url ??
      (typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : null),
    email: user.email,
  };

  if (!profile.display_name && profile.email) {
    profile.display_name = profile.email.split("@")[0];
  }

  const { error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: profile.id,
        display_name: profile.display_name ?? null,
        username: profile.username ?? null,
        avatar_url: profile.avatar_url ?? null,
      },
      { onConflict: "id" }
    );

  if (error) {
    throw error;
  }
}
