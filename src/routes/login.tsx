import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertCircle, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthLayoutEnhanced } from "@/components/auth/auth-layout-enhanced";
import { EnhancedInput } from "@/components/auth/enhanced-input";
import { ToggleSwitch } from "@/components/auth/toggle-switch";
import { GoogleSignInButton, WeChatSignInButton, OrDivider } from "@/components/auth/google-signin-button";
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
  component: LoginPageEnhanced,
});

function LoginPageEnhanced() {
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
  const [show2FA, setShow2FA] = useState(false);
  const [twoFACode, setTwoFACode] = useState("");

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
    setServerError(null);

    try {
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

      toast.success("Welcome back!");

      // Check if 2FA is enabled (placeholder for future implementation)
      const { data: profileData } = await supabase
        .from("users")
        .select("role, source_portals, two_fa_enabled")
        .eq("id", authData.user.id)
        .maybeSingle();

      const role = (profileData as { role?: string } | null)?.role;
      const twoFAEnabled = (profileData as { two_fa_enabled?: boolean } | null)?.two_fa_enabled;

      if (twoFAEnabled) {
        setShow2FA(true);
        return;
      }

      if (next) {
        window.location.href = next;
        return;
      }

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

  if (show2FA) {
    return (
      <AuthLayoutEnhanced
        title={t("auth.login.twoFA") || "Two-Factor Authentication"}
        subtitle="Enter the code from your authenticator app"
      >
        <div className="space-y-4">
          <EnhancedInput
            type="text"
            placeholder="000000"
            value={twoFACode}
            onChange={(e) => setTwoFACode(e.target.value)}
            maxLength={6}
            secureIndicator
          />
          <Button type="button" className="w-full" disabled={twoFACode.length !== 6}>
            Verify Code
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setShow2FA(false)}
          >
            Back
          </Button>
        </div>
      </AuthLayoutEnhanced>
    );
  }

  return (
    <AuthLayoutEnhanced
      title={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
      footer={
        <span>
          {t("auth.login.noAccount")}{" "}
          <Link
            to="/signup"
            search={{ intent: intent || undefined } as never}
            className="font-medium text-primary hover:underline transition-colors"
          >
            {t("common.signup")}
          </Link>
        </span>
      }
    >
      {serverError ? (
        <Alert variant="destructive" className="mb-4 animate-shake">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      {/* Social login buttons */}
      <div className="space-y-2 mb-6">
        <GoogleSignInButton onClick={handleGoogleSignIn} loading={googleLoading} />
        <WeChatSignInButton />
      </div>
      <OrDivider />

      {/* Email/Password form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <EnhancedInput
          label={t("auth.signup.email")}
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          error={errors.email?.message ? t(errors.email.message!) : undefined}
          {...register("email")}
        />

        <EnhancedInput
          label={t("auth.signup.password")}
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          showPasswordToggle
          secureIndicator
          error={errors.password?.message ? t(errors.password.message!) : undefined}
          {...register("password")}
        />

        {/* Remember me & Forgot password */}
        <div className="flex items-center justify-between gap-4">
          <ToggleSwitch
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            label={t("auth.login.rememberMe")}
          />
          <Link
            to="/forgot-password"
            className="text-xs text-primary hover:underline transition-colors whitespace-nowrap"
          >
            {t("auth.login.forgot")}
          </Link>
        </div>

        {/* Sign in button */}
        <Button
          type="submit"
          className="w-full h-11 text-base font-semibold"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Signing in...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Sign in securely
            </>
          )}
        </Button>
      </form>

      {/* Security badge */}
      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
        <span>Your data is encrypted and secure</span>
      </div>
    </AuthLayoutEnhanced>
  );
}
