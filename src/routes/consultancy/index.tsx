import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Briefcase,
  Building2,
  FileText,
  TrendingUp,
  ClipboardCheck,
  Users,
  Shield,
  Clock,
  Award,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConsultancyLayout } from "@/components/layout/consultancy-layout";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/consultancy/")({
  head: () => ({
    meta: [
      { title: "Expert Business Solutions — San Brothers Consultancy" },
      {
        name: "description",
        content:
          "Company registration, business planning, trade & investment advisory. We speak your language.",
      },
      { property: "og:title", content: "Expert Business Solutions" },
      {
        property: "og:description",
        content: "Trusted consultancy for business owners and investors.",
      },
    ],
  }),
  component: ConsultancyHome,
});

async function handleApply(slug: string, navigate: ReturnType<typeof useNavigate>) {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    navigate({ to: "/dashboard/services", search: { apply: slug } as never });
  } else {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("signup_intent", slug);
      sessionStorage.setItem("signup_portal", "consultancy");
    }
    navigate({ to: "/signup", search: { intent: slug, portal: "consultancy" } as never });
  }
}

const SERVICES = [
  {
    slug: "company-registration",
    icon: Building2,
    title: "Company Registration",
    desc: "Set up your Rwandan LLC, branch office, or representative office end-to-end.",
  },
  {
    slug: "document-processing",
    icon: FileText,
    title: "Document Processing",
    desc: "Notarization, certification, and government document handling.",
  },
  {
    slug: "trade-investment",
    icon: TrendingUp,
    title: "Trade & Investment",
    desc: "Market entry support, RDB certification, investment incentives.",
  },
  {
    slug: "business-planning",
    icon: ClipboardCheck,
    title: "Business Planning",
    desc: "Feasibility studies, financial modeling, strategic roadmaps.",
  },
  {
    slug: "administrative-support",
    icon: Users,
    title: "Administrative Support",
    desc: "Ongoing back-office, HR, and compliance support packages.",
  },
];

function ConsultancyHome() {
  const navigate = useNavigate();
  const apply = (slug: string) => void handleApply(slug, navigate);

  return (
    <ConsultancyLayout>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-linear-to-b from-primary/5 via-background to-accent/10">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center md:px-6 md:py-28">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            San Brothers · Consultancy
          </div>
          <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Expert Business Solutions
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground md:text-xl">
            Register your company, plan your growth, and navigate Rwandan business regulations with
            experts who speak your language.
          </p>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Button
              size="lg"
              className="h-14 gap-2 px-6 text-base"
              onClick={() => apply("company-registration")}
            >
              <Building2 className="h-5 w-5" /> Register a Company
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 gap-2 px-6 text-base"
              onClick={() => apply("business-planning")}
            >
              <ClipboardCheck className="h-5 w-5" /> Business Planning
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 gap-2 px-6 text-base"
              onClick={() => apply("trade-investment")}
            >
              <TrendingUp className="h-5 w-5" /> Trade & Investment
            </Button>
          </div>
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
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">How it works</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Briefcase,
              title: "Choose your consultation",
              desc: "Pick the service that matches your goal — from company setup to ongoing support.",
            },
            {
              icon: Users,
              title: "Meet with our expert",
              desc: "We connect you with the right specialist within one business day.",
            },
            {
              icon: Award,
              title: "Get your solution",
              desc: "Clear deliverables, transparent pricing, and continuous support after.",
            },
          ].map((s, i) => (
            <Card key={s.title} className="text-center">
              <CardContent className="flex flex-col items-center gap-4 p-8">
                <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
                  <s.icon className="h-8 w-8" />
                </div>
                <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Step {i + 1}
                </div>
                <h3 className="text-xl font-semibold">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 md:px-6">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Our services</h2>
          <p className="mt-2 text-muted-foreground">Pick what fits your business stage.</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s) => (
              <Card key={s.slug} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col gap-4 p-6">
                  <div className="grid h-12 w-12 place-items-center rounded-md bg-primary/10 text-primary">
                    <s.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="flex-1 text-sm text-muted-foreground">{s.desc}</p>
                  <Button onClick={() => apply(s.slug)} className="mt-auto gap-2">
                    Get started <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
        <div className="grid gap-10 md:grid-cols-3">
          {[
            {
              icon: Shield,
              title: "Trusted experts",
              desc: "Years of experience supporting hundreds of businesses in Rwanda and East Africa.",
            },
            {
              icon: Clock,
              title: "Fast turnaround",
              desc: "Most filings completed within 5–10 business days, with clear milestone updates.",
            },
            {
              icon: Users,
              title: "Multilingual team",
              desc: "English, French, Chinese, Kinyarwanda, and Arabic — no language barriers.",
            },
          ].map((w) => (
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

      {/* CTA */}
      <section className="border-t border-border bg-linear-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center md:px-6">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Ready to grow your business?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Start with a free consultation — we'll match you with the right expert.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="h-12 gap-2 px-8"
              onClick={() => apply("business-planning")}
            >
              Talk to an expert <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="h-12 px-8" asChild>
              <a href="/consultancy/pricing">View pricing</a>
            </Button>
          </div>
        </div>
      </section>
    </ConsultancyLayout>
  );
}
