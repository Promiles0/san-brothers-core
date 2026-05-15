import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from "@/components/ui/accordion";
import { PublicLayout } from "@/components/layout/public-layout";
import { PageHero, CtaBanner } from "@/components/marketing/page-sections";
import { useI18n } from "@/lib/providers/i18n-provider";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — San Brothers" },
      { name: "description", content: "Answers to common questions about visa, accounting, translation, and payments." },
    ],
  }),
  component: Faq,
});

const GROUPS: { title: string; items: { q: string; a: string }[] }[] = [
  {
    title: "General",
    items: [
      { q: "What services does San Brothers offer?", a: "We offer four core service areas: visa and permit facilitation, accounting, business consultancy, and translation/interpretation. All services are delivered both in our Kigali office and through our online platform." },
      { q: "Do I need to register to use the website?", a: "You can browse public information without an account, but to request services, upload documents, or chat with our team you need a free account." },
      { q: "Is my information secure?", a: "Yes. Documents and personal data are stored encrypted and only accessible to staff assigned to your case. We do not share your data with third parties without your written consent." },
    ],
  },
  {
    title: "Visa & Permits",
    items: [
      { q: "How long does a student visa application take?", a: "Most Chinese student visas are decided in 4–10 business days after submission to the embassy, depending on season. Document preparation usually adds 1–2 weeks before submission." },
      { q: "What documents do I need for a Chinese student visa?", a: "Typically: a valid passport, the JW202/JW201 form, your admission notice, recent photos, a completed physical examination form, and proof of funds. We send a tailored checklist after your consultation." },
      { q: "Can you guarantee visa approval?", a: "No. The final decision is always made by the embassy. What we do guarantee is a complete, accurate application package and clear guidance — both of which significantly improve your chances." },
    ],
  },
  {
    title: "Accounting",
    items: [
      { q: "Do you file taxes with RRA on my behalf?", a: "Yes. With your authorization we prepare and file VAT, PAYE, withholding tax, and income tax through the RRA portal. Direct RRA integration is on our roadmap." },
      { q: "What's the cost of bookkeeping per month?", a: "Bookkeeping starts from 50,000 RWF/month for small businesses and scales with transaction volume and complexity. We send a quote after a short discovery call." },
    ],
  },
  {
    title: "Translation",
    items: [
      { q: "How do live interpreter calls work?", a: "From the translation portal you select a language pair, and we connect you to an available interpreter within minutes via voice or video. You're billed per minute after the call ends." },
      { q: "Do you support Kinyarwanda?", a: "Yes. Kinyarwanda is one of our core languages, paired with English, Chinese, French, and Arabic." },
      { q: "Is there a free trial?", a: "Yes. New users get a short free interpreter session to try the service before paying. Document translation is quoted before any work begins." },
    ],
  },
  {
    title: "Payments",
    items: [
      { q: "What payment methods do you accept?", a: "We accept Mobile Money (MTN, Airtel), bank transfer in RWF, and international card payments in USD. Receipts are issued automatically." },
    ],
  },
];

function Faq() {
  const { t } = useI18n();
  return (
    <PublicLayout>
      <PageHero title={t("faq.heroTitle")} subtitle={t("faq.heroSubtitle")}>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder={t("faq.searchPlaceholder")} />
        </div>
      </PageHero>

      <section className="mx-auto max-w-4xl px-4 py-16 md:px-6">
        <div className="space-y-10">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <h2 className="text-xl font-semibold tracking-tight">{g.title}</h2>
              <Accordion type="single" collapsible className="mt-4">
                {g.items.map((it) => (
                  <AccordionItem key={it.q} value={it.q}>
                    <AccordionTrigger>{it.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{it.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </section>

      <CtaBanner />
    </PublicLayout>
  );
}
