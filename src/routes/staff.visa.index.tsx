import { createFileRoute } from "@tanstack/react-router";
import { useCapabilities } from "@/lib/staff/capability-context";
import { StaffCasesList } from "@/components/staff/staff-cases-list";
import { ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/staff/visa/")({ component: Page });
function Page() {
  const { hasCapability, isLoading } = useCapabilities();
  if (isLoading) return null;
  if (!hasCapability("handle_visa") && !hasCapability("approve_visa")) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <ShieldAlert className="h-12 w-12 text-red-400" />
        <h2 className="text-lg font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground text-center">
          You don't have permission to view Visa cases. Contact your admin to request access.
        </p>
      </div>
    );
  }
  return <StaffCasesList category="visa" basePath="/staff/visa" title="Visa Cases" />;
}
