import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Briefcase, Calculator, Check, DollarSign, Globe2, HelpCircle, Languages, Plane, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PublicLayout } from "@/components/layout/public-layout";
import { PageHero, CtaBanner } from "@/components/marketing/page-sections";
import { useI18n } from "@/lib/providers/i18n-provider";
import { resolveServiceIntentDestination } from "@/lib/navigation/service-intents";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — San Brothers" },
      {
        name: "description",
        content: "Transparent pricing for visa, accounting, consultancy, and translation services.",
      },
    ],
  }),
  component: Pricing,
});
interface Plan {
  name: string;
  price: string;
  intent: string;
  popular?: boolean;
  features: string[];
}

const TAB_KEYS = ["visa", "accounting", "consultancy", "translation"] as const;

const TAB_STYLES = {
  visa: { Icon: Plane, color: "text-visa", active: "data-[state=active]:bg-visa", border: "border-visa", glow: "shadow-[0_16px_45px_-24px_var(--visa)]", tint: "hover:bg-visa/5", button: "bg-visa hover:bg-visa/90", outline: "border-visa text-visa hover:bg-visa/10" },
  accounting: { Icon: Calculator, color: "text-accounting", active: "data-[state=active]:bg-accounting", border: "border-accounting", glow: "shadow-[0_16px_45px_-24px_var(--accounting)]", tint: "hover:bg-accounting/5", button: "bg-accounting hover:bg-accounting/90", outline: "border-accounting text-accounting hover:bg-accounting/10" },
  consultancy: { Icon: Briefcase, color: "text-consultancy", active: "data-[state=active]:bg-consultancy", border: "border-consultancy", glow: "shadow-[0_16px_45px_-24px_var(--consultancy)]", tint: "hover:bg-consultancy/5", button: "bg-consultancy hover:bg-consultancy/90", outline: "border-consultancy text-consultancy hover:bg-consultancy/10" },
  translation: { Icon: Languages, color: "text-translation", active: "data-[state=active]:bg-translation", border: "border-translation", glow: "shadow-[0_16px_45px_-24px_var(--translation)]", tint: "hover:bg-translation/5", button: "bg-translation hover:bg-translation/90", outline: "border-translation text-translation hover:bg-translation/10" },
};

const VALUE_LINES = ["Best for individuals", "Most popular for SMEs", "For growing companies"];

function Pricing() {
  const { t, tRaw } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle("revealed", e.isIntersecting)),
      { threshold: 0.1 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const handleGetStarted = async (intent: string) => {
    const destination = await resolveServiceIntentDestination(intent);
    void navigate(destination as never);
  };

  return (
    <PublicLayout>
      <PageHero title={t("pricing.heroTitle")} subtitle={t("pricing.heroSubtitle")}>
        <p className="text-sm text-muted-foreground">{t("pricing.allPrices")}</p>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <Tabs defaultValue="visa" className="w-full">
          <TabsList className="mb-8 flex flex-wrap">
            {TAB_KEYS.map((k) => (
              <TabsTrigger key={k} value={k}>
                {t(`pricing.tabs.${k}`)}
              </TabsTrigger>
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
                          {p.popular ? (
                            <Badge className="bg-accent text-accent-foreground hover:bg-accent">
                              {t("pricing.mostPopular")}
                            </Badge>
                          ) : null}
                        </div>
                        <div>
                          <div className="text-2xl font-bold">{p.price}</div>
                          <div className="text-xs text-muted-foreground">
                            {t("pricing.contactQuote")}
                          </div>
                        </div>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {p.features.map((f) => (
                            <li key={f} className="flex gap-2">
                              <Check className="h-4 w-4 shrink-0 text-primary" />
                              {f}
                            </li>
                          ))}
                        </ul>
                        <Button className="mt-2" onClick={() => handleGetStarted(p.intent)}>
                          {t("pricing.getStarted")}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {key === "translation" ? (
                  <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 px-6 py-6 md:flex-row">
                    <p className="text-sm text-muted-foreground">
                      {t("pricing.translationStrip")}{" "}
                      <span className="font-semibold text-foreground">
                        {t("pricing.weSpeakBrand")}
                      </span>
                      .
                    </p>
                    <Button variant="outline" asChild>
                      <a href="/translate" className="gap-2">
                        {t("pricing.openPortal")} <ArrowRight className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                ) : null}
              </TabsContent>
            );
          })}
        </Tabs>

        <div className="mt-12 grid gap-3 text-sm md:grid-cols-3">
          <a href="/faq" className="rounded-lg border border-border p-4 hover:bg-accent/5">
            {t("pricing.bottom.whatIncluded")} <span className="text-primary">→</span>
          </a>
          <a href="/faq" className="rounded-lg border border-border p-4 hover:bg-accent/5">
            {t("pricing.bottom.howFees")} <span className="text-primary">→</span>
          </a>
          <a href="/faq" className="rounded-lg border border-border p-4 hover:bg-accent/5">
            {t("pricing.bottom.refund")} <span className="text-primary">→</span>
          </a>
        </div>
      </section>

      <CtaBanner
        title={t("home.ctaHeading")}
        subtitle={t("home.ctaSubtitle")}
        label={t("common.getStarted")}
      />
    </PublicLayout>
  );
}