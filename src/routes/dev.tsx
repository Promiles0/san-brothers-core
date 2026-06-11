import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import type { UserRole } from "@/lib/types";

export const Route = createFileRoute("/dev")({
  head: () => ({ meta: [{ title: "Dev Preview — San Brothers" }] }),
  component: DevPreview,
});

const PREVIEW_ROLES: UserRole[] = ["client", "secretary", "manager", "translator", "admin"];

function DevPreview() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-end gap-2 border-b border-border px-4 py-3 md:px-6">
        <LanguageSwitcher />
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
        <a href="/" className="inline-flex">
          <img src="/sanlogo-Photoroom.png" alt="San Brothers" className="h-14 w-14 object-contain shadow-lg rounded-xl" />
        </a>
        <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">Dev Preview</h1>
        <p className="text-balance text-lg text-muted-foreground">Open a dashboard as any role.</p>
        <div className="mt-4 w-full rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap justify-center gap-2">
            {PREVIEW_ROLES.map((r) => (
              <Button key={r} variant="outline" size="sm" asChild className="capitalize">
                <a href={`/dashboard?role=${r}`}>{r}</a>
              </Button>
            ))}
          </div>
        </div>
        <Button variant="ghost" asChild>
          <a href="/">← Back to public site</a>
        </Button>
      </main>
    </div>
  );
}
