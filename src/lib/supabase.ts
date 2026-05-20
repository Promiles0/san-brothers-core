import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  (import.meta.env.SUPABASE_URL as string | undefined) ||
  "";
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  (import.meta.env.SUPABASE_ANON_KEY as string | undefined) ||
  "";

let _client: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url = supabaseUrl ?? "";
  const key = supabaseAnonKey ?? "";

  if (!url || !key) {
    throw new Error(
      "[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them to your .env file.",
    );
  }

  _client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = client[prop as keyof SupabaseClient];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(client) : value;
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
}
