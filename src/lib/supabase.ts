import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  interface Window {
    __SAN_BROTHERS_ENV__?: {
      VITE_SUPABASE_URL?: string;
      VITE_SUPABASE_ANON_KEY?: string;
    };
  }
}

function readEnv(key: "VITE_SUPABASE_URL" | "VITE_SUPABASE_ANON_KEY"): string {
  // 1. Build-time (works when VITE_ vars are in wrangler.jsonc or .env)
  const buildTime = import.meta.env[key] as string | undefined;
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

// Client is created lazily — only when first used, by which time
// window.__SAN_BROTHERS_ENV__ has been injected by the server.
let _client: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  // Reset client if env is now available (first call after hydration)
  if (_client) return _client;

  const url = readEnv("VITE_SUPABASE_URL");
  const key = readEnv("VITE_SUPABASE_ANON_KEY");

  if (!url || !key) {
    // Return a no-op proxy so the app doesn't crash during SSR or
    // before hydration — real calls will fail gracefully with auth errors.
    console.warn("[Supabase] Config not yet available — will retry on next call after hydration.");
    // Return a temporary stub that retries on next property access
    return new Proxy({} as SupabaseClient, {
      get(_t, prop) {
        // On next access, try again (window.__SAN_BROTHERS_ENV__ may now be set)
        const retryUrl = readEnv("VITE_SUPABASE_URL");
        const retryKey = readEnv("VITE_SUPABASE_ANON_KEY");
        if (retryUrl && retryKey) {
          _client = createClient(retryUrl, retryKey, {
            auth: {
              persistSession: true,
              autoRefreshToken: true,
              detectSessionInUrl: true,
            },
          });
          const value = _client[prop as keyof SupabaseClient];
          return typeof value === "function"
            ? (value as (...args: unknown[]) => unknown).bind(_client)
            : value;
        }
        // Still not available — return a no-op function to prevent crashes
        return typeof prop === "string"
          ? () => Promise.resolve({ data: null, error: new Error("Supabase not configured") })
          : undefined;
      },
    });
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
