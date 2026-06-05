import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plane, Calculator, Briefcase, Languages, ShieldCheck, Clock, Globe, UserPlus, LayoutGrid, Upload, CircleCheck as CheckCircle, Star, ChevronDown, Check, ArrowRight, Zap, Award, Users, TrendingUp } from "lucide-react";
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
      { threshold: 0.1 }
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
      { threshold: 0.5 }
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
      <div className="text-4xl font-black text-white md:text-5xl tracking-tight tabular-nums">
        {count}
        <span className="text-blue-400">{suffix}</span>
      </div>
      <div className="mt-1 text-sm font-semibold text-white/90 uppercase tracking-widest">{label}</div>
      {sublabel && <div className="text-xs text-blue-200/70 mt-0.5">{sublabel}</div>}
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
    { icon: UserPlus, title: t("home.steps.register.title"), desc: t("home.steps.register.desc"), num: "01" },
    { icon: LayoutGrid, title: t("home.steps.choose.title"), desc: t("home.steps.choose.desc"), num: "02" },
    { icon: Upload, title: t("home.steps.upload.title"), desc: t("home.steps.upload.desc"), num: "03" },
    { icon: CheckCircle, title: t("home.steps.track.title"), desc: t("home.steps.track.desc"), num: "04" },
  ];

  const testimonials = [
    {
      quote: "San Brothers handled my student visa to China end to end. I never had to chase them for an update.",
      name: "Aline M.",
      loc: "Kigali, Rwanda",
      rating: 5,
      initials: "AM",
      color: "from-blue-500 to-cyan-500",
    },
    {
      quote: "Their accounting team filed our taxes faster than our previous firm. Worth every franc.",
      name: "Jean Paul K.",
      loc: "Kigali, Rwanda",
      rating: 5,
      initials: "JK",
      color: "from-emerald-500 to-teal-500",
    },
    {
      quote: "Got a Chinese-to-Kinyarwanda translator within minutes. The platform is a lifesaver for tourists.",
      name: "Wang Wei",
      loc: "Beijing, China",
      rating: 5,
      initials: "WW",
      color: "from-violet-500 to-purple-500",
    },
    {
      quote: "Company registration done in 2 weeks. Professional and transparent throughout the process.",
      name: "Marie C.",
      loc: "Paris, France",
      rating: 5,
      initials: "MC",
      color: "from-amber-500 to-orange-500",
    },
    {
      quote: "Best business consultancy in Kigali. They know Rwanda's market inside out and deliver results.",
      name: "David O.",
      loc: "Lagos, Nigeria",
      rating: 5,
      initials: "DO",
      color: "from-rose-500 to-pink-500",
    },
    {
      quote: "Translation service is incredibly fast. Certified documents ready in 24 hours — truly exceptional.",
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
    { flag: "🇵🇹", lang: "Português" },
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
      <section className="relative min-h-screen w-full overflow-hidden grid-pattern" style={{ background: "#0A0F1C" }}>
        {/* Ambient orbs */}
        <div className="orb-1 pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full opacity-60"
          style={{ background: "radial-gradient(circle at center, rgba(37,99,235,0.18) 0%, transparent 65%)", filter: "blur(80px)" }} />
        <div className="orb-2 pointer-events-none absolute top-1/2 -right-32 h-[500px] w-[500px] rounded-full opacity-50"
          style={{ background: "radial-gradient(circle at center, rgba(124,58,237,0.15) 0%, transparent 65%)", filter: "blur(70px)" }} />
        <div className="orb-3 pointer-events-none absolute bottom-0 left-1/3 h-[400px] w-[400px] rounded-full opacity-40"
          style={{ background: "radial-gradient(circle at center, rgba(5,150,105,0.12) 0%, transparent 65%)", filter: "blur(60px)" }} />

        <div className="relative z-10 mx-auto max-w-7xl px-4 md:px-6">
          <div className="grid min-h-screen gap-8 md:grid-cols-2 md:items-center md:py-24 py-20">

            {/* Left — headline & CTAs */}
            <div className="flex flex-col justify-center space-y-8 pt-8 md:pt-0">
              {/* Trust badge */}
              <div
                className="badge-pop inline-flex w-fit items-center gap-2.5 rounded-full px-4 py-2 text-sm font-medium text-blue-300"
                style={{ background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.3)" }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
                </span>
                Trusted in 15+ Countries · Est. 2018
              </div>

              {/* Headline */}
              <div className="space-y-3">
                <h1 className="font-black leading-[1.05] tracking-tight text-white" style={{ fontSize: "clamp(2.4rem, 5.5vw, 4.2rem)" }}>
                  <span className="animate-fade-up block">Your Trusted Partner</span>
                  <span className="animate-fade-up delay-100 block">for Global</span>
                  <span className="animate-fade-up delay-200 shimmer-text block">Professional Services</span>
                </h1>
              </div>

              {/* Sub */}
              <p className="animate-fade-up delay-300 max-w-lg text-lg leading-relaxed text-gray-400">
                Accounting · Visa & Permits · Translation · Consultancy
                <br />
                <span className="text-gray-500">Built for Rwanda and the world.</span>
              </p>

              {/* Inline stats */}
              <div className="animate-fade-up delay-300 grid grid-cols-2 gap-4 rounded-2xl p-5 sm:grid-cols-4"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <StatCounter value={1000} label="Clients" sublabel="served" />
                <StatCounter value={15} label="Languages" sublabel="supported" />
                <StatCounter value={4} label="Services" sublabel="areas" />
                <StatCounter value={98} suffix="%" label="Success" sublabel="rate" />
              </div>

              {/* CTAs */}
              <div className="animate-fade-up delay-400 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" asChild
                  className="glow-btn h-14 bg-gradient-to-r from-blue-600 to-blue-700 text-base font-semibold text-white hover:from-blue-500 hover:to-blue-600 border-0 rounded-xl">
                  <a href="/services" className="flex items-center gap-2">
                    Get Started Free <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild
                  className="h-14 rounded-xl border-white/10 bg-white/5 text-base font-semibold text-white backdrop-blur hover:bg-white/10 hover:border-white/20">
                  <a href="/contact">Talk to an Expert</a>
                </Button>
              </div>

              {/* Trust signals */}
              <div className="animate-fade-up delay-500 flex flex-wrap gap-4 text-sm text-gray-400">
                {["Free consultation", "No hidden fees", "24/7 online access"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — floating cards */}
            <div className="relative hidden min-h-[580px] md:block">
              <div className="absolute inset-0">
                {/* Center decoration ring */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-48 w-48 rounded-full opacity-10"
                  style={{ border: "1px dashed rgba(59,130,246,0.5)", animation: "spin-slow 40s linear infinite" }} />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 rounded-full opacity-5"
                  style={{ border: "1px solid rgba(59,130,246,0.4)", animation: "spin-slow 60s linear infinite reverse" }} />

                {/* Visa Approved */}
                <div className="float-card-1 absolute top-8 left-0 w-60">
                  <div className="glass-card-light rounded-2xl p-5" style={{ border: "1px solid rgba(34,197,94,0.25)" }}>
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: "rgba(34,197,94,0.15)" }}>
                        <span className="text-lg">🛂</span>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-400">Status Update</div>
                        <div className="text-sm font-bold text-white">Visa Approved</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: "rgba(34,197,94,0.1)" }}>
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-300">Processing Complete</span>
                    </div>
                  </div>
                </div>

                {/* Tax Filed */}
                <div className="float-card-2 absolute top-28 right-0 w-60">
                  <div className="glass-card-light rounded-2xl p-5" style={{ border: "1px solid rgba(59,130,246,0.25)" }}>
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: "rgba(59,130,246,0.15)" }}>
                        <span className="text-lg">📊</span>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-400">Accounting</div>
                        <div className="text-sm font-bold text-white">Tax Filed</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: "rgba(59,130,246,0.1)" }}>
                      <Zap className="h-4 w-4 text-blue-400" />
                      <span className="text-xs font-semibold text-blue-300">Submitted on time</span>
                    </div>
                  </div>
                </div>

                {/* Translated */}
                <div className="float-card-3 absolute bottom-28 left-10 w-60">
                  <div className="glass-card-light rounded-2xl p-5" style={{ border: "1px solid rgba(139,92,246,0.25)" }}>
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: "rgba(139,92,246,0.15)" }}>
                        <span className="text-lg">🌐</span>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-400">Translation</div>
                        <div className="text-sm font-bold text-white">Done in 3 min</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: "rgba(139,92,246,0.1)" }}>
                      <Clock className="h-4 w-4 text-violet-400" />
                      <span className="text-xs font-semibold text-violet-300">Lightning fast</span>
                    </div>
                  </div>
                </div>

                {/* Company Registered */}
                <div className="float-card-4 absolute bottom-6 right-6 w-60">
                  <div className="glass-card-light rounded-2xl p-5" style={{ border: "1px solid rgba(245,158,11,0.25)" }}>
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: "rgba(245,158,11,0.15)" }}>
                        <span className="text-lg">🏢</span>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-400">Consultancy</div>
                        <div className="text-sm font-bold text-white">Company Registered</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: "rgba(245,158,11,0.1)" }}>
                      <Award className="h-4 w-4 text-amber-400" />
                      <span className="text-xs font-semibold text-amber-300">2 weeks · official</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Language flags strip */}
          <div className="relative z-10 flex flex-wrap justify-center gap-3 border-t py-6" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {flags.map(({ flag, lang }) => (
              <span key={lang} className="flag-pill flex items-center gap-1.5 rounded-full px-3 py-1 text-sm text-gray-400 cursor-default"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                {flag} <span className="text-xs">{lang}</span>
              </span>
            ))}
          </div>

          {/* Scroll indicator */}
          <div className="relative z-10 flex justify-center py-6">
            <div className="bounce-arrow flex flex-col items-center gap-1 text-gray-600">
              <span className="text-xs tracking-widest uppercase text-gray-600">Scroll</span>
              <ChevronDown className="h-5 w-5" />
            </div>
          </div>
        </div>

        <div className="hero-glow-line" />
      </section>

      {/* ========== STATS BANNER ========== */}
      <section className="relative w-full overflow-hidden py-14"
        style={{ background: "linear-gradient(135deg, #0F1729 0%, #0D1B3E 50%, #0F1729 100%)" }}>
        <div className="absolute inset-0 opacity-30"
          style={{
            background: "radial-gradient(ellipse at 20% 50%, rgba(37,99,235,0.2) 0%, transparent 60%), radial-gradient(ellipse at 80% 50%, rgba(124,58,237,0.15) 0%, transparent 60%)"
          }} />
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
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 hidden md:block w-px h-12"
                    style={{ background: "rgba(255,255,255,0.08)" }} />
                )}
                <div className="text-4xl font-black tracking-tight text-white">{s.num}</div>
                <div className="mt-1 text-sm font-semibold uppercase tracking-widest text-blue-300">{s.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== SERVICES ========== */}
      <section className="py-24" style={{ background: "#080D1A" }}>
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-16 animate-fade-up">
            <span className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-400 mb-4"
              style={{ background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.25)" }}>
              What We Do
            </span>
            <h2 className="text-4xl font-black text-white md:text-5xl lg:text-6xl leading-tight">
              Services Built for<br />
              <span className="shimmer-text">Your Success</span>
            </h2>
            <p className="mt-4 max-w-xl text-lg text-gray-500">
              From visas to accounting, we handle the complexity so you can focus on what matters.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {services.map((s, idx) => (
              <div key={s.title}
                className={`animate-fade-up delay-${(idx + 1) * 100} service-card group rounded-2xl p-7 cursor-pointer`}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)",
                }}
                onClick={() => window.location.href = s.href}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 20px 60px rgba(0,0,0,0.4)`;
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(59,130,246,0.25)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "";
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.07)";
                }}
              >
                <div className="mb-5 flex items-start justify-between">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${s.gradient}`}>
                    <s.icon className="h-7 w-7 text-white" />
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.pill}`}>{s.tag}</span>
                </div>
                <h3 className="mb-2 text-xl font-bold text-white">{s.title}</h3>
                <p className="mb-5 text-sm leading-relaxed text-gray-500">{s.desc}</p>
                <div className="mb-5 space-y-2">
                  {["Expert professionals", "Fast processing", "24/7 support"].map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-sm text-gray-400">
                      <Check className={`h-4 w-4 flex-shrink-0 ${s.accent}`} />
                      {feature}
                    </div>
                  ))}
                </div>
                <a href={s.href}
                  className={`inline-flex items-center gap-1.5 text-sm font-semibold ${s.accent} hover:gap-3 transition-all`}>
                  Learn more <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== WHY SAN BROTHERS ========== */}
      <section className="py-24" style={{ background: "#060B18" }}>
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="grid gap-16 md:grid-cols-2 md:items-start">
            {/* Left */}
            <div className="animate-fade-up space-y-6 sticky top-24">
              <span className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-400"
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                Why Choose Us
              </span>
              <h2 className="text-4xl font-black leading-tight text-white md:text-5xl">
                Why thousands trust<br />
                <span style={{ color: "#60A5FA" }}>San Brothers</span>
              </h2>
              <p className="text-lg leading-relaxed text-gray-500">
                We combine international expertise with deep local knowledge to deliver professional services that exceed expectations — every time.
              </p>
              <div className="rounded-2xl p-5 space-y-2"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="text-base">📍</span>
                  <span>Florida House, 2nd Floor, KN 70 Street, Kigali</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="text-base">🕐</span>
                  <span>Mon–Fri 8am–6pm · Sat 9am–2pm</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="text-base">📞</span>
                  <span>+250 700 000 000</span>
                </div>
              </div>
              <Button size="lg" asChild
                className="h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 font-semibold text-white hover:from-blue-500 hover:to-blue-600 border-0">
                <a href="/about" className="flex items-center gap-2">
                  Learn Our Story <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>

            {/* Right */}
            <div className="grid gap-4">
              {why.map((w, idx) => (
                <div key={w.title}
                  className={`animate-fade-up delay-${(idx % 4 + 1) * 100} why-item flex gap-4 rounded-2xl p-5`}
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className={`flex-shrink-0 flex h-11 w-11 items-center justify-center rounded-xl ${w.bg}`}>
                    <w.icon className={`h-5 w-5 ${w.color}`} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{w.title}</h3>
                    <p className="mt-0.5 text-sm text-gray-500">{w.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section className="py-24" style={{ background: "#080D1A" }}>
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-16 animate-fade-up text-center">
            <span className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest text-violet-400 mb-4"
              style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
              The Process
            </span>
            <h2 className="text-4xl font-black text-white md:text-5xl">
              Get started in <span style={{ color: "#A78BFA" }}>4 simple steps</span>
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              From registration to results — we make it effortless.
            </p>
          </div>

          {/* Desktop timeline */}
          <div className="hidden md:grid md:grid-cols-4 gap-6">
            {steps.map((s, i) => (
              <div key={s.title} className={`animate-fade-up delay-${(i + 1) * 100} relative`}>
                {i < steps.length - 1 && (
                  <div className="step-connector" />
                )}
                <div className="rounded-2xl p-6"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-4xl font-black" style={{ color: "rgba(139,92,246,0.2)" }}>{s.num}</span>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl"
                      style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}>
                      <s.icon className="h-5 w-5 text-violet-400" />
                    </div>
                  </div>
                  <h3 className="font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Mobile vertical timeline */}
          <div className="md:hidden space-y-4">
            {steps.map((s, i) => (
              <div key={s.title} className={`animate-fade-up delay-${(i + 1) * 100} flex gap-4`}>
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-xs font-black text-violet-400"
                    style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.2)" }}>
                    {s.num}
                  </div>
                  {i < steps.length - 1 && (
                    <div className="mt-2 w-px flex-1 min-h-8" style={{ background: "rgba(139,92,246,0.2)" }} />
                  )}
                </div>
                <div className="pb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <s.icon className="h-4 w-4 text-violet-400" />
                    <h3 className="font-bold text-white">{s.title}</h3>
                  </div>
                  <p className="text-sm text-gray-500">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS ========== */}
      <section className="py-24 overflow-hidden" style={{ background: "#060B18" }}>
        <div className="mx-auto max-w-7xl px-4 md:px-6 mb-12">
          <div className="animate-fade-up text-center">
            <span className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-400 mb-4"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
              Client Stories
            </span>
            <h2 className="text-4xl font-black text-white md:text-5xl">
              What Our <span style={{ color: "#FCD34D" }}>Clients Say</span>
            </h2>
            <p className="mt-4 text-lg text-gray-500">Real results from real people across the globe.</p>
          </div>
        </div>

        {/* Desktop infinite carousel */}
        <div className="carousel-wrapper hidden md:block">
          <div className="carousel-track flex gap-5" style={{ width: "max-content" }}>
            {[...testimonials, ...testimonials].map((tt, idx) => (
              <div key={idx} className="testimonial-card flex-shrink-0 w-[360px] rounded-2xl p-6"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="mb-4 flex gap-0.5">
                  {Array.from({ length: tt.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="mb-5 text-sm leading-relaxed text-gray-400">"{tt.quote}"</p>
                <div className="flex items-center gap-3 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${tt.color} text-xs font-bold text-white`}>
                    {tt.initials}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{tt.name}</div>
                    <div className="text-xs text-gray-600">{tt.loc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile grid */}
        <div className="md:hidden mx-auto max-w-7xl px-4 grid gap-4">
          {testimonials.slice(0, 3).map((tt) => (
            <div key={tt.name} className="rounded-2xl p-6"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: tt.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mb-4 text-sm leading-relaxed text-gray-400">"{tt.quote}"</p>
              <div className="flex items-center gap-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${tt.color} text-xs font-bold text-white`}>
                  {tt.initials}
                </div>
                <div>
                  <div className="text-sm font-bold text-white">{tt.name}</div>
                  <div className="text-xs text-gray-600">{tt.loc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ========== PARTNERSHIP ========== */}
      <section className="py-20" style={{ background: "#080D1A" }}>
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="rounded-3xl p-8 md:p-12"
            style={{
              background: "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(124,58,237,0.06) 100%)",
              border: "1px solid rgba(37,99,235,0.15)"
            }}>
            <div className="grid gap-10 md:grid-cols-2 md:items-center">
              <div className="animate-fade-up space-y-4">
                <span className="inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest text-blue-400"
                  style={{ background: "rgba(37,99,235,0.12)", border: "1px solid rgba(37,99,235,0.25)" }}>
                  In Partnership With
                </span>
                <h3 className="text-3xl font-black text-white">Best of the Best<br />Company Ltd</h3>
                <p className="text-gray-500 leading-relaxed">
                  Expanding our reach with integrated logistics, China sourcing, and scholarship opportunities for clients worldwide.
                </p>
                <a href="#" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors">
                  Learn more about our partnership <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
              <div className="animate-fade-up delay-200 grid grid-cols-3 gap-4">
                {[
                  { emoji: "📦", title: "Shipping & Logistics", desc: "Global delivery" },
                  { emoji: "🏭", title: "China Sourcing", desc: "Factory direct" },
                  { emoji: "🎓", title: "Scholarships", desc: "Study abroad" },
                ].map((b) => (
                  <div key={b.title} className="partnership-badge rounded-2xl p-5 text-center cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="mb-2 text-3xl">{b.emoji}</div>
                    <div className="text-xs font-bold text-white leading-tight">{b.title}</div>
                    <div className="text-xs text-gray-600 mt-1">{b.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CTA BANNER ========== */}
      <section className="relative overflow-hidden py-24 gradient-animated"
        style={{
          background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 30%, #7C3AED 70%, #6D28D9 100%)"
        }}>
        {/* Noise texture overlay */}
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E\")"
          }} />

        <div className="relative mx-auto max-w-4xl px-4 text-center md:px-6">
          <div className="animate-fade-up space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white/80 mb-2"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}>
              <Users className="h-4 w-4" />
              Join 1,000+ satisfied clients
            </div>
            <h2 className="text-4xl font-black text-white md:text-6xl leading-tight">
              Ready to get started?
            </h2>
            <p className="text-xl text-white/75">
              Create your free account in under 2 minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" asChild
                className="h-14 rounded-xl bg-white text-blue-700 hover:bg-gray-100 text-base font-bold px-8 border-0">
                <a href="/services" className="flex items-center gap-2">
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild
                className="h-14 rounded-xl border-white/25 bg-white/10 text-white backdrop-blur hover:bg-white/20 text-base font-semibold px-8">
                <a href="/contact">Talk to Us</a>
              </Button>
            </div>
            <p className="text-sm text-white/50 pt-2">
              No credit card required · Free consultation · Cancel anytime
            </p>
          </div>
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
