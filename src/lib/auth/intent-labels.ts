export const INTENT_LABELS: Record<string, string> = {
  "student-visa": "Student Visa",
  "tourist-visa": "Tourist Visa",
  "business-visa": "Business Visa",
  "work-permit": "Work Permit",
  "visa-consultation": "Visa Consultation",
  "tax-filing": "Tax Filing",
  "bookkeeping": "Bookkeeping",
  "financial-reporting": "Financial Reporting",
  "audit-support": "Audit Support",
  "tax-advisory": "Tax Advisory",
  "company-registration": "Company Registration",
  "document-processing": "Document Processing",
  "trade-investment": "Trade & Investment",
  "business-planning": "Business Planning",
  "admin-support": "Admin Support",
  "consultancy-intro": "Consultancy Intro",
  "document-translation": "Document Translation",
  "live-interpreter": "Live Interpreter",
  "buy-minutes": "Buy Minutes",
};

export function intentLabel(slug?: string | null): string | null {
  if (!slug) return null;
  return INTENT_LABELS[slug] ?? null;
}

export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login")) return "auth.errors.invalidCredentials";
  if (m.includes("already registered") || m.includes("already been registered") || m.includes("user already")) return "auth.errors.emailExists";
  if (m.includes("password should be at least")) return "auth.errors.weakPassword";
  if (m.includes("email not confirmed")) return "auth.errors.emailNotConfirmed";
  if (m.includes("network") || m.includes("fetch")) return "auth.errors.network";
  if (m.includes("rate limit")) return "auth.errors.rateLimit";
  return "auth.errors.generic";
}
