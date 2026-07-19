import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export function requireEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function createStripeClient() {
  return new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
    maxNetworkRetries: 2,
    telemetry: false,
  });
}

export function createAdminClient() {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createUserClient(authorization: string) {
  const publishableKey =
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");

  if (!publishableKey) {
    throw new Error("Missing Supabase publishable or anon key environment variable.");
  }

  return createClient(requireEnv("SUPABASE_URL"), publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireUser(request: Request) {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new Response("Authentication required.", { status: 401 });
  }

  const client = createUserClient(authorization);
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    throw new Response("Authentication required.", { status: 401 });
  }

  return data.user;
}

export function stripeObjectId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export function toIsoDate(unixSeconds: number | null | undefined): string | null {
  return unixSeconds ? new Date(unixSeconds * 1000).toISOString() : null;
}
