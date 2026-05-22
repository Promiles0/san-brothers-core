import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/auth/auth-layout";
import { useI18n } from "@/lib/providers/i18n-provider";

export const Route = createFileRoute("/auth/error")({
  validateSearch: (s: Record<string, unknown>) => ({
    message: typeof s.message === "string" ? s.message : undefined,
  }),
  component: AuthErrorPage,
});

function AuthErrorPage() {
  const { t } = useI18n();
  const { message } = useSearch({ from: "/auth/error" }) as { message?: string };

  return (
    <AuthLayout title={t("auth.error.title")}>
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground">{message || t("auth.error.default")}</p>
        <div className="flex w-full flex-col gap-2 sm:flex-row">
          <Button asChild className="flex-1">
            <Link to="/login" search={{} as never}>
              {t("auth.error.tryLogin")}
            </Link>
          </Button>
          <Button asChild variant="outline" className="flex-1">
            <Link to="/">{t("auth.error.goHome")}</Link>
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
