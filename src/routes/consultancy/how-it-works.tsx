import { createFileRoute } from "@tanstack/react-router";
import { ConsultancyLayout } from "@/components/layout/consultancy-layout";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/consultancy/how-it-works")({
  head: () => ({
    meta: [
      { title: "How It Works — San Brothers Consultancy" },
      {
        name: "description",
        content: "From first consultation to delivered solution in three simple steps.",
      },
    ],
  }),
  component: HowItWorks,
});

const STEPS = [
  {
    title: "Choose your consultation type",
    desc: "Tell us what you need: company registration, business planning, trade & investment, document processing, or ongoing administrative support.",
  },
  {
    title: "Meet with our expert",
    desc: "Within one business day we match you with the right specialist. Free 30-minute discovery call to scope the work and agree on price.",
  },
  {
    title: "Get your solution",
    desc: "Clear deliverables, milestone updates inside your dashboard, and direct messaging with your case manager until completion.",
  },
];

const EXPECT = [
  "Transparent pricing — quoted upfront, no hidden fees.",
  "Documents and updates stored in your dashboard.",
  "Direct chat with your assigned case manager.",
  "Support in English, French, Chinese, Kinyarwanda and Arabic.",
];

function HowItWorks() {
  return (
    <ConsultancyLayout>
      <section className="border-b border-border bg-linear-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-4xl px-4 py-16 text-center md:px-6">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">How it works</h1>
          <p className="mt-4 text-lg text-muted-foreground">From sign-up to delivered solution.</p>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-4 py-16 md:px-6">
        <ol className="relative space-y-6 border-l-2 border-border pl-8">
          {STEPS.map((s, i) => (
            <li key={i} className="relative">
              <span className="absolute left-[-2.45rem] grid h-8 w-8 place-items-center rounded-full bg-primary font-bold text-primary-foreground">
                {i + 1}
              </span>
              <Card>
                <CardContent className="p-5">
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-16 md:px-6">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">What to expect</h2>
          <ul className="mt-6 list-disc space-y-2 pl-5 text-muted-foreground">
            {EXPECT.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      </section>
    </ConsultancyLayout>
  );
}
