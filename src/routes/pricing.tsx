import { createFileRoute } from "@tanstack/react-router";
import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PublicLayout } from "@/components/layout/public-layout";
import { PageHero, CtaBanner } from "@/components/marketing/page-sections";
import { useI18n } from "@/lib/providers/i18n-provider";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — San Brothers" },
      { name: "description", content: "Transparent pricing for visa, accounting, consultancy, and translation services." },
    ],
  }),
  component: Pricing,
});

interface Plan {
  name: string;
  price: string;
  intent: string;
  popular?: boolean;
  features: string[];
}

const PLANS: Record<string, Plan[]> = {
  visa: [
    { name: "Tourist Visa", price: "From 80,000 RWF", intent: "tourist-visa",
      features: ["Document checklist", "Application review", "Submission support"] },
    { name: "Student Visa", price: "From 150,000 RWF", intent: "student-visa", popular: true,
      features: ["Full document prep", "Embassy submission", "Interview coaching", "Status tracking"] },
    { name: "Work Permit", price: "From 200,000 RWF", intent: "work-permit",
      features: ["End-to-end handling", "Employer coordination", "Renewal reminders"] },
  ],
  accounting: [
    { name: "Starter", price: "From 50,000 RWF / mo", intent: "bookkeeping",
      features: ["Up to 50 transactions", "Monthly summary", "Email support"] },
    { name: "Standard", price: "From 120,000 RWF / mo", intent: "tax-filing", popular: true,
      features: ["Up to 200 transactions", "VAT & PAYE filing", "Quarterly reports"] },
    { name: "Premium", price: "From 250,000 RWF / mo", intent: "tax-compliance",
      features: ["Unlimited transactions", "Full tax compliance", "Dedicated accountant"] },
  ],
  consultancy: [
    { name: "Company Registration", price: "From 180,000 RWF", intent: "company-registration",
      features: ["Name search & RDB filing", "Tax registration", "Bank intro"] },
    { name: "Business Plan", price: "From 350,000 RWF", intent: "business-planning", popular: true,
      features: ["Discovery sessions", "Financial model", "Pitch-ready document"] },
    { name: "Investor Advisory", price: "Custom quote", intent: "trade-investment",
      features: ["Market entry strategy", "Licensing support", "Local partner intros"] },
  ],
  translation: [
    { name: "Document (per page)", price: "From 8,000 RWF", intent: "document-translation",
      features: ["Standard turnaround", "Certified copies on request"] },
    { name: "Live Interpreter", price: "From 1,500 RWF / min", intent: "live-interpreter", popular: true,
      features: ["Connect in minutes", "Voice or video", "Pay per minute"] },
    { name: "Legal Translation", price: "From 12,000 RWF / page", intent: "legal-translation",
      features: ["Court-grade quality", "Notarization available"] },
  ],
};

function Pricing() {
  const { t } = useI18n();
  return (
    <PublicLayout>
      <PageHero title={t("pricing.heroTitle")} subtitle={t("pricing.heroSubtitle")}>
        <p className="text-sm text-muted-foreground">
          All prices in RWF. International payments accepted in USD.
        </p>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <Tabs defaultValue="visa" className="w-full">
          <TabsList className="mb-8 flex flex-wrap">
            <TabsTrigger value="visa">Visa Services</TabsTrigger>
            <TabsTrigger value="accounting">Accounting</TabsTrigger>
            <TabsTrigger value="consultancy">Consultancy</TabsTrigger>
            <TabsTrigger value="translation">Translation</TabsTrigger>
          </TabsList>

          {Object.entries(PLANS).map(([key, plans]) => (
            <TabsContent key={key} value={key}>
              <div className="grid gap-6 md:grid-cols-3">
                {plans.map((p) => (
                  <Card key={p.name} className={p.popular ? "border-accent shadow-md" : ""}>
                    <CardContent className="flex flex-col gap-4 p-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{p.name}</h3>
                        {p.popular ? <Badge className="bg-accent text-accent-foreground hover:bg-accent">Most Popular</Badge> : null}
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{p.price}</div>
                        <div className="text-xs text-muted-foreground">Contact for exact quote</div>
                      </div>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        {p.features.map((f) => (
                          <li key={f} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />{f}</li>
                        ))}
                      </ul>
                      <Button className="mt-2" asChild>
                        <a href={`/signup?intent=${p.intent}`}>Get Started</a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {key === "translation" ? (
                <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 px-6 py-6 md:flex-row">
                  <p className="text-sm text-muted-foreground">
                    Live interpreter and document translation pricing is on our dedicated portal —{" "}
                    <span className="font-semibold text-foreground">We Speak Your Language</span>.
                  </p>
                  <Button variant="outline" asChild>
                    <a href="/translate" className="gap-2">Open Portal <ArrowRight className="h-4 w-4" /></a>
                  </Button>
                </div>
              ) : null}
            </TabsContent>
          ))}
        </Tabs>

        <div className="mt-12 grid gap-3 text-sm md:grid-cols-3">
          <a href="/faq" className="rounded-lg border border-border p-4 hover:bg-accent/5">What's included? <span className="text-primary">→</span></a>
          <a href="/faq" className="rounded-lg border border-border p-4 hover:bg-accent/5">How are fees calculated? <span className="text-primary">→</span></a>
          <a href="/faq" className="rounded-lg border border-border p-4 hover:bg-accent/5">Refund policy <span className="text-primary">→</span></a>
        </div>
      </section>

      <CtaBanner />
    </PublicLayout>
  );
}
