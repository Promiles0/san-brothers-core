import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/admin/settings")({ component: AdminSettings });

function AdminSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Company-wide configuration and preferences.</p>
      </div>
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-20 text-center">
          <Settings className="h-10 w-10 text-muted-foreground" />
          <p className="font-medium">Company settings coming soon</p>
          <p className="text-sm text-muted-foreground">
            Branding, notification preferences, and integrations will be configurable here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
