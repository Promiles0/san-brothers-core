import { createFileRoute } from "@tanstack/react-router";
import { ServicePage } from "@/components/marketing/service-page";

export const Route = createFileRoute("/services/visa")({
  head: () => ({
    meta: [
      { title: "Visa & Permit Facilitation — San Brothers" },
      { name: "description", content: "Tourist, business, student visas and work permits handled end to end." },
    ],
  }),
  component: () => (
    <ServicePage
      title="Visa & Permit Facilitation"
      subtitle="Tourist, business, student visas and work permits — handled end to end."
      primaryCtaIntent="visa-consultation"
      primaryCtaLabel="Request a Visa Consultation"
      subServices={[
        { slug: "tourist-visa", title: "Tourist Visa", desc: "Short-stay visa support for travel and family visits.",
          bullets: ["Valid passport (6+ months)", "Travel itinerary", "Hotel booking", "Bank statements"] },
        { slug: "business-visa", title: "Business Visa", desc: "Visas for meetings, conferences, and trade visits.",
          bullets: ["Invitation letter", "Company registration", "Travel insurance", "Bank statements"] },
        { slug: "student-visa", title: "Student Visa", desc: "End-to-end help for studies in China and beyond.",
          bullets: ["Admission letter", "Academic records", "Health certificate", "Financial proof"] },
        { slug: "work-permit", title: "Work Permit", desc: "Work authorization documentation and renewals.",
          bullets: ["Employment contract", "Background check", "Medical exam", "Educational credentials"] },
        { slug: "visa-consultation", title: "Visa Consultation", desc: "1:1 advice on the best visa path for your situation.",
          bullets: ["30-minute call", "Eligibility review", "Documents checklist", "Timeline estimate"] },
      ]}
      docs={[
        { title: "Tourist Visa", items: ["Valid passport", "Recent photos", "Travel itinerary", "Hotel booking", "Bank statements"] },
        { title: "Student Visa (China)", items: ["JW202 / JW201 form", "Admission notice", "Passport", "Photos", "Physical exam form", "Bank statements"] },
        { title: "Work Permit", items: ["Signed employment contract", "Health certificate", "Police clearance", "Education credentials", "Passport"] },
      ]}
    />
  ),
});
