import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useAuth } from "@/hooks/useAuth";

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

  // Staff/admin land here too (v1) — they see the client shell for now.
  // (Real staff dashboards ship in prompt 5C.)
  useEffect(() => {
    if (!loading && profile && profile.role !== "client") {
      // No-op redirect for now; just keep them on /dashboard
    }
  }, [profile, loading, navigate]);

  const role = (profile?.role === "client" ? "client" : profile?.role ?? "client") as
    | "client" | "secretary" | "manager" | "translator" | "admin";

  return (
    <DashboardLayout role={role}>
      <Outlet />
    </DashboardLayout>
  );
}
