import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { StaffCapabilityProvider } from "@/lib/staff/capability-context";
import { StaffLayout } from "@/components/layout/staff-layout";

export const Route = createFileRoute("/staff")({
  component: StaffLayoutRoute,
});

function StaffLayoutRoute() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login", search: { next: "/staff" } as never });
      return;
    }
    if (profile && profile.role === "client") {
      navigate({ to: "/dashboard", search: {} as never });
    }
  }, [loading, user, profile, navigate]);

  if (loading || !user || !profile || profile.role === "client") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <StaffCapabilityProvider>
      <StaffLayout>
        <Outlet />
      </StaffLayout>
    </StaffCapabilityProvider>
  );
}
