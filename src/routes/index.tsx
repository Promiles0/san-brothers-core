import { Suspense, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
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
  Star,
  Quote,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/layout/public-layout";
import { useI18n } from "@/lib/providers/i18n-provider";
import { supabase } from "@/lib/supabase";
import { Magnetic } from "@/components/fx/magnetic";

import { AnimatedCounter } from "@/components/fx/animated-counter";
import { ParallaxLayer } from "@/components/fx/parallax-layer";
import { RotatingText } from "@/components/fx/rotating-text";
import { DotGrid } from "@/components/fx/dot-grid";
import { Aurora } from "@/components/fx/aurora";
import { CursorSpotlight } from "@/components/fx/cursor-spotlight";

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

function Home() {
  return (
    <PublicLayout>
      <Hero />
      <StatsStrip />
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
//  Hero
// ────────────────────────────────────────────────────────────

function Hero() {
  const { t, tRaw } = useI18n();
  const rotatingPhrases = (() => {
    try {
      const v = tRaw<string[]>("home.heroRotatingPhrases");
      return Array.isArray(v) && v.length ? v : [t("home.heroTitle")];
    } catch {
      return [t("home.heroTitle")];
    }
  })();

  // Cursor → ripple burst on logo click (handled inside Logo3DScene by lifting state).
  const stageRef = useRef<HTMLDivElement>(null);
  const rippleRef = useRef<HTMLDivElement>(null);

  const fireRipple = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    const ripple = rippleRef.current;
    if (!stage || !ripple) return;
    const r = stage.getBoundingClientRect();
    ripple.style.setProperty("--rx-x", `${clientX - r.left}px`);
    ripple.style.setProperty("--rx-y", `${clientY - r.top}px`);
    ripple.classList.remove("is-burst");
    void ripple.offsetWidth;
    ripple.classList.add("is-burst");
  };

  // Floating service glyphs at varied parallax depths.
  const glyphs: { icon: LucideIcon; cls: string; speed: number }[] = [
    { icon: Plane, cls: "left-[6%] top-[18%] text-primary", speed: -0.35 },
    { icon: Languages, cls: "right-[8%] top-[10%] text-accent", speed: 0.25 },
    { icon: Calculator, cls: "left-[12%] bottom-[14%] text-emerald-500", speed: 0.4 },
    { icon: Briefcase, cls: "right-[10%] bottom-[18%] text-amber-500", speed: -0.2 },
    { icon: Globe, cls: "left-[45%] top-[6%] text-primary", speed: 0.15 },
  ];

  return (
    <section
      className="relative overflow-hidden border-b border-border bg-gradient-to-b from-secondary/40 via-background to-background"
      data-fx-skip
    >
      {/* Aurora drift behind everything */}
      <Aurora tone="mixed" opacity={0.32} />

      {/* Warped dot-grid that reacts to the cursor */}
      <DotGrid
        className="text-foreground/55 dark:text-foreground/40"
        spacing={28}
        dotSize={1.3}
        radius={170}
        strength={16}
        repel
      />

      {/* Floating service glyphs */}
      {glyphs.map(({ icon: Icon, cls, speed }, idx) => (
        <ParallaxLayer
          key={idx}
          speed={speed}
          aria-hidden
          className={`pointer-events-none absolute hidden md:block ${cls}`}
        >
          <span className="fx-glyph block opacity-[0.10] dark:opacity-[0.14]" style={{ animationDelay: `${idx * 1.4}s` }}>
            <Icon className="h-16 w-16" />
          </span>
        </ParallaxLayer>
      ))}

      <div className="relative mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-28">
        <div className="grid items-center gap-12 md:grid-cols-2" data-fx-skip>
          {/* Copy */}
          <div data-fx="slide-right" data-fx-once="true" className="text-center md:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              Trusted in 15+ countries
            </span>
            <h1 className="mt-6 text-balance text-4xl font-black leading-[1.05] tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl">
              <RotatingText phrases={rotatingPhrases} />
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg md:mx-0">
              {t("home.heroSubtitle")}
            </p>

            <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row md:justify-start">
              <Magnetic strength={18}>
                <Button
                  asChild
                  size="lg"
                  className="h-12 gap-2 px-7 text-base shadow-lg shadow-primary/30 transition-shadow hover:shadow-primary/50"
                >
                  <Link to="/signup" search={undefined}>
                    Get started free
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </Magnetic>
              <Magnetic strength={14}>
                <Button asChild size="lg" variant="outline" className="h-12 gap-2 px-7 text-base">
                  <Link to="/contact">
                    <MessageCircle className="h-4 w-4" />
                    Talk to an expert
                  </Link>
                </Button>
              </Magnetic>
            </div>

            <div className="mt-4 flex justify-center md:justify-start">
              <a
                href="https://wa.me/250788453192"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
              >
                <MessageCircle className="h-4 w-4" />
                Chat with us on WhatsApp →
              </a>
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

          {/* 3D logo stage */}
          <div
            ref={stageRef}
            data-fx="zoom"
            data-fx-once="true"
            className="fx-logo-stage relative mx-auto h-[260px] w-full max-w-sm sm:h-[320px] md:h-[430px] md:max-w-md"
            onPointerDown={(e) => fireRipple(e.clientX, e.clientY)}
          >
            {/* cursor-following soft light inside the stage only */}
            <CursorSpotlight size={320} blend="screen" />
            <Logo3DScene />
            {/* click ripple layer */}
            <div ref={rippleRef} className="fx-logo-ripple" aria-hidden />
          </div>
        </div>

        {/* Language strip */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 border-t border-border pt-8 text-sm text-muted-foreground">
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

// ────────────────────────────────────────────────────────────
//  3D Logo — cursor-tilt + magnetic pull
// ────────────────────────────────────────────────────────────

function Logo3DScene() {
  // pointer state shared with the Logo3D mesh via ref
  const pointer = useRef({ x: 0, y: 0 });

  return (
    <Canvas
      aria-label="San Brothers logo"
      camera={{ position: [0, 0, 6.2], fov: 38 }}
      dpr={[1, 1.8]}
      gl={{ alpha: true, antialias: true }}
      style={{ background: "transparent" }}
      onPointerMove={(e) => {
        const target = e.currentTarget as HTMLElement;
        const r = target.getBoundingClientRect();
        pointer.current.x = ((e.clientX - r.left) / r.width) * 2 - 1;
        pointer.current.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      }}
      onPointerLeave={() => {
        pointer.current.x = 0;
        pointer.current.y = 0;
      }}
    >
      <ambientLight intensity={1.9} />
      <directionalLight position={[3, 4, 5]} intensity={2.25} />
      <directionalLight position={[-3, -1, 2]} intensity={0.75} color="#ff4b3f" />
      <Suspense fallback={null}>
        <Logo3D pointer={pointer} />
      </Suspense>
    </Canvas>
  );
}

function Logo3D({ pointer }: { pointer: React.MutableRefObject<{ x: number; y: number }> }) {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useLoader(THREE.TextureLoader, "/sanlogo-Photoroom.png");

  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;

  useFrame(({ clock }, delta) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.getElapsedTime();

    // idle drift
    const idleY = Math.sin(t * 0.55) * 0.18;
    const idleX = Math.sin(t * 0.4) * 0.045 - 0.04;

    // cursor-driven targets
    const tx = idleY + pointer.current.x * 0.5;
    const ty = idleX - pointer.current.y * 0.4;
    const tz = pointer.current.x * 0.18; // small parallax push

    // damped lerp toward target
    const k = Math.min(1, delta * 4);
    g.rotation.y += (tx - g.rotation.y) * k;
    g.rotation.x += (ty - g.rotation.x) * k;
    g.position.x += (pointer.current.x * 0.15 - g.position.x) * k;
    g.position.y += (-pointer.current.y * 0.12 - g.position.y) * k;
    g.position.z += (tz - g.position.z) * k;

    g.scale.setScalar(1 + Math.sin(t * 0.8) * 0.018);
  });

  const image = texture.image as HTMLImageElement | undefined;
  const aspect = image?.width && image?.height ? image.width / image.height : 1;
  const width = 4.65;
  const height = width / aspect;

  return (
    <group ref={groupRef} rotation={[0, -0.08, 0]}>
      <mesh position={[0.1, -0.12, -0.16]} scale={[1.01, 1.01, 1]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} transparent opacity={0.22} color="#160000" depthWrite={false} />
      </mesh>
      <mesh>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial
          map={texture}
          transparent
          roughness={0.38}
          metalness={0.04}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ────────────────────────────────────────────────────────────
//  Editorial counter band
// ────────────────────────────────────────────────────────────

function StatsStrip() {
  const stats = [
    { value: 500, suffix: "+", label: "Clients served" },
    { value: 15, suffix: "+", label: "Countries reached" },
    { value: 17, suffix: "", label: "Services offered" },
    { value: 98, suffix: "%", label: "On-time delivery" },
  ];
  const marqueeWords = [
    "Visa applicants",
    "Importers",
    "Diaspora families",
    "Investors",
    "Students",
    "NGOs",
    "Embassies",
    "Founders",
    "Translators",
    "Consultants",
  ];
  return (
    <section className="relative overflow-hidden border-y border-accent/30 bg-foreground text-background">
      {/* Marquee back-texture */}
      <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center opacity-[0.06]">
        <div className="fx-marquee fx-marquee-slow whitespace-nowrap text-[6rem] font-black tracking-tighter">
          {[...marqueeWords, ...marqueeWords].map((w, i) => (
            <span key={i} className="px-8">
              {w} ·
            </span>
          ))}
        </div>
      </div>

      <div className="relative mx-auto grid max-w-6xl grid-cols-2 divide-x divide-background/15 px-4 py-12 md:grid-cols-4 md:px-6 md:py-16">
        {stats.map((s, i) => (
          <div key={s.label} className={`px-4 text-center md:px-8 ${i === 0 ? "border-l-0" : ""}`}>
            <AnimatedCounter
              to={s.value}
              suffix={s.suffix}
              className="block text-5xl font-black tracking-tight sm:text-6xl md:text-7xl"
            />
            <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-background/60 sm:text-xs">
              {s.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────
//  Services
// ────────────────────────────────────────────────────────────

type ServiceAccent = "blue" | "emerald" | "purple" | "amber";

const ACCENT: Record<
  ServiceAccent,
  { glow: string; ring: string; text: string; bg: string; iconBg: string; chipRing: string }
> = {
  blue: {
    glow: "from-blue-500/20",
    ring: "ring-blue-500/30",
    text: "text-blue-500",
    bg: "bg-blue-500",
    iconBg: "from-blue-500/15 to-blue-500/5",
    chipRing: "ring-blue-500/30",
  },
  emerald: {
    glow: "from-emerald-500/20",
    ring: "ring-emerald-500/30",
    text: "text-emerald-500",
    bg: "bg-emerald-500",
    iconBg: "from-emerald-500/15 to-emerald-500/5",
    chipRing: "ring-emerald-500/30",
  },
  purple: {
    glow: "from-purple-500/20",
    ring: "ring-purple-500/30",
    text: "text-purple-500",
    bg: "bg-purple-500",
    iconBg: "from-purple-500/15 to-purple-500/5",
    chipRing: "ring-purple-500/30",
  },
  amber: {
    glow: "from-amber-500/20",
    ring: "ring-amber-500/30",
    text: "text-amber-500",
    bg: "bg-amber-500",
    iconBg: "from-amber-500/15 to-amber-500/5",
    chipRing: "ring-amber-500/30",
  },
};

function ServicesGrid() {
  const { t } = useI18n();
  const services: {
    icon: LucideIcon;
    title: string;
    desc: string;
    outcome: string;
    href: string;
    accent: ServiceAccent;
  }[] = [
    {
      icon: Plane,
      title: t("services.visa"),
      desc: t("home.serviceDesc.visa"),
      outcome: "Student & work visas handled end to end",
      href: "/services/visa",
      accent: "blue",
    },
    {
      icon: Calculator,
      title: t("services.accounting"),
      desc: t("home.serviceDesc.accounting"),
      outcome: "Books, tax filing & monthly reports",
      href: "/services/accounting",
      accent: "emerald",
    },
    {
      icon: Languages,
      title: t("services.translation"),
      desc: t("home.serviceDesc.translation"),
      outcome: "Certified translation in 24 hours",
      href: "https://translate.sanbrothers.cn.com/",
      accent: "purple",
    },
    {
      icon: Briefcase,
      title: t("services.consultancy"),
      desc: t("home.serviceDesc.consultancy"),
      outcome: "Company registration & advisory",
      href: "https://consultancy.sanbrothers.cn.com/",
      accent: "amber",
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
          {services.map((s) => {
            const a = ACCENT[s.accent];
            return (
              <Link
                key={s.title}
                to={s.href}
                className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all duration-300 ease-out will-change-transform hover:-translate-y-1 hover:border-transparent hover:shadow-2xl hover:${a.ring} hover:ring-1`}
              >
                <span
                  aria-hidden
                  className={`pointer-events-none absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 ${a.bg} transition-transform duration-500 ease-out group-hover:scale-x-100`}
                />
                <span
                  aria-hidden
                  className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-radial ${a.glow} to-transparent opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100`}
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:24px_24px]"
                />

                <div className="relative flex items-start justify-between">
                  <div
                    className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${a.iconBg} ${a.text} ring-1 ${a.ring} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
                  >
                    <s.icon className="h-7 w-7" />
                  </div>
                  <div
                    className={`grid h-9 w-9 place-items-center rounded-full border border-border bg-background ${a.text} transition-all duration-300 group-hover:${a.bg} group-hover:text-white group-hover:border-transparent`}
                  >
                    <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </div>
                </div>

                <h3 className="relative mt-5 text-lg font-bold tracking-tight text-card-foreground">
                  {s.title}
                </h3>
                <p className="relative mt-1 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
                <div
                  className={`relative mt-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground ring-1 ${a.chipRing}`}
                >
                  <Sparkles className={`h-3 w-3 ${a.text}`} />
                  {s.outcome}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────
//  Why us — Bento grid
// ────────────────────────────────────────────────────────────

function WhyUs() {
  const { t } = useI18n();
  const feature = {
    icon: Globe,
    title: t("home.why.intl.title"),
    desc: t("home.why.intl.desc"),
  };
  const tiles: { icon: LucideIcon; title: string; desc: string }[] = [
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

        <div className="mt-12 grid auto-rows-[minmax(180px,_auto)] gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Feature tile spans 2 cols on lg */}
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-accent/10 p-8 sm:col-span-2 sm:row-span-2 lg:col-span-2">
            <span
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary/15 blur-3xl"
            />
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full bg-accent/15 blur-3xl"
            />
            <div className="relative">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
                <feature.icon className="h-7 w-7" />
              </div>
              <h3 className="mt-6 text-2xl font-black tracking-tight text-card-foreground md:text-3xl">
                {feature.title}
              </h3>
              <p className="mt-3 max-w-lg text-base leading-relaxed text-muted-foreground">
                {feature.desc}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["EN", "中文", "RW", "FR", "AR"].map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-xs font-semibold text-muted-foreground backdrop-blur"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {tiles.map((w, i) => (
            <div
              key={w.title}
              className={`group relative overflow-hidden rounded-3xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl ${
                i === 1 ? "lg:row-span-2" : ""
              }`}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-primary to-accent opacity-0 transition-opacity group-hover:opacity-100"
              />
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
    { icon: CheckCircle, title: t("home.steps.track.title"), desc: t("home.steps.track.desc") },
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
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 right-0 top-[3.25rem] hidden h-0.5 rounded-full bg-border lg:block"
          >
            <div className="process-track h-full rounded-full" style={{ ["--track" as string]: String(trackPct) }} />
          </div>

          <ol ref={containerRef} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li
                key={s.title}
                data-step={i}
                className={`process-step relative rounded-2xl border border-border bg-card/80 p-6 backdrop-blur transition-all duration-500 ${
                  lit[i] ? "is-lit border-primary/30 shadow-lg shadow-primary/10" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-10 w-10 place-items-center rounded-full text-sm font-bold transition-colors duration-500 ${
                      lit[i]
                        ? "bg-gradient-to-br from-primary to-accent text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
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
//  Social proof
// ────────────────────────────────────────────────────────────

interface FeaturedReview {
  id: string;
  rating: number;
  review_text: string;
  client_display_name: string;
  created_at: string;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 24 * 60 * 60 * 1000;
  const days = Math.floor(diff / day);
  if (days < 1) return "today";
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

interface PartnerLogo {
  name: string;
  src: string;
  bgColor: string;
}

const PARTNER_LOGOS: PartnerLogo[] = [
  { name: "Rwanda Development Board", src: "/logos/rdb.png", bgColor: "#FFFFFF" },
  { name: "Irembo Gov", src: "/logos/irembo-gov.png", bgColor: "#005FD3" },
  { name: "we the best ", src: "/logos/thebest .png", bgColor: "#FFFFFF" },
];

function PartnerLogoMarquee() {
  const trackLogos = [...PARTNER_LOGOS, ...PARTNER_LOGOS];
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card/30 py-8">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent sm:w-24" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent sm:w-24" />
      <div className="fx-marquee fx-marquee-pause gap-6 px-6 sm:gap-8">
        {trackLogos.map((logo, i) => (
          <div
            key={`${logo.name}-${i}`}
            className="flex h-16 shrink-0 items-center justify-center rounded-lg px-6 shadow-sm transition-transform duration-300 hover:scale-105 sm:h-20 sm:px-8"
            style={{ backgroundColor: logo.bgColor }}
          >
            <img src={logo.src} alt={logo.name} className="h-9 w-auto object-contain sm:h-11" loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
}

function SocialProof() {
  const { t } = useI18n();
  const [featured, setFeatured] = useState<FeaturedReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id, rating, review_text, client_display_name, created_at")
        .eq("status", "approved")
        .eq("is_featured", true)
        .order("created_at", { ascending: false })
        .limit(6);
      if (!cancelled) {
        setFeatured((data ?? []) as FeaturedReview[]);
        setLoadingReviews(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hero = featured[0];
  const rest = featured.slice(1);

  return (
    <section className="border-b border-border bg-secondary/40 py-20 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <SectionHeader
          eyebrow="Trusted by clients"
          title={t("home.testimonialsHeading")}
          subtitle="Clients across Rwanda and beyond rely on us for honest advice and reliable delivery."
          align="center"
        />

        {/* Editorial pull-quote (when at least one featured review exists) */}
        {hero ? (
          <figure className="relative mx-auto mt-12 max-w-4xl overflow-hidden rounded-3xl border border-border bg-card p-8 sm:p-12">
            <Quote
              aria-hidden
              className="absolute -left-2 -top-2 h-28 w-28 text-accent/15 sm:-left-4 sm:-top-4 sm:h-40 sm:w-40"
              strokeWidth={1}
            />
            <div className="relative">
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star
                    key={n}
                    className={`h-5 w-5 ${
                      n <= hero.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
              <blockquote className="mt-6 text-balance text-2xl font-medium leading-snug text-card-foreground sm:text-3xl md:text-4xl">
                “{hero.review_text}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3 text-sm">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {hero.client_display_name
                    .split(" ")
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-card-foreground">{hero.client_display_name}</div>
                  <div className="text-muted-foreground">{relativeTime(hero.created_at)}</div>
                </div>
              </figcaption>
            </div>
          </figure>
        ) : null}

        {/* Partner logos marquee */}
        <div className="mt-12">
          <div className="mb-6 flex justify-center">
            <span className="inline-block rounded-full border border-border bg-card px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent">
              Partners & recognition
            </span>
          </div>
          <PartnerLogoMarquee />
        </div>

        {/* Supporting reviews grid */}
        {loadingReviews ? (
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-live="polite">
            <span className="sr-only">{t("reviews.home.loading")}</span>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex animate-pulse flex-col gap-4 rounded-2xl border border-border bg-card p-6">
                <div className="flex items-center gap-1">
                  {[0, 1, 2, 3, 4].map((s) => (
                    <div key={s} className="h-4 w-4 rounded-sm bg-muted" />
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-muted" />
                  <div className="h-3 w-11/12 rounded bg-muted" />
                  <div className="h-3 w-2/3 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : rest.length > 0 ? (
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((r) => (
              <figure
                key={r.id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
              >
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`h-4 w-4 ${
                        n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <blockquote className="flex-1 text-sm italic leading-relaxed text-card-foreground">
                  “{r.review_text}”
                </blockquote>
                <figcaption className="flex items-center gap-3 border-t border-border pt-4">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {r.client_display_name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="text-xs">
                    <div className="font-semibold text-card-foreground">{r.client_display_name}</div>
                    <div className="text-muted-foreground">{relativeTime(r.created_at)}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : !hero ? (
          <div className="mt-12 flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-12 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10">
              <Star className="h-5 w-5 text-primary" />
            </div>
            <p className="max-w-md text-sm text-muted-foreground">{t("reviews.home.empty")}</p>
          </div>
        ) : null}
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
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl md:text-5xl">{t("home.ctaHeading")}</h2>
        <p className="mx-auto mt-4 max-w-xl text-base opacity-90 sm:text-lg">{t("home.ctaSubtitle")}</p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row">
          <Magnetic strength={18}>
            <Button asChild size="lg" variant="secondary" className="h-12 gap-2 px-7 text-base">
              <Link to="/signup" search={undefined}>
                Create free account
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </Magnetic>
          <Magnetic strength={14}>
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
          </Magnetic>
        </div>
      </div>
    </section>
  );
}

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
    <div className={`max-w-2xl ${align === "center" ? "mx-auto text-center" : "text-left"}`}>
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
