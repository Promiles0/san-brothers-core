import type { ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { resolveServiceIntentDestination } from "@/lib/navigation/service-intents";

export function PageHero({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-border bg-linear-to-b from-primary/5 to-background">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-20">
        <h1 className="text-balance text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
        {subtitle ? (
          <p className="mt-4 max-w-2xl text-balance text-lg font-light text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </section>
  );
}

export function CtaBanner({
  title = "Ready to get started?",
  subtitle = "Create your free account in under 2 minutes.",
  href = "/signup",
  label = "Get Started",
  slug,
}: {
  title?: string;
  subtitle?: string;
  href?: string;
  label?: string;
  slug?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleClick = async () => {
    if (slug) {
      const destination = await resolveServiceIntentDestination(slug);
      void navigate(destination as never);
    } else if (href.startsWith("/signup")) {
      if (user) {
        void navigate({ to: "/dashboard/services", search: {} as never });
      } else {
        void navigate({ to: "/signup", search: { intent: "service" } as never });
      }
    } else {
      void navigate({ to: href as never });
    }
  };

  return (
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-14 text-center md:flex-row md:px-6 md:text-left">
        <div>
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h2>
          <p className="mt-2 text-primary-foreground/80">{subtitle}</p>
        </div>
        <Button size="lg" variant="secondary" onClick={handleClick}>
          {label}
        </Button>
      </div>
    </section>
  );
}

export function LandingCtaBanner({
  title = "Ready to get started?",
  subtitle = "Create your free account in under 2 minutes.",
  href = "/signup",
  label = "Get Started Free →",
  slug,
}: {
  title?: string;
  subtitle?: string;
  href?: string;
  label?: string;
  slug?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleClick = async () => {
    if (slug) {
      const destination = await resolveServiceIntentDestination(slug);
      void navigate(destination as never);
    } else if (href.startsWith("/signup")) {
      if (user) {
        void navigate({ to: "/dashboard/services", search: {} as never });
      } else {
        void navigate({ to: "/signup", search: { intent: "service" } as never });
      }
    } else {
      void navigate({ to: href as never });
    }
  };

  return (
    <section className="landing-cta-gradient relative overflow-hidden px-4 py-20 text-white sm:px-6">
      <div
        className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_25%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.18),transparent_25%)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto flex max-w-7xl flex-col items-center justify-between gap-8 rounded-4xl border border-white/10 bg-white/10 px-6 py-16 shadow-[0_40px_120px_rgba(15,23,42,0.3)] backdrop-blur-xl text-center md:flex-row md:text-left">
        <div className="max-w-2xl">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h2>
          <p className="mt-4 text-lg text-slate-100/90">{subtitle}</p>
        </div>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <Button
            onClick={handleClick}
            className="rounded-full bg-white text-slate-950 px-8 py-4 font-semibold text-sm shadow-[0_20px_80px_rgba(255,255,255,0.25)] hover:bg-slate-100"
          >
            {label}
          </Button>
          <p className="text-sm text-slate-200/90">No credit card required · Free consultation</p>
        </div>
      </div>
    </section>
  );
}
