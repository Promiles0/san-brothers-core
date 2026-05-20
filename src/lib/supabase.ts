import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("[Supabase] MISSING ENV VARS - add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env file");
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

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
