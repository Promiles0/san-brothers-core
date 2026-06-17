import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Plane,
  Calculator,
  Briefcase,
  Languages,
  ShieldCheck,
  Clock,
  Globe,
  UserPlus,
  LayoutGrid,
  Upload,
  CircleCheck as CheckCircle,
  ArrowRight,
  Phone,
  MessageCircle,
  Sparkles,
  Award,
  HeartHandshake,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/layout/public-layout";
import { useI18n } from "@/lib/providers/i18n-provider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "San Brothers — Trusted Partner for Global Professional Services" },
      {
        name: "description",
        content:
          "Friendly, professional help with visas, accounting, translation, and business setup — for clients in Rwanda and worldwide.",
      },
      { property: "og:title", content: "San Brothers — Global Professional Services" },
      {
        property: "og:description",
        content: "Visas, accounting, translation, and business support — handled end to end.",
      },
    ],
  }),
  component: Home,
});

// ────────────────────────────────────────────────────────────
//  Page
// ────────────────────────────────────────────────────────────

function Home() {
  return (
    <PublicLayout>
      <PageStyles />
      <Hero />
      <ServicesGrid />
      <WhyUs />
      <Process />
      <SocialProof />
      <CtaSection />
      <StickyContact />
    </PublicLayout>
  );
}

// ────────────────────────────────────────────────────────────
//  Inline keyframes (small, theme-agnostic)
// ────────────────────────────────────────────────────────────

function PageStyles() {
  return (
    <style>{`
      @keyframes home-fade-up {
        from { opacity: 0; transform: translateY(16px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .home-fade-up { animation: home-fade-up 0.7s cubic-bezier(0.16,1,0.3,1) both; }
      .home-delay-1 { animation-delay: 0.08s; }
      .home-delay-2 { animation-delay: 0.16s; }
      .home-delay-3 { animation-delay: 0.24s; }
      .home-delay-4 { animation-delay: 0.32s; }
      @media (prefers-reduced-motion: reduce) {
        .home-fade-up { animation: none !important; opacity: 1 !important; transform: none !important; }
      }
    `}</style>
  );
}

// ────────────────────────────────────────────────────────────
//  Hero
// ────────────────────────────────────────────────────────────

function Hero() {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-secondary/40 via-background to-background">
      {/* Ambient mesh gradient — adapts to theme via tokens */}
      <div aria-hidden className="home-mesh opacity-60 dark:opacity-50" />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-1/2 h-[28rem] w-[28rem] translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />


      <div className="relative mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <div className="grid items-center gap-12 md:grid-cols-2">
          {/* Copy */}
          <div className="home-fade-up text-center md:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Trusted in 15+ countries
            </span>
            <h1 className="mt-6 text-balance text-4xl font-black leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl">
              {t("home.heroTitle")}
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg md:mx-0">
              {t("home.heroSubtitle")}
            </p>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row md:justify-start">
              <Button asChild size="lg" className="h-12 gap-2 px-7 text-base">
                <Link to="/signup" search={undefined}>
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 gap-2 px-7 text-base">
                <Link to="/contact">
                  <MessageCircle className="h-4 w-4" />
                  Talk to an expert
                </Link>
              </Button>
            </div>

            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground md:justify-start">
              <li className="inline-flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-success" />
                Free consultation
              </li>
              <li className="inline-flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-success" />
                No hidden fees
              </li>
              <li className="inline-flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-success" />
                24/7 online access
              </li>
            </ul>
          </div>

          {/* Visual: floating service preview cards built from tokens */}
          <div className="home-fade-up home-delay-2 relative mx-auto hidden aspect-[5/4] w-full max-w-md md:block">
            <FloatingPreview
              className="home-float-a absolute left-0 top-4 w-[62%]"
              icon={Plane}
              tag="VISA"
              title="Tori Faci"
              status="Submitted on time"
              tone="primary"
            />
            <FloatingPreview
              className="home-float-b absolute right-0 top-24 w-[58%]"
              icon={Languages}
              tag="TRANSLATION"
              title="Diploma EN → ZH"
              status="Done in 18 hrs"
              tone="accent"
            />
            <FloatingPreview
              className="home-float-c absolute bottom-0 left-8 w-[64%]"
              icon={Briefcase}
              tag="CONSULTANCY"
              title="Company registered"
              status="2 weeks · official"
              tone="success"
            />
          </div>

        </div>

        {/* Language strip */}
        <div className="home-fade-up home-delay-3 mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-border pt-8 text-sm text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-widest">We speak</span>
          {[
            { flag: "🇬🇧", lang: "English" },
            { flag: "🇨🇳", lang: "中文" },
            { flag: "🇷🇼", lang: "Kinyarwanda" },
            { flag: "🇫🇷", lang: "Français" },
            { flag: "🇸🇦", lang: "العربية" },
          ].map((l) => (
            <span key={l.lang} className="inline-flex items-center gap-1.5">
              <span aria-hidden>{l.flag}</span>
              {l.lang}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function FloatingPreview({
  className,
  icon: Icon,
  tag,
  title,
  status,
  tone,
}: {
  className?: string;
  icon: LucideIcon;
  tag: string;
  title: string;
  status: string;
  tone: "primary" | "accent" | "success";
}) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/15 text-accent",
    success: "bg-success/15 text-success",
  } as const;
  return (
    <div
      className={`glass-card rounded-2xl border border-border/70 p-4 shadow-2xl shadow-primary/10 ring-1 ring-white/5 ${className ?? ""}`}
    >
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]} shadow-inner`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {tag}
          </div>
          <div className="truncate text-sm font-semibold text-card-foreground">{title}</div>
        </div>
      </div>
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success ring-1 ring-success/30">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success shadow-[0_0_8px_var(--success)]" />
        {status}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
//  Services
// ────────────────────────────────────────────────────────────

function ServicesGrid() {
  const { t } = useI18n();
  const services: {
    icon: LucideIcon;
    title: string;
    desc: string;
    outcome: string;
    href: string;
  }[] = [
    {
      icon: Plane,
      title: t("services.visa"),
      desc: t("home.serviceDesc.visa"),
      outcome: "Student & work visas handled end to end",
      href: "/services/visa",
    },
    {
      icon: Calculator,
      title: t("services.accounting"),
      desc: t("home.serviceDesc.accounting"),
      outcome: "Books, tax filing & monthly reports",
      href: "/services/accounting",
    },
    {
      icon: Languages,
      title: t("services.translation"),
      desc: t("home.serviceDesc.translation"),
      outcome: "Certified translation in 24 hours",
      // href: "/services/translation",
      href: "/translate",
    },
    {
      icon: Briefcase,
      title: t("services.consultancy"),
      desc: t("home.serviceDesc.consultancy"),
      outcome: "Company registration & advisory",
      href: "/consultancy",
    },
  ];

  return (
    <section className="border-b border-border bg-background py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHeader
          eyebrow="What we do"
          title={t("home.servicesHeading")}
          subtitle="Four practices, one accountable team. Friendly to first-time clients, fast for repeat ones."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {services.map((s, i) => (
            <Link
              to={s.href}
              key={s.title}
              className={`home-fade-up home-delay-${i + 1} service-card group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-6`}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              />
              <div className="relative flex items-start justify-between">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 text-primary ring-1 ring-primary/20 transition-all duration-300 group-hover:from-primary group-hover:to-primary/80 group-hover:text-primary-foreground group-hover:shadow-lg group-hover:shadow-primary/30">
                  <s.icon className="h-6 w-6" />
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:translate-x-1.5 group-hover:text-primary" />
              </div>
              <h3 className="relative mt-5 text-lg font-bold tracking-tight text-card-foreground">{s.title}</h3>
              <p className="relative mt-1 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              <div className="relative mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground ring-1 ring-accent/20 transition-all group-hover:ring-accent/50 group-hover:shadow-[0_0_12px_color-mix(in_oklab,var(--accent)_30%,transparent)]">
                <Sparkles className="h-3 w-3 text-accent" />
                {s.outcome}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────
//  Why us
// ────────────────────────────────────────────────────────────

function WhyUs() {
  const { t } = useI18n();
  const items: { icon: LucideIcon; title: string; desc: string }[] = [
    { icon: Globe, title: t("home.why.intl.title"), desc: t("home.why.intl.desc") },
    { icon: Clock, title: t("home.why.access.title"), desc: t("home.why.access.desc") },
    { icon: Languages, title: t("home.why.multi.title"), desc: t("home.why.multi.desc") },
    {
      icon: ShieldCheck,
      title: "Secure & confidential",
      desc: "Encrypted document storage and strict access controls on every file.",
    },
    {
      icon: Award,
      title: "Licensed professionals",
      desc: "Real accountants, certified translators, and immigration specialists.",
    },
    {
      icon: HeartHandshake,
      title: "We answer back",
      desc: "Replies within hours, not days. A human picks up the phone.",
    },
  ];

  return (
    <section className="border-b border-border bg-secondary/40 py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHeader
          eyebrow="Why San Brothers"
          title={t("home.whyHeading")}
          subtitle="We combine international standards with deep local knowledge — and we treat every client like our only client."
          align="center"
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((w, i) => (
            <div
              key={w.title}
              className={`home-fade-up home-delay-${(i % 4) + 1} group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-accent/30`}
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent/10 text-accent">
                <w.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-bold text-card-foreground">{w.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{w.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────
//  Process
// ────────────────────────────────────────────────────────────

function Process() {
  const { t } = useI18n();
  const steps: { icon: LucideIcon; title: string; desc: string }[] = [
    { icon: UserPlus, title: t("home.steps.register.title"), desc: t("home.steps.register.desc") },
    { icon: LayoutGrid, title: t("home.steps.choose.title"), desc: t("home.steps.choose.desc") },
    { icon: Upload, title: t("home.steps.upload.title"), desc: t("home.steps.upload.desc") },
    {
      icon: CheckCircle,
      title: t("home.steps.track.title"),
      desc: t("home.steps.track.desc"),
    },
  ];

  const containerRef = useRef<HTMLOListElement | null>(null);
  const [lit, setLit] = useState<boolean[]>(() => steps.map(() => false));

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>("[data-step]"));
    const io = new IntersectionObserver(
      (entries) => {
        setLit((prev) => {
          const next = [...prev];
          entries.forEach((e) => {
            const idx = Number((e.target as HTMLElement).dataset.step);
            if (e.isIntersecting) next[idx] = true;
          });
          return next;
        });
      },
      { threshold: 0.45 },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const progress = lit.filter(Boolean).length / Math.max(1, steps.length - 1);
  const trackPct = Math.min(1, progress);

  return (
    <section className="border-b border-border bg-background py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHeader
          eyebrow="The process"
          title={t("home.howHeading")}
          subtitle="From registration to results — we make it effortless."
          align="center"
        />

        <div className="relative mt-12">
          {/* Connecting track (desktop) */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-[3.25rem] hidden h-0.5 rounded-full bg-border lg:block"
          >
            <div
              className="process-track h-full rounded-full"
              style={{ ["--track" as string]: String(trackPct) }}
            />
          </div>

          <ol
            ref={containerRef}
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {steps.map((s, i) => (
              <li
                key={s.title}
                data-step={i}
                className={`process-step home-fade-up home-delay-${i + 1} relative rounded-2xl border border-border bg-card/80 p-6 backdrop-blur transition-all duration-500 ${
                  lit[i] ? "is-lit border-primary/30 shadow-lg shadow-primary/10" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="step-num grid h-10 w-10 place-items-center rounded-full bg-secondary text-sm font-bold text-muted-foreground">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <s.icon
                    className={`h-5 w-5 transition-colors duration-500 ${lit[i] ? "text-accent" : "text-muted-foreground"}`}
                  />
                </div>
                <h3 className="mt-4 font-bold tracking-tight text-card-foreground">{s.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────
//  Social proof (real-data ready, hides gracefully when empty)
// ────────────────────────────────────────────────────────────

// Replace with real client logos & testimonials when ready.
const REAL_LOGOS: { name: string; src?: string }[] = [];
const REAL_TESTIMONIALS: { quote: string; name: string; role?: string; loc?: string }[] = [];

function SocialProof() {
  const { t } = useI18n();
  const hasLogos = REAL_LOGOS.length > 0;
  const hasTestimonials = REAL_TESTIMONIALS.length > 0;

  return (
    <section className="border-b border-border bg-secondary/40 py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHeader
          eyebrow="Trusted by clients"
          title={t("home.testimonialsHeading")}
          subtitle="Clients across Rwanda and beyond rely on us for honest advice and reliable delivery."
          align="center"
        />

        {hasLogos ? (
          <div className="mt-10 grid grid-cols-2 items-center gap-6 sm:grid-cols-3 md:grid-cols-5">
            {REAL_LOGOS.map((l) => (
              <div
                key={l.name}
                className="grid h-16 place-items-center rounded-xl border border-border bg-card text-sm font-semibold text-muted-foreground"
              >
                {l.src ? (
                  <img src={l.src} alt={l.name} loading="lazy" className="max-h-10 opacity-80" />
                ) : (
                  l.name
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-10 text-center text-sm text-muted-foreground">
            Trusted by Rwandan and international clients across visa, accounting, translation and
            consultancy.
          </div>
        )}

        {hasTestimonials && (
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {REAL_TESTIMONIALS.map((q) => (
              <figure
                key={q.name}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6"
              >
                <blockquote className="text-sm leading-relaxed text-card-foreground">
                  “{q.quote}”
                </blockquote>
                <figcaption className="flex items-center gap-3 border-t border-border pt-4">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {q.name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="text-xs">
                    <div className="font-semibold text-card-foreground">{q.name}</div>
                    {(q.role || q.loc) && (
                      <div className="text-muted-foreground">
                        {[q.role, q.loc].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────
//  CTA
// ────────────────────────────────────────────────────────────

function CtaSection() {
  const { t } = useI18n();
  return (
    <section className="relative overflow-hidden bg-primary py-20 text-primary-foreground md:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, color-mix(in oklab, var(--accent) 30%, transparent), transparent 50%), radial-gradient(circle at 80% 70%, color-mix(in oklab, var(--primary-foreground) 15%, transparent), transparent 55%)",
        }}
      />
      <div className="relative mx-auto max-w-3xl px-4 text-center md:px-6">
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">
          {t("home.ctaHeading")}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base opacity-90 sm:text-lg">
          {t("home.ctaSubtitle")}
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" variant="secondary" className="h-12 gap-2 px-7 text-base">
            <Link to="/signup" search={undefined}>
              Create free account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 gap-2 border-primary-foreground/30 bg-transparent px-7 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <Link to="/contact">
              <Phone className="h-4 w-4" />
              Talk to us
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────
//  Sticky mobile contact
// ────────────────────────────────────────────────────────────

function StickyContact() {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 flex justify-end px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:hidden"
      aria-hidden="false"
    >
      <Link
        to="/contact"
        className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/30 transition-transform active:scale-95"
      >
        <MessageCircle className="h-4 w-4" />
        Chat with us
      </Link>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
//  Shared section header
// ────────────────────────────────────────────────────────────

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
}) {
  return (
    <div
      className={`home-fade-up max-w-2xl ${align === "center" ? "mx-auto text-center" : "text-left"}`}
    >
      <span className="inline-block rounded-full border border-border bg-card px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent">
        {eyebrow}
      </span>
      <h2 className="mt-4 text-balance text-3xl font-black tracking-tight text-foreground sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {subtitle && <p className="mt-4 text-base text-muted-foreground sm:text-lg">{subtitle}</p>}
    </div>
  );
}
