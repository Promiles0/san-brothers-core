import { useEffect, useState } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/auth/auth-layout";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";

export const Route = createFileRoute("/signup/verify-email")({
  validateSearch: (s: Record<string, unknown>) => ({
    email: typeof s.email === "string" ? s.email : "",
    intent: typeof s.intent === "string" ? s.intent : undefined,
  }),
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const { t } = useI18n();
  const { email, intent } = useSearch({ from: "/signup/verify-email" }) as {
    email: string;
    intent?: string;
  };
  const { resendVerification } = useAuth();
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const onResend = async () => {
    if (!email) return;
    const { error } = await resendVerification(email);
    if (error) toast.error(error.message);
    else toast.success(t("auth.verifyEmail.resentToast"));
    setCooldown(60);
  };

  return (
    <AuthLayout title={t("auth.verifyEmail.title")}>
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-primary/10">
          <MailCheck className="h-7 w-7 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          {t("auth.verifyEmail.body")} <span className="font-medium text-foreground">{email}</span>.{" "}
          {t("auth.verifyEmail.body2")}
        </p>
        <p className="mt-4 text-xs text-muted-foreground">{t("auth.verifyEmail.spamHint")}</p>
        <Button
          onClick={onResend}
          disabled={cooldown > 0 || !email}
          className="mt-3 w-full"
          variant="outline"
        >
          {cooldown > 0
            ? `${t("auth.verifyEmail.resend")} (${cooldown}s)`
            : t("auth.verifyEmail.resend")}
        </Button>
        <Link
          to="/signup"
          search={{ intent } as never}
          className="mt-4 text-xs text-primary hover:underline"
        >
          {t("auth.verifyEmail.wrongEmail")} →
        </Link>
      </div>
    </AuthLayout>
  );
}
