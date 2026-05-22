// Hardcoded mapping: service slug → required document labels (i18n keys under dashboard.requiredDocs.*)
// Falls back to a generic list when slug is unknown.

export const requiredDocsBySlug: Record<string, string[]> = {
  "visa-student": [
    "Valid passport",
    "Admission letter",
    "Financial proof",
    "Recent photo",
    "Academic records",
  ],
  "visa-tourist": [
    "Valid passport",
    "Travel itinerary",
    "Hotel booking",
    "Bank statements",
    "Recent photo",
  ],
  "visa-business": [
    "Valid passport",
    "Invitation letter",
    "Company registration",
    "Bank statements",
    "Travel insurance",
  ],
  "visa-work": [
    "Valid passport",
    "Signed employment contract",
    "Health certificate",
    "Police clearance",
    "Education credentials",
  ],
  "visa-consultation": ["Valid passport (optional)"],
  "tax-filing": [
    "Last year's tax return",
    "Income records",
    "Expense records",
    "Bank statements",
    "TIN certificate",
  ],
  "tax-preparation": [
    "Last year's tax return",
    "Income records",
    "Expense records",
    "Bank statements",
    "TIN certificate",
  ],
  bookkeeping: ["Bank statements (last 3 months)", "Invoices and receipts", "Payroll register"],
  "financial-reporting": ["Trial balance", "General ledger", "Prior period reports"],
  "audit-support": ["Audit-ready records", "Prior year audit report", "Bank confirmations"],
  "company-registration": [
    "Founder ID/passport",
    "Proposed company name list",
    "Articles of association draft",
  ],
  "document-processing": ["Original document", "Identification"],
  "trade-advisory": ["Brief on sector and target market"],
  "business-planning": ["Existing business plan (if any)", "Financial projections (if any)"],
  "document-translation": ["Source document (clear scan or PDF)"],
  "live-interpretation": [],
  "legal-translation": ["Source legal document", "Identification"],
};

export const defaultRequiredDocs = ["Identification", "Supporting documents"];

export function getRequiredDocs(slug: string): string[] {
  return requiredDocsBySlug[slug] ?? defaultRequiredDocs;
}
