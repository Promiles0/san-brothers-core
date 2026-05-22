import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export interface DashboardCounts {
  activeServices: number;
  openClaims: number;
  unreadMessages: number;
}

const ACTIVE_STATUSES = [
  "submitted",
  "under_review",
  "awaiting_client",
  "verified",
  "submitted_to_authority",
];
export function useDashboardCounts() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<DashboardCounts>({
    activeServices: 0,
    openClaims: 0,
    unreadMessages: 0,
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [services, claims] = await Promise.all([
          supabase
            .from("service_requests")
            .select("id", { count: "exact", head: true })
            .eq("client_id", user.id)
            .in("status", ACTIVE_STATUSES),
          supabase
            .from("claims")
            .select("id", { count: "exact", head: true })
            .eq("client_id", user.id)
            .in("status", ["open", "under_review"]),
        ]);
        if (cancelled) return;
        setCounts({
          activeServices: services.count ?? 0,
          openClaims: claims.count ?? 0,
          unreadMessages: 0,
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return counts;
}
