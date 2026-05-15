import { createFileRoute } from "@tanstack/react-router";
import { ServicePage, type SubService, type DocGroup } from "@/components/marketing/service-page";
import { useI18n } from "@/lib/providers/i18n-provider";

export const Route = createFileRoute("/services/accounting")({
  head: () => ({
    meta: [
      { title: "Accounting Services — San Brothers" },
      { name: "description", content: "Bookkeeping, tax preparation, financial reporting and audit support." },
    ],
  }),
  component: AccountingPage,
});

function AccountingPage() {
  const { t, tRaw } = useI18n();
  const subKeys = [
    { slug: "bookkeeping", key: "bookkeeping" },
    { slug: "tax-filing", key: "tax", comingSoon: true },
    { slug: "financial-reporting", key: "reporting" },
    { slug: "financial-analysis", key: "analysis" },
    { slug: "audit-support", key: "audit" },
    { slug: "tax-compliance", key: "compliance" },
  ];
  const subServices: SubService[] = subKeys.map((k) => ({
    slug: k.slug,
    title: t(`accountingSvc.sub.${k.key}.title`),
    desc: t(`accountingSvc.sub.${k.key}.desc`),
    bullets: tRaw<string[]>(`accountingSvc.sub.${k.key}.bullets`) ?? [],
    comingSoon: k.comingSoon,
  }));
  const docs: DocGroup[] = ["setup", "tax"].map((k) => ({
    title: t(`accountingSvc.docs.${k}.title`),
    items: tRaw<string[]>(`accountingSvc.docs.${k}.items`) ?? [],
  }));

  return (
    <ServicePage
      title={t("accountingSvc.title")}
      subtitle={t("accountingSvc.subtitle")}
      primaryCtaIntent="accounting-consultation"
      primaryCtaLabel={t("accountingSvc.cta")}
      subServices={subServices}
      docs={docs}
    />
  );
}
