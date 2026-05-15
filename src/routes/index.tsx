import { createFileRoute } from "@tanstack/react-router";
import {
  Plane, Calculator, Briefcase, Languages,
  ShieldCheck, Clock, Globe,
  UserPlus, List, Upload, CheckCircle, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicLayout } from "@/components/layout/public-layout";
import { CtaBanner } from "@/components/marketing/page-sections";
import { useI18n } from "@/lib/providers/i18n-provider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "San Brothers — Trusted Partner for Global Professional Services" },
      { name: "description", content: "Accounting, visas, translation, and business support for clients in Rwanda and worldwide." },
      { property: "og:title", content: "San Brothers — Global Professional Services" },
      { property: "og:description", content: "Accounting, visas, translation, business support." },
    ],
  }),
  component: Home,
});

function Home() {
  const { t } = useI18n();

  const services = [
    { icon: Plane, title: t("services.visa"), desc: "Tourist, business, student visas and work permits handled end to end.", href: "/services/visa" },
    { icon: Calculator, title: t("services.accounting"), desc: "Bookkeeping, tax filing, and financial reporting for SMEs and individuals.", href: "/services/accounting" },
    { icon: Briefcase, title: t("services.consultancy"), desc: "Company registration, advisory, and admin support for businesses.", href: "/services/consultancy" },
    { icon: Languages, title: t("services.translation"), desc: "Document translation and live interpreters in multiple languages.", href: "/services/translation" },
  ];

  const why = [
    { icon: ShieldCheck, title: "International Standards", desc: "Processes built around best-practice compliance, security, and confidentiality." },
    { icon: Clock, title: "24/7 Online Access", desc: "Submit requests, upload documents, and track progress at any hour." },
    { icon: Globe, title: "Multilingual Support", desc: "We work in English, 中文, Kinyarwanda, French, and Arabic." },
  ];

  const steps = [
    { icon: UserPlus, title: "Register", desc: "Create a secure account." },
    { icon: List, title: "Choose service", desc: "Pick the help you need." },
    { icon: Upload, title: "Upload documents", desc: "Securely share your files." },
    { icon: CheckCircle, title: "Track to completion", desc: "Follow each step in real time." },
  ];

  const testimonials = [
    { quote: "San Brothers handled my student visa to China end to end. I never had to chase them for an update.", name: "Aline M.", loc: "Kigali" },
    { quote: "Their accounting team filed our taxes faster than our previous firm. Worth every franc.", name: "Jean Paul K.", loc: "Kigali" },
    { quote: "Got a Chinese-to-Kinyarwanda translator within minutes. The platform is a lifesaver for tourists.", name: "Wang Wei", loc: "Beijing" },
  ];

  return (
    <PublicLayout>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/10 via-background to-accent/5 dark:from-primary/30 dark:via-background dark:to-primary/10">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 md:grid-cols-2 md:items-center md:px-6 md:py-28">
          <div>
            <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              {t("home.heroTitle")}
            </h1>
            <p className="mt-5 max-w-xl text-balance text-lg font-light text-muted-foreground">
              {t("home.heroSubtitle")}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <a href="/services">{t("common.exploreServices")}</a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/contact">{t("common.contactUs")}</a>
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">{t("home.trustStrip")}</p>
          </div>
          <div className="relative hidden md:block">
            <div className="relative mx-auto aspect-square w-full max-w-md">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/30 to-accent/20 blur-3xl" />
              <svg viewBox="0 0 400 400" className="relative h-full w-full">
                <circle cx="200" cy="200" r="140" className="fill-primary/10 stroke-primary/40" strokeWidth="2" />
                <circle cx="200" cy="200" r="90" className="fill-none stroke-primary/30" strokeWidth="2" strokeDasharray="4 6" />
                <rect x="120" y="160" width="100" height="120" rx="8" className="fill-card stroke-border" strokeWidth="2" />
                <line x1="135" y1="185" x2="205" y2="185" className="stroke-muted-foreground" strokeWidth="3" />
                <line x1="135" y1="205" x2="195" y2="205" className="stroke-muted-foreground" strokeWidth="3" />
                <line x1="135" y1="225" x2="180" y2="225" className="stroke-muted-foreground" strokeWidth="3" />
                <circle cx="270" cy="140" r="34" className="fill-accent/80" />
                <path d="M255 135 Q270 125 285 135 L285 145 L275 145 L270 152 L265 145 L255 145 Z" className="fill-accent-foreground" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("home.servicesHeading")}</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {services.map((s) => (
            <Card key={s.title} className="group transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
                <a href={s.href} className="text-sm font-medium text-primary hover:underline">
                  {t("common.learnMore")} →
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* WHY */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 md:px-6">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("home.whyHeading")}</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {why.map((w) => (
              <div key={w.title} className="flex flex-col gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-accent/10 text-accent">
                  <w.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{w.title}</h3>
                <p className="text-sm text-muted-foreground">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("home.howHeading")}</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="relative rounded-xl border border-border bg-card p-6">
              <div className="text-xs font-semibold text-muted-foreground">STEP {i + 1}</div>
              <div className="mt-3 grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* PARTNER */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center md:px-6">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{t("home.partnerHeading")}</h2>
          <p className="mt-4 text-muted-foreground">
            San Brothers partners with Best of the Best Company Ltd for product shipping & logistics,
            China sourcing, and scholarship applications.
          </p>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("home.testimonialsHeading")}</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {testimonials.map((tt) => (
            <Card key={tt.name}>
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 font-semibold text-primary">
                    {tt.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{tt.name}</div>
                    <div className="text-xs text-muted-foreground">{tt.loc}</div>
                  </div>
                </div>
                <div className="flex gap-0.5 text-accent">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">"{tt.quote}"</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <CtaBanner title={t("home.ctaHeading")} subtitle={t("home.ctaSubtitle")} label={t("common.getStarted")} />
    </PublicLayout>
  );
}
