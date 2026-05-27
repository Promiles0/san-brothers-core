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
  const [hasInterpreterHistory, setHasInterpreterHistory] = useState(false);

  // Staff/admin: silently redirect to /staff
  useEffect(() => {
    if (!loading && profile && profile.role !== "client") {
      navigate({ to: "/staff", search: {} as never });
    }
  }, [profile, loading, navigate]);

  // Check if this client has any interpreter call history; subscribe for new ones
  useEffect(() => {
    if (!profile?.id || profile.role !== "client") return;

    void supabase
      .from("interpreter_calls")
      .select("id", { count: "exact", head: true })
      .eq("client_id", profile.id)
      .then(({ count }) => {
        if ((count ?? 0) > 0) setHasInterpreterHistory(true);
      });

    const channel = supabase
      .channel("client-interp-history:" + profile.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "interpreter_calls",
          filter: `client_id=eq.${profile.id}`,
        },
        () => setHasInterpreterHistory(true),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile?.id, profile?.role]);

  const role = (profile?.role === "client" ? "client" : (profile?.role ?? "client")) as
    | "client"
    | "secretary"
    | "manager"
    | "translator"
    | "admin";

  return (
    <DashboardLayout
      role={role}
      hiddenNavKeys={role === "client" && !hasInterpreterHistory ? ["liveInterpreter"] : undefined}
    >
      <Outlet />
      {role === "client" && <AiChatWidget />}
    </DashboardLayout>
  );
}
