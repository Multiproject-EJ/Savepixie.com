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

    const { data: mapping, error: mappingError } = await admin
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (mappingError) throw mappingError;
    if (!mapping?.stripe_customer_id) {
      return jsonResponse(request, { error: "No billing account exists yet." }, 404);
    }

    const customer = await stripe.customers.retrieve(mapping.stripe_customer_id);
    if (customer.deleted || customer.metadata.supabase_user_id !== user.id) {
      return jsonResponse(
        request,
        { error: "This billing account needs support before the customer portal can open." },
        409
      );
    }

    const siteUrl = new URL(requireEnv("SITE_URL")).origin;
    const portal = await stripe.billingPortal.sessions.create({
      customer: mapping.stripe_customer_id,
      return_url: `${siteUrl}/app/plan`,
    });

    return jsonResponse(request, { url: portal.url });
  } catch (error) {
    return responseFromError(request, error);
  }
});
