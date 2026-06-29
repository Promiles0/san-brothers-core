import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  interface Window {
    __SAN_BROTHERS_ENV__?: {
      VITE_SUPABASE_URL?: string;
      SUPABASE_URL?: string;
      VITE_SUPABASE_ANON_KEY?: string;
      SUPABASE_ANON_KEY?: string;
      VITE_SUPABASE_PUBLISHABLE_KEY?: string;
      SUPABASE_PUBLISHABLE_KEY?: string;
    };
  }
}

type PublicEnvKey =
  | "VITE_SUPABASE_URL"
  | "SUPABASE_URL"
  | "VITE_SUPABASE_ANON_KEY"
  | "SUPABASE_ANON_KEY"
  | "VITE_SUPABASE_PUBLISHABLE_KEY"
  | "SUPABASE_PUBLISHABLE_KEY";

function readEnv(key: PublicEnvKey): string {
  // 1. Build-time (works when VITE_ vars are in wrangler.jsonc or .env)
  const buildTime = (import.meta.env as Record<string, string | undefined>)[key];
  if (buildTime && buildTime.trim() && !buildTime.includes("pending")) {
    return buildTime.trim();
  }
  // 2. Runtime injection (server.ts injects window.__SAN_BROTHERS_ENV__ from Cloudflare Secrets)
  if (typeof window !== "undefined") {
    const runtime = window.__SAN_BROTHERS_ENV__?.[key];
    if (runtime && runtime.trim()) return runtime.trim();
  }
  return "";
}

function readFirstEnv(keys: PublicEnvKey[]): string {
  for (const key of keys) {
    const value = readEnv(key);
    if (value) return value;
  }
  return "";
}

let _client: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url = readFirstEnv(["VITE_SUPABASE_URL", "SUPABASE_URL"]);
  const key = readFirstEnv([
    "VITE_SUPABASE_ANON_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_ANON_KEY",
    "SUPABASE_PUBLISHABLE_KEY",
  ]);

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Cloudflare before loading the app.",
    );
  }

  _client = createClient(url, key, {
    auth: {
      persistSession: typeof window !== "undefined",
      autoRefreshToken: typeof window !== "undefined",
      detectSessionInUrl: typeof window !== "undefined",
    },
  });
  return _client;
}

export async function uploadToStorage(
  bucket: string,
  path: string,
  file: File | Blob,
  options?: {
    upsert?: boolean;
    contentType?: string;
    cacheControl?: string;
  },
) {
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  const encodedPath = encodeURI(normalizedPath);
  return supabase.storage.from(bucket).upload(encodedPath, file, {
    upsert: options?.upsert ?? false,
    contentType: options?.contentType,
    cacheControl: options?.cacheControl,
  });
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = client[prop as keyof SupabaseClient];
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: "client" | "secretary" | "manager" | "translator" | "admin";
  signup_source: string;
  preferred_language: "en" | "zh" | "rw";
  profile_picture_url: string | null;
  two_factor_enabled: boolean;
  theme_preference: "light" | "dark" | "system";
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  status: string;
  interpreter_profile_complete: boolean;
  interpreter_languages: { from: string; to: string }[] | null;
  interpreter_bio: string | null;
  availability_status: string | null;
  city: string | null;
  country: string | null;
}
