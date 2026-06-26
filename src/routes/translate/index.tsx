import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Phone,
  FileText,
  Languages,
  Zap,
  MessageCircle,
  Headphones,
  Scale,
  Globe,
  Users,
  Clock,
  Wallet,
  CalendarClock,
  Video,
  MapPin,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TranslateLayout } from "@/components/layout/translate-layout";
import { TranslateCta } from "@/components/marketing/translate-cta";
import { useI18n } from "@/lib/providers/i18n-provider";
import { resolveServiceIntentDestination } from "@/lib/navigation/service-intents";
import { DotGrid } from "@/components/fx/dot-grid";
import { Aurora } from "@/components/fx/aurora";
import { WordMask } from "@/components/fx/word-mask";
import { Magnetic } from "@/components/fx/magnetic";

export const Route = createFileRoute("/translate/")({
  head: () => ({
    meta: [
      { title: "We Speak Your Language — San Brothers Translation" },
      {
        name: "description",
        content:
          "Live human translators and certified document translation, 24/7. First 5 minutes free.",
      },
      { property: "og:title", content: "We Speak Your Language" },
      { property: "og:description", content: "Live translators available right now." },
    ],
    links: [{ rel: "canonical", href: "/translate" }],
  }),
  component: TranslateHome,
});
function TranslateHome() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const handleIntent = async (intent: string) => {
    const destination = await resolveServiceIntentDestination(intent);
    void navigate(destination as never);
  };

  const steps = [
    {
      icon: Languages,
      title: t("translate.home.steps.choose.title"),
      desc: t("translate.home.steps.choose.desc"),
    },
    {
      icon: Zap,
      title: t("translate.home.steps.match.title"),
      desc: t("translate.home.steps.match.desc"),
    },
    {
      icon: MessageCircle,
      title: t("translate.home.steps.talk.title"),
      desc: t("translate.home.steps.talk.desc"),
    },
  ];

  const offerings = [
    {
      icon: Headphones,
      title: t("translate.home.offerings.live.title"),
      desc: t("translate.home.offerings.live.desc"),
      href: "/translate/live",
    },
    {
      icon: FileText,
      title: t("translate.home.offerings.doc.title"),
      desc: t("translate.home.offerings.doc.desc"),
      href: "/translate/document",
    },
    {
      icon: Scale,
      title: t("translate.home.offerings.legal.title"),
      desc: t("translate.home.offerings.legal.desc"),
      href: "/translate/document",
    },
    {
      icon: Globe,
      title: t("translate.home.offerings.multi.title"),
      desc: t("translate.home.offerings.multi.desc"),
      href: "/translate/how-it-works",
    },
  ];

  const why = [
    {
      icon: Users,
      title: t("translate.home.why.human.title"),
      desc: t("translate.home.why.human.desc"),
    },
    {
      icon: Clock,
      title: t("translate.home.why.always.title"),
      desc: t("translate.home.why.always.desc"),
    },
    {
      icon: Wallet,
      title: t("translate.home.why.pay.title"),
      desc: t("translate.home.why.pay.desc"),
    },
  ];

  const scenarios = [
    {
      scenario: t("translate.home.scenarios.airport.scenario"),
      solution: t("translate.home.scenarios.airport.solution"),
    },
    {
      scenario: t("translate.home.scenarios.diploma.scenario"),
      solution: t("translate.home.scenarios.diploma.solution"),
    },
    {
      scenario: t("translate.home.scenarios.business.scenario"),
      solution: t("translate.home.scenarios.business.solution"),
    },
  ];

  return (
    <TranslateLayout>
      <section className="relative overflow-hidden border-b border-border bg-linear-to-b from-accent/10 via-background to-primary/5">
        <Aurora tone="accent" opacity={0.32} />
        <DotGrid
          className="text-foreground/55 dark:text-foreground/40"
          spacing={28}
          dotSize={1.3}
          radius={170}
          strength={16}
          repel
        />
        <div className="relative mx-auto max-w-4xl px-4 py-20 text-center md:px-6 md:py-28">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            {t("translate.home.eyebrow")}
          </div>
          <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            <WordMask text={t("translate.home.hero.title")} resetKey={t("translate.home.hero.title")} />
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground md:text-xl">
            {t("translate.home.hero.subtitle")}
          </p>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
            <Magnetic strength={18}>
              <Button
                size="lg"
                className="h-14 gap-2 px-8 text-base"
                onClick={() => void handleIntent("live-interpreter")}
              >
                <Phone className="h-5 w-5" />
                {t("translate.home.hero.primaryCta")}
              </Button>
            </Magnetic>
            <Magnetic strength={14}>
              <Button
                size="lg"
                variant="outline"
                className="h-14 gap-2 px-8 text-base"
                onClick={() => void handleIntent("document-translation")}
              >
                <FileText className="h-5 w-5" />
                {t("translate.home.hero.secondaryCta")}
              </Button>
            </Magnetic>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">{t("translate.home.hero.note")}</p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
            <span>🇬🇧 EN</span>
            <span className="text-border">·</span>
            <span>🇨🇳 中文</span>
            <span className="text-border">·</span>
            <span>🇷🇼 RW</span>
            <span className="text-border">·</span>
            <span>🇫🇷 FR</span>
            <span className="text-border">·</span>
            <span>🇸🇦 AR</span>
            <span className="text-border">·</span>
            <span className="text-muted-foreground">{t("translate.home.hero.morePlus")}</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
          {t("translate.home.howHeading")}
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <Card key={s.title} className="text-center">
              <CardContent className="flex flex-col items-center gap-4 p-8">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-accent/15 text-accent">
                  <s.icon className="h-8 w-8" />
                </div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t("translate.home.step")} {i + 1}
                </div>
                <h3 className="text-xl font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" /> Schedule a Session
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
            Plan ahead — book an interpreter
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Reserve a remote call or an on-site interpreter for your next appointment.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Card className="group transition hover:-translate-y-1 hover:shadow-md">
            <CardContent className="p-6">
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-300">
                <Video className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Book Remote Interpreter</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Schedule a video or audio call. Mon–Fri 08:00–18:00 CAT, pay per minute.
              </p>
              <Button asChild className="mt-5">
                <Link to="/translate/book" search={{ type: "remote" }}>
                  Book remote <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card className="group transition hover:-translate-y-1 hover:shadow-md">
            <CardContent className="p-6">
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-300">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">Book On-Site Interpreter</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Bank, hospital, immigration, court or business meetings — anywhere in Kigali.
              </p>
              <Button asChild variant="outline" className="mt-5">
                <Link to="/translate/book" search={{ type: "onsite" }}>
                  Book on-site <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-y border-border bg-muted/30">

        <div className="mx-auto max-w-7xl px-4 py-20 md:px-6">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            {t("translate.home.offeringsHeading")}
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {offerings.map((o) => (
              <Card key={o.title}>
                <CardContent className="flex gap-5 p-6">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
                    <o.icon className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{o.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{o.desc}</p>
                    <a
                      href={o.href}
                      className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
                    >
                      {t("common.learnMore")} →
                    </a>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          {why.map((w) => (
            <div key={w.title} className="flex flex-col items-center gap-3 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
                <w.icon className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold">{w.title}</h3>
              <p className="max-w-xs text-sm text-muted-foreground">{w.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 md:px-6">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            {t("translate.home.scenariosHeading")}
          </h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {scenarios.map((s, i) => (
              <Card key={i}>
                <CardContent className="flex flex-col gap-4 p-6">
                  <p className="text-base italic text-muted-foreground">"{s.scenario}"</p>
                  <p className="text-base font-semibold text-foreground">→ {s.solution}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <TranslateCta />
    </TranslateLayout>
  );
}
