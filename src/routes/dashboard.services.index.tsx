import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Clock, PlusCircle, Search, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useI18n } from "@/lib/providers/i18n-provider";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Service } from "@/lib/types/database";
import { usePortal } from "@/lib/portal-context";

export const Route = createFileRoute("/dashboard/services/")({
  validateSearch: (search) => ({
    apply: (search.apply as string) || undefined,
  }),
  component: ServiceCatalog,
});

const CATEGORIES = ["all", "visa", "accounting", "consultancy", "translation"] as const;

function isInterpreterSlug(slug: string) {
  return (
    slug.includes("live-interpret") ||
    slug.includes("live-interp") ||
    slug === "live-interpretation"
  );
}

function ServiceCatalog() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { apply } = useSearch({ from: "/dashboard/services/" });
  const { servicesAvailable, isChild, displayName } = usePortal();
  const [services, setServices] = useState<Service[] | null>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("all");


  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("services")
          .select("*")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        if (error) throw error;
        setServices((data as Service[]) ?? []);
      } catch (e) {
        toast.error((e as Error).message);
        setServices([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!apply) return;

    if (apply === "live-interpreter") {
      void navigate({ to: "/dashboard/interpreter", replace: true } as never);
      return;
    }

    // Navigate to the new apply page
    void navigate({
      to: "/dashboard/services/apply/$slug",
      params: { slug: apply },
      replace: true,
    } as never);
  }, [apply, navigate]);

  const localName = (s: Service) =>
    (locale === "zh" && s.name_zh) || (locale === "rw" && s.name_rw) || s.name_en;
  const localDesc = (s: Service) =>
    (locale === "zh" && s.description_zh) ||
    (locale === "rw" && s.description_rw) ||
    s.description_en ||
    "";

  const filtered = useMemo(() => {
    if (!services) return null;
    return services.filter((s) => {
      const inPortal = servicesAvailable.includes(s.slug);
      const matchesCat = cat === "all" || s.category === cat;
      const matchesQ = !query || localName(s).toLowerCase().includes(query.toLowerCase());
      return inPortal && matchesCat && matchesQ;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services, cat, query, locale, servicesAvailable]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.services.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("dashboard.services.subtitle")}</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("dashboard.services.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Tabs value={cat} onValueChange={(v) => setCat(v as typeof cat)}>
          <TabsList>
            {CATEGORIES.map((c) => (
              <TabsTrigger key={c} value={c}>
                {t(`dashboard.services.cat.${c}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {filtered === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => {
            const interpreter = isInterpreterSlug(s.slug);
            const fmtUSD = (n: number) => `$${Math.round(n)}`;
            const priceText = (() => {
              const min = s.price_usd_min;
              const max = s.price_usd_max;
              if (!min && !max) return null;
              if (min && max && min !== max) return `${fmtUSD(min)} – ${fmtUSD(max)}`;
              return fmtUSD(min ?? max ?? 0);
            })();

            return (
              <Card key={s.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{localName(s)}</CardTitle>
                    <Badge variant="secondary" className="capitalize shrink-0">
                      {t(`dashboard.services.cat.${s.category}`)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <p className="line-clamp-2 text-sm text-muted-foreground">{localDesc(s)}</p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {priceText && (
                      <span className="font-semibold text-foreground">{priceText}</span>
                    )}
                    {s.estimated_days_min != null && s.estimated_days_max != null && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {`${s.estimated_days_min}–${s.estimated_days_max} ${t("dashboard.common.days")}`}
                      </span>
                    )}
                  </div>

                  <Button
                    className={`mt-auto ${interpreter ? "bg-amber-500 text-white hover:bg-amber-600" : ""}`}
                    variant={interpreter ? "default" : "default"}
                    onClick={() => {
                      if (interpreter) {
                        void navigate({ to: "/dashboard/interpreter", replace: true } as never);
                      } else {
                        void navigate({
                          to: "/dashboard/services/apply/$slug",
                          params: { slug: s.slug },
                        } as never);
                      }
                    }}
                  >
                    {interpreter ? (
                      <>
                        <Zap className="mr-1.5 h-3.5 w-3.5" /> Book / Free Trial
                      </>
                    ) : (
                      t("dashboard.services.request")
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          {/* See more / contact card */}
          <Link
            to="/contact"
            className="group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-card/50 p-6 text-center transition-colors hover:border-primary hover:bg-accent/40"
          >
            <PlusCircle className="h-8 w-8 text-muted-foreground group-hover:text-primary" />
            <div>
              <div className="text-sm font-semibold">{t("dashboard.services.seeMoreTitle")}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {t("dashboard.services.seeMoreDesc")}
              </div>
            </div>
          </Link>
        </div>
      )}


    </div>
  );
}
