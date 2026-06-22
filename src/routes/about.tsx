import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Clock,
  Globe2,
  Languages,
  LockKeyhole,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  Smartphone,
  Zap,
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

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About San Brothers — Kigali, Rwanda" },
      {
        name: "description",
        content:
          "Meet the Kigali team simplifying visas, accounting, translation, and business services.",
      },
    ],
  }),
  component: About,
});

const TIMELINE = [
  ["2020", "Founded in Kigali"],
  ["2021", "Launched digital platform"],
  ["2022", "Expanded to serve 10+ countries"],
  ["2023", "Added Live Interpreter service"],
  ["2024", "500+ clients served"],
  ["2025", "15+ countries reached"],
];

function About() {
  const { t } = useI18n();
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
  }, []);
  const values = [
    {
      icon: ShieldCheck,
      title: t("about.values.professional.title"),
      desc: t("about.values.professional.desc"),
      proof: "Every case reviewed by a certified expert",
      color: "border-t-visa text-visa bg-visa/10",
    },
    {
      icon: Clock,
      title: t("about.values.reliable.title"),
      desc: t("about.values.reliable.desc"),
      proof: "98% of cases delivered on or before deadline",
      color: "border-t-accounting text-accounting bg-accounting/10",
    },
    {
      icon: Zap,
      title: t("about.values.efficient.title"),
      desc: t("about.values.efficient.desc"),
      proof: "Full digital — no office visit required",
      color: "border-t-consultancy text-consultancy bg-consultancy/10",
    },
  ];
  return (
    <PublicLayout>
      <section className="overflow-hidden border-b border-border bg-linear-to-br from-primary/10 via-background to-visa/10 relative">
        <ParallaxLayer
          speed={-0.25}
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 h-112 w-[28rem]"
        >
          <div className="h-full w-full rounded-full bg-primary/15 blur-3xl" />
        </ParallaxLayer>
        <ParallaxLayer
          speed={0.15}
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-32 h-[28rem] w-[28rem]"
        >
          <div className="h-full w-full rounded-full bg-visa/15 blur-3xl" />
        </ParallaxLayer>
        <div className="relative mx-auto grid min-h-[670px] max-w-7xl items-center gap-14 px-4 py-20 md:px-6 lg:grid-cols-[1.15fr_.85fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-primary">
              Est. in Kigali, Rwanda
            </p>
            <h1 className="mt-5 max-w-3xl text-balance text-5xl font-black leading-[1.03] md:text-6xl">
              Professionals Who Handle the Hard Parts
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              San Brothers is a Rwandan professional services firm built for individuals, SMEs, and
              international clients who need expert help navigating visas, accounting, translation,
              and business setup — all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-x-10 gap-y-3">
              {[
                { value: 500, suffix: "+", label: "Clients" },
                { value: 17, suffix: "", label: "Services" },
                { value: 5, suffix: "", label: "Languages" },
              ].map((s) => (
                <div key={s.label}>
                  <AnimatedCounter
                    to={s.value}
                    suffix={s.suffix}
                    className="block text-3xl font-black text-primary"
                  />
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
            <Magnetic strength={18} className="mt-8 inline-block">
              <Button size="lg" asChild>
                <Link to="/signup" search={{ intent: "service" } as never}>
                  Work With Us <ArrowRight />
                </Link>
              </Button>
            </Magnetic>
          </div>
          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -inset-10 rounded-full bg-primary/10 blur-3xl" />
            <Card className="relative overflow-hidden border-border/70 shadow-xl">
              <div className="grid h-3 grid-cols-4">
                <span className="bg-visa" />
                <span className="bg-accounting" />
                <span className="bg-translation" />
                <span className="bg-consultancy" />
              </div>
              <CardContent className="p-8 md:p-10">
                <div className="flex items-center gap-2 text-sm font-medium text-success">
                  <span className="public-pulse h-2.5 w-2.5 rounded-full bg-success" /> Kigali
                  office open
                </div>
                <MapPin className="mt-14 h-10 w-10 text-primary" />
                <h2 className="mt-5 text-3xl font-bold">Florida House</h2>
                <p className="mt-3 text-muted-foreground">
                  2nd Floor · KN 70 Street
                  <br />
                  Kigali, Rwanda 🇷🇼
                </p>
                <div className="mt-12 grid grid-cols-4 gap-3">
                  {["bg-visa", "bg-accounting", "bg-translation", "bg-consultancy"].map(
                    (color, index) => (
                      <span
                        key={color}
                        className={`${color} rounded-full`}
                        style={{ height: `${36 + index * 22}px` }}
                      />
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
          <blockquote className="text-balance text-4xl font-black leading-tight text-muted-foreground/35 md:text-6xl">
            Built in Kigali.
            <br />
            Built for the World.
          </blockquote>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              {t("about.storyHeading")}
            </p>
            <div className="mt-5 space-y-5 text-lg leading-8 text-muted-foreground">
              <p>{t("about.story.p1")}</p>
              <p>{t("about.story.p2")}</p>
            </div>
          </div>
        </div>
        <div className="mt-16 grid border-l border-border md:grid-cols-6 md:border-l-0 md:border-t">
          {TIMELINE.map(([year, event]) => (
            <div key={year} className="relative px-6 py-4 md:px-3 md:pt-8">
              <span className="absolute -left-1.5 top-6 h-3 w-3 rounded-full bg-primary md:-top-1.5 md:left-3" />
              <strong className="block text-primary">{year}</strong>
              <span className="mt-1 block text-sm text-muted-foreground">{event}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-muted/45 py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">
              Our principles
            </p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">What We Stand For</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {values.map((value, index) => (
              <TiltCard
                key={value.title}
                max={6}
                className="scroll-reveal"
                style={{ transitionDelay: `${index * 90}ms` }}
              >
                <Card className={`h-full border-t-[3px] ${value.color.split(" ")[0]}`}>
                  <CardContent className="p-7">
                    <div
                      className={`grid h-14 w-14 place-items-center rounded-2xl ${value.color.split(" ").slice(1).join(" ")}`}
                    >
                      <value.icon className="h-7 w-7" />
                    </div>
                    <h3 className="mt-6 text-xl font-bold">{value.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{value.desc}</p>
                    <p className="mt-6 border-t border-border pt-5 text-sm font-semibold">
                      {value.proof}
                    </p>
                  </CardContent>
                </Card>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="grid gap-5 md:grid-cols-2">
          {[
            [
              Globe2,
              "Multilingual Team",
              "We work in English, Chinese, Kinyarwanda, French, and Arabic so you never lose something in translation",
            ],
            [
              Smartphone,
              "Fully Digital",
              "Submit documents, track progress, and message your handler — all from your phone or laptop",
            ],
            [
              Zap,
              "Fast Turnaround",
              "Most services completed in 3–5 business days with real-time status updates",
            ],
            [
              LockKeyhole,
              "Secure & Compliant",
              "Your documents are stored securely and processed in accordance with Rwandan law",
            ],
          ].map(([Icon, title, desc], index) => (
            <TiltCard
              key={String(title)}
              max={4}
              className="scroll-reveal"
              style={{ transitionDelay: `${index * 70}ms` }}
            >
              <div className="flex h-full gap-5 rounded-2xl border border-border bg-card p-6">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{String(title)}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{String(desc)}</p>
                </div>
              </div>
            </TiltCard>
          ))}
        </div>
      </section>
      <section className="bg-muted/45 py-20">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:px-6 lg:grid-cols-2">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="p-7">
                <div className="flex items-center gap-3">
                  <MapPin className="text-primary" />
                  <h2 className="text-2xl font-bold">{t("about.officeHeading")}</h2>
                </div>
                <p className="mt-4 text-muted-foreground">
                  Florida House, 2nd Floor, KN 70 Street, Kigali, Rwanda
                </p>
                <p className="mt-2 text-sm font-medium">Mon–Fri, 8:00–18:00 CAT</p>
              </div>
              <iframe
                src="https://maps.google.com/maps?q=KN+70+Street+Kigali+Rwanda&output=embed"
                width="100%"
                height="300"
                className="border-0"
                allowFullScreen
                loading="lazy"
                title="San Brothers Office Location"
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex h-full flex-col p-7">
              <h2 className="text-2xl font-bold">{t("about.contactHeading")}</h2>
              <div className="mt-7 space-y-5 text-sm">
                {[
                  [Phone, "Rwanda: +250 788 687 288"],
                  [Phone, "Rwanda: +250 788 453 192"],
                  [Phone, "China: +86 155 7739 0044"],
                  [Mail, "sanbrothersgroup@gmail.com"],
                  [Clock, "Mon–Fri 8:00–18:00 CAT"],
                ].map(([Icon, text]) => (
                  <div key={String(text)} className="flex items-center gap-3">
                    <Icon className="h-5 w-5 shrink-0 text-primary" />
                    <span>{String(text)}</span>
                  </div>
                ))}
              </div>
              <Button className="mt-auto self-start" asChild>
                <Link to="/contact">
                  <MessageSquare /> Send a Message
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-4 py-20 md:px-6">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Partnership</p>
          <h2 className="mt-3 text-3xl font-bold">Our Strategic Partner</h2>
        </div>
        <Card className="mt-8">
          <CardContent className="grid items-center gap-7 p-7 md:grid-cols-[auto_1fr_auto]">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-muted text-2xl font-black">
              BB
            </div>
            <div>
              <h3 className="text-xl font-bold">Best of the Best Company Ltd</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Our strategic partner for product shipping & logistics, China sourcing, and
                scholarship applications connecting Rwanda with China.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {["China Sourcing", "Logistics", "Scholarships"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-2xl">🇷🇼 ↔ 🇨🇳</div>
          </CardContent>
        </Card>
      </section>
      <CtaBanner
        title="Ready to work with a team that delivers?"
        subtitle="Create your free account and get expert support."
        label="Get Started Free"
      />
    </PublicLayout>
  );
}
