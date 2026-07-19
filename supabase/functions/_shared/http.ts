const localOrigins = new Set(["http://127.0.0.1:5173", "http://localhost:5173"]);
const productionOrigins = new Set(["https://savepixie.com", "https://www.savepixie.com"]);

function allowedOrigins(): Set<string> {
  const origins = new Set([...localOrigins, ...productionOrigins]);
  const siteUrl = Deno.env.get("SITE_URL");

  if (siteUrl) {
    origins.add(new URL(siteUrl).origin);
  }

  return origins;
}

export function isAllowedBrowserOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  return !origin || allowedOrigins().has(origin);
}

export function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin");
  const allowed = allowedOrigins();
  const fallback = Deno.env.get("SITE_URL")
    ? new URL(Deno.env.get("SITE_URL")!).origin
    : "https://savepixie.com";

  return {
    "Access-Control-Allow-Origin": origin && allowed.has(origin) ? origin : fallback,
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

export function jsonResponse(request: Request, body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders(request) });
}

export function responseFromError(request: Request, error: unknown): Response {
  if (error instanceof Response) {
    return new Response(error.body, {
      status: error.status,
      statusText: error.statusText,
      headers: corsHeaders(request),
    });
  }

  console.error(error);
  return jsonResponse(
    request,
    { error: "The billing service could not complete this request." },
    500
  );
}
