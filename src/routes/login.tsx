import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthLayout } from "@/components/auth/auth-layout";
import { GoogleSignInButton, OrDivider } from "@/components/auth/google-signin-button";
import { useI18n } from "@/lib/providers/i18n-provider";
import { supabase } from "@/lib/supabase";
import { usePortal } from "@/lib/portal-context";

const schema = z.object({
  email: z.string().email("auth.errors.invalidEmail"),
  password: z.string().min(1, "auth.errors.passwordRequired"),
});
type Form = z.infer<typeof schema>;

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    intent: typeof s.intent === "string" ? s.intent : undefined,
    next: typeof s.next === "string" ? s.next : undefined,
    portal: typeof s.portal === "string" ? s.portal : undefined,
  }),
  component: LoginPage,
});
function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const {
    intent,
    next,
    portal: portalParam,
  } = useSearch({ from: "/login" }) as { intent?: string; next?: string; portal?: string };
  const { current: detectedPortal } = usePortal();
  const targetPortal = (portalParam || detectedPortal) as
    | "san-brothers"
    | "translate"
    | "consultancy";
  const [serverError, setServerError] = useState<string | null>(null);
  const [remember, setRemember] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (intent) {
      sessionStorage.setItem("signup_intent", intent);
    }
  }, [intent]);

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);

    const googleIntent = intent || new URLSearchParams(window.location.search).get("intent");

    if (googleIntent) {
      sessionStorage.setItem("signup_intent", googleIntent);
    }

    const intentParam = googleIntent ? `?intent=${encodeURIComponent(googleIntent)}` : "";

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback${intentParam}`,
      },
    });

    if (error) {
      toast.error(error.message);
      setGoogleLoading(false);
    }
  };

  const onSubmit = async (data: Form) => {
    console.log("submit fired");
    setServerError(null);

    try {
      // Call Supabase directly — bypasses any auth context issues
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        console.error("[Login] Supabase auth error:", error);
        setServerError(error.message);
        toast.error(error.message);
        return;
      }

      if (!authData.user) {
        setServerError("Login failed. Please check your email and password.");
        toast.error("Login failed.");
        return;
      }

      console.log("[Login] Success! User:", authData.user.email);
      toast.success("Welcome back!");

      if (next) {
        window.location.href = next;
        return;
      }

      // Fetch role + portals to redirect correctly and track portal source
      const { data: profileData } = await supabase
        .from("users")
        .select("role, source_portals")
        .eq("id", authData.user.id)
        .maybeSingle();
      const role = (profileData as { role?: string } | null)?.role;
      const existingPortals =
        (profileData as { source_portals?: string[] } | null)?.source_portals ?? [];
      if (!existingPortals.includes(targetPortal)) {
        await supabase
          .from("users")
          .update({ source_portals: [...existingPortals, targetPortal] })
          .eq("id", authData.user.id);
      }
      const savedIntent = intent || sessionStorage.getItem("signup_intent");

      if (savedIntent && role === "client") {
        sessionStorage.removeItem("signup_intent");
        navigate({
          to: "/dashboard/services",
          search: { apply: savedIntent } as never,
        });
        return;
      }

      if (role === "admin") {
        navigate({ to: "/admin", search: {} as never });
      } else if (role === "client") {
        navigate({ to: "/dashboard", search: {} as never });
      } else {
        navigate({ to: "/staff", search: {} as never });
      }
    } catch (err) {
      console.error("[Login] Unexpected error:", err);
      setServerError("Something went wrong. Please try again.");
      toast.error("Something went wrong.");
    }
  };

  return (
    <AuthLayout
      title={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
      footer={
        <span>
          {t("auth.login.noAccount")}{" "}
          <Link
            to="/signup"
            search={{ intent: intent || undefined } as never}
            className="font-medium text-primary hover:underline"
          >
            {t("common.signup")}
          </Link>
        </span>
      }
    >
      {serverError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <GoogleSignInButton onClick={handleGoogleSignIn} loading={googleLoading} />
      <OrDivider />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t("auth.signup.email")}</Label>
          <Input type="email" autoComplete="email" {...register("email")} />
          {errors.email ? (
            <p className="text-xs text-destructive">{t(errors.email.message!)}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label>{t("auth.signup.password")}</Label>
          <Input type="password" autoComplete="current-password" {...register("password")} />
          {errors.password ? (
            <p className="text-xs text-destructive">{t(errors.password.message!)}</p>
          ) : null}
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox checked={remember} onCheckedChange={(v) => setRemember(Boolean(v))} />
            {t("auth.login.rememberMe")}
          </label>
          <Link to="/forgot-password" className="text-xs text-primary hover:underline">
            {t("auth.login.forgot")}
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.login.submit")}
        </Button>
      </form>
    </AuthLayout>
  );
}
