import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, Clock, Sparkles, MapPin, Phone, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PublicLayout } from "@/components/layout/public-layout";
import { PageHero, CtaBanner } from "@/components/marketing/page-sections";
import { useI18n } from "@/lib/providers/i18n-provider";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — San Brothers" },
      {
        name: "description",
        content:
          "San Brothers is a Rwandan professional services firm. Professional. Reliable. Efficient.",
      },
    ],
  }),
  component: About,
});

function About() {
  const { t } = useI18n();
  const values = [
    {
      icon: ShieldCheck,
      title: t("about.values.professional.title"),
      desc: t("about.values.professional.desc"),
    },
    { icon: Clock, title: t("about.values.reliable.title"), desc: t("about.values.reliable.desc") },
    {
      icon: Sparkles,
      title: t("about.values.efficient.title"),
      desc: t("about.values.efficient.desc"),
    },
  ];

  return (
    <PublicLayout>
      <PageHero title={t("about.heroTitle")} subtitle={t("about.heroSubtitle")} />

      <section className="mx-auto max-w-4xl px-4 py-16 md:px-6">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{t("about.storyHeading")}</h2>
        <div className="mt-4 space-y-4 text-muted-foreground">
          <p>{t("about.story.p1")}</p>
          <p>{t("about.story.p2")}</p>
        </div>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 md:px-6">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            {t("about.valuesHeading")}
          </h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {values.map((v) => (
              <Card key={v.title}>
                <CardContent className="flex flex-col gap-3 p-6">
                  <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary">
                    <v.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold">{v.title}</h3>
                  <p className="text-sm text-muted-foreground">{v.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="flex flex-col gap-3 p-6">
              <div className="flex items-center gap-2 text-primary">
                <MapPin className="h-5 w-5" />
                <h3 className="text-lg font-semibold text-foreground">
                  {t("about.officeHeading")}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">{t("about.address1")}</p>
              <p className="text-sm text-muted-foreground">{t("about.address2")}</p>
              <div className="mt-3 grid h-40 place-items-center rounded-lg border border-dashed border-border bg-muted text-sm text-muted-foreground">
                {t("about.mapPlaceholder")}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3 p-6">
              <h3 className="text-lg font-semibold">{t("about.contactHeading")}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" /> Rwanda: +250 788 687 288
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" /> Rwanda: +250 788 453 192
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" /> China: +86 155 7739 0044
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" /> sanbrothersgroup@gmail.com
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center md:px-6">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            {t("about.partnership.title")}
          </h2>
          <p className="mt-4 text-muted-foreground">{t("about.partnership.text")}</p>
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
