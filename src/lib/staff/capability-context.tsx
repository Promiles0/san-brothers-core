import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export type Capability =
  | "handle_visa"
  | "handle_accounting"
  | "handle_consultancy"
  | "handle_translation"
  | "handle_live_calls"
  | "register_clients_manually"
  | "approve_visa"
  | "approve_accounting"
  | "view_financial_reports"
  | "manage_staff"
  | "manage_pricing"
  | "manage_services_catalog"
  | "view_audit_log"
  | "handle_claims";

interface Ctx {
  capabilities: Capability[];
  hasCapability: (c: Capability) => boolean;
  isLoading: boolean;
}

const StaffCapabilityContext = createContext<Ctx | null>(null);

export function StaffCapabilityProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCapabilities([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from("staff_capabilities")
          .select("capability")
          .eq("user_id", user.id);
        if (cancelled) return;
        let caps = (data ?? []).map((r: { capability: Capability }) => r.capability);
        // Admins implicitly have all capabilities
        if (profile?.role === "admin") {
          const all: Capability[] = [
            "handle_visa", "handle_accounting", "handle_consultancy", "handle_translation",
            "handle_live_calls", "register_clients_manually", "approve_visa", "approve_accounting",
            "view_financial_reports", "manage_staff", "manage_pricing",
            "manage_services_catalog", "view_audit_log", "handle_claims",
          ];
          caps = Array.from(new Set([...caps, ...all]));
        }
        setCapabilities(caps);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, profile?.role]);

  const value = useMemo<Ctx>(() => ({
    capabilities,
    hasCapability: (c) => capabilities.includes(c),
    isLoading,
  }), [capabilities, isLoading]);

  return <StaffCapabilityContext.Provider value={value}>{children}</StaffCapabilityContext.Provider>;
}

export function useCapabilities() {
  const ctx = useContext(StaffCapabilityContext);
  if (!ctx) throw new Error("useCapabilities must be used within StaffCapabilityProvider");
  return ctx;
}
