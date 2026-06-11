import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback } from "react";
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
  Star,
  ChevronDown,
  Check,
  ArrowRight,
  Zap,
  Award,
  Users,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

function useIntersectionObserver() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1 },
    );
    document.querySelectorAll(".animate-fade-up").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          let current = 0;
          const increment = target / (duration / 16);
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(current));
            }
          }, 16);
          observer.unobserve(entries[0].target);
        }
      },
      { threshold: 0.5 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

function StatCounter({
  value,
  suffix = "+",
  label,
  sublabel,
}: {
  value: number;
  suffix?: string;
  label: string;
  sublabel?: string;
}) {
  const { count, ref } = useCountUp(value);
  return (
    <div ref={ref} className="text-center group">
      <div className="text-4xl font-black text-gray-900 dark:text-white md:text-5xl tracking-tight tabular-nums">
        {count}
        <span className="text-blue-600 dark:text-blue-400">{suffix}</span>
      </div>
      <div className="mt-1 text-sm font-semibold text-gray-900 dark:text-white/90 uppercase tracking-widest">
        {label}
      </div>
      {sublabel && (
        <div className="text-xs text-blue-600 dark:text-blue-200/70 mt-0.5">{sublabel}</div>
      )}
    </div>
  );
}

function Home() {
  const { t } = useI18n();
  useIntersectionObserver();

  const services = [
    {
      icon: Plane,
      title: t("services.visa"),
      desc: t("home.serviceDesc.visa"),
      href: "/services/visa",
      gradient: "from-blue-500 to-cyan-500",
      glow: "group-hover:shadow-blue-500/25",
      border: "group-hover:border-blue-500/40",
      accent: "text-blue-400",
      bg: "bg-blue-500/10",
      pill: "bg-blue-500/20 text-blue-300",
      tag: "Immigration",
    },
    {
      icon: Calculator,
      title: t("services.accounting"),
      desc: t("home.serviceDesc.accounting"),
      href: "/services/accounting",
      gradient: "from-emerald-500 to-teal-500",
      glow: "group-hover:shadow-emerald-500/25",
      border: "group-hover:border-emerald-500/40",
      accent: "text-emerald-400",
      bg: "bg-emerald-500/10",
      pill: "bg-emerald-500/20 text-emerald-300",
      tag: "Finance",
    },
    {
      icon: Languages,
      title: t("services.translation"),
      desc: t("home.serviceDesc.translation"),
      href: "/services/translation",
      gradient: "from-violet-500 to-purple-500",
      glow: "group-hover:shadow-violet-500/25",
      border: "group-hover:border-violet-500/40",
      accent: "text-violet-400",
      bg: "bg-violet-500/10",
      pill: "bg-violet-500/20 text-violet-300",
      tag: "Language",
    },
    {
      icon: Briefcase,
      title: t("services.consultancy"),
      desc: t("home.serviceDesc.consultancy"),
      href: "/services/consultancy",
      gradient: "from-amber-500 to-orange-500",
      glow: "group-hover:shadow-amber-500/25",
      border: "group-hover:border-amber-500/40",
      accent: "text-amber-400",
      bg: "bg-amber-500/10",
      pill: "bg-amber-500/20 text-amber-300",
      tag: "Business",
    },
  ];

  const why = [
    {
      icon: Globe,
      title: t("home.why.intl.title"),
      desc: t("home.why.intl.desc"),
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      icon: Clock,
      title: t("home.why.access.title"),
      desc: t("home.why.access.desc"),
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      icon: Languages,
      title: t("home.why.multi.title"),
      desc: t("home.why.multi.desc"),
      color: "text-violet-400",
      bg: "bg-violet-500/10",
    },
    {
      icon: ShieldCheck,
      title: "Secure & Confidential",
      desc: "Bank-level security for all your documents and data",
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      icon: Award,
      title: "Certified Experts",
      desc: "Licensed professionals with years of local and international experience",
      color: "text-rose-400",
      bg: "bg-rose-500/10",
    },
    {
      icon: TrendingUp,
      title: "Proven Results",
      desc: "98% client satisfaction with measurable outcomes every time",
      color: "text-cyan-400",
      bg: "bg-cyan-500/10",
    },
  ];

  const steps = [
    {
      icon: UserPlus,
      title: t("home.steps.register.title"),
      desc: t("home.steps.register.desc"),
      num: "01",
    },
    {
      icon: LayoutGrid,
      title: t("home.steps.choose.title"),
      desc: t("home.steps.choose.desc"),
      num: "02",
    },
    {
      icon: Upload,
      title: t("home.steps.upload.title"),
      desc: t("home.steps.upload.desc"),
      num: "03",
    },
    {
      icon: CheckCircle,
      title: t("home.steps.track.title"),
      desc: t("home.steps.track.desc"),
      num: "04",
    },
  ];

  const testimonials = [
    {
      quote:
        "San Brothers handled my student visa to China end to end. I never had to chase them for an update.",
      name: "Aline M.",
      loc: "Kigali, Rwanda",
      rating: 5,
      initials: "AM",
      color: "from-blue-500 to-cyan-500",
    },
    {
      quote:
        "Their accounting team filed our taxes faster than our previous firm. Worth every franc.",
      name: "Jean Paul K.",
      loc: "Kigali, Rwanda",
      rating: 5,
      initials: "JK",
      color: "from-emerald-500 to-teal-500",
    },
    {
      quote:
        "Got a Chinese-to-Kinyarwanda translator within minutes. The platform is a lifesaver for tourists.",
      name: "Wang Wei",
      loc: "Beijing, China",
      rating: 5,
      initials: "WW",
      color: "from-violet-500 to-purple-500",
    },
    {
      quote:
        "Company registration done in 2 weeks. Professional and transparent throughout the process.",
      name: "Marie C.",
      loc: "Paris, France",
      rating: 5,
      initials: "MC",
      color: "from-amber-500 to-orange-500",
    },
    {
      quote:
        "Best business consultancy in Kigali. They know Rwanda's market inside out and deliver results.",
      name: "David O.",
      loc: "Lagos, Nigeria",
      rating: 5,
      initials: "DO",
      color: "from-rose-500 to-pink-500",
    },
    {
      quote:
        "Translation service is incredibly fast. Certified documents ready in 24 hours — truly exceptional.",
      name: "Li Fang",
      loc: "Shanghai, China",
      rating: 5,
      initials: "LF",
      color: "from-cyan-500 to-blue-500",
    },
  ];

  const flags = [
    { flag: "🇬🇧", lang: "English" },
    { flag: "🇨🇳", lang: "中文" },
    { flag: "🇷🇼", lang: "Kinyarwanda" },
    { flag: "🇫🇷", lang: "Français" },
    { flag: "🇸🇦", lang: "العربية" },
  ];

  return (
    <PublicLayout>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-18px) rotate(1deg); }
          66% { transform: translateY(-8px) rotate(-1deg); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-22px) rotate(-1deg); }
          66% { transform: translateY(-10px) rotate(1deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        @keyframes float-slower {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-40px); }
        }
        @keyframes orb-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(40px, -30px) scale(1.05); }
          50% { transform: translate(20px, -60px) scale(0.95); }
          75% { transform: translate(-30px, -20px) scale(1.02); }
        }
        @keyframes orb-drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-50px, 40px) scale(1.08); }
          66% { transform: translate(30px, 60px) scale(0.92); }
        }
        @keyframes scroll-carousel {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes bounce-down {
          0%, 100% { transform: translateY(0); opacity: 0.8; }
          50% { transform: translateY(10px); opacity: 0.4; }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 24px rgba(59,130,246,0.45), 0 0 48px rgba(59,130,246,0.15); }
          50% { box-shadow: 0 0 36px rgba(59,130,246,0.7), 0 0 72px rgba(59,130,246,0.25); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes line-grow {
          from { width: 0; }
          to { width: 100%; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes badge-pop {
          0% { transform: scale(0.8) translateY(10px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }

        .animate-fade-up {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1);
        }
        .animate-fade-up.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .delay-100 { transition-delay: 0.1s; }
        .delay-200 { transition-delay: 0.2s; }
        .delay-300 { transition-delay: 0.3s; }
        .delay-400 { transition-delay: 0.4s; }
        .delay-500 { transition-delay: 0.5s; }

        .float-card-1 { animation: float 7s ease-in-out infinite; }
        .float-card-2 { animation: float-delayed 9s ease-in-out infinite 1.5s; }
        .float-card-3 { animation: float 8s ease-in-out infinite 3s; }
        .float-card-4 { animation: float-delayed 10s ease-in-out infinite 0.8s; }

        .orb-1 { animation: orb-drift 20s ease-in-out infinite; }
        .orb-2 { animation: orb-drift-2 25s ease-in-out infinite; }
        .orb-3 { animation: float-slower 30s ease-in-out infinite; }

        .carousel-track {
          animation: scroll-carousel 45s linear infinite;
          will-change: transform;
        }
        .carousel-wrapper:hover .carousel-track {
          animation-play-state: paused;
        }

        .gradient-animated {
          background-size: 300% 300%;
          animation: gradient-shift 10s ease infinite;
        }
        .bounce-arrow { animation: bounce-down 2s ease-in-out infinite; }
        .glow-btn { animation: glow-pulse 2.5s ease-in-out infinite; }

        .glass-card {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .glass-card-light {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.13);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .grid-pattern {
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 60px 60px;
        }

        .service-card {
          transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
        }
        .service-card:hover {
          transform: translateY(-10px);
        }

        .step-connector {
          position: absolute;
          top: 28px;
          left: calc(50% + 36px);
          right: calc(-50% + 36px);
          height: 2px;
          background: linear-gradient(90deg, rgba(59,130,246,0.6) 0%, rgba(59,130,246,0.1) 100%);
          overflow: hidden;
        }
        .step-connector::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(59,130,246,0.9), transparent);
          animation: shimmer 2.5s ease-in-out infinite;
        }

        .shimmer-text {
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.9) 0%,
            rgba(147,197,253,1) 30%,
            rgba(196,181,253,0.9) 60%,
            rgba(255,255,255,0.9) 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 5s linear infinite;
        }

        .badge-pop { animation: badge-pop 0.6s cubic-bezier(0.16,1,0.3,1) both; }

        .hero-glow-line {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(59,130,246,0.4), rgba(139,92,246,0.4), transparent);
        }

        .stat-card-glow {
          transition: box-shadow 0.3s ease;
        }
        .stat-card-glow:hover {
          box-shadow: 0 0 30px rgba(59,130,246,0.2);
        }

        .testimonial-card {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .testimonial-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }

        .why-item {
          transition: all 0.3s ease;
        }
        .why-item:hover {
          transform: translateX(6px);
        }

        .flag-pill {
          transition: all 0.2s ease;
        }
        .flag-pill:hover {
          transform: translateY(-2px) scale(1.05);
        }

        .partnership-badge {
          transition: all 0.3s ease;
        }
        .partnership-badge:hover {
          transform: translateY(-4px);
          background: rgba(255,255,255,0.08);
        }

        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>

      {/* ========== HERO ========== */}
      {/* Syne font for headline */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Syne:wght@800&display=swap"
        rel="stylesheet"
      />
      <HeroSection />

      {/* ========== STATS BANNER ========== */}
      <section className="relative w-full overflow-hidden py-14 bg-linear-to-r from-blue-50 via-white to-blue-50 dark:from-[#0F1729] dark:via-[#0D1B3E] dark:to-[#0F1729]">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse at 20% 50%, rgba(37,99,235,0.2) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(124,58,237,0.15) 0%, transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              { num: "1,000+", label: "Clients Served", sub: "Worldwide" },
              { num: "15+", label: "Languages", sub: "Supported" },
              { num: "98%", label: "Success Rate", sub: "Verified" },
              { num: "4", label: "Service Areas", sub: "End-to-end" },
            ].map((s, i) => (
              <div key={s.label} className="stat-card-glow text-center relative">
                {i < 3 && (
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden md:block w-px h-12 bg-gray-300 dark:bg-white/10" />
                )}
                <div className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">
                  {s.num}
                </div>
                <div className="mt-1 text-sm font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-300">
                  {s.label}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-500 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== SERVICES ========== */}
      <section className="py-24 bg-white dark:bg-[#080D1A]">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-16 animate-fade-up">
            <span
              className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-4"
              style={{
                background: "rgba(37,99,235,0.12)",
                border: "1px solid rgba(37,99,235,0.25)",
              }}
            >
              What We Do
            </span>
            <h2 className="text-4xl font-black text-gray-900 dark:text-white md:text-5xl lg:text-6xl leading-tight">
              Services Built for
              <br />
              <span className="shimmer-text">Your Success</span>
            </h2>
            <p className="mt-4 max-w-xl text-lg text-gray-600 dark:text-gray-500">
              From visas to accounting, we handle the complexity so you can focus on what matters.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {services.map((s, idx) => (
              <div
                key={s.title}
                className={`animate-fade-up delay-${(idx + 1) * 100} service-card group rounded-2xl p-7 cursor-pointer bg-white dark:bg-white/3 border border-gray-300 dark:border-white/10`}
                onClick={() => (window.location.href = s.href)}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow =
                    `0 20px 60px rgba(0,0,0,0.1) dark:rgba(0,0,0,0.4)`;
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(59,130,246,0.25)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "";
                  (e.currentTarget as HTMLDivElement).style.borderColor = "";
                }}
              >
                <div className="mb-5 flex items-start justify-between">
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br ${s.gradient}`}
                  >
                    <s.icon className="h-7 w-7 text-white" />
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.pill}`}>
                    {s.tag}
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">{s.title}</h3>
                <p className="mb-5 text-sm leading-relaxed text-gray-600 dark:text-gray-500">
                  {s.desc}
                </p>
                <div className="mb-5 space-y-2">
                  {["Expert professionals", "Fast processing", "24/7 support"].map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-400"
                    >
                      <Check className={`h-4 w-4 shrink-0 ${s.accent}`} />
                      {feature}
                    </div>
                  ))}
                </div>
                <a
                  href={s.href}
                  className={`inline-flex items-center gap-1.5 text-sm font-semibold ${s.accent} hover:gap-3 transition-all`}
                >
                  Learn more <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== WHY SAN BROTHERS ========== */}
      <section className="py-24 bg-gray-50 dark:bg-[#060B18]">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="grid gap-16 md:grid-cols-2 md:items-start">
            {/* Left */}
            <div className="animate-fade-up space-y-6 sticky top-24">
              <span
                className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400"
                style={{
                  background: "rgba(16,185,129,0.1)",
                  border: "1px solid rgba(16,185,129,0.2)",
                }}
              >
                Why Choose Us
              </span>
              <h2 className="text-4xl font-black leading-tight text-gray-900 md:text-5xl dark:text-white">
                Why thousands trust
                <br />
                <span style={{ color: "#2563EB" }} className="dark:text-blue-400">
                  San Brothers
                </span>
              </h2>
              <p className="text-lg leading-relaxed text-gray-600 dark:text-gray-500">
                We combine international expertise with deep local knowledge to deliver professional
                services that exceed expectations — every time.
              </p>
              <div
                className="rounded-2xl p-5 space-y-2 bg-gray-100 dark:bg-white/3 border border-gray-300 dark:border-white/10"
                style={{}}
              >
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-500">
                  <span className="text-base">📍</span>
                  <span>Florida House, 2nd Floor, KN 70 Street, Kigali</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-500">
                  <span className="text-base">🕐</span>
                  <span>24/7</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-500">
                  <span className="text-base">📞</span>
                  <span>+250 700 000 000</span>
                </div>
              </div>
              <Button
                size="lg"
                asChild
                className="h-12 rounded-xl bg-linear-to-r from-blue-600 to-blue-700 font-semibold text-white hover:from-blue-500 hover:to-blue-600 border-0"
              >
                <a href="/about" className="flex items-center gap-2">
                  Learn Our Story <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>

            {/* Right */}
            <div className="grid gap-4">
              {why.map((w, idx) => (
                <div
                  key={w.title}
                  className={`animate-fade-up delay-${((idx % 4) + 1) * 100} why-item flex gap-4 rounded-2xl p-5 bg-gray-100 dark:bg-white/3 border border-gray-300 dark:border-white/10`}
                >
                  <div
                    className={`flex-shrink-0 flex h-11 w-11 items-center justify-center rounded-xl ${w.bg}`}
                  >
                    <w.icon className={`h-5 w-5 ${w.color}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white">{w.title}</h3>
                    <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-500">{w.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section className="py-24 bg-white dark:bg-[#080D1A]">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-16 animate-fade-up text-center">
            <span
              className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400 mb-4"
              style={{
                background: "rgba(139,92,246,0.1)",
                border: "1px solid rgba(139,92,246,0.2)",
              }}
            >
              The Process
            </span>
            <h2 className="text-4xl font-black text-gray-900 dark:text-white md:text-5xl">
              Get started in{" "}
              <span style={{ color: "#A78BFA" }} className="dark:text-violet-300">
                4 simple steps
              </span>
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-500">
              From registration to results — we make it effortless.
            </p>
          </div>

          {/* Desktop timeline */}
          <div className="hidden md:grid md:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={s.title} className={`animate-fade-up delay-${(i + 1) * 100} relative`}>
                {i < steps.length - 1 && <div className="step-connector" />}
                <div className="rounded-2xl p-6 bg-gray-100 dark:bg-white/3 border border-gray-300 dark:border-white/10">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-4xl font-black text-gray-300 dark:text-white/20">
                      {s.num}
                    </span>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30 border border-violet-300 dark:border-violet-500/30">
                      <s.icon className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile vertical timeline */}
          <div className="md:hidden space-y-4">
            {steps.map((s, i) => (
              <div key={s.title} className={`animate-fade-up delay-${(i + 1) * 100} flex gap-4`}>
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 border border-violet-300 dark:border-violet-500/30">
                    {s.num}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="mt-2 w-px flex-1 min-h-8 bg-gray-300 dark:bg-violet-500/20" />
                  )}
                </div>
                <div className="pb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <s.icon className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    <h3 className="font-bold text-gray-900 dark:text-white">{s.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS ========== */}
      <section className="py-24 overflow-hidden bg-gray-50 dark:bg-[#060B18]">
        <div className="mx-auto max-w-7xl px-4 md:px-6 mb-12">
          <div className="animate-fade-up text-center">
            <span
              className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400 mb-4"
              style={{
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.2)",
              }}
            >
              Client Stories
            </span>
            <h2 className="text-4xl font-black text-gray-900 dark:text-white md:text-5xl">
              What Our{" "}
              <span style={{ color: "#313863" }} className="dark:text-amber-300">
                Clients Say
              </span>
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-500">
              Real results from real people across the globe.
            </p>
          </div>
        </div>

        {/* Desktop infinite carousel */}
        <div className="carousel-wrapper hidden md:block">
          <div className="carousel-track flex gap-5" style={{ width: "max-content" }}>
            {[...testimonials, ...testimonials].map((tt, idx) => (
              <div
                key={idx}
                className="testimonial-card flex-shrink-0 w-[360px] rounded-2xl p-6 bg-white dark:bg-white/3 border border-gray-300 dark:border-white/10"
              >
                <div className="mb-4 flex gap-0.5">
                  {Array.from({ length: tt.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="mb-5 text-sm leading-relaxed text-gray-700 dark:text-gray-400">
                  "{tt.quote}"
                </p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-white/10">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br ${tt.color} text-xs font-bold text-white`}
                  >
                    {tt.initials}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-900 dark:text-white">{tt.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-600">{tt.loc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile grid */}
        <div className="md:hidden mx-auto max-w-7xl px-4 grid gap-4">
          {testimonials.slice(0, 3).map((tt) => (
            <div
              key={tt.name}
              className="rounded-2xl p-6 bg-white dark:bg-white/3 border border-gray-300 dark:border-white/10"
            >
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: tt.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mb-4 text-sm leading-relaxed text-gray-700 dark:text-gray-400">
                "{tt.quote}"
              </p>
              <div className="flex items-center gap-3 pt-3 border-t border-gray-200 dark:border-white/10">
                <div
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${tt.color} text-xs font-bold text-white`}
                >
                  {tt.initials}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">{tt.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-600">{tt.loc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========== PARTNERSHIP ========== */}
      <section className="py-20 pt-32 bg-white dark:bg-[#e9e9e9]">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div
            className="rounded-3xl p-8 md:p-12 bg-blue-50 dark:bg-white/5 border border-blue-200 dark:border-blue-500/20"
            style={{
              background:
                "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(124,58,237,0.06) 100%)",
            }}
          >
            <div className="grid gap-10 md:grid-cols-2 md:items-center">
              <div className="animate-fade-up space-y-4">
                <span
                  className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400"
                  style={{
                    background: "rgba(37,99,235,0.12)",
                    border: "1px solid rgba(37,99,235,0.25)",
                  }}
                >
                  In Partnership With
                </span>
                <h3 className="text-3xl font-black text-gray-900 dark:text-white">
                  Best of the Best
                  <br />
                  Company Ltd
                </h3>
                <p className="text-gray-600 dark:text-gray-500 leading-relaxed">
                  Expanding our reach with integrated logistics, China sourcing, and scholarship
                  opportunities for clients worldwide.
                </p>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  Learn more about our partnership <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
              <div className="animate-fade-up delay-200 grid grid-cols-3 gap-4">
                {[
                  { emoji: "📦", title: "Shipping & Logistics", desc: "Global delivery" },
                  { emoji: "🏭", title: "China Sourcing", desc: "Factory direct" },
                  { emoji: "🎓", title: "Scholarships", desc: "Study abroad" },
                ].map((b) => (
                  <div
                    key={b.title}
                    className="partnership-badge rounded-2xl p-5 text-center cursor-pointer bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10"
                    style={{}}
                  >
                    <div className="mb-2 text-3xl">{b.emoji}</div>
                    <div className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                      {b.title}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-600 mt-1">{b.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CTA BANNER — V5 Spotlight ========== */}
      <section
        className="relative overflow-hidden text-center"
        style={{ background: "#050508", padding: "100px 40px" }}
      >
        {/* Red spotlight glow from above */}
        <div
          className="pointer-events-none absolute"
          style={{
            top: "-100px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "600px",
            height: "600px",
            background:
              "radial-gradient(ellipse, rgba(160,0,0,0.22) 0%, rgba(80,0,0,0.10) 40%, transparent 70%)",
          }}
        />

        {/* Vertical beam + glowing dot — dot styled via .cta-beam::after in <style> above */}
        <div
          className="cta-beam absolute"
          style={{
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "1px",
            height: "60px",
            background: "linear-gradient(to bottom, transparent, #cc0000)",
          }}
        />

        {/* Content */}
        <div className="relative mx-auto" style={{ maxWidth: "720px" }}>
          {/* Brand overline */}
          <span
            className="block"
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: "#cc0000",
              marginBottom: "24px",
            }}
          >
            San Brothers Consulting
          </span>

          {/* Main headline — gradient text */}
          <h2
            style={{
              fontFamily: "'Syne', sans-serif",
              fontWeight: 800,
              fontSize: "clamp(36px, 5.5vw, 72px)",
              lineHeight: 1,
              marginBottom: "20px",
            }}
          >
            <span
              style={{
                display: "block",
                background: "linear-gradient(90deg, #fff 0%, #aaa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Ready to get
            </span>
            <span
              style={{
                display: "block",
                background: "linear-gradient(90deg, #fff 0%, #aaa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              started?
            </span>
          </h2>

          {/* Subtext */}
          <p style={{ color: "#555", fontSize: "17px", marginBottom: "48px", lineHeight: 1.6 }}>
            Create your free account in under 2 minutes.
            <br />
            No credit card. No commitment.
          </p>

          {/* Primary CTA */}
          <div style={{ marginBottom: "48px" }}>
            <Button
              size="lg"
              asChild
              style={{
                background: "linear-gradient(135deg, #cc0000 0%, #800000 100%)",
                border: "none",
                borderRadius: "10px",
                padding: "18px 52px",
                fontSize: "16px",
                fontWeight: 700,
                letterSpacing: "0.03em",
                boxShadow: "0 0 40px rgba(180,0,0,0.40), 0 2px 0 rgba(255,255,255,0.10) inset",
                height: "auto",
              }}
            >
              <a href="/services" className="flex items-center gap-2">
                Get Started Free <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <p style={{ color: "#333", fontSize: "13px", marginTop: "16px" }}>
              or{" "}
              <a href="/contact" style={{ color: "#666", textDecoration: "underline" }}>
                Talk to Us directly
              </a>
            </p>
          </div>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              margin: "0 auto 32px",
              maxWidth: "400px",
            }}
          >
            <div style={{ flex: 1, height: "1px", background: "#1a1a24" }} />
            <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#333" }} />
            <div style={{ flex: 1, height: "1px", background: "#1a1a24" }} />
          </div>

          {/* Trust meta row */}
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap" }}>
            {["Free consultation", "1,000+ clients", "Cancel anytime"].map((item, i, arr) => (
              <span
                key={item}
                style={{
                  padding: "0 20px",
                  color: "#444",
                  fontSize: "12px",
                  borderRight: i < arr.length - 1 ? "1px solid #1a1a24" : "none",
                }}
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}

// ─── HeroSection ──────────────────────────────────────────────────────────────

const SLIDES = [
  {
    pre: "Your Trusted Partner for",
    highlight: "Global Professional Services",
    subtitle: "Accounting, visas, translation & consultancy — built for Rwanda and the world.",
    activeCard: 0, // visa
  },
  {
    pre: "Expert Visa & Permit Support —",
    highlight: "Fast & Reliable",
    subtitle: "Tourist, business, student visas and work permits handled end to end.",
    activeCard: 0,
  },
  {
    pre: "Professional Accounting for",
    highlight: "Growing Businesses",
    subtitle: "Bookkeeping, tax filing and financial reporting for SMEs and individuals.",
    activeCard: 1,
  },
  {
    pre: "Certified Translation &",
    highlight: "Multilingual Interpretation",
    subtitle: "Document translation and live interpreters in 5+ languages, available 24/7.",
    activeCard: 2,
  },
];

const FLOAT_CARDS = [
  {
    emoji: "✈️",
    title: "Visa",
    label: "Visa Approved",
    badge: "Processing Complete",
    dotColor: "#22c55e",
    glowColor: "rgba(34,197,94,0.35)",
    borderColor: "rgba(34,197,94,0.3)",
    badgeBg: "rgba(34,197,94,0.12)",
    badgeText: "#86efac",
    animClass: "sb-float-a",
    animDuration: "5s",
    pos: { top: "18%", left: "3%" },
    entranceDelay: "0.6s",
  },
  {
    emoji: "🧮",
    title: "Accounting",
    label: "Tax Filed",
    badge: "Submitted on time",
    dotColor: "#3b82f6",
    glowColor: "rgba(59,130,246,0.35)",
    borderColor: "rgba(59,130,246,0.3)",
    badgeBg: "rgba(59,130,246,0.12)",
    badgeText: "#93c5fd",
    animClass: "sb-float-b",
    animDuration: "6s",
    pos: { top: "12%", right: "-2%" },
    entranceDelay: "0.75s",
  },
  {
    emoji: "🌐",
    title: "Translation",
    label: "Done in 3 min",
    badge: "Lightning fast",
    dotColor: "#a855f7",
    glowColor: "rgba(168,85,247,0.35)",
    borderColor: "rgba(168,85,247,0.3)",
    badgeBg: "rgba(168,85,247,0.12)",
    badgeText: "#d8b4fe",
    animClass: "sb-float-c",
    animDuration: "7s",
    pos: { top: "56%", left: "6%" },
    entranceDelay: "0.9s",
  },
  {
    emoji: "💼",
    title: "Consultancy",
    label: "Company Registered",
    badge: "2 weeks · official",
    dotColor: "#f59e0b",
    glowColor: "rgba(245,158,11,0.35)",
    borderColor: "rgba(245,158,11,0.3)",
    badgeBg: "rgba(245,158,11,0.12)",
    badgeText: "#fcd34d",
    animClass: "sb-float-d",
    animDuration: "4s",
    pos: { top: "62%", right: "3%" },
    entranceDelay: "1.05s",
  },
];

function FloatCard({
  card,
  isActive,
  index,
}: {
  card: (typeof FLOAT_CARDS)[0];
  isActive: boolean;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  // Trigger badge pulse when card becomes active
  useEffect(() => {
    if (isActive && badgeRef.current) {
      badgeRef.current.style.animation = "none";
      // Trigger reflow to restart animation
      void badgeRef.current.offsetHeight;
      badgeRef.current.style.animation = "sb-badge-pulse 0.4s ease-out";
    }
  }, [isActive]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate 3D magnetic tilt (±15deg max)
      const rotateY = ((e.clientX - centerX) / rect.width) * 20;
      const rotateX = ((e.clientY - centerY) / rect.height) * -20;

      // Floating glow that follows cursor
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.04)`;
      el.style.background = `radial-gradient(circle at ${x}% ${y}%, hsl(var(--primary)/0.15), transparent 60%), rgba(15, 23, 42, 0.7)`;
      el.style.boxShadow = `0 0 24px ${card.glowColor}`;
    },
    [card.glowColor],
  );

  const handleMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transition =
      "transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), background 0.6s ease, box-shadow 0.6s ease";
    el.style.transform = "perspective(800px) rotateX(0) rotateY(0) scale(1)";
    el.style.background = "rgba(15, 23, 42, 0.7)";
    el.style.boxShadow = isActive
      ? `0 0 28px ${card.glowColor}, 0 0 0 1px ${card.borderColor.replace("0.3", "0.6")}`
      : "0 4px 24px rgba(0,0,0,0.3)";
    setTimeout(() => {
      el.style.transition = "all 0.4s ease";
    }, 600);
  }, [isActive, card.glowColor, card.borderColor]);

  // Handle parallax depth on mouse move
  const handleParallaxMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate parallax offsets for different layers
    const offsetX = (e.clientX - centerX) / rect.width;
    const offsetY = (e.clientY - centerY) / rect.height;

    // Icon moves +8px
    const icon = el.querySelector(".sb-parallax-icon") as HTMLElement;
    if (icon) icon.style.transform = `translate(${offsetX * 8}px, ${offsetY * 8}px)`;

    // Text moves +4px
    const texts = el.querySelectorAll(".sb-parallax-text") as NodeListOf<HTMLElement>;
    texts.forEach((text) => {
      text.style.transform = `translate(${offsetX * 4}px, ${offsetY * 4}px)`;
    });

    // Badge moves +2px
    const badge = el.querySelector(".sb-parallax-badge") as HTMLElement;
    if (badge) badge.style.transform = `translate(${offsetX * 2}px, ${offsetY * 2}px)`;
  }, []);

  const handleParallaxLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    const icon = el.querySelector(".sb-parallax-icon") as HTMLElement;
    if (icon) icon.style.transform = "translate(0, 0)";

    const texts = el.querySelectorAll(".sb-parallax-text") as NodeListOf<HTMLElement>;
    texts.forEach((text) => {
      text.style.transform = "translate(0, 0)";
    });

    const badge = el.querySelector(".sb-parallax-badge") as HTMLElement;
    if (badge) badge.style.transform = "translate(0, 0)";
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        handleMouseMove(e);
        handleParallaxMove(e);
      }}
      onMouseLeave={() => {
        handleMouseLeave();
        handleParallaxLeave();
      }}
      className={`sb-card-entrance sb-card-${index} ${card.animClass}`}
      style={
        {
          position: "absolute",
          width: "220px",
          ...card.pos,
          animationDuration:
            card.animClass === "sb-card-entrance" ? card.entranceDelay : card.animDuration,
          ...({ "--entrance-delay": card.entranceDelay } as React.CSSProperties),
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          background: "rgba(15, 23, 42, 0.7)",
          border: `1px solid ${isActive ? card.borderColor.replace("0.3", "0.8") : card.borderColor}`,
          borderRadius: "16px",
          padding: "16px",
          cursor: "default",
          transition: "all 0.4s ease",
          boxShadow: isActive
            ? `0 0 28px ${card.glowColor}, 0 0 0 1px ${card.borderColor.replace("0.3", "0.6")}`
            : "0 4px 24px rgba(0,0,0,0.3)",
          opacity: isActive ? 1 : 0.5,
          transform: isActive ? "scale(1.04)" : "scale(1)",
          zIndex: 10,
        } as React.CSSProperties
      }
    >
      {/* Header with parallax depth */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "10px",
          transition: "transform 0.2s ease",
        }}
        className="sb-parallax-icon"
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "10px",
            background: card.badgeBg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            flexShrink: 0,
            transition: "transform 0.2s ease",
          }}
        >
          {card.emoji}
        </div>
        <div>
          <div
            style={{
              fontSize: "10px",
              color: "rgba(148,163,184,1)",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              transition: "transform 0.2s ease",
            }}
            className="sb-parallax-text"
          >
            {card.title}
          </div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: "rgba(248,250,252,1)",
              lineHeight: 1.2,
              transition: "transform 0.2s ease",
            }}
            className="sb-parallax-text"
          >
            {card.label}
          </div>
        </div>
      </div>
      {/* Badge with parallax depth */}
      <div
        ref={badgeRef}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "7px",
          background: card.badgeBg,
          borderRadius: "8px",
          padding: "6px 10px",
          transition: "transform 0.2s ease",
        }}
        className="sb-parallax-badge"
      >
        <span
          className="sb-pulse-dot"
          style={
            {
              "--pulse-color": card.dotColor,
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: card.dotColor,
              display: "inline-block",
              flexShrink: 0,
            } as React.CSSProperties
          }
        />
        <span style={{ fontSize: "11px", fontWeight: 600, color: card.badgeText }}>
          {card.badge}
        </span>
      </div>
    </div>
  );
}

function HeroSection() {
  const [slide, setSlide] = useState(0);
  const [animState, setAnimState] = useState<"idle" | "out" | "in">("idle");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goToSlide = useCallback(
    (idx: number) => {
      if (animState !== "idle") return;
      setAnimState("out");
      setTimeout(() => {
        setSlide(idx);
        setAnimState("in");
        setTimeout(() => setAnimState("idle"), 500);
      }, 350);
    },
    [animState],
  );

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setAnimState("out");
      setTimeout(() => {
        setSlide((s) => (s + 1) % SLIDES.length);
        setAnimState("in");
        setTimeout(() => setAnimState("idle"), 500);
      }, 350);
    }, 4000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const current = SLIDES[slide];

  return (
    <>
      {/* Inject keyframes + Syne font */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@800&display=swap');

        @keyframes sb-float-a {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes sb-float-b {
          0%, 100% { transform: translateY(-6px); }
          50% { transform: translateY(6px); }
        }
        @keyframes sb-float-c {
          0%, 100% { transform: translateY(-4px); }
          50% { transform: translateY(-14px); }
        }
        @keyframes sb-float-d {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }

        .sb-float-a { animation: sb-float-a 5s ease-in-out infinite !important; }
        .sb-float-b { animation: sb-float-b 6s ease-in-out infinite !important; }
        .sb-float-c { animation: sb-float-c 7s ease-in-out infinite !important; }
        .sb-float-d { animation: sb-float-d 4s ease-in-out infinite !important; }

        @keyframes sb-entrance {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0px) scale(1); }
        }

        .sb-card-0 { animation: sb-entrance 0.6s cubic-bezier(0.22,1,0.36,1) 0.6s both, sb-float-a 5s ease-in-out 1.2s infinite; }
        .sb-card-1 { animation: sb-entrance 0.6s cubic-bezier(0.22,1,0.36,1) 0.75s both, sb-float-b 6s ease-in-out 1.35s infinite; }
        .sb-card-2 { animation: sb-entrance 0.6s cubic-bezier(0.22,1,0.36,1) 0.9s both, sb-float-c 7s ease-in-out 1.5s infinite; }
        .sb-card-3 { animation: sb-entrance 0.6s cubic-bezier(0.22,1,0.36,1) 1.05s both, sb-float-d 4s ease-in-out 1.65s infinite; }

        @keyframes sb-pulse-dot {
          0%, 100% { box-shadow: 0 0 0 0 var(--pulse-color); }
          50% { box-shadow: 0 0 0 4px transparent; }
        }
        .sb-pulse-dot {
          animation: sb-pulse-dot 1.8s ease-in-out infinite;
        }
        
        @keyframes sb-badge-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }

        @keyframes sb-fade-up {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sb-reveal-1 { animation: sb-fade-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
        .sb-reveal-2 { animation: sb-fade-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.25s both; }
        .sb-reveal-3 { animation: sb-fade-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.4s both; }
        .sb-reveal-4 { animation: sb-fade-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.55s both; }

        @keyframes sb-headline {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideOut {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(-16px); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .sb-headline-idle  { opacity: 1; transform: translateY(0); transition: none; }
        .sb-headline-out { animation: slideOut 0.35s ease-in forwards; }
        .sb-headline-in  { animation: slideIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        
        .sb-subtitle-idle { opacity: 1; transform: translateY(0); transition: none; }
        .sb-subtitle-out { animation: slideOut 0.35s ease-in forwards; }
        .sb-subtitle-in { animation: slideIn 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards 0.08s; }
        
        @keyframes dotPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }
        .sb-dot-pulse { animation: dotPulse 0.4s ease-out; }

        @keyframes sb-dot-grid {
          from { background-position: 0 0; }
          to   { background-position: 20px 20px; }
        }
      `}</style>

      <section className="relative min-h-screen w-full overflow-hidden bg-background">
        {/* Radial glow behind cards side */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 70% 50%, hsl(var(--primary) / 0.08), transparent 60%)",
          }}
        />

        {/* Dot grid — left side only */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-1/2"
          style={{
            backgroundImage:
              "radial-gradient(circle, hsl(var(--foreground) / 0.06) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            maskImage: "linear-gradient(to right, transparent, hsl(var(--background)) 90%)",
            WebkitMaskImage: "linear-gradient(to right, transparent, hsl(var(--background)) 90%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-6">
          <div className="grid min-h-screen gap-12 md:grid-cols-2 md:items-center py-20 md:py-0">
            {/* ── LEFT ── */}
            <div className="flex flex-col justify-center space-y-7">
              {/* Eyebrow badge */}
              <div className="sb-reveal-1">
                <span
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wider"
                  style={{
                    background: "hsl(var(--primary) / 0.1)",
                    border: "1px solid hsl(var(--primary) / 0.3)",
                    color: "hsl(var(--primary))",
                  }}
                >
                  <span className="relative flex h-2 w-2">
                    <span
                      className="absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{
                        background: "hsl(var(--primary))",
                        animation: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
                      }}
                    />
                    <span
                      className="relative inline-flex h-2 w-2 rounded-full"
                      style={{ background: "hsl(var(--primary))" }}
                    />
                  </span>
                  Trusted in 15+ Countries · Est. 2020
                </span>
              </div>

              {/* Animated headline */}
              <div className="sb-reveal-2 min-h-[160px] md:min-h-[200px]">
                <h1
                  className={`sb-headline-${animState}`}
                  style={{
                    fontFamily: "'Syne', sans-serif",
                    fontWeight: 800,
                    fontSize: "clamp(2.2rem, 4.5vw, 3.8rem)",
                    lineHeight: 1.05,
                    letterSpacing: "-0.02em",
                    color: "hsl(var(--foreground))",
                  }}
                >
                  <span style={{ display: "block", color: "hsl(var(--foreground))" }}>
                    {current.pre}
                  </span>
                  <span
                    style={{
                      display: "block",
                      color: "hsl(var(--primary))",
                    }}
                  >
                    {current.highlight}
                  </span>
                </h1>
              </div>

              {/* Subtitle */}
              <p
                className={`sb-reveal-3 max-w-lg text-base leading-relaxed sb-subtitle-${animState}`}
                style={{
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                {current.subtitle}
              </p>

              {/* Progress dots */}
              <div className="sb-reveal-3 flex items-center gap-2">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToSlide(i)}
                    aria-label={`Go to slide ${i + 1}`}
                    style={{
                      height: "6px",
                      width: slide === i ? "24px" : "6px",
                      borderRadius: "3px",
                      background:
                        slide === i ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)",
                      border: "none",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      padding: 0,
                    }}
                  />
                ))}
              </div>

              {/* CTAs */}
              <div className="sb-reveal-4 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  asChild
                  className="h-12 gap-2 rounded-xl text-sm font-semibold px-7"
                >
                  <a href="/services">
                    Get Started Free <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  asChild
                  className="h-12 rounded-xl text-sm font-semibold px-7"
                  style={{
                    border: "1px solid hsl(var(--border))",
                  }}
                >
                  <a href="/contact">Talk to an Expert</a>
                </Button>
              </div>

              {/* Trust strip */}
              <div
                className="sb-reveal-4 flex flex-wrap gap-4 text-sm"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                {["Free consultation", "No hidden fees", "24/7 online access"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <Check
                      className="h-3.5 w-3.5 shrink-0"
                      style={{ color: "hsl(var(--success))" }}
                    />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* ── RIGHT — Floating cards ── */}
            <div className="relative hidden min-h-[580px] md:block">
              {FLOAT_CARDS.map((card, i) => (
                <FloatCard key={i} card={card} index={i} isActive={current.activeCard === i} />
              ))}
            </div>
          </div>

          {/* Language flags strip */}
          <div
            className="relative z-10 flex flex-wrap justify-center gap-3 border-t py-6"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            {[
              { flag: "🇬🇧", lang: "English" },
              { flag: "🇨🇳", lang: "中文" },
              { flag: "🇷🇼", lang: "Kinyarwanda" },
              { flag: "🇫🇷", lang: "Français" },
              { flag: "🇸🇦", lang: "العربية" },
            ].map(({ flag, lang }) => (
              <span
                key={lang}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm"
                style={{
                  background: "hsl(var(--muted))",
                  border: "1px solid hsl(var(--border))",
                  color: "hsl(var(--muted-foreground))",
                }}
              >
                {flag} <span className="text-xs">{lang}</span>
              </span>
            ))}
          </div>

          {/* Scroll indicator */}
          <div className="relative z-10 flex justify-center py-5">
            <div
              className="flex flex-col items-center gap-1"
              style={{ color: "hsl(var(--muted-foreground))" }}
            >
              <span className="text-xs tracking-widest uppercase">Scroll</span>
              <ChevronDown className="h-4 w-4 animate-bounce" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
