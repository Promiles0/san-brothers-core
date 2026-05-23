import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/staff/admin/analytics")({ component: Page });

function Page() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Deep dives into revenue, conversion, and team performance.
        </p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Advanced analytics coming soon</p>
          <p className="text-sm text-muted-foreground">
            Quick KPIs and charts are on the Dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
