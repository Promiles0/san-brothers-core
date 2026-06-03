import { createFileRoute } from "@tanstack/react-router";
import { ConsultancyLayout } from "@/components/layout/consultancy-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Award, Globe, HeartHandshake } from "lucide-react";

export const Route = createFileRoute("/consultancy/about")({
  head: () => ({
    meta: [
      { title: "About — San Brothers Consultancy" },
      { name: "description", content: "Meet the team behind San Brothers Business Consultancy." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <ConsultancyLayout>
      <section className="border-b border-border bg-linear-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center md:px-6">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">About our consultancy</h1>
          <p className="mt-4 text-lg text-muted-foreground">
            San Brothers is a multilingual professional services firm helping local and
            international clients succeed in Rwanda and East Africa.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 md:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Award,
              title: "Trusted by hundreds",
              desc: "From sole proprietors to international investors, our work covers every business stage.",
            },
            {
              icon: Globe,
              title: "Cross-border expertise",
              desc: "Deep knowledge of Rwandan regulations plus active networks in China, the EU and beyond.",
            },
            {
              icon: HeartHandshake,
              title: "Client-first",
              desc: "Clear pricing, milestone-based delivery, and a real human you can message at any time.",
            },
          ].map((b) => (
            <Card key={b.title}>
              <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                  <b.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Our team</h2>
          <p className="mt-4 text-muted-foreground">
            A multidisciplinary team of legal advisors, accountants, business analysts, and
            multilingual case managers. Every engagement is assigned a primary case manager who
            stays with you from kickoff to completion.
          </p>
        </div>
      </section>
    </ConsultancyLayout>
  );
}
