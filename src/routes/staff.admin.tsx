import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCapabilities } from "@/lib/staff/capability-context";

export const Route = createFileRoute("/staff/admin")({ component: AdminLayoutRoute });

function AdminLayoutRoute() {
  const { profile } = useAuth();
  const { hasCapability, isLoading } = useCapabilities();
  const navigate = useNavigate();
  const allowed = profile?.role === "admin" || hasCapability("manage_staff");

  useEffect(() => {
    if (!isLoading && profile && !allowed) navigate({ to: "/staff" });
  }, [isLoading, profile, allowed, navigate]);

  if (isLoading || !profile) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!allowed) return null;
  return <Outlet />;
}
