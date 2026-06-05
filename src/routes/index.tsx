import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDown,
  Award,
  Briefcase,
  Calculator,
  Check,
  CheckCircle,
  Clock,
  Globe,
  LayoutGrid,
  List,
  Lock,
  Plane,
  ShieldCheck,
  Star,
  Truck,
  Upload,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicLayout } from "@/components/layout/public-layout";
import { LandingCtaBanner } from "@/components/marketing/page-sections";
import { useI18n } from "@/lib/providers/i18n-provider";
import { useEffect } from "react";

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

const heroStats = [
  { value: 1000, suffix: "+", label: "Clients" },
  { value: 15, suffix: "+", label: "Languages" },
  { value: 4, suffix: "+", label: "Service Areas" },
  { value: 98, suffix: "%", label: "Success" },
];

const serviceCards = [
  {
    color: "from-blue-500 to-sky-500",
    icon: Plane,
    title: "Visa & Permits",
    desc: "Fast visa approvals and permit support for individuals and businesses.",
    bullets: ["Tourist & business visas", "Work permits", "Student visa guidance"],
    href: "/services/visa",
  },
  {
    color: "from-emerald-500 to-green-500",
    icon: Calculator,
    title: "Accounting",
    desc: "Accurate bookkeeping, tax filing, and financial reporting built for growth.",
    bullets: ["Tax filing", "Payroll support", "Financial statements"],
    href: "/services/accounting",
  },
  {
    color: "from-violet-500 to-fuchsia-500",
    icon: Globe,
    title: "Translation",
    desc: "Certified translators available across languages and document types.",
    bullets: ["Legal document translation", "Tourist support", "Fast delivery"],
    href: "/services/translation",
  },
  {
    color: "from-amber-400 to-orange-500",
    icon: Briefcase,
    title: "Consultancy",
    desc: "Business strategy, registration, and market entry support in Rwanda.",
    bullets: ["Company setup", "Market research", "Compliance advice"],
    href: "/services/consultancy",
  },
];

const whyItems = [
  {
    icon: ShieldCheck,
    title: "International Standards",
    desc: "Processes built around best-practice compliance.",
    accent: "bg-sky-500/10 text-sky-300",
  },
  {
    icon: Clock,
    title: "24/7 Online Access",
    desc: "Submit requests and track progress any time.",
    accent: "bg-emerald-500/10 text-emerald-300",
  },
  {
    icon: Globe,
    title: "Multilingual Support",
    desc: "English, Chinese, Kinyarwanda, French, Arabic.",
    accent: "bg-violet-500/10 text-violet-300",
  },
  {
    icon: Lock,
    title: "Secure & Confidential",
    desc: "Bank-level security for all your documents.",
    accent: "bg-amber-500/10 text-amber-300",
  },
];

const processSteps = [
  {
    icon: UserPlus,
    title: "Register",
    desc: "Create your free account in under 2 minutes.",
  },
  {
    icon: LayoutGrid,
    title: "Choose Service",
    desc: "Browse and select the service you need.",
  },
  {
    icon: Upload,
    title: "Upload Documents",
    desc: "Securely share your files with our team.",
  },
  {
    icon: CheckCircle,
    title: "Track to Completion",
    desc: "Monitor progress in real time.",
  },
];

const carouselTestimonials = [
  {
    name: "Aline M.",
    location: "Kigali",
    quote:
      "San Brothers handled my student visa to China end to end. I never had to chase them for an update.",
  },
  {
    name: "Jean Paul K.",
    location: "Kigali",
    quote:
      "Their accounting team filed our taxes faster than our previous firm. Worth every franc.",
  },
  {
    name: "Wang Wei",
    location: "Beijing",
    quote:
      "Got a Chinese-to-Kinyarwanda translator within minutes. The platform is a lifesaver for tourists.",
  },
  {
    name: "Marie C.",
    location: "Paris",
    quote: "Company registration done in 2 weeks. Professional and transparent throughout.",
  },
  {
    name: "David O.",
    location: "Lagos",
    quote: "Best business consultancy in Kigali. They know Rwanda's market inside out.",
  },
  {
    name: "Li Fang",
    location: "Shanghai",
    quote: "Translation service is incredibly fast. Certified documents ready in 24 hours.",
  },
];

const partnershipServices = [
  {
    icon: Truck,
    title: "Product Shipping & Logistics",
  },
  {
    icon: Globe,
    title: "China Sourcing",
  },
  {
    icon: Award,
    title: "Scholarships",
  },
];

function Home() {
  const { t, tRaw } = useI18n();

  useEffect(() => {
    const visibleTargets = new Set<HTMLElement>([
      ...Array.from(document.querySelectorAll<HTMLElement>(".animate-fade-up")),
      ...Array.from(document.querySelectorAll<HTMLElement>(".count-up")),
    ]);
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add("visible");

          if (entry.target.classList.contains("count-up")) {
            const element = entry.target as HTMLElement;
            if (element.dataset.countStarted) {
              return;
            }
            element.dataset.countStarted = "true";
            const target = Number(element.dataset.count ?? "0");
            const suffix = element.dataset.suffix ?? "";
            const start = performance.now();
            const duration = 1200;

            const step = (time: number) => {
              const progress = Math.min(1, (time - start) / duration);
              const value = Math.floor(progress * target);
              element.textContent = `${value.toLocaleString()}${suffix}`;
              if (progress < 1) {
                requestAnimationFrame(step);
              } else {
                element.textContent = `${target.toLocaleString()}${suffix}`;
              }
            };

            requestAnimationFrame(step);
          }
        });
      },
      { threshold: 0.25 },
    );

    visibleTargets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

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
      icon: Globe,
      title: t("services.translation"),
      desc: t("home.serviceDesc.translation"),
      href: "/services/translation",
    },
  ];

  const testimonials =
    tRaw<{ quote: string; name: string; loc: string }[]>("home.testimonials") ?? [];

  return (
    <PublicLayout>
      <section className="relative overflow-hidden bg-[#0A0F1C] text-white">
        <div className="absolute inset-0 landing-hero" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_24%)] opacity-60"
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-[linear-gradient(0deg,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[length:32px_32px] opacity-30 pointer-events-none"
          aria-hidden="true"
        />

        <span className="hero-orb hero-orb-1" aria-hidden="true" />
        <span className="hero-orb hero-orb-2" aria-hidden="true" />
        <span className="hero-orb hero-orb-3" aria-hidden="true" />
        <span className="hero-orb hero-orb-4" aria-hidden="true" />

        <div className="relative mx-auto grid min-h-screen max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:py-28">
          <div className="relative z-10">
            <span className="inline-flex items-center rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-100 shadow-[0_0_30px_rgba(56,189,248,0.12)] animate-fade-up">
              🌍 Trusted in 15+ Countries
            </span>
            <div className="mt-10 space-y-4">
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                <span className="block animate-fade-up delay-100">Your Trusted Partner for</span>
                <span className="block animate-fade-up delay-200">Global Professional</span>
                <span className="block animate-fade-up delay-300 text-sky-300">Services</span>
              </h1>
              <p className="max-w-2xl text-base text-slate-300 sm:text-lg animate-fade-up delay-400">
                Accounting · Visa & Permits · Translation · Consultancy
                <span className="block text-slate-400">Built for Rwanda and the world.</span>
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,0.2)]"
                >
                  <span
                    className="count-up text-3xl font-bold leading-none text-white animate-fade-up"
                    data-count={stat.value}
                    data-suffix={stat.suffix}
                  >
                    0{stat.suffix}
                  </span>
                  <p className="mt-2 text-sm uppercase tracking-[0.22em] text-slate-400">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <Button
                size="lg"
                className="bg-linear-to-r from-sky-500 to-violet-500 text-white shadow-[0_0_30px_rgba(59,130,246,0.25)] hover:shadow-[0_0_40px_rgba(59,130,246,0.35)]"
              >
                <a href="/signup" className="inline-flex items-center gap-2">
                  Get Started Free <ArrowDown className="h-4 w-4 rotate-180" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/contact">Talk to Us</a>
              </Button>
            </div>

            <p className="mt-6 text-sm text-slate-300 animate-fade-up delay-500">
              ✓ Free consultation &nbsp; ✓ No hidden fees &nbsp; ✓ 24/7 online access
            </p>
          </div>

          <div className="relative z-10 flex items-center justify-center">
            <div className="relative mx-auto w-full max-w-md">
              <div className="floating-card floating-card-1">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-2xl">🛂</span>
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                </div>
                <p className="mt-4 font-semibold">Visa Approved</p>
              </div>
              <div className="floating-card floating-card-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-2xl">📊</span>
                  <Check className="h-5 w-5 text-sky-300" />
                </div>
                <p className="mt-4 font-semibold">Tax Filed</p>
              </div>
              <div className="floating-card floating-card-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-2xl">🌐</span>
                  <Check className="h-5 w-5 text-slate-100" />
                </div>
                <p className="mt-4 font-semibold">Translated in 3min</p>
              </div>
              <div className="floating-card floating-card-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-2xl">🏢</span>
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                </div>
                <p className="mt-4 font-semibold">Company Registered</p>
              </div>
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-8 flex justify-center text-slate-300 sm:bottom-6">
            <div className="flex flex-col items-center gap-2 text-sm opacity-90">
              <span className="animate-fade-up">Scroll to explore</span>
              <ArrowDown className="h-6 w-6 animate-bounce" aria-hidden="true" />
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#0F2347] px-4 py-12 sm:px-6 md:py-16">
        <div
          className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.24),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.16),transparent_25%)]"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-7xl">
          <div className="grid gap-6 border border-white/10 bg-white/5 p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.18)] backdrop-blur-xl sm:grid-cols-4">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="border-b border-white/10 pb-4 last:border-b-0 last:pb-0 sm:border-b-0 sm:border-l sm:pb-0 sm:pl-6"
              >
                <p
                  className="text-4xl font-semibold text-white count-up"
                  data-count={stat.value}
                  data-suffix={stat.suffix}
                >
                  0{stat.suffix}
                </p>
                <p className="mt-2 text-sm uppercase tracking-[0.2em] text-slate-300">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <span className="text-sm uppercase tracking-[0.36em] text-sky-400">WHAT WE DO</span>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
              Services Built for Your Success
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
              From visas to accounting, we handle the complexity.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {serviceCards.map((service, index) => {
              const Icon = service.icon;
              return (
                <div
                  key={service.title}
                  className="animate-fade-up rounded-3xl border border-slate-200/70 bg-white/90 p-8 shadow-[0_30px_60px_rgba(15,23,42,0.08)] transition-transform duration-300 hover:-translate-y-2 hover:border-transparent hover:shadow-[0_30px_80px_rgba(59,130,246,0.15)] dark:border-white/10 dark:bg-slate-950/70"
                  style={{ transitionDelay: `${index * 75}ms` }}
                >
                  <div
                    className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br ${service.color} text-white shadow-lg`}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-slate-900 dark:text-white">
                    {service.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {service.desc}
                  </p>
                  <ul className="mt-5 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    {service.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2">
                        <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          ✓
                        </span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={service.href}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-sky-600 transition hover:text-sky-500"
                  >
                    Learn more →
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/80 bg-slate-50 py-20 dark:bg-slate-950 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="grid gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-[0.36em] text-sky-500">WHY SAN BROTHERS</p>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                Why thousands trust San Brothers
              </h2>
              <p className="max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                San Brothers combines local Rwanda expertise with global standards so you can move
                faster, stay compliant, and keep every step transparent. From visas to translation,
                our platform makes professional services simple and secure.
              </p>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Florida House, 2nd Floor, KN 70 Street, Kigali
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {whyItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="animate-fade-up rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-950/70"
                    style={{ transitionDelay: `${index * 75}ms` }}
                  >
                    <div
                      className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${item.accent}`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-lg font-semibold text-slate-900 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {item.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="space-y-8 text-center">
          <p className="text-sm uppercase tracking-[0.36em] text-sky-500">THE PROCESS</p>
          <div>
            <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
              Get started in 4 simple steps
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-base text-slate-600 dark:text-slate-300">
              Every step is designed to keep your request moving quickly and transparently.
            </p>
          </div>
        </div>

        <div className="relative mt-16 overflow-hidden rounded-4xl border border-slate-200/70 bg-white/90 p-6 shadow-[0_40px_120px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-950/80">
          <div className="absolute inset-x-8 top-1/2 hidden h-px bg-slate-200/70 md:block dark:bg-slate-700" />
          <div className="grid gap-6 md:grid-cols-4">
            {processSteps.map((step, index) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={step.title}
                  className="relative animate-fade-up rounded-3xl border border-slate-200/70 bg-slate-50/80 p-8 text-left dark:border-white/10 dark:bg-slate-900/80"
                  style={{ transitionDelay: `${index * 80}ms` }}
                >
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-sky-500/10 text-sky-500">
                    <StepIcon className="h-6 w-6" />
                  </div>
                  <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#0f172a] px-4 py-20 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="space-y-4 text-center">
            <p className="text-sm uppercase tracking-[0.36em] text-sky-400">What Our Clients Say</p>
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Real stories from real clients
            </h2>
          </div>

          <div className="testimonial-slider relative mt-12 overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-5 backdrop-blur-2xl">
            <div className="testimonial-track flex gap-5">
              {[...carouselTestimonials, ...carouselTestimonials].map((testimonial, index) => (
                <div
                  key={`${testimonial.name}-${index}`}
                  className="testimonial-card min-w-[280px] flex-shrink-0 rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.18)]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-white">{testimonial.name}</p>
                      <p className="text-sm text-slate-400">{testimonial.location}</p>
                    </div>
                    <div className="flex gap-1 text-amber-300">
                      {Array.from({ length: 5 }).map((_, starIndex) => (
                        <Star key={starIndex} className="h-4 w-4" />
                      ))}
                    </div>
                  </div>
                  <p className="mt-6 text-sm leading-7 text-slate-300">"{testimonial.quote}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="rounded-[32px] border border-slate-200/70 bg-slate-50/90 p-8 shadow-[0_40px_90px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-slate-950/70">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.36em] text-sky-500">
                In Partnership With
              </p>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                Best of the Best Company Ltd
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                Product Shipping & Logistics · China Sourcing · Scholarships
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {partnershipServices.map((service) => {
                const Icon = service.icon;
                return (
                  <div
                    key={service.title}
                    className="group flex items-center gap-4 rounded-3xl border border-slate-200/70 bg-white/90 p-5 transition hover:-translate-y-1 hover:border-sky-400/30 dark:border-white/10 dark:bg-slate-900/80"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-500 group-hover:bg-sky-500/15">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {service.title}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <LandingCtaBanner
        title="Ready to get started?"
        subtitle="Create your free account in under 2 minutes."
        href="/signup"
        label="Get Started Free →"
      />
    </PublicLayout>
  );
}
