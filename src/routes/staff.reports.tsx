import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useCapabilities } from "@/lib/staff/capability-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/staff/reports")({ component: Page });

function Page() {
  const { hasCapability, isLoading } = useCapabilities();
  const navigate = useNavigate();
  useEffect(() => {
    if (!isLoading && !hasCapability("view_financial_reports")) navigate({ to: "/staff" });
  }, [isLoading, hasCapability, navigate]);

  const [completedThisMonth, setCompletedThisMonth] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("service_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("completed_at", start.toISOString());
      setCompletedThisMonth(count ?? 0);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reports</h1>
      <div className="grid gap-3 md:grid-cols-2">
        <Stat title="Total Revenue This Month" value="Coming soon" />
        <Stat
          title="Cases Completed This Month"
          value={completedThisMonth === null ? "…" : String(completedThisMonth)}
        />
        <Stat title="Average Case Duration" value="Coming soon" />
        <Stat title="Top Services" value="Coming soon" />
      </div>
      <p className="text-sm text-muted-foreground">Full reports coming soon.</p>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
