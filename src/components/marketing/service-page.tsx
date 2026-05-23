import type { LucideIcon } from "lucide-react";
import { UserPlus, Upload, ClipboardCheck, Send, CheckCircle } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { PublicLayout } from "@/components/layout/public-layout";
import { PageHero, CtaBanner } from "@/components/marketing/page-sections";
import { useI18n } from "@/lib/providers/i18n-provider";
import { useAuth } from "@/hooks/useAuth";
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

const PROCESS_KEYS: { icon: LucideIcon; key: string }[] = [
  { icon: UserPlus, key: "register" },
  { icon: Upload, key: "upload" },
  { icon: ClipboardCheck, key: "review" },
  { icon: Send, key: "submit" },
  { icon: CheckCircle, key: "result" },
];

export function ServicePage({
  title,
  subtitle,
  primaryCtaIntent,
  primaryCtaLabel,
  subServices,
  docs,
}: ServicePageProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleApply = (slug: string) => {
    if (user) {
      void navigate({ to: `/dashboard/services/${slug}` as never });
    } else {
      void navigate({
        to: "/login",
        search: { intent: slug, next: `/dashboard/services/${slug}` } as never,
      });
    }
  };

  return (
    <PublicLayout>
      <PageHero title={title} subtitle={subtitle}>
        <Button size="lg" onClick={() => handleApply(primaryCtaIntent)}>
          {primaryCtaLabel ?? t("common.apply")}
        </Button>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          {t("servicePage.whatWeHandle")}
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {subServices.map((s) => (
            <Card key={s.slug} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3 p-6">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  {s.comingSoon ? (
                    <Badge variant="secondary">{t("servicePage.comingSoon")}</Badge>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-auto self-start"
                  onClick={() => handleApply(s.slug)}
                >
                  {t("servicePage.applyBtn")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            {t("servicePage.howProcess")}
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-5">
            {PROCESS_KEYS.map((p, i) => (
              <li key={p.key} className="rounded-xl border border-border bg-card p-5">
                <div className="text-xs font-semibold text-muted-foreground">
                  {t("servicePage.stepLabel")} {i + 1}
                </div>
                <div className="mt-2 grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
                  <p.icon className="h-4 w-4" />
                </div>
                <div className="mt-2 text-sm font-semibold">
                  {t(`servicePage.process.${p.key}`)}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {docs && docs.length > 0 ? (
        <section className="mx-auto max-w-4xl px-4 py-16 md:px-6">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            {t("servicePage.documents")}
          </h2>
          <Accordion type="single" collapsible className="mt-6">
            {docs.map((d) => (
              <AccordionItem key={d.title} value={d.title}>
                <AccordionTrigger>{d.title}</AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {d.items.map((it) => (
                      <li key={it} className="flex gap-2">
                        <span className="text-primary">•</span>
                        {it}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      ) : null}

      <CtaBanner
        title={t("home.ctaHeading")}
        subtitle={t("home.ctaSubtitle")}
        label={t("common.getStarted")}
        slug={primaryCtaIntent}
      />
    </PublicLayout>
  );
}
