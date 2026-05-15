import { createFileRoute } from "@tanstack/react-router";
import { Plane, Calculator, Briefcase, Languages, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicLayout } from "@/components/layout/public-layout";
import { PageHero, CtaBanner } from "@/components/marketing/page-sections";
import { useI18n } from "@/lib/providers/i18n-provider";

export const Route = createFileRoute("/services/")({
  head: () => ({
    meta: [
      { title: "Services — San Brothers" },
      { name: "description", content: "Visa, accounting, consultancy, and translation services for clients in Rwanda and abroad." },
    ],
  }),
  component: ServicesOverview,
});

function ServicesOverview() {
  const { t } = useI18n();

  const services = [
    {
      icon: Plane, title: t("services.visa"), href: "/services/visa",
      desc: "End-to-end visa and permit support for travel, business, study, and work. We handle paperwork, embassy submission, and follow-up.",
      sub: ["Tourist Visa", "Business Visa", "Student Visa", "Work Permit", "Visa Consultation"],
    },
    {
      icon: Calculator, title: t("services.accounting"), href: "/services/accounting",
      desc: "Full-cycle accounting: bookkeeping, financial reporting, audit support and tax compliance for SMEs and individuals.",
      sub: ["Bookkeeping", "Tax Preparation", "Financial Reporting", "Audit Support", "Tax Compliance Advisory"],
    },
    {
      icon: Briefcase, title: t("services.consultancy"), href: "/services/consultancy",
      desc: "Company registration, trade & investment advisory, business planning, and admin support for new and growing businesses.",
      sub: ["Company Registration", "Document Processing", "Trade & Investment Advisory", "Business Planning", "Administrative Support"],
    },
    {
      icon: Languages, title: t("services.translation"), href: "/services/translation",
      desc: "Document translation and live interpreters across English, Chinese, Kinyarwanda, French and Arabic. Powered by our dedicated translation portal.",
      sub: ["Document Translation", "Live Interpreters", "Legal Translation", "Multilingual Support"],
    },
  ];

  return (
    <PublicLayout>
      <PageHero title={t("servicesPage.heroTitle")} subtitle={t("servicesPage.heroSubtitle")} />

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          {services.map((s) => (
            <Card key={s.title} className="transition-shadow hover:shadow-md">
              <CardContent className="flex flex-col gap-4 p-8">
                <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="h-7 w-7" />
                </div>
                <h2 className="text-2xl font-semibold">{s.title}</h2>
                <p className="text-muted-foreground">{s.desc}</p>
                <ul className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                  {s.sub.map((x) => (
                    <li key={x} className="flex gap-2"><span className="text-primary">•</span>{x}</li>
                  ))}
                </ul>
                <Button className="mt-2 self-start" asChild>
                  <a href={s.href}>Learn More</a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 rounded-xl border border-border bg-muted/30 px-6 py-6 md:flex-row">
          <p className="text-sm text-muted-foreground">
            Need translation help right now? Visit <span className="font-semibold text-foreground">We Speak Your Language</span>.
          </p>
          <Button variant="outline" asChild>
            <a href="/services/translation" className="gap-2">Open Translation <ArrowRight className="h-4 w-4" /></a>
          </Button>
        </div>
      </section>

      <CtaBanner />
    </PublicLayout>
  );
}
