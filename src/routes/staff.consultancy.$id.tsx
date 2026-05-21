import { createFileRoute } from "@tanstack/react-router";
import { StaffCaseDetail } from "@/components/staff/staff-case-detail";

export const Route = createFileRoute("/staff/consultancy/$id")({ component: Page });
function Page() {
  const { id } = Route.useParams();
  return <StaffCaseDetail id={id} category="consultancy" basePath="/staff/consultancy" />;
}
