import { createFileRoute } from "@tanstack/react-router";
import { ServicePage, type SubService, type DocGroup } from "@/components/marketing/service-page";
import { useI18n } from "@/lib/providers/i18n-provider";

export const Route = createFileRoute("/services/visa")({
  head: () => ({
    meta: [
      { title: "Visa & Permit Facilitation — San Brothers" },
      {
        name: "description",
        content: "Tourist, business, student visas and work permits handled end to end.",
      },
    ],
  }),
  component: VisaPage,
});
function VisaPage() {
  const { t, tRaw } = useI18n();
  const subKeys = [
    { slug: "tourist-visa", key: "tourist" },
    { slug: "business-visa", key: "business" },
    { slug: "student-visa", key: "student" },
    { slug: "work-permit", key: "work" },
    { slug: "visa-consultation", key: "consult" },
  ];
  const subServices: SubService[] = subKeys.map((k) => ({
    slug: k.slug,
    title: t(`visa.sub.${k.key}.title`),
    desc: t(`visa.sub.${k.key}.desc`),
    bullets: tRaw<string[]>(`visa.sub.${k.key}.bullets`) ?? [],
  }));
  const docs: DocGroup[] = ["tourist", "studentChina", "work"].map((k) => ({
    title: t(`visa.docs.${k}.title`),
    items: tRaw<string[]>(`visa.docs.${k}.items`) ?? [],
  }));

  return (
    <ServicePage
      title={t("visa.title")}
      subtitle={t("visa.subtitle")}
      primaryCtaIntent="visa-consultation"
      primaryCtaLabel={t("visa.cta")}
      subServices={subServices}
      docs={docs}
    />
  );
}
