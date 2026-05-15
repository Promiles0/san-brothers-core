import { createFileRoute } from "@tanstack/react-router";
import { Plane, Calculator, Briefcase, Languages, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicLayout } from "@/components/layout/public-layout";
import { PageHero, CtaBanner } from "@/components/marketing/page-sections";
import { useI18n } from "@/lib/providers/i18n-provider";

export const Route = createFileRoute("/services/")({
  head: () => ({
    meta: [
      { title: "Services — San Brothers" },
      { name: "description", content: "Visa, accounting, consultancy, and translation services for clients in Rwanda and abroad." },
    ],
  }),
  component: ServicesOverview,
});

const CARDS = [
  { key: "visa", icon: Plane, href: "/services/visa", svcKey: "services.visa" },
  { key: "accounting", icon: Calculator, href: "/services/accounting", svcKey: "services.accounting" },
  { key: "consultancy", icon: Briefcase, href: "/services/consultancy", svcKey: "services.consultancy" },
  { key: "translation", icon: Languages, href: "/services/translation", svcKey: "services.translation" },
] as const;

function ServicesOverview() {
  const { t, tRaw } = useI18n();

  return (
    <PublicLayout>
      <PageHero title={t("servicesPage.heroTitle")} subtitle={t("servicesPage.heroSubtitle")} />

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          {CARDS.map((s) => {
            const sub = tRaw<string[]>(`servicesPage.cards.${s.key}.sub`) ?? [];
            return (
              <Card key={s.key} className="transition-shadow hover:shadow-md">
                <CardContent className="flex flex-col gap-4 p-8">
                  <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-primary">
                    <s.icon className="h-7 w-7" />
                  </div>
                  <h2 className="text-2xl font-semibold">{t(s.svcKey)}</h2>
                  <p className="text-muted-foreground">{t(`servicesPage.cards.${s.key}.desc`)}</p>
                  <ul className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                    {sub.map((x) => (
                      <li key={x} className="flex gap-2"><span className="text-primary">•</span>{x}</li>
                    ))}
                  </ul>
                  <Button className="mt-2 self-start" asChild>
                    <a href={s.href}>{t("servicesPage.learnMore")}</a>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 px-6 py-6 md:flex-row">
          <p className="text-sm text-muted-foreground">
            {t("servicesPage.translationStrip")} <span className="font-semibold text-foreground">{t("servicesPage.weSpeakBrand")}</span>.
          </p>
          <Button variant="outline" asChild>
            <a href="/services/translation" className="gap-2">{t("servicesPage.openTranslation")} <ArrowRight className="h-4 w-4" /></a>
          </Button>
        </div>
      </section>

      <CtaBanner title={t("home.ctaHeading")} subtitle={t("home.ctaSubtitle")} label={t("common.getStarted")} />
    </PublicLayout>
  );
}
