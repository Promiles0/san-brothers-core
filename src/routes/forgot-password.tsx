import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertCircle, Loader2, CheckCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthLayoutEnhanced } from "@/components/auth/auth-layout-enhanced";
import { EnhancedInput } from "@/components/auth/enhanced-input";
import { useI18n } from "@/lib/providers/i18n-provider";
import { supabase } from "@/lib/supabase";

const schema = z.object({
  email: z.string().email("auth.errors.invalidEmail"),
});

type Form = z.infer<typeof schema>;

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPageEnhanced,
});

function ForgotPasswordPageEnhanced() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    setServerError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error("[Forgot Password] Error:", error);
        setServerError(error.message);
        toast.error(error.message);
        return;
      }

      setSubmitted(true);
      setSubmittedEmail(data.email);
      toast.success("Password reset email sent!");
    } catch (err) {
      console.error("[Forgot Password] Unexpected error:", err);
      setServerError("Something went wrong. Please try again.");
      toast.error("Something went wrong.");
    }
  };

  if (submitted) {
    return (
      <AuthLayoutEnhanced
        title="Check your email"
        subtitle="We've sent you a password reset link"
        footer={
          <span>
            Remember your password?{" "}
            <Link
              to="/login"
              className="font-medium text-primary hover:underline transition-colors"
            >
              Sign in
            </Link>
          </span>
        }
      >
        <div className="space-y-6 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              We've sent a password reset link to:
            </p>
            <p className="font-medium text-foreground">{submittedEmail}</p>
          </div>

          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 text-left space-y-2">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Next steps:
            </p>
            <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
              <li>Check your email for the reset link</li>
              <li>Click the link to create a new password</li>
              <li>Sign in with your new password</li>
            </ol>
          </div>

          <div className="space-y-3 pt-4">
            <Button onClick={() => navigate({ to: "/login" })} className="w-full h-11">
              Back to Sign In
            </Button>

            <p className="text-xs text-muted-foreground">
              Didn't receive the email?{" "}
              <button
                onClick={() => setSubmitted(false)}
                className="text-primary hover:underline transition-colors"
              >
                Try again
              </button>
            </p>
          </div>
        </div>
      </AuthLayoutEnhanced>
    );
  }

  return (
    <AuthLayoutEnhanced
      title="Reset your password"
      subtitle="Enter your email address and we'll send you a link to reset your password"
      footer={
        <span>
          Remember your password?{" "}
          <Link
            to="/login"
            className="font-medium text-primary hover:underline transition-colors"
          >
            Sign in
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <EnhancedInput
          label={t("auth.signup.email")}
          type="email"
          placeholder="Enter your email address"
          autoComplete="email"
          error={errors.email?.message ? t(errors.email.message!) : undefined}
          {...register("email")}
        />

        <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Sending reset link...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4 mr-2" />
              Send Reset Link
            </>
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          We'll send a secure link to your email address. The link will expire in 24 hours.
        </p>
      </form>
    </AuthLayoutEnhanced>
  );
}
