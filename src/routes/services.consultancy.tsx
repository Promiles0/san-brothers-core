import { createFileRoute } from "@tanstack/react-router";
import { ServicePage, type SubService } from "@/components/marketing/service-page";
import { useI18n } from "@/lib/providers/i18n-provider";

export const Route = createFileRoute("/services/consultancy")({
  head: () => ({
    meta: [
      { title: "Business Consultancy — San Brothers" },
      { name: "description", content: "Company registration, advisory, and admin support for businesses." },
    ],
  }),
  component: ConsultancyPage,
});

function ConsultancyPage() {
  const { t, tRaw } = useI18n();
  const subKeys = [
    { slug: "company-registration", key: "company", comingSoon: true },
    { slug: "document-processing", key: "docs" },
    { slug: "trade-investment", key: "trade" },
    { slug: "business-planning", key: "planning" },
    { slug: "admin-support", key: "admin" },
  ];
  const subServices: SubService[] = subKeys.map((k) => ({
    slug: k.slug,
    title: t(`consultancySvc.sub.${k.key}.title`),
    desc: t(`consultancySvc.sub.${k.key}.desc`),
    bullets: tRaw<string[]>(`consultancySvc.sub.${k.key}.bullets`) ?? [],
    comingSoon: k.comingSoon,
  }));

  return (
    <ServicePage
      title={t("consultancySvc.title")}
      subtitle={t("consultancySvc.subtitle")}
      primaryCtaIntent="consultancy-intro"
      primaryCtaLabel={t("consultancySvc.cta")}
      subServices={subServices}
    />
  );
}
