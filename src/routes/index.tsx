import { createFileRoute } from "@tanstack/react-router";
import {
  Plane,
  Calculator,
  Briefcase,
  Languages,
  ShieldCheck,
  Clock,
  Globe,
  UserPlus,
  List,
  Upload,
  CheckCircle,
  Star,
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
      {
        name: "description",
        content:
          "Accounting, visas, translation, and business support for clients in Rwanda and worldwide.",
      },
      { property: "og:title", content: "San Brothers — Global Professional Services" },
      { property: "og:description", content: "Accounting, visas, translation, business support." },
    ],
  }),
  component: Home,
});
function Home() {
  const { t, tRaw } = useI18n();

  const services = [
    {
      icon: Plane,
      title: t("services.visa"),
      desc: t("home.serviceDesc.visa"),
      href: "/services/visa",
    },
    {
      icon: Calculator,
      title: t("services.accounting"),
      desc: t("home.serviceDesc.accounting"),
      href: "/services/accounting",
    },
    {
      icon: Briefcase,
      title: t("services.consultancy"),
      desc: t("home.serviceDesc.consultancy"),
      href: "/services/consultancy",
    },
    {
      icon: Languages,
      title: t("services.translation"),
      desc: t("home.serviceDesc.translation"),
      href: "/services/translation",
    },
  ];

  const why = [
    { icon: ShieldCheck, title: t("home.why.intl.title"), desc: t("home.why.intl.desc") },
    { icon: Clock, title: t("home.why.access.title"), desc: t("home.why.access.desc") },
    { icon: Globe, title: t("home.why.multi.title"), desc: t("home.why.multi.desc") },
  ];

  const steps = [
    { icon: UserPlus, title: t("home.steps.register.title"), desc: t("home.steps.register.desc") },
    { icon: List, title: t("home.steps.choose.title"), desc: t("home.steps.choose.desc") },
    { icon: Upload, title: t("home.steps.upload.title"), desc: t("home.steps.upload.desc") },
    { icon: CheckCircle, title: t("home.steps.track.title"), desc: t("home.steps.track.desc") },
  ];

  const testimonials =
    tRaw<{ quote: string; name: string; loc: string }[]>("home.testimonials") ?? [];
  const stepLabel = t("home.stepLabel");

  return (
    <PublicLayout>
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
              <iframe
                src="/sbc3d.html"
                className="relative h-full w-full"
                style={{ border: "none", background: "transparent" }}
                title="SBC Logo 3D"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          {t("home.servicesHeading")}
        </h2>
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

      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">{t("home.howHeading")}</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="relative rounded-xl border border-border bg-card p-6">
              <div className="text-xs font-semibold text-muted-foreground">
                {stepLabel} {i + 1}
              </div>
              <div className="mt-3 grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center md:px-6">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            {t("home.partnerHeading")}
          </h2>
          <p className="mt-4 text-muted-foreground">{t("home.partnerText")}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
          {t("home.testimonialsHeading")}
        </h2>
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

      <CtaBanner
        title={t("home.ctaHeading")}
        subtitle={t("home.ctaSubtitle")}
        label={t("common.getStarted")}
      />
    </PublicLayout>
  );
}
