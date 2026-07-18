import { corsHeaders, isAllowedBrowserOrigin, jsonResponse } from "../_shared/http.ts";

const allowedCodes = new Set([
  "render_fatal",
  "session_load",
  "profile_prepare",
  "private_data_load",
  "save_action",
  "billing_status",
  "billing_checkout",
  "billing_portal",
  "account_export",
  "account_delete",
]);

const allowedSurfaces = new Set(["auth", "app", "saving", "billing", "settings"]);

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

  const contentLength = Number(request.headers.get("Content-Length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 512) {
    return jsonResponse(request, { error: "Payload too large." }, 413);
  }

  const body = (await request.json().catch(() => null)) as {
    code?: unknown;
    surface?: unknown;
  } | null;

  if (
    typeof body?.code !== "string" ||
    typeof body.surface !== "string" ||
    !allowedCodes.has(body.code) ||
    !allowedSurfaces.has(body.surface)
  ) {
    return jsonResponse(request, { error: "Invalid operational event." }, 400);
  }

  // Deliberately log only two fixed allow-listed values. The gateway already
  // records request timing; never add error messages, stacks, tokens, emails,
  // savings values, customer metadata, or arbitrary client context here.
  console.warn(
    JSON.stringify({
      event: "savepixie_client_error",
      code: body.code,
      surface: body.surface,
    })
  );

  return jsonResponse(request, { accepted: true }, 202);
});
