import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, FileText, Scale, Mic, ArrowRight } from "lucide-react";
import { TranslateLayout } from "@/components/layout/translate-layout";
import { TranslateCta } from "@/components/marketing/translate-cta";
import { PageHero } from "@/components/marketing/page-sections";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/providers/i18n-provider";
import { supabase } from "@/lib/supabase";
import { resolveServiceIntentDestination } from "@/lib/navigation/service-intents";
import { getInterpreterPricing } from "@/lib/pricing/interpreter-rates";
import { convertRwfToUsd } from "@/lib/pricing/interpreter-rates";
import { getMinutePackages, type MinutePackage } from "@/lib/pricing/minute-packages";

export const Route = createFileRoute("/translate/pricing")({
  head: () => ({
    meta: [
      { title: "Translation Pricing — We Speak Your Language" },
      {
        name: "description",
        content: "Estimate your translation or interpreter cost in USD instantly.",
      },
      { property: "og:title", content: "Translation Pricing" },
      { property: "og:description", content: "Interactive USD cost estimator." },
    ],
    links: [{ rel: "canonical", href: "/translate/pricing" }],
  }),
  component: PricingPage,
});

// Per-page RWF rates sourced from src/messages/en.json (pricing.plans.translation).
// Converted to USD via the shared RWF_PER_USD constant in interpreter-rates.ts.
const DOC_PER_PAGE_RWF = 8000;
const LEGAL_PER_PAGE_RWF = 12000;

type Mode = "document" | "legal" | "interpreter";

interface LanguageRow {
  id: string;
  code: string;
  name_en: string;
  flag_emoji: string | null;
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function PricingPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("document");
  const [pages, setPages] = useState(1);
  const [minutes, setMinutes] = useState(30);
  const [fromLang, setFromLang] = useState<string>("");
  const [toLang, setToLang] = useState<string>("");
  const [languages, setLanguages] = useState<LanguageRow[]>([]);
  const [interpreterRate, setInterpreterRate] = useState<number | null>(null);
  const [packages, setPackages] = useState<MinutePackage[]>([]);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("supported_languages")
        .select("id, code, name_en, flag_emoji")
        .eq("is_active", true)
        .order("name_en");
      const rows = (data ?? []) as LanguageRow[];
      setLanguages(rows);
      if (rows.length > 0) {
        setFromLang((prev) => prev || rows[0].code);
        setToLang((prev) => prev || rows[Math.min(1, rows.length - 1)].code);
      }
    })();
    void getInterpreterPricing()
      .then((p) => setInterpreterRate(p.client_rate_usd))
      .catch(() => setInterpreterRate(null));
    void getMinutePackages()
      .then(setPackages)
      .catch(() => setPackages([]));
  }, []);

  const docRateUsd = useMemo(() => convertRwfToUsd(DOC_PER_PAGE_RWF), []);
  const legalRateUsd = useMemo(() => convertRwfToUsd(LEGAL_PER_PAGE_RWF), []);

  const { total, breakdown, intent } = useMemo(() => {
    if (mode === "interpreter") {
      const rate = interpreterRate ?? 0;
      return {
        total: minutes * rate,
        breakdown: `${minutes} × ${formatUsd(rate)}/${t("translate.pricing.calculator.perMin")}`,
        intent: "live-interpreter",
      };
    }
    const rate = mode === "legal" ? legalRateUsd : docRateUsd;
    return {
      total: pages * rate,
      breakdown: `${pages} × ${formatUsd(rate)}/${t("translate.pricing.calculator.perPage")}`,
      intent: mode === "legal" ? "legal-translation" : "document-translation",
    };
  }, [mode, pages, minutes, interpreterRate, docRateUsd, legalRateUsd, t]);

  const handleCta = async () => {
    const destination = await resolveServiceIntentDestination(intent);
    void navigate(destination as never);
  };

  const modes: { value: Mode; label: string; icon: typeof FileText }[] = [
    { value: "document", label: t("translate.pricing.calculator.modes.document"), icon: FileText },
    { value: "legal", label: t("translate.pricing.calculator.modes.legal"), icon: Scale },
    {
      value: "interpreter",
      label: t("translate.pricing.calculator.modes.interpreter"),
      icon: Mic,
    },
  ];

  return (
    <TranslateLayout>
      <PageHero title={t("translate.pricing.title")} subtitle={t("translate.pricing.subtitle")} />

      <section className="mx-auto max-w-4xl px-4 py-12 md:px-6">
        <Card className="border-purple-500/30 shadow-lg dark:border-purple-400/20">
          <CardContent className="p-6 md:p-8">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">
              {t("translate.pricing.calculator.title")}
            </div>
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              {t("translate.pricing.calculator.subtitle")}
            </h2>

            {/* Mode selector */}
            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {modes.map((m) => {
                const Icon = m.icon;
                const active = mode === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMode(m.value)}
                    className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                      active
                        ? "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300"
                        : "border-border bg-card text-muted-foreground hover:border-purple-300 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {m.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {mode === "interpreter" ? (
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">
                    {t("translate.pricing.calculator.minutes")}
                  </label>
                  <Stepper
                    value={minutes}
                    min={5}
                    step={5}
                    onChange={setMinutes}
                  />
                  {packages.length > 0 && (
                    <div className="mt-4">
                      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {t("translate.pricing.calculator.presets")}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {packages.slice(0, 4).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setMinutes(p.minutes)}
                            className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-300"
                          >
                            {p.minutes} min · {formatUsd(p.price_usd)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium">
                      {t("translate.pricing.calculator.pages")}
                    </label>
                    <Stepper value={pages} min={1} step={1} onChange={setPages} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">
                        {t("translate.pricing.calculator.from")}
                      </label>
                      <LanguageSelect
                        languages={languages}
                        value={fromLang}
                        onChange={setFromLang}
                        placeholder={t("translate.pricing.calculator.loadingLangs")}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        {t("translate.pricing.calculator.to")}
                      </label>
                      <LanguageSelect
                        languages={languages}
                        value={toLang}
                        onChange={setToLang}
                        placeholder={t("translate.pricing.calculator.loadingLangs")}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Result */}
            <div className="mt-8 rounded-xl border border-purple-500/30 bg-purple-500/5 p-6 dark:bg-purple-400/5">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("translate.pricing.calculator.total")}
              </div>
              <div className="mt-1 text-4xl font-bold text-purple-700 dark:text-purple-300 md:text-5xl">
                {mode === "interpreter" && interpreterRate === null
                  ? t("translate.pricing.calculator.loadingRate")
                  : formatUsd(total)}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">{breakdown}</div>
              {mode !== "interpreter" && fromLang && toLang && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {languages.find((l) => l.code === fromLang)?.name_en} →{" "}
                  {languages.find((l) => l.code === toLang)?.name_en}
                </div>
              )}
              <div className="mt-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {t("translate.pricing.calculator.note")}
                </p>
                <Button
                  onClick={handleCta}
                  className="gap-2 bg-purple-600 text-white hover:bg-purple-700"
                >
                  {t("translate.pricing.calculator.cta")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
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

function Stepper({
  value,
  min,
  step,
  onChange,
}: {
  value: number;
  min: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onChange(Math.max(min, value - step))}
        aria-label="Decrease"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => {
          const next = Number(e.target.value);
          if (Number.isFinite(next)) onChange(Math.max(min, next));
        }}
        className="h-10 flex-1 rounded-md border border-input bg-transparent px-3 text-center text-base font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => onChange(value + step)}
        aria-label="Increase"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

function LanguageSelect({
  languages,
  value,
  onChange,
  placeholder,
}: {
  languages: LanguageRow[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={languages.length === 0}>
      <SelectTrigger className="mt-2">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {languages.map((l) => (
          <SelectItem key={l.id} value={l.code}>
            <span className="mr-2">{l.flag_emoji ?? "🌐"}</span>
            {l.name_en}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// Re-export Badge to keep prior imports satisfied
export { Badge };
