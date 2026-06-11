import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Clock,
  CirclePlus as PlusCircle,
  Search,
  Zap,
  Plane,
  Calculator,
  Languages,
  Briefcase,
  Check,
  X,
  Radio,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
type Category = (typeof CATEGORIES)[number];

const CATEGORY_CONFIG: Record<
  string,
  {
    icon: React.ElementType;
    color: string;
    bg: string;
    text: string;
    border: string;
    shadow: string;
    btnHover: string;
    label: string;
  }
> = {
  visa: {
    icon: Plane,
    color: "#3B82F6",
    bg: "bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-t-blue-500",
    shadow: "hover:shadow-blue-500/20",
    btnHover: "hover:bg-blue-600 hover:text-white",
    label: "Visa",
  },
  accounting: {
    icon: Calculator,
    color: "#10B981",
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-t-emerald-500",
    shadow: "hover:shadow-emerald-500/20",
    btnHover: "hover:bg-emerald-600 hover:text-white",
    label: "Accounting",
  },
  translation: {
    icon: Languages,
    color: "#8B5CF6",
    bg: "bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
    border: "border-t-violet-500",
    shadow: "hover:shadow-violet-500/20",
    btnHover: "hover:bg-violet-600 hover:text-white",
    label: "Translation",
  },
  consultancy: {
    icon: Briefcase,
    color: "#F59E0B",
    bg: "bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-t-amber-500",
    shadow: "hover:shadow-amber-500/20",
    btnHover: "hover:bg-amber-500 hover:text-white",
    label: "Consultancy",
  },
};

const POPULAR_SLUGS = new Set([
  "tourist-visa",
  "document-translation",
  "live-interpreter",
  "company-registration",
]);

function isInterpreterSlug(slug: string) {
  return (
    slug.includes("live-interpret") ||
    slug.includes("live-interp") ||
    slug === "live-interpretation"
  );
}

function getCatConfig(cat: string) {
  return CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.visa;
}

function ServiceCard({
  s,
  onRequest,
  locale,
}: {
  s: Service;
  onRequest: () => void;
  locale: string;
}) {
  const cfg = getCatConfig(s.category);
  const Icon = cfg.icon;
  const interpreter = isInterpreterSlug(s.slug);
  const popular = POPULAR_SLUGS.has(s.slug);

  const name = (locale === "zh" && s.name_zh) || (locale === "rw" && s.name_rw) || s.name_en;
  const desc =
    (locale === "zh" && s.description_zh) ||
    (locale === "rw" && s.description_rw) ||
    s.description_en ||
    "";

  const priceUSD = (() => {
    const min = s.price_usd_min;
    const max = s.price_usd_max;
    if (!min && !max) return null;
    const fmt = (n: number) => `$${Math.round(n)}`;
    if (min && max && min !== max) return `${fmt(min)} – ${fmt(max)} USD`;
    return `${fmt(min ?? max ?? 0)} USD`;
  })();

  const priceRWF = (() => {
    const min = s.price_usd_min;
    const max = s.price_usd_max;
    if (!min && !max) return null;
    const toRWF = (n: number) => `RWF ${(n * 1285).toLocaleString()}`;
    if (min && max && min !== max) return `≈ ${toRWF(min)} – ${toRWF(max)}`;
    return `≈ ${toRWF(min ?? max ?? 0)}`;
  })();

  return (
    <div
      className={`group relative flex flex-col rounded-xl border-t-4 ${cfg.border} border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-all duration-250 hover:-translate-y-1 hover:shadow-lg ${cfg.shadow} cursor-pointer`}
      style={{ transition: "transform 0.2s ease, box-shadow 0.2s ease" }}
    >
      {/* Badges */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5 z-10">
        {popular && (
          <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-600 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
            ⭐ Popular
          </span>
        )}
        {interpreter && (
          <span className="flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-600 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Available Now
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        {/* Icon + category */}
        <div className="mb-4 flex items-center gap-3">
          <div
            className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${cfg.bg}`}
          >
            {interpreter ? (
              <Radio className={`h-6 w-6 ${cfg.text}`} />
            ) : (
              <Icon className={`h-6 w-6 ${cfg.text}`} />
            )}
          </div>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.bg} ${cfg.text}`}
          >
            {cfg.label}
          </span>
        </div>

        {/* Name */}
        <h3 className="mb-1.5 font-bold text-gray-900 dark:text-white leading-tight pr-16">
          {name}
        </h3>

        {/* Description */}
        <p className="mb-4 line-clamp-2 text-sm text-gray-500 dark:text-gray-400">{desc}</p>

        {/* Price */}
        {priceUSD && (
          <div className="mb-3">
            <div className="text-base font-bold text-gray-900 dark:text-white">{priceUSD}</div>
            {priceRWF && <div className="text-xs text-gray-500 dark:text-gray-400">{priceRWF}</div>}
          </div>
        )}

        {/* Duration */}
        {s.estimated_days_min != null && s.estimated_days_max != null && (
          <div className="mb-4 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            <span>
              {s.estimated_days_min}–{s.estimated_days_max} days
            </span>
          </div>
        )}

        {/* Features */}
        <div className="mb-4 space-y-1.5">
          {(interpreter
            ? ["Live professional interpreters", "First 5 minutes FREE", "Available in 5 languages"]
            : ["Expert professionals", "Fast processing", "24/7 support"]
          ).map((f) => (
            <div
              key={f}
              className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300"
            >
              <Check className={`h-3.5 w-3.5 flex-shrink-0 ${cfg.text}`} />
              {f}
            </div>
          ))}
        </div>

        {/* Interpreter FREE badge */}
        {interpreter && (
          <div className="mb-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-1.5 text-center">
            <span className="text-xs font-bold text-green-700 dark:text-green-400">
              First 5 min FREE — Try it now!
            </span>
          </div>
        )}

        {/* Request button */}
        <Button
          onClick={onRequest}
          className={`mt-auto w-full transition-all duration-200 ${interpreter ? "bg-amber-500 hover:bg-amber-600 text-white border-0" : `bg-white dark:bg-transparent border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white ${cfg.btnHover}`}`}
        >
          {interpreter ? (
            <>
              <Zap className="mr-1.5 h-3.5 w-3.5" /> Book / Free Trial
            </>
          ) : (
            <>Request Now →</>
          )}
        </Button>
      </div>
    </div>
  );
}

function ServiceCatalog() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const { apply } = useSearch({ from: "/dashboard/services/" });
  const { servicesAvailable } = usePortal();
  const [services, setServices] = useState<Service[] | null>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Category>("all");

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
    void navigate({
      to: "/dashboard/services/apply/$slug",
      params: { slug: apply },
      replace: true,
    } as never);
  }, [apply, navigate]);

  const filtered = useMemo(() => {
    if (!services) return null;
    const localName = (s: Service) =>
      (locale === "zh" && s.name_zh) || (locale === "rw" && s.name_rw) || s.name_en;
    return services.filter((s) => {
      const inPortal = servicesAvailable.includes(s.slug);
      const matchesCat = cat === "all" || s.category === cat;
      const matchesQ = !query || localName(s).toLowerCase().includes(query.toLowerCase());
      return inPortal && matchesCat && matchesQ;
    });
  }, [services, cat, query, locale, servicesAvailable]);

  const catCounts = useMemo(() => {
    if (!services) return {} as Record<string, number>;
    return services.reduce(
      (acc, s) => {
        if (servicesAvailable.includes(s.slug)) acc[s.category] = (acc[s.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [services, servicesAvailable]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          {t("dashboard.services.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t("dashboard.services.subtitle")}
        </p>
      </div>

      {/* Filter + Search */}
      <div className="flex flex-col gap-3">
        {/* Category tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {CATEGORIES.map((c) => {
            const cfg = c === "all" ? null : getCatConfig(c);
            const count =
              c === "all"
                ? (services?.filter((s) => servicesAvailable.includes(s.slug)).length ?? 0)
                : (catCounts[c] ?? 0);
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border ${
                  cat === c
                    ? c === "all"
                      ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 border-transparent"
                      : `border-transparent text-white`
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
                style={
                  cat === c && c !== "all" && cfg
                    ? { background: cfg.color, borderColor: cfg.color }
                    : {}
                }
              >
                {c === "all" ? "All" : cfg?.label}
                <span
                  className={`rounded-full px-1.5 text-[10px] font-bold py-px ${cat === c ? "bg-white/25" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("dashboard.services.searchPlaceholder")}
            className="pl-9 pr-9"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {filtered === null ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-16 text-center">
          <Search className="h-8 w-8 text-gray-300 dark:text-gray-600" />
          <div className="space-y-1">
            <p className="font-medium text-gray-900 dark:text-white">
              {query ? "No services found" : `No services in this category yet.`}
            </p>
            {query && <p className="text-sm text-gray-500">Try a different search term.</p>}
          </div>
          {query && (
            <Button variant="outline" size="sm" onClick={() => setQuery("")}>
              Clear Search
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s, i) => (
            <div
              key={s.id}
              style={{
                animationDelay: `${i * 50}ms`,
                opacity: 0,
                animation: `fadeInUp 0.3s ease ${i * 50}ms forwards`,
              }}
            >
              <ServiceCard
                s={s}
                locale={locale}
                onRequest={() => {
                  if (isInterpreterSlug(s.slug)) {
                    void navigate({ to: "/dashboard/interpreter", replace: true } as never);
                  } else {
                    void navigate({
                      to: "/dashboard/services/apply/$slug",
                      params: { slug: s.slug },
                    } as never);
                  }
                }}
              />
            </div>
          ))}

          {/* See more card */}
          <Link
            to="/contact"
            className="group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 p-8 text-center transition-all hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
          >
            <PlusCircle className="h-8 w-8 text-gray-400 group-hover:text-blue-500 transition-colors" />
            <div>
              <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {t("dashboard.services.seeMoreTitle")}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {t("dashboard.services.seeMoreDesc")}
              </div>
            </div>
          </Link>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
