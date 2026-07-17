import type { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";
import type { Tables, TablesUpdate } from "../../types/database";

export type ProfileRow = Tables<"profiles">;

type ProfileUpsert = Pick<TablesUpdate<"profiles">, "display_name" | "username" | "avatar_url">;

type UpdateProfileInput = {
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
};

export async function ensureProfile(user: User, overrides?: ProfileUpsert) {
  const profile: ProfileUpsert & { id: string; email?: string | null } = {
    id: user.id,
    display_name:
      overrides?.display_name ??
      (typeof user.user_metadata?.display_name === "string"
        ? user.user_metadata.display_name
        : (user.user_metadata?.full_name ?? null)),
    username:
      overrides?.username ??
      (typeof user.user_metadata?.username === "string" ? user.user_metadata.username : null),
    avatar_url:
      overrides?.avatar_url ??
      (typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null),
    email: user.email,
  };

  if (!profile.display_name && profile.email) {
    profile.display_name = profile.email.split("@")[0];
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      id: profile.id,
      display_name: profile.display_name ?? null,
      username: profile.username ?? null,
      avatar_url: profile.avatar_url ?? null,
    },
    { onConflict: "id", ignoreDuplicates: true }
  );

  if (error) {
    throw error;
  }

  if (overrides && Object.keys(overrides).length > 0) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: overrides.display_name !== undefined ? overrides.display_name : undefined,
        username: overrides.username !== undefined ? overrides.username : undefined,
        avatar_url: overrides.avatar_url !== undefined ? overrides.avatar_url : undefined,
      })
      .eq("id", user.id);

    if (updateError) {
      throw updateError;
    }
  }
}

export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, username, avatar_url, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data;
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<ProfileRow> {
  const payload: ProfileUpsert = {
    display_name: input.displayName ?? null,
    username: input.username ?? null,
    avatar_url: input.avatarUrl ?? null,
  };

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select("id, display_name, username, avatar_url, created_at")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to update profile");
  }

  return data;
}
