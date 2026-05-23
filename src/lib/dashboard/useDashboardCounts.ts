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
        const [services, claims, convs] = await Promise.all([
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
          supabase
            .from("conversations")
            .select("id")
            .eq("client_id", user.id),
        ]);
        let unread = 0;
        const convIds = (convs.data ?? []).map((c: { id: string }) => c.id);
        if (convIds.length > 0) {
          const { count } = await supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .in("conversation_id", convIds)
            .eq("is_read", false)
            .neq("sender_id", user.id);
          unread = count ?? 0;
        }
        if (cancelled) return;
        setCounts({
          activeServices: services.count ?? 0,
          openClaims: claims.count ?? 0,
          unreadMessages: unread,
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
