import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Briefcase,
  Building2,
  Calculator,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Globe2,
  GraduationCap,
  Headphones,
  Languages,
  Landmark,
  LineChart,
  Plane,
  Search,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicLayout } from "@/components/layout/public-layout";
import { CtaBanner } from "@/components/marketing/page-sections";
import { useI18n } from "@/lib/providers/i18n-provider";
import { Magnetic } from "@/components/fx/magnetic";
import { TiltCard } from "@/components/fx/tilt-card";
import { AnimatedCounter } from "@/components/fx/animated-counter";
import { ParallaxLayer } from "@/components/fx/parallax-layer";

export const Route = createFileRoute("/services/")({
  head: () => ({
    meta: [
      { title: "Professional Services in Rwanda — San Brothers" },
      {
        name: "description",
        content:
          "Visa, accounting, consultancy, and translation services for clients in Rwanda and abroad.",
      },
    ],
  }),
  component: ServicesOverview,
});

type Category = "visa" | "accounting" | "translation" | "consultancy";
const CATEGORY_STYLES: Record<
  Category,
  { border: string; text: string; soft: string; button: string }
> = {
  visa: {
    border: "border-t-visa",
    text: "text-visa",
    soft: "bg-visa/10",
    button: "bg-visa text-primary-foreground hover:bg-visa/90",
  },
  accounting: {
    border: "border-t-accounting",
    text: "text-accounting",
    soft: "bg-accounting/10",
    button: "bg-accounting text-primary-foreground hover:bg-accounting/90",
  },
  translation: {
    border: "border-t-translation",
    text: "text-translation",
    soft: "bg-translation/10",
    button: "bg-translation text-primary-foreground hover:bg-translation/90",
  },
  consultancy: {
    border: "border-t-consultancy",
    text: "text-consultancy",
    soft: "bg-consultancy/10",
    button: "bg-consultancy text-foreground hover:bg-consultancy/90",
  },
};
const CATEGORIES: { key: Category; label: string; icon: typeof Plane }[] = [
  { key: "visa", label: "Visa & Permits", icon: Plane },
  { key: "accounting", label: "Accounting", icon: BarChart3 },
  { key: "translation", label: "Translation", icon: Globe2 },
  { key: "consultancy", label: "Consultancy", icon: Briefcase },
];
const SERVICES = [
  {
    category: "visa",
    name: "Tourist Visa",
    icon: Plane,
    desc: "Quick-process tourist visas for Rwanda and major destinations worldwide.",
    tags: ["Fast Processing", "Embassy Ready", "Online Tracking"],
    price: "Starting from RWF 45,000",
  },
  {
    category: "visa",
    name: "Business Visa",
    icon: Briefcase,
    desc: "Multi-entry business visas with invitation letter support and fast-track processing.",
    tags: ["Multi-Entry", "Corporate", "Fast Track"],
    price: "Starting from RWF 65,000",
  },
  {
    category: "visa",
    name: "Student Visa",
    icon: GraduationCap,
    desc: "Student visa facilitation with university liaison and document review.",
    tags: ["University Support", "Renewal Help", "Document Review"],
    price: "Starting from RWF 50,000",
  },
  {
    category: "visa",
    name: "Work Permit",
    icon: FileCheck2,
    desc: "End-to-end work permit facilitation for expats and international companies in Rwanda.",
    tags: ["RDB Compliant", "Expat Ready", "Company Support"],
    price: "Starting from RWF 120,000",
  },
  {
    category: "accounting",
    name: "Bookkeeping",
    icon: BookOpenCheck,
    desc: "Monthly reconciliation and ledger management tailored for SMEs and sole traders.",
    tags: ["Monthly Reports", "Cloud-based", "RRA Compliant"],
    price: "Starting from RWF 35,000 /mo",
  },
  {
    category: "accounting",
    name: "Tax Filing",
    icon: Calculator,
    desc: "Corporate and personal tax returns filed accurately and on time via the RRA portal.",
    tags: ["On-Time Filing", "RRA Portal", "Penalty-Free"],
    price: "Starting from RWF 40,000",
  },
  {
    category: "accounting",
    name: "Financial Reporting",
    icon: LineChart,
    desc: "IFRS-aligned financial statements and management reports for investors and boards.",
    tags: ["IFRS Standards", "Investor Ready", "Audit Trail"],
    price: "Starting from RWF 55,000",
  },
  {
    category: "accounting",
    name: "Audit Support",
    icon: ClipboardCheck,
    desc: "Internal audit preparation and external audit coordination for compliance readiness.",
    tags: ["Pre-Audit Prep", "Compliance Check", "Board Ready"],
    price: "Starting from RWF 70,000",
  },
  {
    category: "translation",
    name: "Document Translation",
    icon: FileText,
    desc: "Certified translation of legal, business, and personal documents across 5 languages.",
    tags: ["Certified", "Legal Grade", "5 Languages"],
    price: "Starting from RWF 8,000 /page",
  },
  {
    category: "translation",
    name: "Legal Translation",
    icon: Landmark,
    desc: "Court-ready legal document translation with notarization support and sworn translators.",
    tags: ["Court-Ready", "Notarized", "Sworn Translator"],
    price: "Starting from RWF 15,000 /page",
  },
  {
    category: "translation",
    name: "Live Interpreter",
    icon: Headphones,
    desc: "Real-time video and audio interpretation for meetings, calls, and conferences.",
    tags: ["Real-Time", "Video Calls", "On-Demand"],
    price: "Starting from $0.80 /min",
  },
  {
    category: "translation",
    name: "Multilingual Support",
    icon: Languages,
    desc: "Ongoing multilingual support packages for businesses operating across regions.",
    tags: ["Ongoing", "5 Languages", "Business Grade"],
    price: "Starting from RWF 80,000 /mo",
  },
  {
    category: "consultancy",
    name: "Company Registration",
    icon: Building2,
    desc: "Full RDB registration for local and foreign companies — all types, fast track available.",
    tags: ["RDB Certified", "Fast Track", "All Company Types"],
    price: "Starting from RWF 150,000",
  },
  {
    category: "consultancy",
    name: "Business Planning",
    icon: CircleDollarSign,
    desc: "Market research, feasibility studies, and investor-ready business plans for Rwanda and beyond.",
    tags: ["Investor Ready", "Market Research", "Custom Plans"],
    price: "Starting from RWF 200,000",
  },
  {
    category: "consultancy",
    name: "Trade Advisory",
    icon: Globe2,
    desc: "Import/export compliance, EAC trade agreements, and market entry strategy support.",
    tags: ["Import/Export", "EAC Compliant", "Market Entry"],
    price: "Starting from RWF 100,000",
  },
  {
    category: "consultancy",
    name: "Admin Support",
    icon: ShieldCheck,
    desc: "Ongoing business administration, compliance tracking, and secretarial services.",
    tags: ["Ongoing", "Compliance", "Secretarial"],
    price: "Starting from RWF 45,000 /mo",
  },
] as const;

function ServicesOverview() {
  const { t, tRaw } = useI18n();
  const [activeCategory, setActiveCategory] = useState<"all" | Category>("all");
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) =>
          entry.target.classList.toggle("animate-in", entry.isIntersecting),
        ),
      { threshold: 0.1 },
    );
    document.querySelectorAll(".scroll-reveal").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [activeCategory]);
  const jumpTo = (category: Category) => {
    setActiveCategory("all");
    window.setTimeout(
      () =>
        document.getElementById(category)?.scrollIntoView({ behavior: "smooth", block: "start" }),
      0,
    );
  };
  return (
    <PublicLayout>
      <section className="public-hero-gradient relative isolate flex min-h-[80vh] items-center overflow-hidden text-primary-foreground">
        <div className="absolute inset-0 bg-background/10" aria-hidden="true" />
        <ParallaxLayer
          speed={-0.3}
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-[32rem] w-[32rem]"
        >
          <div className="h-full w-full rounded-full bg-primary-foreground/10 blur-3xl" />
        </ParallaxLayer>
        <ParallaxLayer
          speed={0.2}
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-24 h-[28rem] w-[28rem]"
        >
          <div className="h-full w-full rounded-full bg-accent/20 blur-3xl" />
        </ParallaxLayer>
        <div className="relative mx-auto w-full max-w-7xl px-4 py-24 md:px-6">
          <p className="public-fade-up text-sm font-semibold uppercase tracking-[0.22em] text-primary-foreground/70">
            Professional services · Kigali, Rwanda
          </p>
          <h1
            className="public-fade-up mt-5 max-w-4xl text-balance text-5xl font-black leading-[1.02] tracking-tight md:text-7xl"
            style={{ animationDelay: "80ms" }}
          >
            Everything You Need, Under One Roof
          </h1>
          <p
            className="public-fade-up mt-6 max-w-2xl text-balance text-lg text-primary-foreground/80 md:text-xl"
            style={{ animationDelay: "160ms" }}
          >
            Visa & permits, accounting, translation, consultancy — handled by experts in Kigali.
          </p>
          <div
            className="public-fade-up mt-8 flex flex-col gap-3 sm:flex-row"
            style={{ animationDelay: "240ms" }}
          >
            <Magnetic strength={18}>
              <Button size="lg" variant="secondary" asChild>
                <Link to="/signup" search={{ intent: "service" } as never}>
                  Get Started
                </Link>
              </Button>
            </Magnetic>
            <Magnetic strength={14}>
              <Button
                size="lg"
                variant="outline"
                className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                asChild
              >
                <Link to="/pricing">View Pricing</Link>
              </Button>
            </Magnetic>
          </div>
          <div className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-primary-foreground/15 bg-primary-foreground/15 lg:grid-cols-4">
            {[
              { value: 500, suffix: "+", label: "Clients Served" },
              { value: 17, suffix: "", label: "Services Available" },
              { value: 5, suffix: "", label: "Languages Supported" },
              { value: 3, suffix: " Days", label: "Avg Turnaround" },
            ].map((stat, index) => (
              <div
                key={stat.label}
                className="public-fade-up bg-primary/70 p-5 backdrop-blur-sm md:p-6"
                style={{ animationDelay: `${320 + index * 80}ms` }}
              >
                <AnimatedCounter
                  to={stat.value}
                  suffix={stat.suffix}
                  className="block text-2xl font-black md:text-3xl"
                />
                <span className="text-sm text-primary-foreground/70">{stat.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {CATEGORIES.map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant="outline"
                className="rounded-full border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
                onClick={() => jumpTo(key)}
              >
                <Icon />
                {label}
              </Button>
            ))}
          </div>
        </div>
      </section>
      <nav
        className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur"
        aria-label="Filter services"
      >
        <div className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4 md:px-6">
          {[{ key: "all", label: "All" }, ...CATEGORIES].map((item) => {
            const isActive = activeCategory === item.key;
            const activeBorder =
              item.key === "all" ? "border-primary" : CATEGORY_STYLES[item.key as Category].border;
            return (
              <Button
                key={item.key}
                variant="ghost"
                className={`h-14 shrink-0 rounded-none border-b-2 px-1 ${isActive ? `${activeBorder} text-foreground` : "border-transparent text-muted-foreground"}`}
                onClick={() => setActiveCategory(item.key as "all" | Category)}
              >
                {item.label}
              </Button>
            );
          })}
        </div>
      </nav>
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        {CATEGORIES.filter(({ key }) => activeCategory === "all" || activeCategory === key).map(
          ({ key, label }) => {
            const styles = CATEGORY_STYLES[key];
            const translatedFeatures = tRaw<string[]>(`servicesPage.cards.${key}.sub`) ?? [];
            return (
              <div id={key} key={key} className="scroll-mt-36 py-9 first:pt-0">
                <p className={`mb-5 text-xs font-bold uppercase tracking-[0.2em] ${styles.text}`}>
                  {label}
                </p>
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {SERVICES.filter((service) => service.category === key).map((service, index) => (
                    <TiltCard
                      key={service.name}
                      max={6}
                      className="scroll-reveal"
                      style={{ transitionDelay: `${index * 60}ms` }}
                    >
                      <Card
                        className={`group h-full border-t-[3px] ${styles.border} overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-lg`}
                      >
                        <CardContent className="flex h-full flex-col p-6">
                          <div className="flex items-start justify-between gap-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${styles.soft} ${styles.text}`}
                            >
                              {key}
                            </span>
                            <div
                              className={`grid h-11 w-11 place-items-center rounded-xl ${styles.soft} ${styles.text}`}
                            >
                              <service.icon className="h-5 w-5" />
                            </div>
                          </div>
                          <h2 className="mt-5 text-xl font-bold">{service.name}</h2>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {service.desc}
                          </p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {service.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                          <p className="mt-5 text-sm font-medium text-muted-foreground">
                            {service.price}
                          </p>
                          <div className="mt-auto flex items-center gap-4 pt-6">
                            <Button className={styles.button} asChild>
                              <Link to="/dashboard/services">Apply Now</Link>
                            </Button>
                            <Link
                              to="/pricing"
                              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
                            >
                              {t("servicesPage.learnMore")} <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                          <span className="sr-only">{translatedFeatures.join(", ")}</span>
                        </CardContent>
                      </Card>
                    </TiltCard>
                  ))}
                </div>
              </div>
            );
          },
        )}
      </section>
      <section className="bg-muted/45 py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              Simple by design
            </p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">How San Brothers Works</h2>
          </div>
          <div className="relative mt-12 grid gap-8 md:grid-cols-4 md:gap-5">
            <div
              className="absolute left-[12.5%] right-[12.5%] top-6 hidden border-t border-dashed border-primary/30 md:block"
              aria-hidden="true"
            />
            {[
              [UserPlus, "Create Account", "Sign up free in under 2 minutes"],
              [Search, "Choose a Service", "Browse our catalog and submit your application online"],
              [Briefcase, "We Handle It", "Our certified experts take over and keep you updated"],
              [
                CheckCircle2,
                "Track & Receive",
                "Get live status updates until your service is complete",
              ],
            ].map(([Icon, title, desc], index) => (
              <div key={String(title)} className="scroll-reveal relative text-center">
                <div className="relative z-10 mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                  {index + 1}
                </div>
                <Icon className="mx-auto mt-6 h-7 w-7 text-primary" />
                <h3 className="mt-4 font-bold">{String(title)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{String(desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-14 text-center">
        <div className="mx-auto max-w-4xl px-4 md:px-6">
          <p className="text-lg font-semibold">
            Trusted by individuals, SMEs, and multinationals across 15+ countries
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            🇷🇼 Kinyarwanda · 🇬🇧 English · 🇨🇳 中文 · 🇫🇷 Français · 🇸🇦 العربية
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-20 md:px-6">
        <div className="scroll-reveal overflow-hidden rounded-3xl bg-linear-to-br from-translation to-translation/70 p-8 text-primary-foreground shadow-lg md:p-12">
          <div className="grid items-center gap-8 md:grid-cols-[auto_1fr_auto]">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary-foreground/15">
              <Globe2 className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">{t("servicesPage.weSpeakBrand")}</h2>
              <p className="mt-2 text-primary-foreground/80">
                Human-certified translation in 5 languages — document, legal, and live.
              </p>
            </div>
            <Button
              variant="outline"
              className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              asChild
            >
              <Link to="/services/translation">
                {t("servicesPage.openTranslation")} <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>
      <CtaBanner
        title="Ready to Get Started?"
        subtitle="Create your free account and put our experts to work."
        label={t("common.getStarted")}
      />
    </PublicLayout>
  );
}
