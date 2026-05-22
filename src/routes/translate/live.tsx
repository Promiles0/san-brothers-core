import { createFileRoute, Link } from "@tanstack/react-router";
import { TranslateLayout } from "@/components/layout/translate-layout";
import { TranslateCta } from "@/components/marketing/translate-cta";
import { PageHero } from "@/components/marketing/page-sections";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, PhoneCall } from "lucide-react";
import { useI18n } from "@/lib/providers/i18n-provider";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/translate/live")({
  head: () => ({
    meta: [
      { title: "Live Interpreter Calls — We Speak Your Language" },
      {
        name: "description",
        content: "Talk to a real human translator in seconds. First 5 minutes free.",
      },
      { property: "og:title", content: "Live Interpreter Calls" },
      { property: "og:description", content: "Real human translators, on demand." },
    ],
    links: [{ rel: "canonical", href: "/translate/live" }],
  }),
  component: LivePage,
});

function LivePage() {
  const { t, tRaw } = useI18n();
  const { user } = useAuth();
  const howSteps = tRaw<string[]>("translate.live.how.steps") ?? [];
  const useCases = tRaw<string[]>("translate.live.uses.items") ?? [];
  const trialPoints = tRaw<string[]>("translate.live.trial.points") ?? [];
  const pricingPoints = tRaw<string[]>("translate.live.pricing.points") ?? [];

  const startHref = user ? "/translate/live/session" : "/login?intent=interpreter";

  return (
    <TranslateLayout>
      <PageHero title={t("translate.live.title")} subtitle={t("translate.live.subtitle")} />

      <div className="mx-auto -mt-6 flex max-w-4xl justify-center px-4 md:px-6">
        <Button size="lg" className="h-14 px-10 text-base" asChild>
          <Link to={startHref}>
            <PhoneCall className="h-5 w-5" />
            Start Session
          </Link>
        </Button>
      </div>


      <section className="mx-auto max-w-4xl px-4 py-16 md:px-6">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          {t("translate.live.how.heading")}
        </h2>
        <ol className="mt-6 space-y-3">
          {howSteps.map((s, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-lg border border-border bg-card p-4"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
                {i + 1}
              </span>
              <span className="text-sm">{s}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-16 md:px-6">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            {t("translate.live.uses.heading")}
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {useCases.map((c, i) => (
              <li key={i} className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-sm">{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-16 md:px-6">
        <Card className="border-accent/40 bg-accent/5">
          <CardContent className="p-8">
            <div className="text-xs font-semibold uppercase tracking-widest text-accent">
              {t("translate.live.trial.eyebrow")}
            </div>
            <h3 className="mt-2 text-2xl font-bold md:text-3xl">
              {t("translate.live.trial.heading")}
            </h3>
            <ul className="mt-5 space-y-2">
              {trialPoints.map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-16 md:px-6">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            {t("translate.live.pricing.heading")}
          </h2>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            {pricingPoints.map((p, i) => (
              <li key={i}>• {p}</li>
            ))}
          </ul>
          <a
            href="/translate/pricing"
            className="mt-5 inline-block text-sm font-medium text-primary hover:underline"
          >
            {t("translate.live.pricing.seeFull")} →
          </a>
        </div>
      </section>

      <TranslateCta />
    </TranslateLayout>
  );
}
