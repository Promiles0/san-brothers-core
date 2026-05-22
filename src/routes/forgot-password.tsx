import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth/auth-layout";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";

const schema = z.object({ email: z.string().email("auth.errors.invalidEmail") });
type Form = z.infer<typeof schema>;

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});
function ForgotPasswordPage() {
  const { t } = useI18n();
  const { resetPassword } = useAuth();
  const [sent, setSent] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: Form) => {
    await resetPassword(data.email);
    setSent(data.email);
  };

  return (
    <AuthLayout
      title={t("auth.forgot.title")}
      subtitle={t("auth.forgot.subtitle")}
      footer={
        <Link to="/login" search={{} as never} className="font-medium text-primary hover:underline">
          ← {t("auth.forgot.backToLogin")}
        </Link>
      }
    >
      {sent ? (
        <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
          {t("auth.forgot.sent").replace("{email}", sent)}
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("auth.signup.email")}</Label>
            <Input type="email" autoComplete="email" {...register("email")} />
            {errors.email ? (
              <p className="text-xs text-destructive">{t(errors.email.message!)}</p>
            ) : null}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.forgot.submit")}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
