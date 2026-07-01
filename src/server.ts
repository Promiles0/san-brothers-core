import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

// Subdomain → portal-prefix rewriting is handled by TanStack Router's
// `rewrite` config in src/router.tsx (works for both SSR and client navigation).
// Do NOT also rewrite here — having both causes ERR_TOO_MANY_REDIRECTS because
// TanStack's `rewrite.output` then sees a mismatch between the incoming URL
// path and the canonical external URL and redirects to reconcile.

interface CloudflareEnv {
  STRIPE_SECRET_KEY?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  VITE_STRIPE_PUBLISHABLE_KEY?: string;
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  MTN_MOMO_CONSUMER_KEY?: string;
  MTN_MOMO_CONSUMER_SECRET?: string;
  [key: string]: unknown;
}

function readBuildEnv(key: string): string | undefined {
  const value = (import.meta.env as Record<string, string | undefined>)[key];
  if (typeof value === "string" && value.trim()) return value.trim();

  const processEnv =
    typeof process !== "undefined"
      ? (process.env as Record<string, string | undefined>)
      : undefined;
  const processValue = processEnv?.[key];
  return typeof processValue === "string" && processValue.trim() ? processValue.trim() : undefined;
}

function readRuntimeEnv(env: unknown, key: keyof CloudflareEnv): string | undefined {
  const runtime = env && typeof env === "object" ? (env as CloudflareEnv)[key] : undefined;
  if (typeof runtime === "string" && runtime.trim()) return runtime.trim();
  return readBuildEnv(String(key));
}

function hasRuntimeEnv(env: unknown): env is CloudflareEnv {
  return env != null && typeof env === "object";
}

// ─── Stripe PaymentIntent endpoint ────────────────────────────────────────
// Server-authoritative: amount is computed from DB pricing, never trusted
// from the client. Requires an authenticated Supabase session.

type IntentRequest =
  | {
      kind: "service";
      service_id: string;
      service_request_id?: string;
      metadata?: Record<string, string>;
    }
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

async function supabaseGet<T>(env: CloudflareEnv, path: string, apiKey: string): Promise<T | null> {
  const url = readRuntimeEnv(env, "SUPABASE_URL") || readRuntimeEnv(env, "VITE_SUPABASE_URL");
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
  const url = readRuntimeEnv(env, "SUPABASE_URL") || readRuntimeEnv(env, "VITE_SUPABASE_URL");
  const anon =
    readRuntimeEnv(env, "SUPABASE_PUBLISHABLE_KEY") ||
    readRuntimeEnv(env, "VITE_SUPABASE_PUBLISHABLE_KEY") ||
    readRuntimeEnv(env, "VITE_SUPABASE_ANON_KEY") ||
    readRuntimeEnv(env, "SUPABASE_ANON_KEY");
  if (!url || !anon) return null;
  const res = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anon, Authorization: `Bearer ${bearer}` },
  });
  if (!res.ok) return null;
  const user = (await res.json()) as { id?: string };
  return user.id ? { id: user.id } : null;
}

async function handleStripePaymentIntent(request: Request, env: unknown): Promise<Response> {
  try {
    const cfEnv = hasRuntimeEnv(env) ? env : {};

    // 1) Authenticate caller
    const authHeader = request.headers.get("authorization") || "";
    const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    if (!bearer) return jsonResponse({ error: "Unauthorized" }, 401);

    const secretKey = readRuntimeEnv(cfEnv, "STRIPE_SECRET_KEY");
    if (!secretKey) return jsonResponse({ error: "Stripe not configured" }, 500);

    const serviceRoleKey = readRuntimeEnv(cfEnv, "SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) {
      return jsonResponse({ error: "Server not configured for payment authorization" }, 500);
    }

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

// ─── MTN MoMo (MADAPI Payments V1) ──────────────────────────────────────
const USD_TO_RWF = 1285;

let momoTokenCache: { token: string; expiresAt: number } | null = null;

async function getMomoAccessToken(env: CloudflareEnv): Promise<string | null> {
  const key = readRuntimeEnv(env, "MTN_MOMO_CONSUMER_KEY");
  const secret = readRuntimeEnv(env, "MTN_MOMO_CONSUMER_SECRET");
  if (!key || !secret) return null;
  if (momoTokenCache && Date.now() < momoTokenCache.expiresAt - 30_000) {
    return momoTokenCache.token;
  }
  const basic = btoa(`${key}:${secret}`);
  const res = await fetch("https://api.mtn.com/v1/oauth/access_token?grant_type=client_credentials", {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!body.access_token) return null;
  momoTokenCache = {
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return body.access_token;
}

function normalizeMomoMsisdn(input: string): string | null {
  const digits = String(input || "").replace(/\D/g, "");
  // Accept 07XXXXXXXX (10) or 7XXXXXXXX (9) or 2507XXXXXXXX (12)
  let local = digits;
  if (local.startsWith("250")) local = local.slice(3);
  if (local.length === 10 && local.startsWith("0")) local = local.slice(1);
  if (local.length !== 9) return null;
  if (!local.startsWith("78") && !local.startsWith("79")) return null;
  return `250${local}`;
}

async function resolveMomoAmountRwf(
  env: CloudflareEnv,
  raw: IntentRequest,
  serviceRoleKey: string,
): Promise<{ amount: number; metadata: Record<string, string> } | { error: string; status: number }> {
  const metadata: Record<string, string> = { ...(raw.metadata ?? {}), kind: raw.kind };
  let usd: number | null = null;
  if (raw.kind === "service") {
    if (!raw.service_id) return { error: "service_id required", status: 400 };
    const service = await supabaseGet<{
      id: string;
      price_usd_min: number | null;
      price_usd_max: number | null;
      is_active: boolean | null;
    }>(
      env,
      `services?id=eq.${encodeURIComponent(raw.service_id)}&select=id,price_usd_min,price_usd_max,is_active`,
      serviceRoleKey,
    );
    if (!service) return { error: "Service not found", status: 404 };
    if (service.is_active === false) return { error: "Service not available", status: 400 };
    usd = service.price_usd_min ?? service.price_usd_max;
    metadata.service_id = service.id;
    if (raw.service_request_id) metadata.service_request_id = raw.service_request_id;
  } else if (raw.kind === "minute_package") {
    if (!raw.minute_package_id) return { error: "minute_package_id required", status: 400 };
    const pkg = await supabaseGet<{ id: string; price_usd: number | null; is_active: boolean | null }>(
      env,
      `minute_packages?id=eq.${encodeURIComponent(raw.minute_package_id)}&select=id,price_usd,is_active`,
      serviceRoleKey,
    );
    if (!pkg) return { error: "Package not found", status: 404 };
    if (pkg.is_active === false) return { error: "Package not available", status: 400 };
    usd = pkg.price_usd;
    metadata.minute_package_id = pkg.id;
  } else {
    return { error: "Unsupported intent kind", status: 400 };
  }
  if (usd == null || !Number.isFinite(usd) || usd <= 0) {
    return { error: "Price unavailable for this item", status: 400 };
  }
  return { amount: Math.round(usd * USD_TO_RWF), metadata };
}

async function supabaseInsert(
  env: CloudflareEnv,
  path: string,
  apiKey: string,
  body: unknown,
): Promise<Response> {
  const url = readRuntimeEnv(env, "SUPABASE_URL") || readRuntimeEnv(env, "VITE_SUPABASE_URL");
  return fetch(`${url}/rest/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
}

async function supabaseUpdate(
  env: CloudflareEnv,
  path: string,
  apiKey: string,
  body: unknown,
): Promise<Response> {
  const url = readRuntimeEnv(env, "SUPABASE_URL") || readRuntimeEnv(env, "VITE_SUPABASE_URL");
  return fetch(`${url}/rest/v1/${path}`, {
    method: "PATCH",
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  });
}

type MomoInitiateBody = {
  phone_number?: string;
  kind?: IntentRequest["kind"];
  service_id?: string;
  service_request_id?: string;
  minute_package_id?: string;
  metadata?: Record<string, string>;
};

async function handleMomoInitiatePayment(request: Request, env: unknown): Promise<Response> {
  try {
    const cfEnv = hasRuntimeEnv(env) ? env : {};
    const authHeader = request.headers.get("authorization") || "";
    const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    if (!bearer) return jsonResponse({ error: "Unauthorized" }, 401);

    const serviceRoleKey = readRuntimeEnv(cfEnv, "SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) return jsonResponse({ error: "Server not configured" }, 500);

    const authedUser = await verifySupabaseUser(cfEnv, bearer);
    if (!authedUser) return jsonResponse({ error: "Unauthorized" }, 401);
    if (!rateLimitOk(authedUser.id)) return jsonResponse({ error: "Too many requests" }, 429);

    const raw = (await request.json().catch(() => null)) as MomoInitiateBody | null;
    if (!raw || !raw.kind) return jsonResponse({ error: "Invalid request" }, 400);

    const msisdn = normalizeMomoMsisdn(raw.phone_number || "");
    if (!msisdn) return jsonResponse({ error: "Invalid MTN phone number" }, 400);

    // Idempotency: block duplicate pending charge for same service_request_id
    if (raw.service_request_id) {
      const existing = await supabaseGet<{ id: string; status: string }>(
        cfEnv,
        `payments?service_request_id=eq.${encodeURIComponent(raw.service_request_id)}&status=in.(pending,processing)&select=id,status`,
        serviceRoleKey,
      );
      if (existing) return jsonResponse({ error: "A payment is already in progress." }, 409);
    }

    const priced = await resolveMomoAmountRwf(cfEnv, raw as IntentRequest, serviceRoleKey);
    if ("error" in priced) return jsonResponse({ error: priced.error }, priced.status);

    const token = await getMomoAccessToken(cfEnv);
    if (!token) return jsonResponse({ error: "MoMo not configured" }, 500);

    const referenceId = crypto.randomUUID();

    // Record pending payment first
    const paymentRes = await supabaseInsert(cfEnv, "payments", serviceRoleKey, {
      client_id: authedUser.id,
      service_request_id: raw.service_request_id ?? null,
      method: "momo",
      reference: referenceId,
      amount_rwf: priced.amount,
      currency: "RWF",
      status: "pending",
    });
    if (!paymentRes.ok) {
      const t = await paymentRes.text();
      console.error("[MoMo] payment insert failed", t);
      return jsonResponse({ error: "Could not record payment" }, 500);
    }

    const initiateRes = await fetch("https://api.mtn.com/v1/payments", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Reference-Id": referenceId,
      },
      body: JSON.stringify({
        amount: String(priced.amount),
        currency: "RWF",
        externalId: referenceId,
        payer: { partyIdType: "MSISDN", partyId: msisdn },
        payerMessage: "San Brothers payment",
        payeeNote: "San Brothers",
      }),
    });

    if (!initiateRes.ok) {
      const errText = await initiateRes.text().catch(() => "");
      console.error("[MoMo] initiate failed", initiateRes.status, errText);
      await supabaseUpdate(
        cfEnv,
        `payments?provider_reference=eq.${encodeURIComponent(referenceId)}`,
        serviceRoleKey,
        { status: "failed" },
      );
      return jsonResponse({ error: "Failed to initiate MoMo payment" }, 502);
    }

    return jsonResponse({ referenceId, amount: priced.amount, currency: "RWF" });
  } catch (err) {
    console.error("[MoMo initiate]", err);
    return jsonResponse({ error: "MoMo payment failed" }, 500);
  }
}

async function handleMomoStatusCheck(
  request: Request,
  env: unknown,
  referenceId: string,
): Promise<Response> {
  try {
    const cfEnv = hasRuntimeEnv(env) ? env : {};
    const authHeader = request.headers.get("authorization") || "";
    const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
    if (!bearer) return jsonResponse({ error: "Unauthorized" }, 401);
    const authedUser = await verifySupabaseUser(cfEnv, bearer);
    if (!authedUser) return jsonResponse({ error: "Unauthorized" }, 401);

    const serviceRoleKey = readRuntimeEnv(cfEnv, "SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) return jsonResponse({ error: "Server not configured" }, 500);

    const record = await supabaseGet<{ id: string; user_id: string; status: string }>(
      cfEnv,
      `payments?provider_reference=eq.${encodeURIComponent(referenceId)}&select=id,user_id,status`,
      serviceRoleKey,
    );
    if (!record) return jsonResponse({ error: "Not found" }, 404);
    if (record.user_id !== authedUser.id) return jsonResponse({ error: "Forbidden" }, 403);

    if (record.status === "succeeded" || record.status === "failed") {
      return jsonResponse({ status: record.status });
    }

    const token = await getMomoAccessToken(cfEnv);
    if (!token) return jsonResponse({ status: record.status });

    const res = await fetch(`https://api.mtn.com/v1/payments/${encodeURIComponent(referenceId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return jsonResponse({ status: record.status });
    const body = (await res.json()) as { status?: string };
    const providerStatus = (body.status || "").toUpperCase();
    let mapped = record.status;
    if (providerStatus === "SUCCESSFUL") mapped = "succeeded";
    else if (providerStatus === "FAILED" || providerStatus === "REJECTED") mapped = "failed";
    else mapped = "pending";

    if (mapped !== record.status) {
      await supabaseUpdate(
        cfEnv,
        `payments?provider_reference=eq.${encodeURIComponent(referenceId)}`,
        serviceRoleKey,
        { status: mapped },
      );
    }
    return jsonResponse({ status: mapped });
  } catch (err) {
    console.error("[MoMo status]", err);
    return jsonResponse({ error: "Status check failed" }, 500);
  }
}

async function handleMomoCallback(request: Request, env: unknown): Promise<Response> {
  try {
    const cfEnv = hasRuntimeEnv(env) ? env : {};
    const serviceRoleKey = readRuntimeEnv(cfEnv, "SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) return jsonResponse({ error: "Server not configured" }, 500);
    const body = (await request.json().catch(() => null)) as {
      referenceId?: string;
      status?: string;
    } | null;
    if (!body?.referenceId) return jsonResponse({ error: "Invalid payload" }, 400);
    const providerStatus = (body.status || "").toUpperCase();
    let mapped = "pending";
    if (providerStatus === "SUCCESSFUL") mapped = "succeeded";
    else if (providerStatus === "FAILED" || providerStatus === "REJECTED") mapped = "failed";
    await supabaseUpdate(
      cfEnv,
      `payments?provider_reference=eq.${encodeURIComponent(body.referenceId)}`,
      serviceRoleKey,
      { status: mapped },
    );
    return jsonResponse({ ok: true });
  } catch (err) {
    console.error("[MoMo callback]", err);
    return jsonResponse({ error: "Callback failed" }, 500);
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

async function injectPublicRuntimeEnv(response: Response, env: CloudflareEnv): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;

  const supabaseUrl =
    readRuntimeEnv(env, "VITE_SUPABASE_URL") || readRuntimeEnv(env, "SUPABASE_URL");
  const supabaseAnonKey =
    readRuntimeEnv(env, "VITE_SUPABASE_ANON_KEY") ||
    readRuntimeEnv(env, "VITE_SUPABASE_PUBLISHABLE_KEY") ||
    readRuntimeEnv(env, "SUPABASE_PUBLISHABLE_KEY") ||
    readRuntimeEnv(env, "SUPABASE_ANON_KEY");
  const stripePublishableKey =
    readRuntimeEnv(env, "VITE_STRIPE_PUBLISHABLE_KEY") ||
    readRuntimeEnv(env, "STRIPE_PUBLISHABLE_KEY");

  if (!supabaseUrl && !supabaseAnonKey && !stripePublishableKey) return response;

  const html = await response.text();
  const script = `<script>window.__SAN_BROTHERS_ENV__=${escapeInlineJson({
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey,
    VITE_STRIPE_PUBLISHABLE_KEY: stripePublishableKey,
  })};</script>`;
  const body = html.includes("</head>")
    ? html.replace("</head>", `${script}</head>`)
    : script + html;
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
    if (url.pathname === "/api/momo/pay" && request.method === "POST") {
      return await handleMomoInitiatePayment(request, env);
    }
    if (url.pathname.startsWith("/api/momo/status/") && request.method === "GET") {
      const referenceId = url.pathname.replace("/api/momo/status/", "");
      return await handleMomoStatusCheck(request, env, referenceId);
    }
    if (url.pathname === "/api/momo/callback" && request.method === "POST") {
      return await handleMomoCallback(request, env);
    }

    // Subdomain → portal-prefix rewriting is owned by TanStack Router's
    // `rewrite` config (src/router.tsx) for both SSR and client navigation.
    // Do not rewrite the request URL here.

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
