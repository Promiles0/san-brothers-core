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
