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

  // Staff/admin: silently redirect to /staff
  useEffect(() => {
    if (!loading && profile && profile.role !== "client") {
      navigate({ to: "/staff", search: {} as never });
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

