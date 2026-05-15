import { createFileRoute } from "@tanstack/react-router";
import { ServicePage } from "@/components/marketing/service-page";

export const Route = createFileRoute("/services/consultancy")({
  head: () => ({
    meta: [
      { title: "Business Consultancy — San Brothers" },
      { name: "description", content: "Company registration, advisory, and admin support for businesses." },
    ],
  }),
  component: () => (
    <ServicePage
      title="Business Consultancy"
      subtitle="Company registration, advisory, and admin support for businesses of every size."
      primaryCtaIntent="consultancy-intro"
      primaryCtaLabel="Book a Free Consultation"
      subServices={[
        { slug: "company-registration", title: "Company Registration", desc: "Register your company in Rwanda with confidence.",
          bullets: ["Name search", "RDB registration", "Tax registration", "Bank account opening"], comingSoon: true },
        { slug: "document-processing", title: "Document Processing", desc: "Help with notarization, legalization, and apostille.",
          bullets: ["Notary services", "Apostille / legalization", "Certified copies", "Embassy submissions"] },
        { slug: "trade-investment", title: "Trade & Investment Advisory", desc: "Guidance for investors entering the Rwandan market.",
          bullets: ["Market entry strategy", "Sector analysis", "Investor licensing", "Local partnerships"] },
        { slug: "business-planning", title: "Business Planning", desc: "Build a clear plan to grow your business or attract funding.",
          bullets: ["Business model canvas", "Financial projections", "Pitch deck review", "Strategy workshop"] },
        { slug: "admin-support", title: "Administrative Support", desc: "Outsource everyday admin work to us.",
          bullets: ["Office mail", "Document drafting", "Translations coordination", "Calendar management"] },
      ]}
    />
  ),
});
