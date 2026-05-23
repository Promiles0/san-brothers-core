import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { TranslateLayout } from "@/components/layout/translate-layout";
import { TranslateCta } from "@/components/marketing/translate-cta";
import { PageHero } from "@/components/marketing/page-sections";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { pricingPlans, type PricingPlan } from "@/lib/mock-data/translate";
import { useI18n } from "@/lib/providers/i18n-provider";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/translate/pricing")({
  head: () => ({
    meta: [
      { title: "Translation Pricing — We Speak Your Language" },
      { name: "description", content: "Simple pay-as-you-use pricing. Start with 5 minutes free." },
      { property: "og:title", content: "Translation Pricing" },
      { property: "og:description", content: "Pay-as-you-go, daily, monthly and yearly plans." },
    ],
    links: [{ rel: "canonical", href: "/translate/pricing" }],
  }),
  component: PricingPage,
});

function PlanCard({ plan, ctaLabel }: { plan: PricingPlan; ctaLabel: string }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const formatMin =
    plan.minutes >= 1000
      ? `${plan.minutes.toLocaleString()} ${t("translate.pricing.minutes")}`
      : `${plan.minutes} ${t("translate.pricing.minutes")}`;
  const validityLabel = plan.validity ? t(`translate.pricing.validity.${plan.validity}`) : "";
  return (
    <Card
      className={
        plan.isPopular ? "relative border-accent shadow-lg ring-2 ring-accent/30" : "relative"
      }
    >
      {plan.isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-accent text-accent-foreground hover:bg-accent">
            {t("translate.pricing.mostPopular")}
          </Badge>
        </div>
      )}
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {plan.isPopular
            ? t("translate.pricing.tierPopular")
            : t(`translate.pricing.tiers.${plan.name.toLowerCase().replace(/\s+/g, "")}`) ||
              plan.name}
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{plan.priceRwf.toLocaleString()}</span>
          <span className="text-sm text-muted-foreground">RWF</span>
        </div>
        <div className="text-sm font-medium">
          {formatMin}
          {validityLabel ? ` / ${validityLabel}` : ""}
        </div>
        {plan.note && <p className="text-sm text-accent">{plan.note}</p>}
        <Button
          className="mt-2"
          onClick={() => {
            if (user) {
              void navigate({ to: "/translate/live/session" });
            } else {
              void navigate({
                to: "/login",
                search: { intent: "live-interpreter", next: "/translate/live/session" } as never,
              });
            }
          }}
        >
          {ctaLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

function PricingPage() {
  const { t } = useI18n();

  const groups: { key: "payg" | "daily" | "monthly" | "yearly"; cta: string }[] = [
    { key: "payg", cta: t("translate.pricing.buy") },
    { key: "daily", cta: t("translate.pricing.buy") },
    { key: "monthly", cta: t("translate.pricing.subscribe") },
    { key: "yearly", cta: t("translate.pricing.subscribe") },
  ];

  return (
    <TranslateLayout>
      <PageHero title={t("translate.pricing.title")} subtitle={t("translate.pricing.subtitle")} />

      <section className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <Tabs defaultValue="payg" className="w-full">
          <TabsList className="mx-auto flex h-auto w-full max-w-2xl flex-wrap justify-center">
            <TabsTrigger value="payg">{t("translate.pricing.tabs.payg")}</TabsTrigger>
            <TabsTrigger value="daily">{t("translate.pricing.tabs.daily")}</TabsTrigger>
            <TabsTrigger value="monthly">{t("translate.pricing.tabs.monthly")}</TabsTrigger>
            <TabsTrigger value="yearly">{t("translate.pricing.tabs.yearly")}</TabsTrigger>
          </TabsList>
          {groups.map((g) => (
            <TabsContent key={g.key} value={g.key} className="mt-10">
              <div className="grid gap-6 md:grid-cols-3">
                {pricingPlans
                  .filter((p) => p.planType === g.key)
                  .map((p, i) => (
                    <PlanCard key={`${g.key}-${i}`} plan={p} ctaLabel={g.cta} />
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            {t("translate.pricing.docHeading")}
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="p-6">
                <h3 className="text-base font-semibold">
                  {t("translate.pricing.docStandard.title")}
                </h3>
                <p className="mt-1 text-2xl font-bold">
                  5,000 RWF{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    / {t("translate.pricing.page")}
                  </span>
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h3 className="text-base font-semibold">
                  {t("translate.pricing.docCertified.title")}
                </h3>
                <p className="mt-1 text-2xl font-bold">
                  12,000 RWF{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    / {t("translate.pricing.page")}
                  </span>
                </p>
              </CardContent>
            </Card>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{t("translate.pricing.docNote")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 md:px-6">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          {t("translate.pricing.faq.heading")}
        </h2>
        <div className="mt-6 space-y-4">
          {["expire", "cancel", "payments"].map((k) => (
            <Card key={k}>
              <CardContent className="p-5">
                <h3 className="font-semibold">{t(`translate.pricing.faq.${k}.q`)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t(`translate.pricing.faq.${k}.a`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <TranslateCta />
    </TranslateLayout>
  );
}
