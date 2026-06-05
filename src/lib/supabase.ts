import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || import.meta.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.SUPABASE_ANON_KEY || "";

let _client: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;
  const url = SUPABASE_URL || "https://placeholder.supabase.co";
  const key = SUPABASE_ANON_KEY || "placeholder-key";
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
  }
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
