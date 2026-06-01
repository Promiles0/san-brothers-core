import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/lib/providers/i18n-provider";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: (s: Record<string, unknown>) => ({
    intent: typeof s.intent === "string" ? s.intent : undefined,
  }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { intent } = useSearch({ from: "/auth/callback" }) as { intent?: string };
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Supabase SDK auto-detects session from URL on load
        await new Promise((r) => setTimeout(r, 200));
        const { data, error: sessErr } = await supabase.auth.getSession();
        if (cancelled) return;
        if (sessErr || !data.session) {
          navigate({
            to: "/auth/error",
            search: { message: sessErr?.message ?? "no_session" } as never,
          });
          return;
        }
        const uid = data.session.user.id;
        const savedIntent = intent || sessionStorage.getItem("signup_intent");

        if (savedIntent) {
          sessionStorage.removeItem("signup_intent");
          navigate({
            to: "/dashboard/services",
            search: { apply: savedIntent } as never,
          });
          return;
        }

        // Pick up pending intent
        const { data: intents } = await supabase
          .from("signup_intents")
          .select("*")
          .eq("user_id", uid)
          .eq("consumed", false)
          .order("captured_at", { ascending: false })
          .limit(1);
        const pending = intents?.[0];
        if (pending) {
          await supabase.from("signup_intents").update({ consumed: true }).eq("id", pending.id);
          navigate({
            to: "/dashboard",
            search: { intent: pending.intent_slug } as never,
          });
          return;
        }
        navigate({ to: "/dashboard", search: {} as never });
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "unknown";
        setError(msg);
        navigate({ to: "/auth/error", search: { message: msg } as never });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [intent, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">
          {error ?? t("auth.callback.activating")}
        </p>
      </div>
    </div>
  );
}
