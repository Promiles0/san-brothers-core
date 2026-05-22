import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AuthLayout, PasswordStrength } from "@/components/auth/auth-layout";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";
import { friendlyAuthError } from "@/lib/auth/intent-labels";

const schema = z
  .object({
    password: z.string().min(8, "auth.errors.weakPassword"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "auth.errors.passwordsDontMatch",
    path: ["confirm"],
  });
type Form = z.infer<typeof schema>;

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});
function ResetPasswordPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Form>({
    resolver: zodResolver(schema),
  });
  const password = watch("password") || "";

  const onSubmit = async (data: Form) => {
    setServerError(null);
    const { error } = await updatePassword(data.password);
    if (error) {
      const k = friendlyAuthError(error.message);
      setServerError(t(k));
      return;
    }
    toast.success(t("auth.reset.successToast"));
    navigate({ to: "/login", search: {} as never });
  };

  return (
    <AuthLayout title={t("auth.reset.title")} subtitle={t("auth.reset.subtitle")}>
      {serverError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t("auth.reset.newPassword")}</Label>
          <Input type="password" autoComplete="new-password" {...register("password")} />
          <PasswordStrength password={password} />
          {errors.password ? (
            <p className="text-xs text-destructive">{t(errors.password.message!)}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label>{t("auth.reset.confirm")}</Label>
          <Input type="password" autoComplete="new-password" {...register("confirm")} />
          {errors.confirm ? (
            <p className="text-xs text-destructive">{t(errors.confirm.message!)}</p>
          ) : null}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("auth.reset.submit")}
        </Button>
      </form>
    </AuthLayout>
  );
}
