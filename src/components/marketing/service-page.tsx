import type { LucideIcon } from "lucide-react";
import {
  UserPlus, Upload, ClipboardCheck, Send, CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";
import { PublicLayout } from "@/components/layout/public-layout";
import { PageHero, CtaBanner } from "@/components/marketing/page-sections";

export interface SubService {
  slug: string;
  title: string;
  desc: string;
  bullets: string[];
  comingSoon?: boolean;
}

export interface DocGroup {
  title: string;
  items: string[];
}

interface ServicePageProps {
  title: string;
  subtitle: string;
  primaryCtaIntent: string;
  primaryCtaLabel?: string;
  subServices: SubService[];
  docs?: DocGroup[];
}

const PROCESS = [
  { icon: UserPlus, title: "Register" },
  { icon: Upload, title: "Upload Documents" },
  { icon: ClipboardCheck, title: "Secretary Review" },
  { icon: Send, title: "Manager Submits" },
  { icon: CheckCircle, title: "Receive Result" },
] satisfies { icon: LucideIcon; title: string }[];

export function ServicePage({
  title, subtitle, primaryCtaIntent, primaryCtaLabel = "Request a Consultation",
  subServices, docs,
}: ServicePageProps) {
  return (
    <PublicLayout>
      <PageHero title={title} subtitle={subtitle}>
        <Button size="lg" asChild>
          <a href={`/signup?intent=${primaryCtaIntent}`}>{primaryCtaLabel}</a>
        </Button>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">What we handle</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {subServices.map((s) => (
            <Card key={s.slug} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3 p-6">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  {s.comingSoon ? <Badge variant="secondary">Coming soon</Badge> : null}
                </div>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
                <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex gap-2"><span className="text-primary">•</span>{b}</li>
                  ))}
                </ul>
                <Button variant="outline" size="sm" className="mt-auto self-start" asChild>
                  <a href={`/signup?intent=${s.slug}`}>Apply</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">How the process works</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-5">
            {PROCESS.map((p, i) => (
              <li key={p.title} className="rounded-xl border border-border bg-card p-5">
                <div className="text-xs font-semibold text-muted-foreground">STEP {i + 1}</div>
                <div className="mt-2 grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <p.icon className="h-4 w-4" />
                </div>
                <div className="mt-2 text-sm font-semibold">{p.title}</div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {docs && docs.length > 0 ? (
        <section className="mx-auto max-w-4xl px-4 py-16 md:px-6">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Documents you'll need</h2>
          <Accordion type="single" collapsible className="mt-6">
            {docs.map((d) => (
              <AccordionItem key={d.title} value={d.title}>
                <AccordionTrigger>{d.title}</AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {d.items.map((it) => (
                      <li key={it} className="flex gap-2"><span className="text-primary">•</span>{it}</li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ) : null}

      <CtaBanner />
    </PublicLayout>
  );
}
