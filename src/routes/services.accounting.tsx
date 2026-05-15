import { createFileRoute } from "@tanstack/react-router";
import { ServicePage } from "@/components/marketing/service-page";

export const Route = createFileRoute("/services/accounting")({
  head: () => ({
    meta: [
      { title: "Accounting Services — San Brothers" },
      { name: "description", content: "Bookkeeping, tax preparation, financial reporting and audit support." },
    ],
  }),
  component: () => (
    <ServicePage
      title="Accounting Services"
      subtitle="Bookkeeping, tax filing, and financial reporting for SMEs and individuals."
      primaryCtaIntent="accounting-consultation"
      primaryCtaLabel="Request an Accounting Consultation"
      subServices={[
        { slug: "bookkeeping", title: "Bookkeeping", desc: "Accurate month-to-month records you can rely on.",
          bullets: ["Daily transaction entry", "Bank reconciliation", "Monthly summary", "Cloud-based access"] },
        { slug: "tax-filing", title: "Tax Preparation", desc: "Prepare and file taxes correctly and on time.",
          bullets: ["VAT", "PAYE", "Income tax", "Withholding tax"], comingSoon: true },
        { slug: "financial-reporting", title: "Financial Reporting", desc: "Clear monthly and annual reports for decision-making.",
          bullets: ["Income statement", "Balance sheet", "Cash flow", "Custom KPIs"] },
        { slug: "financial-analysis", title: "Financial Analysis", desc: "Insight into performance and profitability.",
          bullets: ["Trend analysis", "Ratio analysis", "Budget vs actual", "Forecasting"] },
        { slug: "audit-support", title: "Audit Support", desc: "We prepare your books and stand by you during audits.",
          bullets: ["Audit-ready records", "Document gathering", "Auditor liaison", "Post-audit follow-up"] },
        { slug: "tax-compliance", title: "Tax Compliance & Advisory", desc: "Stay compliant and minimize risk with ongoing advisory.",
          bullets: ["RRA filings", "Compliance calendar", "Advisory calls", "Penalty resolution"] },
      ]}
      docs={[
        { title: "Bookkeeping setup", items: ["Bank statements (last 3 months)", "Invoices and receipts", "Payroll register", "Existing chart of accounts (if any)"] },
        { title: "Tax filing", items: ["TIN certificate", "RRA login (optional)", "Sales records", "Purchase records", "Payroll records"] },
      ]}
    />
  ),
});
