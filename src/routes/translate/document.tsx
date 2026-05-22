import { createFileRoute } from "@tanstack/react-router";
import { Upload, Languages, Download, Check } from "lucide-react";
import { TranslateLayout } from "@/components/layout/translate-layout";
import { TranslateCta } from "@/components/marketing/translate-cta";
import { PageHero } from "@/components/marketing/page-sections";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/lib/providers/i18n-provider";

export const Route = createFileRoute("/translate/document")({
  head: () => ({
    meta: [
      { title: "Document Translation — We Speak Your Language" },
      { name: "description", content: "Upload it. We translate it. You get it back." },
      { property: "og:title", content: "Document Translation" },
      {
        property: "og:description",
        content: "Professional human translation of personal, business and legal documents.",
      },
    ],
    links: [{ rel: "canonical", href: "/translate/document" }],
  }),
  component: DocumentPage,
});
function DocumentPage() {
  const { t, tRaw } = useI18n();
  const items = tRaw<string[]>("translate.document.items") ?? [];
  const turnaround =
    tRaw<{ label: string; time: string }[]>("translate.document.turnaround.rows") ?? [];
  const formats = tRaw<string[]>("translate.document.formats.list") ?? [];

  const flow = [
    { icon: Upload, label: t("translate.document.flow.upload") },
    { icon: Languages, label: t("translate.document.flow.translate") },
    { icon: Download, label: t("translate.document.flow.download") },
  ];

  return (
    <TranslateLayout>
      <PageHero title={t("translate.document.title")} subtitle={t("translate.document.subtitle")} />

      <section className="mx-auto max-w-5xl px-4 py-16 md:px-6">
        <div className="grid grid-cols-3 items-center gap-3">
          {flow.map((f, i) => (
            <div key={i} className="flex flex-col items-center gap-2 text-center">
              <div className="grid h-16 w-16 place-items-center rounded-full bg-accent/15 text-accent">
                <f.icon className="h-7 w-7" />
              </div>
              <div className="text-sm font-semibold sm:text-base">{f.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-16 md:px-6">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            {t("translate.document.itemsHeading")}
          </h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {items.map((it, i) => (
              <li key={i} className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-sm">{it}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 md:px-6">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          {t("translate.document.turnaround.heading")}
        </h2>
        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              {turnaround.map((r, i) => (
                <tr key={i} className="bg-card">
                  <td className="px-4 py-3 font-medium">{r.label}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-16 md:px-6">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            {t("translate.document.formats.heading")}
          </h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {formats.map((f) => (
              <Card key={f}>
                <CardContent className="px-5 py-3 text-sm font-medium">{f}</CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <TranslateCta />
    </TranslateLayout>
  );
}
