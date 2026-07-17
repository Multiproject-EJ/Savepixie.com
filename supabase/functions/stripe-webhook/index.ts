import Stripe from "stripe";
import {
  createAdminClient,
  createStripeClient,
  requireEnv,
  stripeObjectId,
  toIsoDate,
} from "../_shared/billing.ts";

const cryptoProvider = Stripe.createSubtleCryptoProvider();
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const productKeys = new Set(["savepixie", "wallethabit"]);

async function resolveUserId(
  admin: ReturnType<typeof createAdminClient>,
  metadataUserId: string | undefined,
  customerId: string
): Promise<string | null> {
  if (metadataUserId && uuidPattern.test(metadataUserId)) return metadataUserId;

  const { data, error } = await admin
    .from("billing_customers")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) throw error;
  return data?.user_id ?? null;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed.", { status: 405 });
  }

  const signature = request.headers.get("Stripe-Signature");
  if (!signature) return new Response("Missing Stripe signature.", { status: 400 });

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    const stripe = createStripeClient();
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      requireEnv("STRIPE_WEBHOOK_SIGNING_SECRET"),
      undefined,
      cryptoProvider
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid Stripe signature.";
    return new Response(message, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = stripeObjectId(session.customer);
      const userId = session.client_reference_id ?? session.metadata?.supabase_user_id;

      if (customerId && userId && uuidPattern.test(userId)) {
        const { error } = await admin.from("billing_customers").upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );
        if (error) throw error;
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = stripeObjectId(subscription.customer);
      if (!customerId) throw new Error("Subscription event has no Stripe customer ID.");

      const userId = await resolveUserId(admin, subscription.metadata.supabase_user_id, customerId);
      if (!userId) throw new Error("Subscription event cannot be matched to a SavePixie user.");

      const firstItem = subscription.items.data[0];
      const productKey = subscription.metadata.product_key;
      if (!productKey || !productKeys.has(productKey)) {
        throw new Error("Subscription event has no recognized product key.");
      }

      if (
        productKey === "savepixie" &&
        firstItem?.price.id !== requireEnv("STRIPE_SAVEPIXIE_PRO_PRICE_ID")
      ) {
        throw new Error("SavePixie subscription event uses an unrecognized price.");
      }

      const { error } = await admin.rpc("process_stripe_subscription_event", {
        p_event_id: event.id,
        p_event_type: event.type,
        p_product_key: productKey,
        p_user_id: userId,
        p_customer_id: customerId,
        p_subscription_id: subscription.id,
        p_status: subscription.status,
        p_price_id: firstItem?.price.id ?? null,
        p_trial_ends_at: toIsoDate(subscription.trial_end),
        p_current_period_end: toIsoDate(firstItem?.current_period_end),
        p_cancel_at: toIsoDate(subscription.cancel_at),
      });

      if (error) throw error;
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    return new Response("Webhook processing failed.", { status: 500 });
  }
});
