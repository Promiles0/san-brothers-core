import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { useI18n } from "@/lib/providers/i18n-provider";
import type { UserRole } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "San Brothers Global Digital Ecosystem" },
      { name: "description", content: "Multi-tenant SaaS for visa, accounting, translation and consultancy services." },
    ],
  }),
  component: Index,
});

const PREVIEW_ROLES: UserRole[] = ["client", "secretary", "manager", "translator", "admin"];

function Index() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-end gap-2 border-b border-border px-4 py-3 md:px-6">
        <LanguageSwitcher />
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary text-xl font-bold text-primary-foreground shadow-lg">SB</div>
        <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">
          {t("common.brand")}
        </h1>
        <p className="text-balance text-lg text-muted-foreground">{t("common.tagline")}</p>

        <div className="mt-4 w-full rounded-xl border border-border bg-card p-6 shadow-sm">
          <p className="mb-4 text-sm font-medium text-muted-foreground">Dev preview — open a dashboard as:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {PREVIEW_ROLES.map((r) => (
              <Button key={r} variant="outline" size="sm" asChild className="capitalize">
                <a href={`/dashboard?role=${r}`}>{r}</a>
              </Button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
