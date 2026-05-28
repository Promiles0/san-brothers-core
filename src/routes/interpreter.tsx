import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  PhoneCall,
  Clock,
  ShieldCheck,
  Sparkles,
  Globe2,
  Zap,
  MessageSquare,
  Star,
  Check,
} from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/interpreter")({
  head: () => ({
    meta: [
      { title: "We Speak Your Language — Live Interpreters 24/7" },
      {
        name: "description",
        content:
          "Professional interpreters available 24/7 in English, French, Chinese, Kinyarwanda & Kiswahili. First 5 minutes free.",
      },
      { property: "og:title", content: "We Speak Your Language — Live Interpreters" },
      {
        property: "og:description",
        content: "Connect with a certified human interpreter in seconds.",
      },
    ],
  }),
  component: InterpreterLanding,
});

interface MinutePackage {
  id: string;
  tab: string;
  tier: string;
  minutes: number;
  price_usd: number;
  label: string;
  savings_percent: number;
  is_highlighted: boolean;
}

const TAB_ORDER = ["pay-as-you-go", "daily", "monthly", "yearly"];
const TAB_LABELS: Record<string, string> = {
  "pay-as-you-go": "Pay as you go",
  daily: "Daily",
  monthly: "Monthly",
  yearly: "Yearly",
};

const LANGS = [
  { flag: "🇬🇧", name: "English" },
  { flag: "🇫🇷", name: "Français" },
  { flag: "🇨🇳", name: "中文" },
  { flag: "🇷🇼", name: "Kinyarwanda" },
  { flag: "🇰🇪", name: "Kiswahili" },
];

function InterpreterLanding() {
  const [packages, setPackages] = useState<MinutePackage[]>([]);
  const [activeTab, setActiveTab] = useState(TAB_ORDER[0]);
  const pricingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void supabase
      .from("minute_packages")
      .select("*")
      .order("price_usd", { ascending: true })
      .then(({ data }) => {
        if (data) setPackages(data as MinutePackage[]);
      });
  }, []);

  const packagesByTab = packages.reduce<Record<string, MinutePackage[]>>((acc, pkg) => {
    const key = pkg.tab.toLowerCase().replace(/\s+/g, "-");
    (acc[key] ??= []).push(pkg);
    return acc;
  }, {});
  const availableTabs = TAB_ORDER.filter((t) => (packagesByTab[t]?.length ?? 0) > 0);
  const displayTabs = availableTabs.length > 0 ? availableTabs : TAB_ORDER;

  return (
    <PublicLayout>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-background via-background to-muted/30">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 left-1/2 h-[480px] w-[900px] -translate-x-1/2 rounded-full bg-green-500/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center md:px-6 md:py-28">
          <Badge
            variant="secondary"
            className="mb-6 gap-1.5 border-green-500/30 bg-green-500/10 px-3 py-1 text-green-700 dark:text-green-300"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            Interpreters online now
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            We Speak Your{" "}
            <span className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
              Language
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            Professional interpreters available 24/7 in English, French, Chinese, Kinyarwanda &
            Kiswahili.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="h-14 gap-2 bg-green-600 px-8 text-base text-white shadow-lg shadow-green-600/30 hover:bg-green-700"
              asChild
            >
              <a href="/dashboard/interpreter">
                <PhoneCall className="h-5 w-5" />
                Start Free Call
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-base"
              onClick={() => pricingRef.current?.scrollIntoView({ behavior: "smooth" })}
            >
              View Pricing
            </Button>
          </div>

          {/* Trust badges */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm">
            <TrustBadge icon={Sparkles} text="First 5 minutes FREE" />
            <TrustBadge icon={Clock} text="Available Now" />
            <TrustBadge icon={ShieldCheck} text="Certified Interpreters" />
          </div>

          {/* Language flags strip */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            {LANGS.map((l) => (
              <div
                key={l.name}
                className="flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-2 text-sm backdrop-blur"
              >
                <span className="text-xl leading-none">{l.flag}</span>
                <span className="font-medium">{l.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto max-w-5xl px-4 py-20 md:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-green-600 dark:text-green-400">
            How it works
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            From hello to understood in seconds
          </h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Globe2,
              n: 1,
              title: "Choose your languages",
              desc: "Pick the language you speak and the one you need translated.",
            },
            {
              icon: Zap,
              n: 2,
              title: "Connect instantly",
              desc: "A certified interpreter joins your call in under 30 seconds.",
            },
            {
              icon: MessageSquare,
              n: 3,
              title: "Communicate clearly",
              desc: "Speak naturally — we bridge the conversation in real-time.",
            },
          ].map((s) => (
            <Card key={s.n} className="relative overflow-hidden border-border/60">
              <CardContent className="p-7">
                <div className="absolute right-4 top-3 text-7xl font-bold text-muted/30">
                  {s.n}
                </div>
                <div className="relative">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-green-500/10 text-green-600 dark:text-green-400">
                    <s.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section
        ref={pricingRef}
        className="border-y border-border bg-muted/30 scroll-mt-24"
        id="pricing"
      >
        <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-green-600 dark:text-green-400">
              Simple Pricing
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
              Pay how you want
            </h2>
            <p className="mt-3 text-muted-foreground">
              Start with 5 free minutes. No subscription required.
            </p>
          </div>

          <div className="mt-12">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mx-auto grid w-full max-w-2xl grid-cols-4">
                {displayTabs.map((t) => (
                  <TabsTrigger key={t} value={t} className="text-xs sm:text-sm">
                    {TAB_LABELS[t] ?? t}
                  </TabsTrigger>
                ))}
              </TabsList>

              {displayTabs.map((t) => (
                <TabsContent key={t} value={t} className="mt-8">
                  <div className="grid gap-5 md:grid-cols-3">
                    {(packagesByTab[t] ?? []).slice(0, 3).map((pkg) => (
                      <PricingCard key={pkg.id} pkg={pkg} />
                    ))}
                    {(packagesByTab[t] ?? []).length === 0 && (
                      <div className="md:col-span-3 rounded-xl border border-dashed border-border bg-background/50 p-10 text-center text-sm text-muted-foreground">
                        Pricing coming soon for this option.
                      </div>
                    )}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center md:px-6">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          Ready to be understood?
        </h2>
        <p className="mt-3 text-muted-foreground">
          Your first 5 minutes are on us. No credit card required.
        </p>
        <Button
          size="lg"
          className="mt-7 h-14 gap-2 bg-green-600 px-8 text-base text-white shadow-lg shadow-green-600/30 hover:bg-green-700"
          asChild
        >
          <a href="/dashboard/interpreter">
            <PhoneCall className="h-5 w-5" />
            Start Free Call
          </a>
        </Button>
      </section>
    </PublicLayout>
  );
}

function TrustBadge({ icon: Icon, text }: { icon: typeof Sparkles; text: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <Icon className="h-4 w-4 text-green-600 dark:text-green-400" />
      <span className="font-medium">{text}</span>
    </div>
  );
}

function PricingCard({ pkg }: { pkg: MinutePackage }) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-background p-7 transition-all",
        pkg.is_highlighted
          ? "border-green-500/60 shadow-xl shadow-green-500/10 ring-1 ring-green-500/40 md:scale-[1.03]"
          : "border-border hover:border-green-500/40 hover:shadow-md",
      )}
    >
      {pkg.is_highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="gap-1 bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-600">
            <Star className="h-3 w-3 fill-current" />
            Best Value
          </Badge>
        </div>
      )}

      <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground">{pkg.label}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold">${pkg.price_usd.toFixed(2)}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          {pkg.minutes} minutes
          {pkg.savings_percent > 0 && (
            <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
              Save {pkg.savings_percent}%
            </span>
          )}
        </p>
      </div>

      <ul className="mt-6 space-y-2 text-sm">
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
          <span>Certified human interpreters</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
          <span>All supported languages</span>
        </li>
        <li className="flex items-start gap-2">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
          <span>Minutes never expire</span>
        </li>
      </ul>

      <Button
        className={cn(
          "mt-7 w-full",
          pkg.is_highlighted && "bg-green-600 text-white hover:bg-green-700",
        )}
        variant={pkg.is_highlighted ? "default" : "outline"}
        asChild
      >
        <a href="/dashboard/interpreter">Get Started</a>
      </Button>
    </div>
  );
}
