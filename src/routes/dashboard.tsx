import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import type { UserRole } from "@/lib/types";

const searchSchema = z.object({
  role: z.enum(["client", "secretary", "manager", "translator", "admin"]).catch("client"),
});

export const Route = createFileRoute("/dashboard")({
  validateSearch: searchSchema,
  component: DashboardPage,
});

function DashboardPage() {
  const { role } = Route.useSearch() as { role: UserRole };
  return (
    <DashboardLayout role={role} breadcrumbs={[role, "Home"]}>
      <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card p-8 text-center">
        <h1 className="text-2xl font-bold capitalize">{role} dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Sidebar wired for the <span className="font-medium capitalize">{role}</span> role.
          Page content arrives in a later prompt.
        </p>
      </div>
    </DashboardLayout>
  );
}
