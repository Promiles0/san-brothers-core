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
  return typeof processValue === "string" && processValue.trim()
    ? processValue.trim()
    : undefined;
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

// ─── MTN MoMo (MADAPI Payments V1) ───────────────────────────────────────
const MOMO_BASE_URL = "https://api.mtn.com/v1";
const MOMO_CALLBACK_URL = "https://sanbrothers.cn.com/api/momo/callback";
const RWF_PER_USD = 1285;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let momoTokenCache: { token: string; expiresAt: number } | null = null;
const momoInFlight = new Set<string>();

async function getMomoAccessToken(env: CloudflareEnv): Promise<string | null> {
  const now = Date.now();
  if (momoTokenCache && momoTokenCache.expiresAt > now + 30_000) {
    return momoTokenCache.token;
  }
  const key = readRuntimeEnv(env, "MTN_MOMO_CONSUMER_KEY" as keyof CloudflareEnv);
  const secret = readRuntimeEnv(env, "MTN_MOMO_CONSUMER_SECRET" as keyof CloudflareEnv);
  if (!key || !secret) return null;
  const basic = btoa(`${key}:${secret}`);
  const res = await fetch(`${MOMO_BASE_URL}/oauth/access_token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    console.error("[MoMo] OAuth failed", res.status, await res.text().catch(() => ""));
    return null;
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  const ttlMs = (data.expires_in ?? 3600) * 1000;
  momoTokenCache = { token: data.access_token, expiresAt: now + ttlMs };
  return data.access_token;
}

async function supabaseInsert(
  env: CloudflareEnv,
  table: string,
  row: Record<string, unknown>,
  serviceRoleKey: string,
): Promise<boolean> {
  const url = readRuntimeEnv(env, "SUPABASE_URL") || readRuntimeEnv(env, "VITE_SUPABASE_URL");
  if (!url) return false;
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) console.error("[Supabase insert]", table, res.status, await res.text().catch(() => ""));
  return res.ok;
}

async function supabasePatch(
  env: CloudflareEnv,
  pathWithQuery: string,
  row: Record<string, unknown>,
  serviceRoleKey: string,
): Promise<boolean> {
  const url = readRuntimeEnv(env, "SUPABASE_URL") || readRuntimeEnv(env, "VITE_SUPABASE_URL");
  if (!url) return false;
  const res = await fetch(`${url}/rest/v1/${pathWithQuery}`, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) console.error("[Supabase patch]", pathWithQuery, res.status, await res.text().catch(() => ""));
  return res.ok;
}

type MomoInitiateBody = {
  kind?: "service" | "minute_package";
  service_id?: string;
  service_request_id?: string;
  minute_package_id?: string;
  phone_number?: string;
};

async function handleMomoInitiatePayment(request: Request, env: unknown): Promise<Response> {
  let lockKey: string | null = null;
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

    const body = (await request.json().catch(() => null)) as MomoInitiateBody | null;
    if (!body || !body.kind) return jsonResponse({ error: "Invalid request" }, 400);

    const digits = (body.phone_number || "").replace(/\D/g, "");
    if (digits.length !== 9 || !(digits.startsWith("078") || digits.startsWith("079"))) {
      return jsonResponse({ error: "Invalid phone number. Use a 9-digit 078/079 number." }, 400);
    }
    const msisdn = `250${digits}`;

    let amountRwf: number | null = null;
    let description = "San Brothers payment";
    let serviceRequestId: string | undefined;

    if (body.kind === "service") {
      if (!body.service_id) return jsonResponse({ error: "service_id required" }, 400);
      if (body.service_request_id) {
        const sr = await supabaseGet<{ id: string; client_id: string; service_id: string }>(
          cfEnv,
          `service_requests?id=eq.${encodeURIComponent(body.service_request_id)}&select=id,client_id,service_id`,
          serviceRoleKey,
        );
        if (!sr) return jsonResponse({ error: "Service request not found" }, 404);
        if (sr.client_id !== authedUser.id) return jsonResponse({ error: "Forbidden" }, 403);
        if (sr.service_id !== body.service_id) return jsonResponse({ error: "Service mismatch" }, 400);
        serviceRequestId = body.service_request_id;
      }
      const service = await supabaseGet<{
        id: string;
        name_en?: string;
        price_usd_min: number | null;
        price_usd_max: number | null;
        is_active: boolean | null;
      }>(
        cfEnv,
        `services?id=eq.${encodeURIComponent(body.service_id)}&select=id,name_en,price_usd_min,price_usd_max,is_active`,
        serviceRoleKey,
      );
      if (!service) return jsonResponse({ error: "Service not found" }, 404);
      if (service.is_active === false) return jsonResponse({ error: "Service not available" }, 400);
      const usd = service.price_usd_min ?? service.price_usd_max;
      if (!usd || usd <= 0) return jsonResponse({ error: "Price unavailable" }, 400);
      amountRwf = Math.round(usd * RWF_PER_USD);
      if (service.name_en) description = `San Brothers: ${service.name_en}`;
    } else if (body.kind === "minute_package") {
      if (!body.minute_package_id) return jsonResponse({ error: "minute_package_id required" }, 400);
      const pkg = await supabaseGet<{ id: string; price_usd: number | null; is_active: boolean | null }>(
        cfEnv,
        `minute_packages?id=eq.${encodeURIComponent(body.minute_package_id)}&select=id,price_usd,is_active`,
        serviceRoleKey,
      );
      if (!pkg) return jsonResponse({ error: "Package not found" }, 404);
      if (pkg.is_active === false) return jsonResponse({ error: "Package not available" }, 400);
      if (!pkg.price_usd || pkg.price_usd <= 0) return jsonResponse({ error: "Price unavailable" }, 400);
      amountRwf = Math.round(pkg.price_usd * RWF_PER_USD);
      description = "San Brothers: Interpreter Minutes";
    } else {
      return jsonResponse({ error: "Unsupported kind" }, 400);
    }

    lockKey = serviceRequestId || body.minute_package_id || null;
    if (lockKey) {
      if (momoInFlight.has(lockKey)) {
        return jsonResponse({ error: "A payment is already in progress for this item." }, 409);
      }
      momoInFlight.add(lockKey);
    }

    const token = await getMomoAccessToken(cfEnv);
    if (!token) {
      if (lockKey) momoInFlight.delete(lockKey);
      return jsonResponse({ error: "MoMo not configured" }, 500);
    }

    const externalTransactionId = crypto.randomUUID();

    const momoRes = await fetch(`${MOMO_BASE_URL}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        countryCode: "RW",
        transactionId: externalTransactionId,
      },
      body: JSON.stringify({
        externalTransactionId,
        countryCode: "RW",
        transactionType: "MERCHANT_PAYMENT",
        callbackURL: MOMO_CALLBACK_URL,
        description,
        payer: { payerIdType: "MSISDN", payerId: msisdn, payerNote: description },
        amount: { amount: String(amountRwf), units: "RWF" },
        totalAmount: { amount: String(amountRwf), units: "RWF" },
      }),
    });

    const momoData = (await momoRes.json().catch(() => ({}))) as {
      transactionId?: string;
      data?: { transactionId?: string };
      statusMessage?: string;
      message?: string;
    };

    if (!momoRes.ok) {
      if (lockKey) momoInFlight.delete(lockKey);
      console.error("[MoMo initiate failed]", momoRes.status, momoData);
      return jsonResponse(
        { error: momoData.statusMessage || momoData.message || "MoMo request failed" },
        400,
      );
    }

    const providerRef = momoData.transactionId || momoData.data?.transactionId || null;

    await supabaseInsert(
      cfEnv,
      "payments",
      {
        client_id: authedUser.id,
        service_request_id: serviceRequestId ?? null,
        amount_rwf: amountRwf,
        currency: "RWF",
        method: "momo",
        status: "pending",
        reference: externalTransactionId,
        provider_ref: providerRef,
        metadata: {
          kind: body.kind,
          service_id: body.service_id ?? null,
          minute_package_id: body.minute_package_id ?? null,
          msisdn,
          momo_response: momoData,
        },
      },
      serviceRoleKey,
    );

    return jsonResponse({
      referenceId: externalTransactionId,
      status: "pending",
      message: "Payment prompt sent to your phone. Please approve it.",
    });
  } catch (err) {
    if (lockKey) momoInFlight.delete(lockKey);
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

    if (!UUID_RE.test(referenceId)) return jsonResponse({ error: "Invalid referenceId" }, 400);

    const serviceRoleKey = readRuntimeEnv(cfEnv, "SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) return jsonResponse({ error: "Server not configured" }, 500);

    const token = await getMomoAccessToken(cfEnv);
    if (!token) return jsonResponse({ error: "MoMo not configured" }, 500);

    const res = await fetch(`${MOMO_BASE_URL}/${referenceId}/transactionStatus`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        countryCode: "RW",
        transactionId: referenceId,
      },
    });
    const data = (await res.json().catch(() => ({}))) as {
      statusCode?: string;
      statusMessage?: string;
      data?: { statusCode?: string; statusMessage?: string };
    };
    console.log("[MoMo Status] raw response:", JSON.stringify(data));

    const innerCode = data.data?.statusCode ?? data.statusCode;
    const innerMsg = data.data?.statusMessage ?? data.statusMessage ?? "";
    const isSuccess = innerCode === "0000" || /success/i.test(innerMsg);
    const isFailure =
      !isSuccess &&
      innerCode != null &&
      innerCode !== "" &&
      !/pending|in.?progress/i.test(innerMsg);

    if (isSuccess) {
      await supabasePatch(
        cfEnv,
        `payments?reference=eq.${encodeURIComponent(referenceId)}`,
        { status: "completed", paid_at: new Date().toISOString() },
        serviceRoleKey,
      );
      momoInFlight.delete(referenceId);
      return jsonResponse({ status: "SUCCESSFUL", message: innerMsg || "Payment successful" });
    }
    if (isFailure) {
      await supabasePatch(
        cfEnv,
        `payments?reference=eq.${encodeURIComponent(referenceId)}`,
        { status: "failed" },
        serviceRoleKey,
      );
      momoInFlight.delete(referenceId);
      return jsonResponse({ status: "FAILED", message: innerMsg || "Payment failed" });
    }
    return jsonResponse({ status: "PENDING", message: innerMsg || "Awaiting confirmation" });
  } catch (err) {
    console.error("[MoMo status]", err);
    return jsonResponse({ error: "Status check failed" }, 500);
  }
}

async function handleMomoCallback(request: Request, env: unknown): Promise<Response> {
  try {
    const cfEnv = hasRuntimeEnv(env) ? env : {};
    const serviceRoleKey = readRuntimeEnv(cfEnv, "SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) return jsonResponse({ received: true });

    const body = (await request.json().catch(() => ({}))) as {
      externalTransactionId?: string;
      statusCode?: string;
      data?: { externalTransactionId?: string; statusCode?: string };
    };
    const ext = body.externalTransactionId || body.data?.externalTransactionId;
    const code = body.statusCode || body.data?.statusCode;
    if (!ext || !UUID_RE.test(ext)) return jsonResponse({ received: true });

    momoInFlight.delete(ext);

    const update: Record<string, unknown> =
      code === "0000"
        ? { status: "completed", paid_at: new Date().toISOString() }
        : { status: "failed" };
    await supabasePatch(
      cfEnv,
      `payments?reference=eq.${encodeURIComponent(ext)}`,
      update,
      serviceRoleKey,
    );
    return jsonResponse({ received: true });
  } catch (err) {
    console.error("[MoMo callback]", err);
    return jsonResponse({ received: true });
  }
}



async function supabaseGet<T>(
  env: CloudflareEnv,
  path: string,
  apiKey: string,
): Promise<T | null> {
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

async function handleStripePaymentIntent(
  request: Request,
  env: unknown,
): Promise<Response> {
  try {
    const cfEnv = hasRuntimeEnv(env) ? env : {};

    // 1) Authenticate caller
    const authHeader = request.headers.get("authorization") || "";
    const bearer = authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : "";
    if (!bearer) return jsonResponse({ error: "Unauthorized" }, 401);

    const secretKey = readRuntimeEnv(cfEnv, "STRIPE_SECRET_KEY");
    if (!secretKey) return jsonResponse({ error: "Stripe not configured" }, 500);

    const serviceRoleKey = readRuntimeEnv(cfEnv, "SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) {
      return jsonResponse(
        { error: "Server not configured for payment authorization" },
        500,
      );
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

  const supabaseUrl = readRuntimeEnv(env, "VITE_SUPABASE_URL") || readRuntimeEnv(env, "SUPABASE_URL");
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

