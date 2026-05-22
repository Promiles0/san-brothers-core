import { createFileRoute } from "@tanstack/react-router";
import { TranslateLayout } from "@/components/layout/translate-layout";
import { TranslateCta } from "@/components/marketing/translate-cta";
import { PageHero } from "@/components/marketing/page-sections";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supportedLanguages } from "@/lib/mock-data/translate";
import { useI18n } from "@/lib/providers/i18n-provider";

export const Route = createFileRoute("/translate/languages")({
  head: () => ({
    meta: [
      { title: "Languages We Support — We Speak Your Language" },
      {
        name: "description",
        content: "Live interpreters and document translation across major world languages.",
      },
      { property: "og:title", content: "Languages We Support" },
      { property: "og:description", content: "EN, ZH, RW, FR, AR and more." },
    ],
    links: [{ rel: "canonical", href: "/translate/languages" }],
  }),
  component: LanguagesPage,
});

function LanguagesPage() {
  const { t } = useI18n();
  return (
    <TranslateLayout>
      <PageHero
        title={t("translate.languages.title")}
        subtitle={t("translate.languages.subtitle")}
      />
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {supportedLanguages.map((l) => (
            <Card key={l.code} className={l.isComingSoon ? "opacity-70" : ""}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className="text-4xl">{l.flag}</div>
                <div className="flex-1">
                  <div className="text-base font-semibold">{l.nameEn}</div>
                  <div className="text-sm text-muted-foreground">{l.nameNative}</div>
                  <div className="mt-2">
                    {l.isComingSoon ? (
                      <Badge variant="outline">{t("translate.languages.comingSoon")}</Badge>
                    ) : (
                      <Badge>{t("translate.languages.liveDocs")}</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-start gap-4 rounded-xl border border-border bg-muted/30 p-6 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-muted-foreground">{t("translate.languages.notListed")}</p>
          <Button variant="outline" asChild>
            <a href="/contact">{t("translate.languages.requestCta")}</a>
          </Button>
        </div>
      </section>
      <TranslateCta />
    </TranslateLayout>
  );
}
