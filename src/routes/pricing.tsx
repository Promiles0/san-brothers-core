import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Briefcase,
  Calculator,
  Check,
  DollarSign,
  Globe2,
  HelpCircle,
  Languages,
  Plane,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PublicLayout } from "@/components/layout/public-layout";
import { CtaBanner, PageHero } from "@/components/marketing/page-sections";
import { useI18n } from "@/lib/providers/i18n-provider";
import { resolveServiceIntentDestination } from "@/lib/navigation/service-intents";
import { Magnetic } from "@/components/fx/magnetic";
import { TiltCard } from "@/components/fx/tilt-card";
import { supabase } from "@/lib/supabase";

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

type PriceUnit = "flat" | "per_page" | "per_minute" | "per_month";

interface LivePrice {
  price_usd: number;
  unit: PriceUnit;
  display_note: string | null;
}

function formatLivePrice(p: LivePrice): string {
  if (p.display_note === "Custom quote" && p.price_usd === 0) return "Custom quote";
  const suffix =
    p.unit === "per_page"
      ? " / page"
      : p.unit === "per_minute"
        ? " / min"
        : p.unit === "per_month"
          ? " / mo"
          : "";
  const base = `$${p.price_usd.toFixed(2)}${suffix}`;
  if (p.display_note && p.display_note !== "Custom quote") return `${p.display_note} ${base}`;
  return base;
}


interface Plan {
  name: string;
  price: string;
  intent: string;
  popular?: boolean;
  features: string[];
}

const TAB_KEYS = ["visa", "accounting", "consultancy", "translation"] as const;

const TAB_STYLES = {
  visa: {
    Icon: Plane,
    color: "text-visa",
    active: "data-[state=active]:bg-visa",
    border: "border-visa",
    glow: "shadow-[0_16px_45px_-24px_var(--visa)]",
    tint: "hover:bg-visa/5",
    button: "bg-visa hover:bg-visa/90",
    outline: "border-visa text-visa hover:bg-visa/10",
  },
  accounting: {
    Icon: Calculator,
    color: "text-accounting",
    active: "data-[state=active]:bg-accounting",
    border: "border-accounting",
    glow: "shadow-[0_16px_45px_-24px_var(--accounting)]",
    tint: "hover:bg-accounting/5",
    button: "bg-accounting hover:bg-accounting/90",
    outline: "border-accounting text-accounting hover:bg-accounting/10",
  },
  consultancy: {
    Icon: Briefcase,
    color: "text-consultancy",
    active: "data-[state=active]:bg-consultancy",
    border: "border-consultancy",
    glow: "shadow-[0_16px_45px_-24px_var(--consultancy)]",
    tint: "hover:bg-consultancy/5",
    button: "bg-consultancy hover:bg-consultancy/90",
    outline: "border-consultancy text-consultancy hover:bg-consultancy/10",
  },
  translation: {
    Icon: Languages,
    color: "text-translation",
    active: "data-[state=active]:bg-translation",
    border: "border-translation",
    glow: "shadow-[0_16px_45px_-24px_var(--translation)]",
    tint: "hover:bg-translation/5",
    button: "bg-translation hover:bg-translation/90",
    outline: "border-translation text-translation hover:bg-translation/10",
  },
};

const VALUE_LINES = ["Best for individuals", "Most popular for SMEs", "For growing companies"];

function Pricing() {
  const { t, tRaw } = useI18n();
  const navigate = useNavigate();
  const [livePrices, setLivePrices] = useState<Record<string, LivePrice> | null>(null);
  const [pricesLoading, setPricesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("service_prices")
          .select("price_usd, unit, display_note, services!inner(slug, is_active)")
          .eq("services.is_active", true);
        if (error) throw error;
        if (cancelled) return;
        const map: Record<string, LivePrice> = {};
        for (const row of (data ?? []) as Array<{
          price_usd: number;
          unit: PriceUnit;
          display_note: string | null;
          services: { slug: string; is_active: boolean } | null;
        }>) {
          const slug = row.services?.slug;
          if (!slug) continue;
          map[slug] = {
            price_usd: Number(row.price_usd),
            unit: row.unit,
            display_note: row.display_note,
          };
        }
        if (Object.keys(map).length > 0) setLivePrices(map);
      } catch {
        // graceful fallback to tRaw() data
      } finally {
        if (!cancelled) setPricesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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

      <div className="border-b border-border bg-muted/20 px-4 py-4 text-center text-xs text-muted-foreground dark:bg-muted/10 sm:text-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1">
          <span>Transparent pricing</span>
          <span aria-hidden="true">.</span>
          <span>No hidden fees</span>
          <span aria-hidden="true">.</span>
          <span>All prices in RWF</span>
          <span aria-hidden="true">.</span>
          <span>Payments accepted in USD</span>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-20">
        <Tabs defaultValue="visa" className="w-full">
          <div className="mb-10 border-b border-border pb-8">
            <TabsList className="flex h-auto w-full justify-start gap-2 overflow-x-auto bg-transparent p-0 pb-2 md:justify-center">
              {TAB_KEYS.map((k) => {
                const { Icon, active, color } = TAB_STYLES[k];

                return (
                  <TabsTrigger
                    key={k}
                    value={k}
                    className={`${active} rounded-full border border-border bg-card px-4 py-2.5 text-muted-foreground shadow-none hover:bg-muted data-[state=active]:text-primary-foreground data-[state=active]:shadow-md`}
                  >
                    <Icon className={`mr-2 h-4 w-4 ${color}`} />
                    {t(`pricing.tabs.${k}`)}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Choose the plan that fits your needs
            </p>
          </div>

          {TAB_KEYS.map((key) => {
            const plans = tRaw<Plan[]>(`pricing.plans.${key}`) ?? [];
            const styles = TAB_STYLES[key];

            return (
              <TabsContent key={key} value={key}>
                <div className="grid items-stretch gap-6 md:grid-cols-3">
                  {plans.map((p, index) => (
                    <TiltCard
                      key={p.name}
                      max={5}
                      className="h-full"
                      style={{ transitionDelay: `${index * 100}ms` }}
                    >
                      <Card
                        className={`relative h-full overflow-hidden bg-card transition-[transform,box-shadow,background-color] duration-300 hover:-translate-y-1 hover:shadow-lg ${styles.tint} ${
                          p.popular
                            ? `border-2 ${styles.border} ${styles.glow} md:scale-105`
                            : "border-border"
                        }`}
                      >
                        <div className={`h-1 w-full bg-current ${styles.color}`} />
                        {p.popular ? (
                          <Badge
                            className={`absolute right-4 top-4 border-0 ${styles.button} text-primary-foreground`}
                          >
                            {t("pricing.mostPopular")}
                          </Badge>
                        ) : null}
                        <CardContent className="flex h-full flex-col gap-5 p-6 pt-7">
                          <div className="flex items-center justify-between">
                            <h3 className="pr-24 text-lg font-semibold text-foreground">{p.name}</h3>
                          </div>
                          <div>
                            <div className="text-4xl font-black tracking-tight text-foreground">
                              {p.price}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t("pricing.contactQuote")}
                            </div>
                          </div>
                          <p className="text-sm font-semibold italic text-muted-foreground">
                            {VALUE_LINES[index] ?? VALUE_LINES[0]}
                          </p>
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            {p.features.map((f) => (
                              <li key={f} className="flex gap-2">
                                <Check className={`mt-0.5 h-4 w-4 shrink-0 ${styles.color}`} />
                                {f}
                              </li>
                            ))}
                          </ul>
                          <Magnetic strength={12} className="mt-auto block w-full">
                            <Button
                              variant={p.popular ? "default" : "outline"}
                              className={`w-full ${p.popular ? `${styles.button} text-primary-foreground` : styles.outline}`}
                              onClick={() => handleGetStarted(p.intent)}
                            >
                              {t("pricing.getStarted")}
                            </Button>
                          </Magnetic>
                        </CardContent>
                      </Card>
                    </TiltCard>
                  ))}
                </div>

                {key === "translation" ? (
                  <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-xl border border-border border-l-4 border-l-translation bg-gradient-to-r from-translation/20 to-translation/5 px-6 py-6 md:flex-row">
                    <div className="flex items-start gap-3">
                      <Globe2 className="mt-0.5 h-5 w-5 shrink-0 text-translation" />
                      <p className="text-sm text-muted-foreground">
                        {t("pricing.translationStrip")}{" "}
                        <span className="font-semibold text-foreground">
                          {t("pricing.weSpeakBrand")}
                        </span>
                        .
                      </p>
                    </div>
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

        <div className="mt-14 grid gap-3 border-t border-border pt-10 text-sm md:grid-cols-3">
          {[
            { label: t("pricing.bottom.whatIncluded"), Icon: HelpCircle },
            { label: t("pricing.bottom.howFees"), Icon: DollarSign },
            { label: t("pricing.bottom.refund"), Icon: RotateCcw },
          ].map(({ label, Icon }) => (
            <a
              key={label}
              href="/faq"
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-foreground transition-all hover:border-primary/30 hover:bg-accent/10 hover:shadow-md"
            >
              <Icon className="h-5 w-5 text-primary" />
              <span className="flex-1">{label}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </a>
          ))}
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
