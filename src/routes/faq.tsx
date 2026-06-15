import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calculator, CreditCard, HelpCircle, Languages, Plane, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

const GROUP_STYLES = {
  general: { Icon: HelpCircle, color: "text-muted-foreground", border: "border-l-muted-foreground", tint: "bg-muted" },
  visa: { Icon: Plane, color: "text-visa", border: "border-l-visa", tint: "bg-visa/10" },
  accounting: { Icon: Calculator, color: "text-accounting", border: "border-l-accounting", tint: "bg-accounting/10" },
  translation: { Icon: Languages, color: "text-translation", border: "border-l-translation", tint: "bg-translation/10" },
  payments: { Icon: CreditCard, color: "text-consultancy", border: "border-l-consultancy", tint: "bg-consultancy/10" },
};

interface Group {
  title: string;
  items: { q: string; a: string }[];
}

function Faq() {
  const { t, tRaw } = useI18n();
  const [query, setQuery] = useState("");
  const groups = GROUP_KEYS.map((key) => ({ key, group: tRaw<Group>(`faq.groups.${key}`) })).filter(
    (entry): entry is { key: (typeof GROUP_KEYS)[number]; group: Group } => Boolean(entry.group),
  );
  const normalizedQuery = query.trim().toLowerCase();
  const filteredGroups = groups.map(({ key, group }) => ({
    key,
    group,
    items: group.items.filter((item) => !normalizedQuery || item.q.toLowerCase().includes(normalizedQuery) || item.a.toLowerCase().includes(normalizedQuery)),
  }));
  const resultCount = filteredGroups.reduce((total, entry) => total + entry.items.length, 0);

  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle("revealed", e.isIntersecting)),
      { threshold: 0.1 },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [query]);

  return (
    <PublicLayout>
      <PageHero title={t("faq.heroTitle")} subtitle={t("faq.heroSubtitle")}>
        <div className="max-w-xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-12 rounded-full border-border bg-background pl-11 shadow-sm transition-shadow focus-visible:shadow-lg" placeholder={t("faq.searchPlaceholder")} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {query ? <p className="mt-3 text-center text-xs text-muted-foreground">Showing {resultCount} results for “{query}”</p> : null}
        </div>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-20">
        <div className="mb-8 overflow-x-auto lg:hidden">
          <div className="flex min-w-max gap-2 pb-2">
            {groups.map(({ key, group }) => {
              const { Icon, color } = GROUP_STYLES[key];
              return <a key={key} href={`#${key}`} className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm text-foreground"><Icon className={`h-4 w-4 ${color}`} />{group.title}<span className="rounded-full bg-muted px-1.5 text-xs text-muted-foreground">{group.items.length}</span></a>;
            })}
          </div>
        </div>

        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
          <aside className="hidden lg:block">
            <nav className="sticky top-24 space-y-2" aria-label="FAQ topics">
              <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.16em] text-foreground">Browse by Topic</h2>
              {groups.map(({ key, group }) => {
                const { Icon, color, border } = GROUP_STYLES[key];
                return <a key={key} href={`#${key}`} className={`group flex items-center gap-3 rounded-lg border border-border border-l-4 ${border} bg-card px-3 py-3 text-sm text-foreground transition hover:bg-muted`}><Icon className={`h-4 w-4 ${color}`} /><span className="flex-1">{group.title}</span><span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground group-hover:bg-background">{group.items.length}</span></a>;
              })}
            </nav>
          </aside>

          <div className="space-y-12">
            {resultCount === 0 ? (
              <div className="rounded-xl border border-border bg-muted/30 px-6 py-14 text-center">
                <HelpCircle className="mx-auto h-10 w-10 text-muted-foreground" />
                <h2 className="mt-4 text-xl font-bold text-foreground">No questions match your search</h2>
                <p className="mt-2 text-sm text-muted-foreground">Try different keywords or browse by category below</p>
                <Button className="mt-5" variant="outline" onClick={() => setQuery("")}>Clear search</Button>
              </div>
            ) : filteredGroups.map(({ key, group, items }) => {
              if (items.length === 0) return null;
              const { Icon, color, border, tint } = GROUP_STYLES[key];
              return (
                <section id={key} key={key} className="reveal scroll-mt-28 border-b border-border pb-12">
                  <div className={`flex items-center gap-4 border-l-4 ${border} pl-4`}>
                    <div className={`grid h-10 w-10 place-items-center rounded-full ${tint}`}><Icon className={`h-5 w-5 ${color}`} /></div>
                    <div><h2 className="text-xl font-bold tracking-tight text-foreground">{group.title}</h2><p className="text-xs text-muted-foreground">{items.length} questions</p></div>
                  </div>
                  <Accordion type="single" collapsible className="mt-5">
                    {items.map((it) => (
                      <AccordionItem key={it.q} value={it.q} className="border-border">
                        <AccordionTrigger className={`text-base font-semibold text-foreground hover:no-underline data-[state=open]:${color}`}>{it.q}</AccordionTrigger>
                        <AccordionContent className={`border-l-2 ${border} pl-4 pr-2 text-sm leading-relaxed text-muted-foreground`}>{it.a}</AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </section>
              );
            })}
          </div>
        </div>

        <div className="mt-12 rounded-xl border border-border bg-muted/40 p-6 text-center dark:bg-muted/20">
          <h2 className="text-xl font-bold text-foreground">Still have questions?</h2>
          <p className="mt-2 text-sm text-muted-foreground">Can&apos;t find your answer? Our team responds in under 24 hours.</p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild><Link to="/contact">Send a Message</Link></Button>
            <Button asChild variant="outline"><Link to="/services">Browse Services</Link></Button>
          </div>
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
