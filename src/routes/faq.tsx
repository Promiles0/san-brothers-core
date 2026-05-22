import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { PublicLayout } from "@/components/layout/public-layout";
import { PageHero, CtaBanner } from "@/components/marketing/page-sections";
import { useI18n } from "@/lib/providers/i18n-provider";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title: "FAQ — San Brothers" },
      {
        name: "description",
        content: "Answers to common questions about visa, accounting, translation, and payments.",
      },
    ],
  }),
  component: Faq,
});
const GROUP_KEYS = ["general", "visa", "accounting", "translation", "payments"] as const;

interface Group {
  title: string;
  items: { q: string; a: string }[];
}

function Faq() {
  const { t, tRaw } = useI18n();
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
          {GROUP_KEYS.map((key) => {
            const g = tRaw<Group>(`faq.groups.${key}`);
            if (!g) return null;
            return (
              <div key={key}>
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
            );
          })}
        </div>
      </section>

      <CtaBanner
        title={t("home.ctaHeading")}
        subtitle={t("home.ctaSubtitle")}
        label={t("common.getStarted")}
      />
    </PublicLayout>
  );
}
