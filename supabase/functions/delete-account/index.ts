import { createAdminClient, createStripeClient, requireUser } from "../_shared/billing.ts";
import { corsHeaders, isAllowedBrowserOrigin, jsonResponse } from "../_shared/http.ts";

const blockingSubscriptionStatuses = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
  "paused",
]);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown account deletion error.";
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (request.method !== "POST") {
    return jsonResponse(request, { error: "Method not allowed." }, 405);
  }

  if (!isAllowedBrowserOrigin(request)) {
    return jsonResponse(request, { error: "Origin not allowed." }, 403);
  }

  try {
    const body = (await request.json().catch(() => null)) as { confirmation?: unknown } | null;
    if (body?.confirmation !== "DELETE") {
      return jsonResponse(request, { error: "Type DELETE to confirm this action." }, 400);
    }

    const user = await requireUser(request);
    const lastSignIn = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : Number.NaN;
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

    if (!Number.isFinite(lastSignIn) || lastSignIn < tenMinutesAgo) {
      return jsonResponse(
        request,
        { error: "Please confirm your password again before deleting your account." },
        401
      );
    }

    const admin = createAdminClient();
    const { data: mapping, error: mappingError } = await admin
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (mappingError) throw mappingError;

    // Stripe is the billing authority. A local entitlement can be delayed, so query
    // Stripe itself whenever a customer mapping exists before allowing erasure.
    if (mapping?.stripe_customer_id) {
      const stripe = createStripeClient();
      const subscriptions = await stripe.subscriptions.list({
        customer: mapping.stripe_customer_id,
        status: "all",
        limit: 100,
      });
      const hasBlockingSubscription = subscriptions.data.some((subscription) =>
        blockingSubscriptionStatuses.has(subscription.status)
      );

      if (hasBlockingSubscription) {
        return jsonResponse(
          request,
          {
            error:
              "Cancel your SavePixie subscription in Billing first. Your account has not been deleted or changed.",
          },
          409
        );
      }
    }

    const { error: preparationError } = await admin.rpc("prepare_savepixie_account_deletion", {
      p_user_id: user.id,
    });
    if (preparationError) throw preparationError;

    const { error: deletionError } = await admin.auth.admin.deleteUser(user.id);
    if (deletionError) throw deletionError;

    return jsonResponse(request, { deleted: true });
  } catch (error) {
    console.error("delete-account failed", errorMessage(error));
    return jsonResponse(
      request,
      { error: "We couldn't safely delete your account. Please try again or contact support." },
      500
    );
  }
});
