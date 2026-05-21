import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCapabilities } from "@/lib/staff/capability-context";
import { StaffCasesList } from "@/components/staff/staff-cases-list";

export const Route = createFileRoute("/staff/accounting")({ component: Page });
function Page() {
  const { hasCapability, isLoading } = useCapabilities();
  const navigate = useNavigate();
  useEffect(() => { if (!isLoading && !hasCapability("handle_accounting")) navigate({ to: "/staff" }); }, [isLoading, hasCapability, navigate]);
  return <StaffCasesList category="accounting" basePath="/staff/accounting" title="Accounting Cases" />;
}
