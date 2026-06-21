import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { TranslateLayout } from "@/components/layout/translate-layout";
import { TranslateCta } from "@/components/marketing/translate-cta";
import { PageHero } from "@/components/marketing/page-sections";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/providers/i18n-provider";
import { supabase } from "@/lib/supabase";

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

interface SupportedLang {
  id: string;
  code: string;
  name_en: string;
  name_native: string | null;
  flag_emoji: string | null;
  is_active: boolean;
}

function LanguagesPage() {
  const { t } = useI18n();
  const [langs, setLangs] = useState<SupportedLang[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("supported_languages")
        .select("id, code, name_en, name_native, flag_emoji, is_active")
        .order("name_en");
      setLangs((data ?? []) as SupportedLang[]);
      setLoading(false);
    })();
  }, []);

  return (
    <TranslateLayout>
      <PageHero
        title={t("translate.languages.title")}
        subtitle={t("translate.languages.subtitle")}
      />
      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        {loading ? (
          <div className="text-center text-sm text-muted-foreground">
            {t("translate.pricing.calculator.loadingLangs")}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {langs.map((l) => (
              <Card key={l.id} className={l.is_active ? "" : "opacity-70"}>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="text-4xl">{l.flag_emoji ?? "🌐"}</div>
                  <div className="flex-1">
                    <div className="text-base font-semibold">{l.name_en}</div>
                    {l.name_native && (
                      <div className="text-sm text-muted-foreground">{l.name_native}</div>
                    )}
                    <div className="mt-2">
                      {l.is_active ? (
                        <Badge>{t("translate.languages.liveDocs")}</Badge>
                      ) : (
                        <Badge variant="outline">{t("translate.languages.comingSoon")}</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
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
