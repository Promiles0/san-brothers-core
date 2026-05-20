import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, type ProfileRow } from "@/lib/supabase";

export interface SignUpData {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  preferred_language: "en" | "zh" | "rw";
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: ProfileRow | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (data: SignUpData) => Promise<{ error: Error | null; userId?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  resendVerification: (email: string) => Promise<{ error: Error | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  if (typeof window === "undefined") return <>{children}</>;
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const profileFetchId = useRef(0);

  const fetchProfile = useCallback(async (uid: string | null) => {
    const id = ++profileFetchId.current;
    if (!uid) {
      setProfile(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", uid)
        .maybeSingle();
      if (id !== profileFetchId.current) return;
      if (error) {
        // eslint-disable-next-line no-console
        console.warn("[auth] profile fetch error", error.message);
        setProfile(null);
      } else {
        setProfile((data as ProfileRow | null) ?? null);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[auth] profile fetch failed", e);
    }
  }, []);

  useEffect(() => {
    // IMPORTANT: subscribe BEFORE getSession to avoid missing events
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      // Defer profile fetch to avoid deadlock inside callback
      setTimeout(() => fetchProfile(newSession?.user?.id ?? null), 0);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      fetchProfile(data.session?.user?.id ?? null).finally(() => setLoading(false));
    });

    return () => sub.subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = useCallback<AuthContextValue["signIn"]>(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      // best-effort last_login_at update (RLS will allow user's own row)
      const uid = (await supabase.auth.getUser()).data.user?.id;
      if (uid) {
        await supabase
          .from("users")
          .update({ last_login_at: new Date().toISOString() })
          .eq("id", uid);
      }
    }
    return { error: error ? new Error(error.message) : null };
  }, []);

  const signUp = useCallback<AuthContextValue["signUp"]>(async (data) => {
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { data: res, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          full_name: data.full_name,
          phone: data.phone,
          preferred_language: data.preferred_language,
        },
      },
    });
    return {
      error: error ? new Error(error.message) : null,
      userId: res.user?.id,
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
    setUser(null);
  }, []);

  const resetPassword = useCallback<AuthContextValue["resetPassword"]>(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const updatePassword = useCallback<AuthContextValue["updatePassword"]>(async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const resendVerification = useCallback<AuthContextValue["resendVerification"]>(async (email) => {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const verifyOtp = useCallback<AuthContextValue["verifyOtp"]>(async (email, token) => {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    return { error: error ? new Error(error.message) : null };
  }, []);

  const refreshProfile = useCallback(async () => {
    await fetchProfile(user?.id ?? null);
  }, [fetchProfile, user?.id]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      loading,
      signIn,
      signUp,
      signOut,
      resetPassword,
      updatePassword,
      resendVerification,
      verifyOtp,
      refreshProfile,
    }),
    [user, session, profile, loading, signIn, signUp, signOut, resetPassword, updatePassword, resendVerification, verifyOtp, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
