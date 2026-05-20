import { useState } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";
import { friendlyAuthError } from "@/lib/auth/intent-labels";
import { supabase } from "@/lib/supabase";

const schema = z.object({
  email: z.string().email("auth.errors.invalidEmail"),
  password: z.string().min(1, "auth.errors.passwordRequired"),
  remember: z.boolean().optional(),
});
type Form = z.infer<typeof schema>;

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({
    intent: typeof s.intent === "string" ? s.intent : undefined,
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { intent, next } = useSearch({ from: "/login" }) as { intent?: string; next?: string };
  const { signIn } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    setServerError(null);
    const { error } = await signIn(data.email, data.password);
    if (error) {
      const k = friendlyAuthError(error.message);
      setServerError(t(k));
      toast.error(t(k));
      return;
    }
    // Check 2FA
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (uid) {
      const { data: profile } = await supabase.from("users").select("role,two_factor_enabled").eq("id", uid).maybeSingle();
      const staff = ["secretary", "manager", "translator", "admin"];
      if (profile && staff.includes(profile.role) && profile.two_factor_enabled) {
        navigate({ to: "/login/2fa", search: {} as never });
        return;
      }
    }
    if (intent) navigate({ to: "/dashboard", search: { intent } as never });
    else if (next) window.location.href = next;
    else navigate({ to: "/dashboard", search: {} as never });
  };

  return (
    <AuthLayout
      title={t("auth.login.title")}
      subtitle={t("auth.login.subtitle")}
      footer={
        <span>
          {t("auth.login.noAccount")}{" "}
          <Link to="/signup" search={{ intent } as never} className="font-medium text-primary hover:underline">
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t("auth.signup.email")}</Label>
          <Input type="email" autoComplete="email" {...register("email")} />
          {errors.email ? <p className="text-xs text-destructive">{t(errors.email.message!)}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label>{t("auth.signup.password")}</Label>
          <Input type="password" autoComplete="current-password" {...register("password")} />
          {errors.password ? <p className="text-xs text-destructive">{t(errors.password.message!)}</p> : null}
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox {...register("remember")} />
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
