import { createFileRoute } from "@tanstack/react-router";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PublicLayout } from "@/components/layout/public-layout";
import { PageHero, CtaBanner } from "@/components/marketing/page-sections";
import { useI18n } from "@/lib/providers/i18n-provider";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — San Brothers" },
      { name: "description", content: "Transparent pricing for visa, accounting, consultancy, and translation services." },
    ],
  }),
  component: Pricing,
});

interface Plan { name: string; price: string; intent: string; popular?: boolean; features: string[] }

const TAB_KEYS = ["visa", "accounting", "consultancy", "translation"] as const;

function Pricing() {
  const { t, tRaw } = useI18n();
  return (
    <PublicLayout>
      <PageHero title={t("pricing.heroTitle")} subtitle={t("pricing.heroSubtitle")}>
        <p className="text-sm text-muted-foreground">{t("pricing.allPrices")}</p>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <Tabs defaultValue="visa" className="w-full">
          <TabsList className="mb-8 flex flex-wrap">
            {TAB_KEYS.map((k) => (
              <TabsTrigger key={k} value={k}>{t(`pricing.tabs.${k}`)}</TabsTrigger>
            ))}
          </TabsList>

          {TAB_KEYS.map((key) => {
            const plans = tRaw<Plan[]>(`pricing.plans.${key}`) ?? [];
            return (
              <TabsContent key={key} value={key}>
                <div className="grid gap-6 md:grid-cols-3">
                  {plans.map((p) => (
                    <Card key={p.name} className={p.popular ? "border-accent shadow-md" : ""}>
                      <CardContent className="flex flex-col gap-4 p-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold">{p.name}</h3>
                          {p.popular ? <Badge className="bg-accent text-accent-foreground hover:bg-accent">{t("pricing.mostPopular")}</Badge> : null}
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{p.price}</div>
                          <div className="text-xs text-muted-foreground">{t("pricing.contactQuote")}</div>
                        </div>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {p.features.map((f) => (
                            <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />{f}</li>
                          ))}
                        </ul>
                        <Button className="mt-2" asChild>
                          <a href={`/signup?intent=${p.intent}`}>{t("pricing.getStarted")}</a>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {key === "translation" ? (
                  <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 px-6 py-6 md:flex-row">
                    <p className="text-sm text-muted-foreground">
                      {t("pricing.translationStrip")}{" "}
                      <span className="font-semibold text-foreground">{t("pricing.weSpeakBrand")}</span>.
                    </p>
                    <Button variant="outline" asChild>
                      <a href="/translate" className="gap-2">{t("pricing.openPortal")} <ArrowRight className="h-4 w-4" /></a>
                    </Button>
                  </div>
                ) : null}
              </TabsContent>
            );
          })}
        </Tabs>

        <div className="mt-12 grid gap-3 text-sm md:grid-cols-3">
          <a href="/faq" className="rounded-lg border border-border p-4 hover:bg-accent/5">{t("pricing.bottom.whatIncluded")} <span className="text-primary">→</span></a>
          <a href="/faq" className="rounded-lg border border-border p-4 hover:bg-accent/5">{t("pricing.bottom.howFees")} <span className="text-primary">→</span></a>
          <a href="/faq" className="rounded-lg border border-border p-4 hover:bg-accent/5">{t("pricing.bottom.refund")} <span className="text-primary">→</span></a>
        </div>
      </section>

      <CtaBanner title={t("home.ctaHeading")} subtitle={t("home.ctaSubtitle")} label={t("common.getStarted")} />
    </PublicLayout>
  );
}
