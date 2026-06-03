import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { AiChatWidget } from "@/components/dashboard/ai-chat-widget";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayoutRoute,
});

function DashboardLayoutRoute() {
  return (
    <ProtectedRoute>
      <DashboardShell />
    </ProtectedRoute>
  );
}
function DashboardShell() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [clientNavAccess, setClientNavAccess] = useState({
    hasServiceRequests: false,
    hasInterpreterHistory: false,
    hasConversations: false,
  });

  // Staff/admin: silently redirect to /staff
  useEffect(() => {
    if (!loading && profile && profile.role !== "client") {
      navigate({ to: "/staff", search: {} as never });
    }
  }, [profile, loading, navigate]);

  // Check client-only navigation unlocks; subscribe for newly-created activity
  useEffect(() => {
    if (!profile?.id || profile.role !== "client") return;

    let cancelled = false;

    void Promise.all([
      supabase
        .from("service_requests")
        .select("id", { count: "exact", head: true })
        .eq("client_id", profile.id),
      supabase
        .from("interpreter_calls")
        .select("id", { count: "exact", head: true })
        .eq("client_id", profile.id),
      supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("client_id", profile.id),
    ]).then(([serviceRequests, interpreterCalls, conversations]) => {
      if (cancelled) return;
      setClientNavAccess({
        hasServiceRequests: (serviceRequests.count ?? 0) > 0,
        hasInterpreterHistory: (interpreterCalls.count ?? 0) > 0,
        hasConversations: (conversations.count ?? 0) > 0,
      });
    });

    const serviceRequestsChannel = supabase
      .channel("client-service-requests:" + profile.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "service_requests",
          filter: `client_id=eq.${profile.id}`,
        },
        () => setClientNavAccess((current) => ({ ...current, hasServiceRequests: true })),
      )
      .subscribe();

    const interpreterChannel = supabase
      .channel("client-interp-history:" + profile.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "interpreter_calls",
          filter: `client_id=eq.${profile.id}`,
        },
        () => setClientNavAccess((current) => ({ ...current, hasInterpreterHistory: true })),
      )
      .subscribe();

    const conversationsChannel = supabase
      .channel("client-conversations:" + profile.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "conversations",
          filter: `client_id=eq.${profile.id}`,
        },
        () => setClientNavAccess((current) => ({ ...current, hasConversations: true })),
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(serviceRequestsChannel);
      void supabase.removeChannel(interpreterChannel);
      void supabase.removeChannel(conversationsChannel);
    };
  }, [profile?.id, profile?.role]);

  const role = (profile?.role === "client" ? "client" : (profile?.role ?? "client")) as
    | "client"
    | "secretary"
    | "manager"
    | "translator"
    | "admin";

  const hiddenNavKeys =
    role === "client"
      ? [
          ...(!clientNavAccess.hasServiceRequests
            ? ["myServices", "documents", "payments", "claims"]
            : []),
          ...(!clientNavAccess.hasInterpreterHistory ? ["liveInterpreter"] : []),
          ...(!clientNavAccess.hasServiceRequests && !clientNavAccess.hasConversations
            ? ["messages"]
            : []),
        ]
      : undefined;

  return (
    <DashboardLayout role={role} hiddenNavKeys={hiddenNavKeys}>
      <Outlet />
      {role === "client" && <AiChatWidget />}
    </DashboardLayout>
  );
}
