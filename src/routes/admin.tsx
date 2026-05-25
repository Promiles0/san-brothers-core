import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AdminLayout } from "@/components/layout/admin-layout";

export const Route = createFileRoute("/admin")({
  component: AdminLayoutRoute,
});

function AdminLayoutRoute() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", search: { next: "/admin" } as never });
      return;
    }
    if (profile && profile.role !== "admin") {
      if (profile.role === "client") {
        navigate({ to: "/dashboard", search: {} as never });
      } else {
        navigate({ to: "/staff", search: {} as never });
      }
    }
  }, [loading, user, profile, navigate]);

  if (loading || !user || !profile || profile.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
