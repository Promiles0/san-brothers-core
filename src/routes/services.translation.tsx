import { createFileRoute } from "@tanstack/react-router";
import { Mic, FileText, Scale, Globe, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicLayout } from "@/components/layout/public-layout";
import { PageHero, CtaBanner } from "@/components/marketing/page-sections";

export const Route = createFileRoute("/services/translation")({
  head: () => ({
    meta: [
      { title: "Translation & Interpretation — San Brothers" },
      { name: "description", content: "Document translation, live interpreters, and multilingual support — available 24/7." },
    ],
  }),
  component: TranslationBridge,
});

const FEATURES = [
  { icon: Mic, title: "Live Interpreters", desc: "On-demand voice interpreters in minutes." },
  { icon: FileText, title: "Document Translation", desc: "Certified document translation across formats." },
  { icon: Scale, title: "Legal Translation", desc: "Court-grade translation for legal documents." },
  { icon: Globe, title: "Multilingual Support", desc: "Help in 5+ languages, 24/7." },
];

function TranslationBridge() {
  return (
    <PublicLayout>
      <PageHero
        title="Translation & Interpretation"
        subtitle="Document translation, live interpreters, and multilingual support — available 24/7."
      />

      <section className="mx-auto max-w-5xl px-4 py-16 md:px-6">
        <Card className="overflow-hidden">
          <CardContent className="grid gap-6 p-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-accent">We Speak Your Language</div>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">A dedicated portal for instant translation</h2>
              <p className="mt-3 text-muted-foreground">
                Connect with live interpreters in minutes, request document translations, and pay securely.
                Built for travelers, businesses, students, and legal teams.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <a href="/translate" className="gap-2">Open Translation Portal <ArrowRight className="h-4 w-4" /></a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="/signup?intent=document-translation">Document Translation</a>
                </Button>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="grid h-32 w-32 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Globe className="h-16 w-16" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <Card key={f.title}>
              <CardContent className="flex flex-col gap-3 p-6">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Available in English · 中文 · Kinyarwanda · Français · العربية (more coming)
        </p>
      </section>

      <CtaBanner
        title="Need translation right now?"
        subtitle="Open We Speak Your Language and connect in minutes."
        href="/translate"
        label="Open Portal"
      />
    </PublicLayout>
  );
}
