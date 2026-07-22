import {
  createAdminClient,
  createStripeClient,
  requireEnv,
  requireUser,
} from "../_shared/billing.ts";
import {
  corsHeaders,
  isAllowedBrowserOrigin,
  jsonResponse,
  responseFromError,
} from "../_shared/http.ts";

const productKey = "savepixie";

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
    const user = await requireUser(request);
    const admin = createAdminClient();
    const stripe = createStripeClient();

    const { data: entitlement, error: entitlementError } = await admin
      .from("entitlements")
      .select("has_pro_access, subscription_status")
      .eq("user_id", user.id)
      .eq("product_key", productKey)
      .maybeSingle();

    if (entitlementError) throw entitlementError;
    if (
      entitlement?.has_pro_access ||
      (entitlement &&
        !["inactive", "canceled", "incomplete_expired"].includes(entitlement.subscription_status))
    ) {
      return jsonResponse(
        request,
        { error: "A SavePixie subscription already exists. Open billing settings instead." },
        409
      );
    }

    const { data: mapping, error: mappingError } = await admin
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (mappingError) throw mappingError;

    let customerId = mapping?.stripe_customer_id as string | undefined;

    if (customerId) {
      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted) {
        customerId = undefined;
      } else if (customer.metadata.supabase_user_id !== user.id) {
        return jsonResponse(
          request,
          { error: "This billing account needs support before Checkout can open." },
          409
        );
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create(
        {
          email: user.email,
          metadata: { supabase_user_id: user.id },
        },
        { idempotencyKey: `savepixie-customer-${user.id}` }
      );
      customerId = customer.id;

      const { error: saveCustomerError } = await admin.from("billing_customers").upsert(
        {
          user_id: user.id,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      if (saveCustomerError) throw saveCustomerError;
    }

    const priceId = requireEnv("STRIPE_SAVEPIXIE_PRO_PRICE_ID");
    const price = await stripe.prices.retrieve(priceId);

    if (
      !price.active ||
      price.type !== "recurring" ||
      price.currency !== "nok" ||
      price.unit_amount !== 4900 ||
      price.recurring?.interval !== "month" ||
      price.recurring.interval_count !== 1
    ) {
      throw new Error(
        "The configured SavePixie Pro price is not the approved 49 NOK monthly plan."
      );
    }

    const siteUrl = new URL(requireEnv("SITE_URL")).origin;
    const checkout = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        customer: customerId,
        client_reference_id: user.id,
        payment_method_collection: "always",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${siteUrl}/app/today?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/app/plan?checkout=cancelled`,
        subscription_data: {
          metadata: { supabase_user_id: user.id, product_key: productKey },
          ...(entitlement
            ? {}
            : {
                trial_period_days: 7,
                trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } },
              }),
        },
        metadata: { supabase_user_id: user.id, product_key: productKey },
      },
      { idempotencyKey: `savepixie-checkout-${user.id}` }
    );

    if (!checkout.url) throw new Error("Stripe did not return a Checkout URL.");
    return jsonResponse(request, { url: checkout.url });
  } catch (error) {
    return responseFromError(request, error);
  }
});
