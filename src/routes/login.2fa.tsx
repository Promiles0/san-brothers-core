import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { AuthLayout } from "@/components/auth/auth-layout";
import { useI18n } from "@/lib/providers/i18n-provider";

export const Route = createFileRoute("/login/2fa")({
  component: TwoFactorPage,
});

function TwoFactorPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onVerify = async () => {
    if (code.length !== 6) return;
    setSubmitting(true);
    // TODO: replace with supabase.auth.mfa.challengeAndVerify when 2FA is implemented in later prompt
    await new Promise((r) => setTimeout(r, 400));
    setSubmitting(false);
    toast.success(t("auth.twofa.verified"));
    navigate({ to: "/dashboard", search: {} as never });
  };
  const onResend = () => {
    // TODO: implement code resend when real 2FA is wired
    toast.info(t("auth.twofa.resentToast"));
  };

  return (
    <AuthLayout
      title={t("auth.twofa.title")}
      subtitle={t("auth.twofa.subtitle")}
      footer={
        <span>
          {t("auth.twofa.lost")}{" "}
          <Link to="/contact" className="font-medium text-primary hover:underline">
            {t("common.contactUs")}
          </Link>
        </span>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <InputOTP maxLength={6} value={code} onChange={setCode}>
          <InputOTPGroup>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <Button onClick={onVerify} disabled={code.length !== 6 || submitting} className="w-full">
          {t("auth.twofa.verify")}
        </Button>
        <button type="button" onClick={onResend} className="text-xs text-primary hover:underline">
          {t("auth.twofa.resend")}
        </button>
      </div>
    </AuthLayout>
  );
}
