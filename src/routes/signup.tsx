import { useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthLayout, PasswordStrength } from "@/components/auth/auth-layout";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";
import { intentLabel, friendlyAuthError } from "@/lib/auth/intent-labels";
import { supabase } from "@/lib/supabase";
const signupSchema = z
  .object({
    full_name: z.string().min(2, "auth.errors.nameTooShort"),
    email: z.string().email("auth.errors.invalidEmail"),
    phone: z
      .string()
      .min(6, "auth.errors.invalidPhone")
      .regex(/^\+?[0-9\s\-()]+$/, "auth.errors.invalidPhone"),
    preferred_language: z.enum(["en", "zh", "rw"]),
    password: z.string().min(8, "auth.errors.weakPassword"),
    confirm: z.string(),
    terms: z.boolean().refine((v) => v, { message: "auth.errors.termsRequired" }),
  })
  .refine((d) => d.password === d.confirm, {
    message: "auth.errors.passwordsDontMatch",
    path: ["confirm"],
  });

type SignupForm = z.infer<typeof signupSchema>;

export const Route = createFileRoute("/signup")({
  validateSearch: (s: Record<string, unknown>) => ({
    intent: typeof s.intent === "string" ? s.intent : undefined,
  }),
  component: SignupPage,
});

function SignupPage() {
  const { t } = useI18n();
  const { intent } = useSearch({ from: "/signup" }) as { intent?: string };
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { preferred_language: "en", terms: false },
  });

  const password = watch("password") || "";
  const lang = watch("preferred_language");
  const intentName = intentLabel(intent);

  const onSubmit = async (data: SignupForm) => {
    setServerError(null);
    const { error, userId } = await signUp({
      email: data.email,
      password: data.password,
      full_name: data.full_name,
      phone: data.phone,
      preferred_language: data.preferred_language,
    });
    if (error) {
      const key = friendlyAuthError(error.message);
      setServerError(t(key));
      toast.error(t(key));
      return;
    }
    if (intent && userId) {
      await supabase.from("signup_intents").insert({ user_id: userId, intent_slug: intent });
    }
    toast.success(t("auth.signup.successToast"));
    navigate({
      to: "/signup/verify-email",
      search: { email: data.email, intent } as never,
    });
  };

  return (
    <AuthLayout
      title={t("auth.signup.title")}
      subtitle={t("auth.signup.subtitle")}
      footer={
        <span>
          {t("auth.signup.haveAccount")}{" "}
          <Link
            to="/login"
            search={{ intent } as never}
            className="font-medium text-primary hover:underline"
          >
            {t("common.login")}
          </Link>
        </span>
      }
    >
      {intentName ? (
        <div className="mb-4 rounded-md bg-primary/10 px-3 py-2 text-sm text-foreground">
          {t("auth.signup.intentBanner")} <span className="font-semibold">{intentName}</span>
        </div>
      ) : null}

      {serverError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field
          label={t("auth.signup.fullName")}
          error={errors.full_name?.message ? t(errors.full_name.message) : undefined}
        >
          <Input autoComplete="name" {...register("full_name")} />
        </Field>
        <Field
          label={t("auth.signup.email")}
          error={errors.email?.message ? t(errors.email.message) : undefined}
        >
          <Input type="email" autoComplete="email" {...register("email")} />
        </Field>
        <Field
          label={t("auth.signup.phone")}
          hint={t("auth.signup.phoneHint")}
          error={errors.phone?.message ? t(errors.phone.message) : undefined}
        >
          <Input type="tel" placeholder="+250 7XX XXX XXX" {...register("phone")} />
        </Field>
        <Field label={t("auth.signup.preferredLanguage")}>
          <Select
            value={lang}
            onValueChange={(v) => setValue("preferred_language", v as "en" | "zh" | "rw")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="zh">中文</SelectItem>
              <SelectItem value="rw">Kinyarwanda</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field
          label={t("auth.signup.password")}
          error={errors.password?.message ? t(errors.password.message) : undefined}
        >
          <Input type="password" autoComplete="new-password" {...register("password")} />
          <PasswordStrength password={password} />
        </Field>
        <Field
          label={t("auth.signup.confirmPassword")}
          error={errors.confirm?.message ? t(errors.confirm.message) : undefined}
        >
          <Input type="password" autoComplete="new-password" {...register("confirm")} />
        </Field>

        <div className="flex items-start gap-2">
          <Checkbox
            id="terms"
            onCheckedChange={(c) => setValue("terms", Boolean(c), { shouldValidate: true })}
          />
          <label htmlFor="terms" className="text-xs text-muted-foreground leading-snug">
            {t("auth.signup.termsPrefix")}{" "}
            <a href="/terms" className="underline">
              {t("auth.signup.terms")}
            </a>{" "}
            {t("common.and") || "&"}{" "}
            <a href="/privacy" className="underline">
              {t("auth.signup.privacy")}
            </a>
          </label>
        </div>
        {errors.terms ? (
          <p className="text-xs text-destructive">{t(errors.terms.message!)}</p>
        ) : null}

        <div id="turnstile-container" />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.signup.submit")}
        </Button>

        <p className="text-center text-xs text-muted-foreground">{t("auth.signup.helpText")}</p>
      </form>
    </AuthLayout>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint && !error ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
