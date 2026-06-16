import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, AlertCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthLayoutEnhanced, PasswordStrength } from "@/components/auth/auth-layout-enhanced";
import { EnhancedInput } from "@/components/auth/enhanced-input";
import {
  GoogleSignInButton,
  WeChatSignInButton,
  OrDivider,
} from "@/components/auth/google-signin-button";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";
import { intentLabel, friendlyAuthError } from "@/lib/auth/intent-labels";
import { supabase } from "@/lib/supabase";
import { usePortal, type Portal } from "@/lib/portal-context";

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
    portal: typeof s.portal === "string" ? (s.portal as Portal) : undefined,
  }),
  component: SignupPageEnhanced,
});

type SignupStep = "basic" | "details" | "security" | "confirm";

function SignupPageEnhanced() {
  const { t } = useI18n();
  const { intent, portal: portalParam } = useSearch({ from: "/signup" }) as {
    intent?: string;
    portal?: Portal;
  };
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { current: detectedPortal } = usePortal();
  const targetPortal: Portal = portalParam || detectedPortal;

  const [currentStep, setCurrentStep] = useState<SignupStep>("basic");
  const [serverError, setServerError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: { preferred_language: "en", terms: false },
    mode: "onChange",
  });

  const password = watch("password") || "";
  const lang = watch("preferred_language");
  const terms = watch("terms");
  const intentName = intentLabel(intent);

  useEffect(() => {
    if (intent) sessionStorage.setItem("signup_intent", intent);
    sessionStorage.setItem("signup_portal", targetPortal);
  }, [intent, targetPortal]);

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

  const handleNextStep = async () => {
    const steps: SignupStep[] = ["basic", "details", "security", "confirm"];
    const currentIndex = steps.indexOf(currentStep);

    let fieldsToValidate: (keyof SignupForm)[] = [];

    if (currentStep === "basic") {
      fieldsToValidate = ["full_name", "email"];
    } else if (currentStep === "details") {
      fieldsToValidate = ["phone", "preferred_language"];
    } else if (currentStep === "security") {
      fieldsToValidate = ["password", "confirm"];
    }

    const isValid = await trigger(fieldsToValidate);

    if (isValid && currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handlePrevStep = () => {
    const steps: SignupStep[] = ["basic", "details", "security", "confirm"];
    const currentIndex = steps.indexOf(currentStep);

    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

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

    if (userId) {
      await supabase
        .from("users")
        .update({ source_portals: [targetPortal] })
        .eq("id", userId);
    }

    toast.success(t("auth.signup.successToast"));
    navigate({
      to: "/signup/verify-email",
      search: { email: data.email, intent } as never,
    });
  };

  const stepTitles: Record<SignupStep, string> = {
    basic: "Create your account",
    details: "Tell us more",
    security: "Secure your account",
    confirm: "Review & confirm",
  };

  const stepDescriptions: Record<SignupStep, string> = {
    basic: "Start with your basic information",
    details: "Add your contact details",
    security: "Set a strong password",
    confirm: "Review everything before confirming",
  };

  return (
    <AuthLayoutEnhanced
      title={stepTitles[currentStep]}
      subtitle={stepDescriptions[currentStep]}
      footer={
        <span>
          {t("auth.signup.haveAccount")}{" "}
          <Link
            to="/login"
            search={{ intent: intent || undefined } as never}
            className="font-medium text-primary hover:underline transition-colors"
          >
            {t("common.login")}
          </Link>
        </span>
      }
    >
      {/* Progress indicator */}
      <div className="mb-8 flex justify-between gap-2">
        {(["basic", "details", "security", "confirm"] as SignupStep[]).map((step, index) => (
          <div
            key={step}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              ["basic", "details", "security", "confirm"].indexOf(currentStep) >= index
                ? "bg-primary"
                : "bg-muted"
            }`}
          />
        ))}
      </div>

      {intentName ? (
        <div className="mb-4 rounded-lg bg-primary/10 px-3 py-2 text-sm text-foreground animate-fade-in">
          {t("auth.signup.intentBanner")} <span className="font-semibold">{intentName}</span>
        </div>
      ) : null}

      {serverError ? (
        <Alert variant="destructive" className="mb-4 animate-shake">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      {/* Step 1: Basic Information */}
      {currentStep === "basic" && (
        <div className="space-y-4 animate-fade-in">
          <div className="space-y-2 mb-6">
            <GoogleSignInButton onClick={handleGoogleSignIn} loading={googleLoading} />
            <WeChatSignInButton />
          </div>
          <OrDivider />

          <EnhancedInput
            label={t("auth.signup.fullName")}
            placeholder="Full Name"
            autoComplete="name"
            error={errors.full_name?.message ? t(errors.full_name.message) : undefined}
            {...register("full_name")}
          />

          <EnhancedInput
            label={t("auth.signup.email")}
            type="email"
            placeholder="your@email.com"
            autoComplete="email"
            error={errors.email?.message ? t(errors.email.message) : undefined}
            {...register("email")}
          />

          <Button onClick={handleNextStep} className="w-full h-11">
            Next <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {/* Step 2: Contact Details */}
      {currentStep === "details" && (
        <div className="space-y-4 animate-fade-in">
          <EnhancedInput
            label={t("auth.signup.phone")}
            type="tel"
            placeholder="+250 7--- --- ---"
            hint={t("auth.signup.phoneHint")}
            error={errors.phone?.message ? t(errors.phone.message) : undefined}
            {...register("phone")}
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              {t("auth.signup.preferredLanguage")}
            </label>
            <Select
              value={lang}
              onValueChange={(v) => setValue("preferred_language", v as "en" | "zh" | "rw")}
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
                <SelectItem value="rw">Kinyarwanda</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevStep}
              className="flex-1 h-11"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleNextStep} className="flex-1 h-11">
              Next <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Security */}
      {currentStep === "security" && (
        <div className="space-y-4 animate-fade-in">
          <EnhancedInput
            label={t("auth.signup.password")}
            type="password"
            placeholder="Create a strong password"
            showPasswordToggle
            error={errors.password?.message ? t(errors.password.message) : undefined}
            {...register("password")}
          />

          <PasswordStrength password={password} />

          <EnhancedInput
            label={t("auth.signup.confirmPassword")}
            type="password"
            placeholder="Confirm your password"
            showPasswordToggle
            error={errors.confirm?.message ? t(errors.confirm.message) : undefined}
            {...register("confirm")}
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevStep}
              className="flex-1 h-11"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleNextStep} className="flex-1 h-11">
              Next <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Confirm */}
      {currentStep === "confirm" && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 animate-fade-in">
          <div className="rounded-lg bg-muted/50 p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{watch("full_name")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{watch("email")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone:</span>
              <span className="font-medium">{watch("phone")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Language:</span>
              <span className="font-medium uppercase">{watch("preferred_language")}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 py-2">
            <input
              type="checkbox"
              id="terms"
              checked={terms}
              onChange={(e) => setValue("terms", e.target.checked, { shouldValidate: true })}
              className="mt-1"
            />
            <label htmlFor="terms" className="text-xs text-muted-foreground leading-snug">
              {t("auth.signup.termsPrefix")}{" "}
              <a href="/terms" className="underline text-primary hover:text-primary/80">
                {t("auth.signup.terms")}
              </a>{" "}
              {t("common.and") || "&"}{" "}
              <a href="/privacy" className="underline text-primary hover:text-primary/80">
                {t("auth.signup.privacy")}
              </a>
            </label>
          </div>
          {errors.terms ? (
            <p className="text-xs text-destructive">{t(errors.terms.message!)}</p>
          ) : null}

          <div id="turnstile-container" />

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevStep}
              className="flex-1 h-11"
              disabled={isSubmitting}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button type="submit" className="flex-1 h-11" disabled={isSubmitting || !terms}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  Create Account
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">{t("auth.signup.helpText")}</p>
        </form>
      )}
    </AuthLayoutEnhanced>
  );
}
