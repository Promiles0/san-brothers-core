import { useCapabilities, type Capability } from "./capability-context";
import { useAuth } from "@/hooks/useAuth";

export const CAPABILITY_TO_CATEGORY: Record<string, string[]> = {
  handle_visa: ["visa"],
  handle_translation: ["translation"],
  handle_accounting: ["accounting"],
  handle_consultancy: ["consultancy"],
  handle_live_calls: ["translation"],
  approve_visa: ["visa"],
  approve_accounting: ["accounting"],
  approve_consultancy: ["consultancy"],
};

const ADMIN_CAPABILITIES: Capability[] = [
  "manage_staff",
  "view_audit_log",
  "register_clients_manually",
  "view_financial_reports",
  "manage_services_catalog",
  "manage_pricing",
];

const CATEGORY_LABELS: Record<string, string> = {
  visa: "Visa & Permits",
  translation: "Translation",
  accounting: "Accounting",
  consultancy: "Consultancy",
};

export function getCategoryLabel(cat: string) {
  return CATEGORY_LABELS[cat] ?? cat;
}

export function getAllowedCategories(
  capabilities: Capability[],
  userRole: string | undefined,
): string[] | null {
  if (
    userRole === "admin" ||
    capabilities.some((cap) => ADMIN_CAPABILITIES.includes(cap))
  ) {
    return null;
  }

  const categories = new Set<string>();
  capabilities.forEach((cap) => {
    const cats = CAPABILITY_TO_CATEGORY[cap];
    if (cats) cats.forEach((cat) => categories.add(cat));
  });

  return categories.size > 0 ? Array.from(categories) : [];
}

export function useAllowedCategories() {
  const { capabilities } = useCapabilities();
  const { profile } = useAuth();
  return getAllowedCategories(capabilities, profile?.role);
}
