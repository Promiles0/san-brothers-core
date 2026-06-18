import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  Calculator,
  FileCheck2,
  Globe2,
  Languages,
  MessageCircle,
  Plane,
  Scale,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/layout/public-layout";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "San Brothers — Trusted Partner for Global Professional Services" },
      {
        name: "description",
        content:
          "Friendly, professional help with visas, accounting, translation, and business setup for clients in Rwanda and worldwide.",
      },
      { property: "og:title", content: "San Brothers — Global Professional Services" },
      {
        property: "og:description",
        content: "Visas, accounting, translation, and business support handled end to end.",
      },
    ],
  }),
  component: Home,
});

const services: {
  icon: LucideIcon;
  title: string;
  desc: string;
  href: string;
}[] = [
  {
    icon: Calculator,
    title: "Accounting Services",
    desc: "Bookkeeping, tax support, payroll, and clean reporting for growing teams.",
    href: "/services/accounting",
  },
  {
    icon: Plane,
    title: "Visa & Permit Facilitation",
    desc: "End-to-end application guidance, document checks, and timely submissions.",
    href: "/services/visa",
  },
  {
    icon: Languages,
    title: "Translation & Interpretation",
    desc: "Clear communication across English, Chinese, French, Kinyarwanda, and Arabic.",
    href: "/translate",
  },
  {
    icon: Building2,
    title: "Business Consultancy",
    desc: "Company registration, market entry, strategy, and local compliance planning.",
    href: "/consultancy",
  },
  {
    icon: FileCheck2,
    title: "Document Legalization",
    desc: "Apostille, notarization, certification, and official document preparation.",
    href: "/services",
  },
  {
    icon: Scale,
    title: "Trade Facilitation",
    desc: "Import, export, customs coordination, and practical cross-border support.",
    href: "/services",
  },
];

const processSteps = [
  {
    title: "Tell us what you need",
    desc: "Submit request online, any language, no office visit.",
  },
  {
    title: "We assign your expert",
    desc: "Specialist reviews, clear plan with timeline and pricing.",
  },
  {
    title: "Stay informed in real time",
    desc: "Track progress, proactive updates, no surprises.",
  },
  {
    title: "Receive your results",
    desc: "Digital or physical delivery, your choice.",
  },
];

const languages = [
  { flag: "🇬🇧", label: "English" },
  { flag: "🇨🇳", label: "中文" },
  { flag: "🇷🇼", label: "Kinyarwanda" },
  { flag: "🇫🇷", label: "Français" },
  { flag: "🇸🇦", label: "العربية" },
];

function Home() {
  useHomepageAnimations();

  return (
    <PublicLayout>
      <PageStyles />
      <div className="san-home">
        <ScrollProgress />
        <Hero />
        <StatsRow />
        <ServicesGrid />
        <Process />
        <LanguagesSection />
        <CtaSection />
        <StickyContact />
      </div>
    </PublicLayout>
  );
}

function useHomepageAnimations() {
  useEffect(() => {
    const animateCounter = (el: HTMLElement, target: number, duration: number) => {
      let start: number | null = null;
      const suffix = el.dataset.suffix ?? "";
      const format = el.dataset.format;

      const step = (timestamp: number) => {
        if (!start) start = timestamp;
        const progress = Math.min((timestamp - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const value = Math.floor(ease * target);
        el.textContent = `${format === "percent" ? value : value.toLocaleString()}${suffix}`;

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = `${format === "percent" ? target : target.toLocaleString()}${suffix}`;
        }
      };

      requestAnimationFrame(step);
    };

    const observed = new Set<Element>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || observed.has(entry.target)) return;
          observed.add(entry.target);
          entry.target.classList.add("visible");

          entry.target.querySelectorAll<HTMLElement>(".counter").forEach((counter) => {
            animateCounter(counter, Number(counter.dataset.target ?? 0), 1500);
          });
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -60px 0px",
      },
    );

    document
      .querySelectorAll(".anim-fade-up, .anim-fade-left, .anim-scale, .hero-title .line, .process-line")
      .forEach((el) => observer.observe(el));

    const heroTimer = window.setTimeout(() => {
      document.querySelectorAll(".hero .anim-fade-up, .hero-title .line").forEach((el) => {
        el.classList.add("visible");
      });
    }, 100);

    return () => {
      window.clearTimeout(heroTimer);
      observer.disconnect();
    };
  }, []);
}

function ScrollProgress() {
  useEffect(() => {
    const progressBar = document.querySelector<HTMLElement>(".scroll-progress");
    if (!progressBar) return;

    const updateProgress = () => {
      const scrolled = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.transform = `scaleX(${max > 0 ? Math.min(scrolled / max, 1) : 0})`;
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  return <div aria-hidden className="scroll-progress" />;
}

function Hero() {
  return (
    <section className="hero relative overflow-hidden">
      <div aria-hidden className="hero-glow hero-glow-one" />
      <div aria-hidden className="hero-glow hero-glow-two" />

      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-4 py-20 md:px-7 lg:grid-cols-[1.08fr_0.92fr] lg:py-24">
        <div className="relative z-10 text-center lg:text-left">
          <div className="anim-fade-up hero-badge">
            <span className="badge-dot" />
            Trusted in 15+ Countries
          </div>

          <h1 className="hero-title mt-6 text-[clamp(2.25rem,7vw,5.75rem)] font-extrabold leading-[0.98] text-white">
            <span className="line delay-1">
              <span>Your Trusted</span>
            </span>
            <span className="line delay-2">
              <span>Partner for Global</span>
            </span>
            <span className="line delay-3">
              <span>Professional Services</span>
            </span>
          </h1>

          <p className="anim-fade-up delay-4 mx-auto mt-6 max-w-2xl text-base leading-8 text-white/60 sm:text-lg lg:mx-0">
            Visa facilitation, accounting, translation, and business consultancy handled by one
            trusted team for clients across Rwanda and the world.
          </p>

          <div className="anim-fade-up delay-5 mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Button asChild size="lg" className="home-primary-btn h-12 gap-2 px-7 text-base">
              <Link to="/signup" search={undefined}>
                Get started free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="home-secondary-btn h-12 gap-2 px-7 text-base">
              <Link to="/contact">
                Talk to an expert
                <MessageCircle className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <ul className="anim-fade-up delay-6 mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-white/58 lg:justify-start">
            {["Free consultation", "No hidden fees", "24/7 online access"].map((item) => (
              <li key={item} className="inline-flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-[var(--green)]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative hidden h-[520px] lg:block">
          <FloatingCard
            className="card-one delay-card-1"
            icon={Plane}
            tag="Visa"
            title="Visa submitted"
            status="On time"
            tone="green"
          />
          <FloatingCard
            className="card-two delay-card-2"
            icon={Languages}
            tag="Translation"
            title="Diploma translated"
            status="Done in 18 hrs"
            tone="blue"
          />
          <FloatingCard
            className="card-three delay-card-3"
            icon={BriefcaseBusiness}
            tag="Consultancy"
            title="Company registered"
            status="Official"
            tone="green"
          />
        </div>
      </div>
    </section>
  );
}

function FloatingCard({
  className,
  icon: Icon,
  tag,
  title,
  status,
  tone,
}: {
  className: string;
  icon: LucideIcon;
  tag: string;
  title: string;
  status: string;
  tone: "blue" | "green";
}) {
  return (
    <div className={`float-card anim-fade-up ${className}`}>
      <div className="flex items-center gap-3">
        <div className="float-icon">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/45">{tag}</div>
          <div className="mt-1 text-base font-semibold text-white">{title}</div>
        </div>
      </div>
      <div className={`status-pill ${tone === "green" ? "status-green" : "status-blue"}`}>
        <span className="pill-dot" />
        {status}
      </div>
    </div>
  );
}

function StatsRow() {
  const stats = [
    { target: 1500, suffix: "+", label: "Clients served" },
    { target: 15, suffix: "+", label: "Countries" },
    { target: 98, suffix: "%", label: "Satisfaction rate", format: "percent" },
    { target: 24, suffix: "/7", label: "Online access" },
  ];

  return (
    <section className="bg-[var(--navy)] px-4 md:px-7">
      <div className="stats-row anim-fade-up mx-auto max-w-7xl">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-item">
            <div
              className="counter stat-number"
              data-target={stat.target}
              data-suffix={stat.suffix}
              data-format={stat.format}
            >
              0{stat.suffix}
            </div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ServicesGrid() {
  const delays = ["0ms", "120ms", "240ms", "60ms", "180ms", "300ms"];

  return (
    <section className="section-block bg-[var(--navy)]">
      <div className="mx-auto max-w-7xl px-4 md:px-7">
        <SectionHeader
          eyebrow="What we do"
          title="Professional services, coordinated end to end"
          subtitle="One accountable team for paperwork, translation, compliance, and business support."
        />

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <Link
              key={service.title}
              to={service.href}
              className="service-card anim-fade-up group"
              style={{ transitionDelay: delays[index] }}
            >
              <div className="service-icon">
                <service.icon className="h-6 w-6" />
              </div>
              <h3>{service.title}</h3>
              <p>{service.desc}</p>
              <span className="service-arrow">
                Explore <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Process() {
  return (
    <section className="section-block bg-[var(--navy2)]">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 md:px-7 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <SectionHeader
          eyebrow="How it works"
          title="A clear process from request to result"
          subtitle="You always know what is happening, who is responsible, and what comes next."
        />

        <div className="process-list">
          <div aria-hidden className="process-line" />
          {processSteps.map((step, index) => (
            <div
              key={step.title}
              className="process-item anim-fade-left"
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="process-number">{String(index + 1).padStart(2, "0")}</div>
              <div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LanguagesSection() {
  return (
    <section className="section-block bg-[var(--navy)]">
      <div className="mx-auto max-w-7xl px-4 text-center md:px-7">
        <SectionHeader
          align="center"
          eyebrow="Languages"
          title="Speak to us in the language that fits"
          subtitle="Multilingual support for clients, partners, families, and institutions."
        />

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {languages.map((language, index) => (
            <span
              key={language.label}
              className="lang-pill anim-scale"
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              <span aria-hidden>{language.flag}</span>
              {language.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="cta-section bg-[var(--navy2)] px-4 py-20 md:px-7 md:py-24">
      <div aria-hidden className="cta-glow" />
      <div className="cta-box anim-fade-up">
        <h2>Ready to get started?</h2>
        <p>Book a free consultation today. No commitments, just clarity.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="home-primary-btn h-12 gap-2 px-7 text-base">
            <Link to="/signup" search={undefined}>
              Book free consultation
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="home-secondary-btn h-12 px-7 text-base">
            <Link to="/about">Learn more</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  align?: "left" | "center";
}) {
  return (
    <div className={`anim-fade-up max-w-2xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      <span className="section-eyebrow">{eyebrow}</span>
      <h2 className="mt-4 text-balance text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-8 text-white/58 sm:text-lg">{subtitle}</p>
    </div>
  );
}

function StickyContact() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-end px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:hidden">
      <Link
        to="/contact"
        className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-950/40 transition-transform active:scale-95"
      >
        <MessageCircle className="h-4 w-4" />
        Chat with us
      </Link>
    </div>
  );
}

function PageStyles() {
  return (
    <style>{`
      .san-home {
        --navy: #0d1b2e;
        --navy2: #111c2e;
        --accent: #3b7cf6;
        --accent2: #5b9aff;
        --green: #1dcf82;
        --white: #ffffff;
        --muted: rgba(255,255,255,0.55);
        --card-bg: rgba(255,255,255,0.05);
        --card-border: rgba(255,255,255,0.10);
        background: var(--navy);
        color: var(--white);
      }

      .scroll-progress {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #3b7cf6, #1dcf82);
        transform-origin: left;
        transform: scaleX(0);
        z-index: 999;
      }

      .hero {
        background:
          radial-gradient(circle at 80% 18%, rgba(59,124,246,0.18), transparent 30rem),
          radial-gradient(circle at 18% 85%, rgba(29,207,130,0.10), transparent 24rem),
          linear-gradient(180deg, var(--navy), var(--navy2));
      }
      .hero-glow {
        position: absolute;
        pointer-events: none;
        border-radius: 999px;
        filter: blur(42px);
        opacity: 0.65;
      }
      .hero-glow-one {
        right: 8%;
        top: 14%;
        width: 18rem;
        height: 18rem;
        background: rgba(59,124,246,0.18);
      }
      .hero-glow-two {
        left: 5%;
        bottom: 6%;
        width: 16rem;
        height: 16rem;
        background: rgba(29,207,130,0.11);
      }

      .hero-badge,
      .section-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        border: 1px solid var(--card-border);
        background: var(--card-bg);
        color: rgba(255,255,255,0.72);
        border-radius: 999px;
        padding: 0.5rem 0.85rem;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        backdrop-filter: blur(12px);
      }
      .badge-dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: var(--accent);
        animation: pulse 2s ease-in-out infinite;
      }

      .hero-title .line {
        display: block;
        overflow: hidden;
      }
      .hero-title .line span {
        display: block;
        opacity: 0;
        transform: translateY(44px);
        transition: opacity .72s ease, transform .72s ease;
      }
      .hero-title .line.visible span {
        opacity: 1;
        transform: translateY(0);
      }

      .anim-fade-up {
        opacity: 0;
        transform: translateY(28px);
        transition: opacity .65s ease, transform .65s ease;
      }
      .anim-fade-up.visible {
        opacity: 1;
        transform: translateY(0);
      }
      .anim-fade-left {
        opacity: 0;
        transform: translateX(-32px);
        transition: opacity .65s ease, transform .65s ease;
      }
      .anim-fade-left.visible {
        opacity: 1;
        transform: translateX(0);
      }
      .anim-scale {
        opacity: 0;
        transform: scale(0.84);
        transition: opacity .45s ease, transform .45s ease;
      }
      .anim-scale.visible {
        opacity: 1;
        transform: scale(1);
      }
      .delay-1 { transition-delay: 100ms; }
      .delay-2 { transition-delay: 220ms; }
      .delay-3 { transition-delay: 340ms; }
      .delay-4 { transition-delay: 500ms; }
      .delay-5 { transition-delay: 650ms; }
      .delay-6 { transition-delay: 800ms; }
      .delay-card-1 { transition-delay: 400ms; }
      .delay-card-2 { transition-delay: 500ms; }
      .delay-card-3 { transition-delay: 700ms; }

      .home-primary-btn {
        border: 0;
        background: linear-gradient(135deg, var(--accent), #2966d8);
        color: white;
        box-shadow: 0 18px 36px rgba(59,124,246,0.28);
      }
      .home-primary-btn:hover {
        background: linear-gradient(135deg, var(--accent2), var(--accent));
      }
      .home-secondary-btn {
        border-color: var(--card-border);
        background: rgba(255,255,255,0.04);
        color: white;
        backdrop-filter: blur(12px);
      }
      .home-secondary-btn:hover {
        background: rgba(255,255,255,0.09);
        color: white;
      }

      .float-card {
        position: absolute;
        background: rgba(255,255,255,0.07);
        border: 1px solid rgba(255,255,255,0.13);
        border-radius: 18px;
        padding: 20px 24px;
        backdrop-filter: blur(12px);
        box-shadow: 0 16px 40px rgba(0,0,0,0.24);
      }
      .float-card:hover {
        transform: translateY(-6px) scale(1.03);
        box-shadow: 0 24px 48px rgba(0,0,0,0.35);
      }
      .card-one { top: 30px; left: 0; width: 210px; }
      .card-two { top: 175px; right: 20px; width: 230px; }
      .card-three { top: 360px; left: 50px; width: 240px; }
      .float-icon {
        display: grid;
        width: 44px;
        height: 44px;
        place-items: center;
        border-radius: 14px;
        background: rgba(59,124,246,0.16);
        color: var(--accent2);
      }
      .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        margin-top: 1rem;
        border-radius: 999px;
        padding: 0.28rem 0.58rem;
        font-size: 0.75rem;
        font-weight: 700;
      }
      .status-green { background: rgba(29,207,130,0.16); color: var(--green); }
      .status-blue { background: rgba(59,124,246,0.16); color: var(--accent2); }
      .pill-dot {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: currentColor;
        animation: blink 1.9s ease-in-out infinite;
      }

      .stats-row {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        border-top: 1px solid var(--card-border);
        border-bottom: 1px solid var(--card-border);
      }
      .stat-item {
        min-height: 142px;
        display: grid;
        place-items: center;
        align-content: center;
        border-right: 1px solid var(--card-border);
        text-align: center;
      }
      .stat-item:last-child { border-right: 0; }
      .stat-number {
        color: var(--accent2);
        font-size: clamp(2rem, 4vw, 3.25rem);
        font-weight: 800;
        line-height: 1;
      }
      .stat-label {
        margin-top: 0.65rem;
        color: var(--muted);
        font-size: 0.9rem;
      }

      .section-block {
        padding: 6rem 0;
      }
      .service-card {
        display: flex;
        min-height: 260px;
        flex-direction: column;
        border: 1px solid var(--card-border);
        border-radius: 18px;
        background: var(--card-bg);
        padding: 1.55rem;
        color: white;
        text-decoration: none;
        transition-property: opacity, transform, background, border-color;
      }
      .service-card:hover {
        background: rgba(59,124,246,0.09);
        border-color: rgba(59,124,246,0.3);
        transform: translateY(-4px);
      }
      .service-icon {
        display: grid;
        width: 3rem;
        height: 3rem;
        place-items: center;
        border-radius: 14px;
        background: rgba(59,124,246,0.14);
        color: var(--accent2);
      }
      .service-card h3,
      .process-item h3 {
        margin-top: 1.35rem;
        font-size: 1.15rem;
        font-weight: 800;
        line-height: 1.25;
      }
      .service-card p,
      .process-item p {
        margin-top: 0.65rem;
        color: var(--muted);
        line-height: 1.75;
      }
      .service-arrow {
        margin-top: auto;
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        color: var(--accent2);
        font-size: 0.9rem;
        font-weight: 700;
      }

      .process-list {
        position: relative;
        display: grid;
        gap: 1.35rem;
      }
      .process-line {
        position: absolute;
        left: 21px;
        top: 44px;
        bottom: 44px;
        width: 1px;
        background: linear-gradient(to bottom, #3b7cf6, #1dcf82);
        opacity: 0;
        transition: opacity .8s ease;
      }
      .process-line.visible { opacity: 0.35; }
      .process-item {
        position: relative;
        display: grid;
        grid-template-columns: 44px 1fr;
        gap: 1.1rem;
      }
      .process-number {
        z-index: 1;
        display: grid;
        width: 44px;
        height: 44px;
        place-items: center;
        border: 1px solid rgba(59,124,246,0.3);
        border-radius: 50%;
        background: rgba(59,124,246,0.14);
        color: var(--accent2);
        font-size: 13px;
        font-weight: 700;
      }
      .process-item h3 { margin-top: 0.2rem; }

      .lang-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        border: 1px solid var(--card-border);
        border-radius: 999px;
        background: var(--card-bg);
        padding: 0.8rem 1.05rem;
        color: rgba(255,255,255,0.78);
        font-weight: 700;
      }
      .lang-pill:hover {
        border-color: rgba(59,124,246,0.45);
        background: rgba(59,124,246,0.07);
        transform: scale(1.06);
      }

      .cta-section {
        position: relative;
        overflow: hidden;
      }
      .cta-glow {
        position: absolute;
        left: 50%;
        top: 50%;
        width: 600px;
        height: 300px;
        pointer-events: none;
        transform: translate(-50%, -50%);
        background: radial-gradient(ellipse, rgba(59,124,246,0.11) 0%, transparent 70%);
      }
      .cta-box {
        position: relative;
        max-width: 660px;
        margin: 0 auto;
        border: 1px solid var(--card-border);
        border-radius: 26px;
        background: rgba(255,255,255,0.05);
        padding: 64px 52px;
        text-align: center;
        backdrop-filter: blur(12px);
      }
      .cta-box h2 {
        font-size: clamp(2rem, 5vw, 3.75rem);
        font-weight: 800;
        line-height: 1.04;
        color: white;
      }
      .cta-box p {
        margin: 1rem auto 0;
        max-width: 31rem;
        color: var(--muted);
        font-size: 1.1rem;
      }

      @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.25} }
      @keyframes pulse {
        0%,100% { box-shadow: 0 0 0 0 rgba(59,124,246,0.6); }
        50% { box-shadow: 0 0 0 6px rgba(59,124,246,0); }
      }

      @media (max-width: 900px) {
        .section-block { padding: 4.5rem 0; }
        .stats-row { grid-template-columns: repeat(2, 1fr); }
        .stat-item:nth-child(2) { border-right: 0; }
        .stat-item:nth-child(-n+2) { border-bottom: 1px solid var(--card-border); }
      }

      @media (max-width: 560px) {
        .section-block { padding: 4rem 0; }
        .hero-title { font-size: 36px; }
        .cta-box { padding: 44px 24px; border-radius: 20px; }
      }

      @media (prefers-reduced-motion: reduce) {
        .scroll-progress,
        .anim-fade-up,
        .anim-fade-left,
        .anim-scale,
        .hero-title .line span,
        .float-card,
        .service-card,
        .process-line,
        .lang-pill,
        .badge-dot,
        .pill-dot {
          animation: none !important;
          transition: none !important;
        }
        .anim-fade-up,
        .anim-fade-left,
        .anim-scale,
        .hero-title .line span {
          opacity: 1 !important;
          transform: none !important;
        }
      }
    `}</style>
  );
}
