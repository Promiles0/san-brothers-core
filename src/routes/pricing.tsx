cat > src/routes/pricing.tsx << 'ENDOFFILE'
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, ArrowRight, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PublicLayout } from "@/components/layout/public-layout";
import { PageHero, CtaBanner } from "@/components/marketing/page-sections";
import { useI18n } from "@/lib/providers/i18n-provider";
import { resolveServiceIntentDestination } from "@/lib/navigation/service-intents";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing - San Brothers" },
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
  minRwf: number;
  maxRwf: number;
  minUsd: number;
  maxUsd: number;
  intent: string;
  popular?: boolean;
  features: string[];
  timeline?: string;
  documents?: string;
}

const TAB_KEYS = ["visa", "accounting", "consultancy", "translation"] as const;

function Pricing() {
  const { t, tRaw } = useI18n();
  const navigate = useNavigate();

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
        <div className="mb-12 rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
          <p className="text-sm text-foreground">
            <span className="font-semibold">Pricing Note:</span> Prices below are starting rates.
            Final quotes depend on complexity, documents required, and timeline.{" "}
            <span className="text-primary font-medium">Get a personalized quote</span> after applying.
          </p>
        </div>

        <Tabs defaultValue="visa" className="w-full">
          <TabsList className="mb-12 grid w-full grid-cols-2 lg:grid-cols-4">
            {TAB_KEYS.map((k) => (
              <TabsTrigger key={k} value={k} className="text-sm">
                {t(`pricing.tabs.${k}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          {TAB_KEYS.map((key) => {
            const plans = tRaw<Plan[]>(`pricing.plans.${key}`) ?? [];
            return (
              <TabsContent key={key} value={key}>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {plans.map((p) => (
                    <Card
                      key={p.name}
                      className={`relative flex flex-col transition-all hover:shadow-lg ${
                        p.popular ? "border-2 border-accent lg:scale-105" : ""
                      }`}
                    >
                      {p.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-accent text-accent-foreground hover:bg-accent px-3 py-1">
                            {t("pricing.mostPopular")}
                          </Badge>
                        </div>
                      )}

                      <CardHeader className="pb-4">
                        <h3 className="text-xl font-bold text-foreground">{p.name}</h3>
                      </CardHeader>

                      <CardContent className="flex flex-1 flex-col gap-6">
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-foreground">
                              ${p.minUsd}
                            </span>
                            <span className="text-sm text-muted-foreground">USD</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Starting price - Up to ${p.maxUsd} depending on complexity
                          </p>
                          <p className="text-xs text-muted-foreground pt-2 border-t">
                            {p.minRwf.toLocaleString()} - {p.maxRwf.toLocaleString()} RWF
                          </p>
                        </div>

                        <div className="space-y-2 border-t pt-4">
                          {p.timeline && (
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-4 w-4 text-primary shrink-0" />
                              <span className="text-muted-foreground">{p.timeline}</span>
                            </div>
                          )}
                          {p.documents && (
                            <div className="flex items-center gap-2 text-sm">
                              <FileText className="h-4 w-4 text-primary shrink-0" />
                              <span className="text-muted-foreground">{p.documents}</span>
                            </div>
                          )}
                        </div>

                        <ul className="space-y-3 flex-1">
                          {p.features.map((f) => (
                            <li key={f} className="flex gap-3 text-sm">
                              <Check className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
                              <span className="text-foreground">{f}</span>
                            </li>
                          ))}
                        </ul>

                        <Button
                          onClick={() => handleGetStarted(p.intent)}
                          className="w-full"
                          variant={p.popular ? "default" : "outline"}
                          size="lg"
                        >
                          {t("pricing.getStarted")}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {key === "translation" ? (
                  <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-xl border border-border bg-blue-500/5 px-6 py-8 md:flex-row">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t("pricing.translationStrip")}{" "}
                        <span className="font-semibold text-foreground">
                          {t("pricing.weSpeakBrand")}
                        </span>
                        .
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Get instant translation support for 17+ languages
                      </p>
                    </div>
                    <Button variant="outline" asChild size="lg">
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

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          
            href="/faq"
            className="group rounded-lg border border-border bg-card p-5 hover:border-accent hover:shadow-md transition-all"
          >
            <h4 className="font-semibold text-foreground mb-1">
              {"What's Included? "}
              <span className="text-accent group-hover:translate-x-1 inline-block transition-transform">
                {">"}
              </span>
            </h4>
            <p className="text-xs text-muted-foreground">
              {t("pricing.bottom.whatIncluded")}
            </p>
          </a>
          
            href="/faq"
            className="group rounded-lg border border-border bg-card p-5 hover:border-accent hover:shadow-md transition-all"
          >
            <h4 className="font-semibold text-foreground mb-1">
              {"How Pricing Works "}
              <span className="text-accent group-hover:translate-x-1 inline-block transition-transform">
                {">"}
              </span>
            </h4>
            <p className="text-xs text-muted-foreground">
              {t("pricing.bottom.howFees")}
            </p>
          </a>
          
            href="/faq"
            className="group rounded-lg border border-border bg-card p-5 hover:border-accent hover:shadow-md transition-all"
          >
            <h4 className="font-semibold text-foreground mb-1">
              {"Refund Policy "}
              <span className="text-accent group-hover:translate-x-1 inline-block transition-transform">
                {">"}
              </span>
            </h4>
            <p className="text-xs text-muted-foreground">
              {t("pricing.bottom.refund")}
            </p>
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
ENDOFFILE