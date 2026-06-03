import { createFileRoute } from "@tanstack/react-router";
import { TranslateLayout } from "@/components/layout/translate-layout";
import { TranslateCta } from "@/components/marketing/translate-cta";
import { PageHero } from "@/components/marketing/page-sections";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/providers/i18n-provider";

export const Route = createFileRoute("/translate/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — We Speak Your Language" },
      { name: "description", content: "From sign-up to translator in under 2 minutes." },
      { property: "og:title", content: "How It Works — We Speak Your Language" },
      { property: "og:description", content: "From sign-up to translator in under 2 minutes." },
    ],
    links: [{ rel: "canonical", href: "/translate/how-it-works" }],
  }),
  component: HowItWorks,
});

function HowItWorks() {
  const { t, tRaw } = useI18n();
  const steps = tRaw<{ title: string; desc: string }[]>("translate.howItWorks.steps") ?? [];
  const expect = tRaw<string[]>("translate.howItWorks.expect.points") ?? [];
  return (
    <TranslateLayout>
      <PageHero
        title={t("translate.howItWorks.title")}
        subtitle={t("translate.howItWorks.subtitle")}
      />
      <section className="mx-auto max-w-3xl px-4 py-16 md:px-6">
        <ol className="relative space-y-6 border-l-2 border-border pl-8">
          {steps.map((s, i) => (
            <li key={i} className="relative">
              <span className="absolute left-[-2.45rem] grid h-8 w-8 place-items-center rounded-full bg-accent font-bold text-accent-foreground">
                {i + 1}
              </span>
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            {t("translate.howItWorks.expect.heading")}
          </h2>
          <ul className="mt-6 list-disc space-y-2 pl-5 text-muted-foreground">
            {expect.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      </section>
      <TranslateCta />
    </TranslateLayout>
  );
}
