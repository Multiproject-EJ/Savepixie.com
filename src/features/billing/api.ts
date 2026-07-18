import { supabase } from "../../lib/supabase";
import { reportClientError } from "../../lib/telemetry";
import type { Tables } from "../../types/database";

type EntitlementRow = Tables<"entitlements">;

export type Entitlement = Omit<EntitlementRow, "product_key" | "plan"> & {
  product_key: "savepixie" | "wallethabit";
  plan: "free" | "pro";
};

const entitlementColumns =
  "user_id, product_key, plan, has_pro_access, subscription_status, trial_ends_at, current_period_end, cancel_at, updated_at";

export async function fetchEntitlement(userId: string): Promise<Entitlement | null> {
  const { data, error } = await supabase
    .from("entitlements")
    .select(entitlementColumns)
    .eq("user_id", userId)
    .eq("product_key", "savepixie")
    .maybeSingle();

  if (error) throw error;
  return (data as Entitlement | null) ?? null;
}

function hostedStripeUrl(value: unknown): string {
  if (typeof value !== "string") throw new Error("The billing service did not return a URL.");

  const url = new URL(value);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".stripe.com")) {
    throw new Error("The billing service returned an unexpected destination.");
  }

  return url.toString();
}

async function invokeBillingFunction(name: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke(name, {
    method: "POST",
    body: {},
  });

  if (error) {
    reportClientError(
      name === "create-checkout-session" ? "billing_checkout" : "billing_portal",
      "billing"
    );
    const response = "context" in error ? (error as { context?: Response }).context : null;
    let message = "Billing could not complete that request. Please try again.";

    if (response) {
      try {
        const body = (await response.clone().json()) as { error?: string };
        if (body.error) message = body.error;
      } catch {
        // Keep the customer-safe fallback when the service returns no JSON body.
      }
    }

    throw new Error(message);
  }
  return hostedStripeUrl(data?.url);
}

export function createCheckoutSession(): Promise<string> {
  return invokeBillingFunction("create-checkout-session");
}

export function createPortalSession(): Promise<string> {
  return invokeBillingFunction("create-portal-session");
}
