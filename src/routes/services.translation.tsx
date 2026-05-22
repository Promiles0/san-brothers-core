import { createFileRoute } from "@tanstack/react-router";
import { Mic, FileText, Scale, Globe, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PublicLayout } from "@/components/layout/public-layout";
import { PageHero, CtaBanner } from "@/components/marketing/page-sections";
import { useI18n } from "@/lib/providers/i18n-provider";

export const Route = createFileRoute("/services/translation")({
  head: () => ({
    meta: [
      { title: "Translation & Interpretation — San Brothers" },
      {
        name: "description",
        content:
          "Document translation, live interpreters, and multilingual support — available 24/7.",
      },
    ],
  }),
  component: TranslationBridge,
});

const FEATURE_KEYS = [
  { icon: Mic, key: "live" },
  { icon: FileText, key: "doc" },
  { icon: Scale, key: "legal" },
  { icon: Globe, key: "multi" },
] as const;
function TranslationBridge() {
  const { t } = useI18n();
  return (
    <PublicLayout>
      <PageHero title={t("translationSvc.title")} subtitle={t("translationSvc.subtitle")} />

      <section className="mx-auto max-w-5xl px-4 py-16 md:px-6">
        <Card className="overflow-hidden">
          <CardContent className="grid gap-6 p-8 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-accent">
                {t("translationSvc.weSpeakLabel")}
              </div>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">
                {t("translationSvc.panelTitle")}
              </h2>
              <p className="mt-3 text-muted-foreground">{t("translationSvc.panelText")}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <a href="/translate" className="gap-2">
                    {t("translationSvc.openPortal")} <ArrowRight className="h-4 w-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <a href="/signup?intent=document-translation">{t("translationSvc.docBtn")}</a>
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
          {FEATURE_KEYS.map((f) => (
            <Card key={f.key}>
              <CardContent className="flex flex-col gap-3 p-6">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{t(`translationSvc.features.${f.key}.title`)}</h3>
                <p className="text-sm text-muted-foreground">
                  {t(`translationSvc.features.${f.key}.desc`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          {t("translationSvc.languages")}
        </p>
      </section>

      <CtaBanner
        title={t("translationSvc.ctaTitle")}
        subtitle={t("translationSvc.ctaSubtitle")}
        href="/translate"
        label={t("translationSvc.ctaLabel")}
      />
    </PublicLayout>
  );
}
