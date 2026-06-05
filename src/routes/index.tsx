import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
  CheckCircle,
  Star,
  ChevronDown,
  Check,
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

// Intersection Observer hook for scroll animations
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

    document.querySelectorAll(".animate-fade-up").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);
}

// Counter animation hook
function useCountUp(target: number, duration: number = 2000) {
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

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [target, duration]);

  return { count, ref };
}

function StatCounter({ value, label }: { value: number; label: string }) {
  const { count, ref } = useCountUp(value);
  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl font-bold text-white md:text-4xl">{count}+</div>
      <div className="text-sm text-gray-300">{label}</div>
    </div>
  );
}

function Home() {
  const { t, tRaw } = useI18n();
  useIntersectionObserver();

  const services = [
    {
      icon: Plane,
      title: t("services.visa"),
      desc: t("home.serviceDesc.visa"),
      href: "/services/visa",
      color: "from-blue-500 to-blue-600",
      borderColor: "border-blue-500/20",
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-500",
    },
    {
      icon: Calculator,
      title: t("services.accounting"),
      desc: t("home.serviceDesc.accounting"),
      href: "/services/accounting",
      color: "from-green-500 to-green-600",
      borderColor: "border-green-500/20",
      bgColor: "bg-green-500/10",
      textColor: "text-green-500",
    },
    {
      icon: Languages,
      title: t("services.translation"),
      desc: t("home.serviceDesc.translation"),
      href: "/services/translation",
      color: "from-purple-500 to-purple-600",
      borderColor: "border-purple-500/20",
      bgColor: "bg-purple-500/10",
      textColor: "text-purple-500",
    },
    {
      icon: Briefcase,
      title: t("services.consultancy"),
      desc: t("home.serviceDesc.consultancy"),
      href: "/services/consultancy",
      color: "from-orange-500 to-orange-600",
      borderColor: "border-orange-500/20",
      bgColor: "bg-orange-500/10",
      textColor: "text-orange-500",
    },
  ];

  const why = [
    { icon: Globe, title: t("home.why.intl.title"), desc: t("home.why.intl.desc") },
    { icon: Clock, title: t("home.why.access.title"), desc: t("home.why.access.desc") },
    { icon: Languages, title: t("home.why.multi.title"), desc: t("home.why.multi.desc") },
    { icon: ShieldCheck, title: "Secure & Confidential", desc: "Bank-level security for all your documents" },
  ];

  const steps = [
    { icon: UserPlus, title: t("home.steps.register.title"), desc: t("home.steps.register.desc") },
    { icon: LayoutGrid, title: t("home.steps.choose.title"), desc: t("home.steps.choose.desc") },
    { icon: Upload, title: t("home.steps.upload.title"), desc: t("home.steps.upload.desc") },
    { icon: CheckCircle, title: t("home.steps.track.title"), desc: t("home.steps.track.desc") },
  ];

  const testimonials = [
    {
      quote: "San Brothers handled my student visa to China end to end. I never had to chase them for an update.",
      name: "Aline M.",
      loc: "Kigali",
      rating: 5,
    },
    {
      quote: "Their accounting team filed our taxes faster than our previous firm. Worth every franc.",
      name: "Jean Paul K.",
      loc: "Kigali",
      rating: 5,
    },
    {
      quote: "Got a Chinese-to-Kinyarwanda translator within minutes. The platform is a lifesaver for tourists.",
      name: "Wang Wei",
      loc: "Beijing",
      rating: 5,
    },
    {
      quote: "Company registration done in 2 weeks. Professional and transparent throughout.",
      name: "Marie C.",
      loc: "Paris",
      rating: 5,
    },
    {
      quote: "Best business consultancy in Kigali. They know Rwanda's market inside out.",
      name: "David O.",
      loc: "Lagos",
      rating: 5,
    },
    {
      quote: "Translation service is incredibly fast. Certified documents ready in 24 hours.",
      name: "Li Fang",
      loc: "Shanghai",
      rating: 5,
    },
  ];

  return (
    <PublicLayout>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }

        @keyframes float-slow {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }

        @keyframes float-slower {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-40px); }
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
          0%, 100% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(8px); opacity: 0.7; }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
          50% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.8); }
        }

        .animate-fade-up {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .animate-fade-up.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .float-1 { animation: float 6s ease-in-out infinite; }
        .float-2 { animation: float-slow 8s ease-in-out infinite 1s; }
        .float-3 { animation: float-slower 10s ease-in-out infinite 2s; }
        .float-4 { animation: float 7s ease-in-out infinite 0.5s; }

        .carousel-scroll {
          animation: scroll-carousel 40s linear infinite;
        }

        .carousel-scroll:hover {
          animation-play-state: paused;
        }

        .gradient-animated {
          background-size: 200% 200%;
          animation: gradient-shift 8s ease infinite;
        }

        .bounce-arrow {
          animation: bounce-down 2s ease-in-out infinite;
        }

        .glow-button {
          animation: glow-pulse 2s ease-in-out infinite;
        }

        .stagger-1 { animation-delay: 0.1s; }
        .stagger-2 { animation-delay: 0.2s; }
        .stagger-3 { animation-delay: 0.3s; }
        .stagger-4 { animation-delay: 0.4s; }

        .glass-morphism {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
        }

        .dark .glass-morphism {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .grid-pattern {
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 50px 50px;
        }

        .service-card-hover {
          transition: all 0.3s ease;
        }

        .service-card-hover:hover {
          transform: translateY(-8px);
        }

        .hero-gradient-orb-1 {
          position: absolute;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, transparent 70%);
          border-radius: 50%;
          filter: blur(60px);
          animation: float 15s ease-in-out infinite;
        }

        .hero-gradient-orb-2 {
          position: absolute;
          width: 250px;
          height: 250px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
          border-radius: 50%;
          filter: blur(50px);
          animation: float-slow 20s ease-in-out infinite;
        }

        .hero-gradient-orb-3 {
          position: absolute;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%);
          border-radius: 50%;
          filter: blur(40px);
          animation: float-slower 25s ease-in-out infinite;
        }
      `}</style>

      {/* HERO SECTION */}
      <section className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 grid-pattern">
        {/* Animated gradient orbs */}
        <div className="hero-gradient-orb-1 -top-20 -left-20" />
        <div className="hero-gradient-orb-2 top-1/3 right-1/4" />
        <div className="hero-gradient-orb-3 bottom-1/4 left-1/3" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-20 md:px-6">
          <div className="grid gap-12 md:grid-cols-2 md:items-center min-h-[calc(100vh-120px)]">
            {/* Left content */}
            <div className="flex flex-col justify-center space-y-8">
              {/* Badge */}
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 backdrop-blur-sm">
                <span className="text-lg">🌍</span>
                <span className="text-sm font-medium text-blue-300">Trusted in 15+ Countries</span>
              </div>

              {/* Headline with staggered animation */}
              <div className="space-y-2">
                <h1 className="text-5xl font-bold text-white md:text-6xl lg:text-7xl leading-tight">
                  <span className="animate-fade-up stagger-1 inline-block">Your Trusted Partner</span>
                  <br />
                  <span className="animate-fade-up stagger-2 inline-block">for Global</span>
                  <br />
                  <span className="animate-fade-up stagger-3 inline-block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                    Professional Services
                  </span>
                </h1>
              </div>

              {/* Subheadline */}
              <p className="text-lg text-gray-300 max-w-xl animate-fade-up stagger-4">
                Accounting · Visa & Permits · Translation · Consultancy
                <br />
                <span className="text-gray-400">Built for Rwanda and the world.</span>
              </p>

              {/* Stats row */}
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4 py-6">
                <StatCounter value={1000} label="Clients" />
                <StatCounter value={15} label="Languages" />
                <StatCounter value={4} label="Services" />
                <StatCounter value={98} label="Success %" />
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button size="lg" className="glow-button bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0" asChild>
                  <a href="/services">Get Started Free →</a>
                </Button>
                <Button size="lg" variant="outline" className="border-gray-600 text-white hover:bg-gray-900" asChild>
                  <a href="/contact">Talk to Us</a>
                </Button>
              </div>

              {/* Trust line */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-300 pt-4">
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" /> Free consultation
                </span>
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" /> No hidden fees
                </span>
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-400" /> 24/7 online access
                </span>
              </div>
            </div>

            {/* Right side - Floating cards */}
            <div className="relative hidden md:block h-full min-h-[600px]">
              <div className="absolute inset-0 flex items-center justify-center">
                {/* Floating service cards */}
                <div className="float-1 absolute top-12 left-0 w-64">
                  <div className="glass-morphism rounded-2xl p-6 border border-green-500/30">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">🛂</span>
                      <span className="text-sm font-semibold text-white">Visa Approved</span>
                    </div>
                    <div className="flex justify-end">
                      <Check className="h-5 w-5 text-green-400" />
                    </div>
                  </div>
                </div>

                <div className="float-2 absolute top-32 right-0 w-64">
                  <div className="glass-morphism rounded-2xl p-6 border border-blue-500/30">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">📊</span>
                      <span className="text-sm font-semibold text-white">Tax Filed</span>
                    </div>
                    <div className="flex justify-end">
                      <Check className="h-5 w-5 text-blue-400" />
                    </div>
                  </div>
                </div>

                <div className="float-3 absolute bottom-32 left-12 w-64">
                  <div className="glass-morphism rounded-2xl p-6 border border-purple-500/30">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">🌐</span>
                      <span className="text-sm font-semibold text-white">Translated in 3min</span>
                    </div>
                    <div className="flex justify-end">
                      <Check className="h-5 w-5 text-purple-400" />
                    </div>
                  </div>
                </div>

                <div className="float-4 absolute bottom-12 right-8 w-64">
                  <div className="glass-morphism rounded-2xl p-6 border border-orange-500/30">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">🏢</span>
                      <span className="text-sm font-semibold text-white">Company Registered</span>
                    </div>
                    <div className="flex justify-end">
                      <Check className="h-5 w-5 text-orange-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Language flags at bottom */}
          <div className="flex justify-center gap-6 py-8 border-t border-gray-800">
            <span className="text-lg">🇬🇧 EN</span>
            <span className="text-lg">🇨🇳 中文</span>
            <span className="text-lg">🇷🇼 RW</span>
            <span className="text-lg">🇫🇷 FR</span>
            <span className="text-lg">🇸🇦 AR</span>
          </div>

          {/* Scroll indicator */}
          <div className="flex justify-center pt-8">
            <div className="bounce-arrow text-gray-400">
              <ChevronDown className="h-6 w-6" />
            </div>
          </div>
        </div>
      </section>

      {/* STATS BANNER */}
      <section className="w-full bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 text-center">
            <div className="border-r border-blue-700/50 last:border-r-0">
              <div className="text-3xl font-bold text-white md:text-4xl">1,000+</div>
              <div className="text-sm text-blue-200">Clients Served</div>
            </div>
            <div className="border-r border-blue-700/50 last:border-r-0">
              <div className="text-3xl font-bold text-white md:text-4xl">15+</div>
              <div className="text-sm text-blue-200">Languages</div>
            </div>
            <div className="border-r border-blue-700/50 last:border-r-0">
              <div className="text-3xl font-bold text-white md:text-4xl">98%</div>
              <div className="text-sm text-blue-200">Success Rate</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white md:text-4xl">4</div>
              <div className="text-sm text-blue-200">Service Areas</div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES SECTION */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="mb-12 space-y-2">
          <p className="text-sm font-semibold text-blue-500 uppercase tracking-wider">WHAT WE DO</p>
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white md:text-5xl">
            Services Built for Your Success
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            From visas to accounting, we handle the complexity.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {services.map((s, idx) => (
            <div
              key={s.title}
              className={`animate-fade-up service-card-hover stagger-${(idx % 4) + 1}`}
            >
              <Card className={`group h-full border-2 ${s.borderColor} bg-gradient-to-br from-white/50 to-white/30 dark:from-gray-900/50 dark:to-gray-800/30 backdrop-blur-sm transition-all duration-300`}>
                <CardContent className="flex flex-col gap-4 p-6">
                  <div className={`grid h-16 w-16 place-items-center rounded-xl bg-gradient-to-br ${s.color} text-white`}>
                    <s.icon className="h-8 w-8" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">{s.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{s.desc}</p>
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Check className={`h-4 w-4 ${s.textColor}`} />
                      <span>Expert professionals</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className={`h-4 w-4 ${s.textColor}`} />
                      <span>Fast processing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className={`h-4 w-4 ${s.textColor}`} />
                      <span>24/7 support</span>
                    </div>
                  </div>
                  <a href={s.href} className={`text-sm font-medium ${s.textColor} hover:underline pt-2`}>
                    Learn more →
                  </a>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* WHY SAN BROTHERS SECTION */}
      <section className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            {/* Left: Text block */}
            <div className="space-y-6 animate-fade-up">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
                Why thousands trust San Brothers
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                We combine international expertise with local knowledge to deliver professional services that exceed expectations. Our team is committed to making complex processes simple and transparent.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                📍 Florida House, 2nd Floor, KN 70 Street, Kigali
              </p>
            </div>

            {/* Right: Feature list */}
            <div className="space-y-6">
              {why.map((w, idx) => (
                <div key={w.title} className={`animate-fade-up stagger-${(idx % 4) + 1} flex gap-4`}>
                  <div className="flex-shrink-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                      <w.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{w.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{w.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="mb-12 space-y-2">
          <p className="text-sm font-semibold text-blue-500 uppercase tracking-wider">THE PROCESS</p>
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white md:text-5xl">
            Get started in 4 simple steps
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {steps.map((s, i) => (
            <div
              key={s.title}
              className={`animate-fade-up stagger-${(i % 4) + 1} relative`}
            >
              {/* Connecting line (hidden on mobile) */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[calc(50%+24px)] right-[calc(-100%)] h-1 bg-gradient-to-r from-blue-500 to-transparent" />
              )}

              <Card className="relative z-10 bg-gradient-to-br from-white/50 to-white/30 dark:from-gray-900/50 dark:to-gray-800/30 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
                <CardContent className="flex flex-col gap-4 p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm">
                      {i + 1}
                    </div>
                    <div className="grid h-12 w-12 place-items-center rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                      <s.icon className="h-6 w-6" />
                    </div>
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{s.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{s.desc}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-20">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mb-12 space-y-2">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white">What Our Clients Say</h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">Real stories from real clients</p>
          </div>

          {/* Desktop carousel */}
          <div className="hidden md:block overflow-hidden">
            <div className="carousel-scroll flex gap-6">
              {[...testimonials, ...testimonials].map((tt, idx) => (
                <div key={idx} className="flex-shrink-0 w-96">
                  <Card className="glass-morphism h-full border-gray-200/50 dark:border-gray-700/50">
                    <CardContent className="flex flex-col gap-4 p-6">
                      <div className="flex gap-1 text-yellow-400">
                        {Array.from({ length: tt.rating }).map((_, i) => (
                          <Star key={i} className="h-4 w-4 fill-current" />
                        ))}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">"{tt.quote}"</p>
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">{tt.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{tt.loc}</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile grid */}
          <div className="md:hidden grid gap-6 grid-cols-1">
            {testimonials.slice(0, 3).map((tt) => (
              <Card key={tt.name} className="glass-morphism border-gray-200/50 dark:border-gray-700/50">
                <CardContent className="flex flex-col gap-4 p-6">
                  <div className="flex gap-1 text-yellow-400">
                    {Array.from({ length: tt.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">"{tt.quote}"</p>
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{tt.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{tt.loc}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PARTNERSHIP BANNER */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-950 py-16">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div className="space-y-4">
              <p className="text-sm font-semibold text-blue-400 uppercase tracking-wider">In Partnership With</p>
              <h3 className="text-2xl font-bold text-white">Best of the Best Company Ltd</h3>
              <p className="text-gray-300">Product Shipping & Logistics · China Sourcing · Scholarships</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="glass-morphism rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">📦</div>
                <p className="text-xs text-gray-300">Shipping & Logistics</p>
              </div>
              <div className="glass-morphism rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">🏭</div>
                <p className="text-xs text-gray-300">China Sourcing</p>
              </div>
              <div className="glass-morphism rounded-lg p-4 text-center">
                <div className="text-2xl mb-2">🎓</div>
                <p className="text-xs text-gray-300">Scholarships</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 py-20 gradient-animated">
        <div className="mx-auto max-w-4xl px-4 text-center md:px-6">
          <h2 className="text-4xl font-bold text-white md:text-5xl">Ready to get started?</h2>
          <p className="mt-4 text-lg text-blue-100">Create your free account in under 2 minutes.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100" asChild>
              <a href="/services">Get Started Free →</a>
            </Button>
          </div>
          <p className="mt-6 text-sm text-blue-100">No credit card required · Free consultation</p>
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
