export type Portal = "san-brothers" | "translate" | "consultancy";

export interface PortalConfig {
  name: string;
  displayName: string;
  tagline: string;
  servicesAvailable: string[];
  isSanBrothers: boolean;
  isChild: boolean;
}

export const PORTAL_CONFIG: Record<Portal, PortalConfig> = {
  "san-brothers": {
    name: "san-brothers",
    displayName: "San Brothers",
    tagline: "Professional Services - We Speak Your Language",
    servicesAvailable: [
      "tourist-visa", "business-visa", "student-visa", "work-permit", "visa-consultation",
      "company-registration", "document-processing", "trade-investment", "business-planning", "administrative-support",
      "document-translation", "certified-translation", "live-interpreter",
      "bookkeeping", "tax-filing", "financial-reporting", "audit-support",
    ],
    isSanBrothers: true,
    isChild: false,
  },
  translate: {
    name: "translate",
    displayName: "Translate Portal",
    tagline: "Need help in your language? - We Speak Your Language",
    servicesAvailable: ["live-interpreter", "document-translation", "certified-translation"],
    isSanBrothers: false,
    isChild: true,
  },
  consultancy: {
    name: "consultancy",
    displayName: "Business Consultancy",
    tagline: "Expert Business Solutions - We Speak Your Language",
    servicesAvailable: [
      "company-registration", "document-processing", "trade-investment", "business-planning", "administrative-support",
    ],
    isSanBrothers: false,
    isChild: true,
  },
};

/** Detect portal from current hostname OR pathname (so /consultancy/* on shared domains also works). */
export function detectPortal(): Portal {
  if (typeof window === "undefined") return "san-brothers";
  const hostname = window.location.hostname;
  const pathname = window.location.pathname;

  if (hostname.startsWith("translate.") || pathname.startsWith("/translate")) return "translate";
  if (hostname.startsWith("consultancy.") || pathname.startsWith("/consultancy")) return "consultancy";
  return "san-brothers";
}

export function usePortal() {
  const current = detectPortal();
  const config = PORTAL_CONFIG[current];
  return {
    current,
    config,
    isSanBrothers: config.isSanBrothers,
    isChild: config.isChild,
    displayName: config.displayName,
    tagline: config.tagline,
    servicesAvailable: config.servicesAvailable,
  };
}

export function getParentLink(): string {
  if (typeof window === "undefined") return "/";
  const { protocol, hostname, port } = window.location;
  // If on a child subdomain, strip the leading portal label
  if (hostname.startsWith("translate.") || hostname.startsWith("consultancy.")) {
    const parent = hostname.replace(/^(translate|consultancy)\./, "");
    const portPart = port ? `:${port}` : "";
    return `${protocol}//${parent}${portPart}`;
  }
  // Same-origin (pathname-based) — return root
  return "/";
}
