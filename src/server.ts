import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

interface CloudflareEnv {
  STRIPE_SECRET_KEY?: string;
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  [key: string]: unknown;
}

// ─── Stripe PaymentIntent endpoint ────────────────────────────────────────
// Server-authoritative: amount is computed from DB pricing, never trusted
// from the client. Requires an authenticated Supabase session.

type IntentRequest =
  | { kind: "service"; service_id: string; service_request_id?: string; metadata?: Record<string, string> }
  | { kind: "minute_package"; minute_package_id: string; metadata?: Record<string, string> };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Best-effort per-user rate limit. In-memory in the Worker isolate; not
// authoritative across isolates. Treat as a soft guard — proper rate
// limiting should be done at the Cloudflare edge (WAF / Rate Limiting Rules).
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, number[]>();
function rateLimitOk(userId: string): boolean {
  const now = Date.now();
  const bucket = (rateBuckets.get(userId) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (bucket.length >= RATE_LIMIT_MAX) {
    rateBuckets.set(userId, bucket);
    return false;
  }
  bucket.push(now);
  rateBuckets.set(userId, bucket);
  return true;
}

async function supabaseGet<T>(
  env: CloudflareEnv,
  path: string,
  apiKey: string,
): Promise<T | null> {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  if (!url) return null;
  const res = await fetch(`${url}/rest/v1/${path}`, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as T[];
  return rows[0] ?? null;
}

async function verifySupabaseUser(
  env: CloudflareEnv,
  bearer: string,
): Promise<{ id: string } | null> {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anon =
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anon, Authorization: `Bearer ${bearer}` },
  });
  if (!res.ok) return null;
  const user = (await res.json()) as { id?: string };
  return user.id ? { id: user.id } : null;
}

async function handleStripePaymentIntent(
  request: Request,
  env: unknown,
): Promise<Response> {
  try {
    const cfEnv = env as CloudflareEnv;
    const secretKey = cfEnv.STRIPE_SECRET_KEY;
    if (!secretKey) return jsonResponse({ error: "Stripe not configured" }, 500);

    const serviceRoleKey = cfEnv.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return jsonResponse(
        { error: "Server not configured for payment authorization" },
        500,
      );
    }

    // 1) Authenticate caller
    const authHeader = request.headers.get("authorization") || "";
    const bearer = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";
    if (!bearer) return jsonResponse({ error: "Unauthorized" }, 401);

    const authedUser = await verifySupabaseUser(cfEnv, bearer);
    if (!authedUser) return jsonResponse({ error: "Unauthorized" }, 401);

    // 2) Rate limit per user (best-effort)
    if (!rateLimitOk(authedUser.id)) {
      return jsonResponse({ error: "Too many requests" }, 429);
    }

    // 3) Parse + validate body
    const raw = (await request.json().catch(() => null)) as IntentRequest | null;
    if (!raw || typeof raw !== "object" || !("kind" in raw)) {
      return jsonResponse({ error: "Invalid request" }, 400);
    }

    // 4) Resolve authoritative amount (USD) from the database
    let amountUsd: number | null = null;
    const metadata: Record<string, string> = {
      ...(raw.metadata ?? {}),
      user_id: authedUser.id,
      kind: raw.kind,
    };

    if (raw.kind === "service") {
      if (!raw.service_id || typeof raw.service_id !== "string") {
        return jsonResponse({ error: "service_id required" }, 400);
      }

      // If paying against an existing service_request, verify ownership.
      if (raw.service_request_id) {
        const sr = await supabaseGet<{ id: string; client_id: string; service_id: string }>(
          cfEnv,
          `service_requests?id=eq.${encodeURIComponent(raw.service_request_id)}&select=id,client_id,service_id`,
          serviceRoleKey,
        );
        if (!sr) return jsonResponse({ error: "Service request not found" }, 404);
        if (sr.client_id !== authedUser.id) {
          return jsonResponse({ error: "Forbidden" }, 403);
        }
        if (sr.service_id !== raw.service_id) {
          return jsonResponse({ error: "Service mismatch" }, 400);
        }
        metadata.service_request_id = raw.service_request_id;
      }

      const service = await supabaseGet<{
        id: string;
        price_usd_min: number | null;
        price_usd_max: number | null;
        is_active: boolean | null;
      }>(
        cfEnv,
        `services?id=eq.${encodeURIComponent(raw.service_id)}&select=id,price_usd_min,price_usd_max,is_active`,
        serviceRoleKey,
      );
      if (!service) return jsonResponse({ error: "Service not found" }, 404);
      if (service.is_active === false) {
        return jsonResponse({ error: "Service not available" }, 400);
      }
      // Use price_usd_min as the authoritative charge (matches existing UI).
      amountUsd = service.price_usd_min ?? service.price_usd_max;
      metadata.service_id = service.id;
    } else if (raw.kind === "minute_package") {
      if (!raw.minute_package_id || typeof raw.minute_package_id !== "string") {
        return jsonResponse({ error: "minute_package_id required" }, 400);
      }
      const pkg = await supabaseGet<{
        id: string;
        price_usd: number | null;
        is_active: boolean | null;
      }>(
        cfEnv,
        `minute_packages?id=eq.${encodeURIComponent(raw.minute_package_id)}&select=id,price_usd,is_active`,
        serviceRoleKey,
      );
      if (!pkg) return jsonResponse({ error: "Package not found" }, 404);
      if (pkg.is_active === false) {
        return jsonResponse({ error: "Package not available" }, 400);
      }
      amountUsd = pkg.price_usd;
      metadata.minute_package_id = pkg.id;
    } else {
      return jsonResponse({ error: "Unsupported intent kind" }, 400);
    }

    if (amountUsd == null || !Number.isFinite(amountUsd) || amountUsd <= 0) {
      return jsonResponse({ error: "Price unavailable for this item" }, 400);
    }

    // 5) Create PaymentIntent with the server-computed amount
    const stripeResponse = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: Math.round(amountUsd * 100).toString(),
        currency: "usd",
        "automatic_payment_methods[enabled]": "true",
        ...Object.entries(metadata).reduce(
          (acc, [key, value]) => ({ ...acc, [`metadata[${key}]`]: String(value) }),
          {} as Record<string, string>,
        ),
      }),
    });

    const paymentIntent = (await stripeResponse.json()) as {
      client_secret?: string;
      error?: { message: string };
    };

    if (!stripeResponse.ok || !paymentIntent.client_secret) {
      console.error("[Stripe API]", paymentIntent.error);
      return jsonResponse({ error: paymentIntent.error?.message ?? "Stripe error" }, 400);
    }

    return jsonResponse({ clientSecret: paymentIntent.client_secret, amount: amountUsd });
  } catch (err) {
    console.error("[Stripe API]", err);
    return jsonResponse({ error: "Payment processing failed" }, 500);
  }
}

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}
function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function escapeInlineJson(value: unknown): string {
  return (JSON.stringify(value) ?? "null").replace(/[<>&\u2028\u2029]/g, (char) => {
    switch (char) {
      case "<":
        return "\\u003c";
      case ">":
        return "\\u003e";
      case "&":
        return "\\u0026";
      case "\u2028":
        return "\\u2028";
      case "\u2029":
        return "\\u2029";
      default:
        return char;
    }
  });
}

async function injectPublicRuntimeEnv(
  response: Response,
  env: CloudflareEnv,
): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;

  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseAnonKey =
    env.VITE_SUPABASE_ANON_KEY ||
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return response;

  const html = await response.text();
  const script = `<script>window.__SAN_BROTHERS_ENV__=${escapeInlineJson({
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey,
  })};</script>`;
  const body = html.includes("</head>") ? html.replace("</head>", `${script}</head>`) : script + html;
  const headers = new Headers(response.headers);
  headers.delete("content-length");

  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);

    // THIS MUST BE FIRST — before any TanStack handler
    if (url.pathname === "/api/stripe/payment-intent" && request.method === "POST") {
      const response = await handleStripePaymentIntent(request, env);
      return response;
    }

    // Subdomain rewriting — must run before TanStack handler
    const hostname = url.hostname;
    if (hostname === "translate.sanbrothers.cn.com" && !url.pathname.startsWith("/translate")) {
      const rewritten = new URL(request.url);
      rewritten.pathname = "/translate" + (url.pathname === "/" ? "" : url.pathname);
      request = new Request(rewritten.toString(), request);
    } else if (hostname === "consultancy.sanbrothers.cn.com" && !url.pathname.startsWith("/consultancy")) {
      const rewritten = new URL(request.url);
      rewritten.pathname = "/consultancy" + (url.pathname === "/" ? "" : url.pathname);
      request = new Request(rewritten.toString(), request);
    }

    // TanStack handler AFTER our custom routes
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return await injectPublicRuntimeEnv(normalized, env as CloudflareEnv);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};

