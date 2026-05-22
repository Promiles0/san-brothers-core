import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/lib/dashboard/status-badge";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/my-services/")({
  component: MyServicesList,
});

interface Row {
  id: string;
  status: string;
  progress_step: number;
  progress_total: number;
  created_at: string;
  updated_at: string;
  services: { name_en: string; name_zh: string | null; name_rw: string | null } | null;
}
const TAB_STATUSES: Record<string, string[]> = {
  active: ["submitted", "under_review", "awaiting_client", "verified", "submitted_to_authority"],
  completed: ["completed"],
  cancelled: ["cancelled", "rejected"],
};

function MyServicesList() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("service_requests")
          .select(
            "id,status,progress_step,progress_total,created_at,updated_at,services(name_en,name_zh,name_rw)",
          )
          .eq("client_id", user.id)
          .order("updated_at", { ascending: false });
        if (error) throw error;
        setRows((data as unknown as Row[]) ?? []);
      } catch (e) {
        toast.error((e as Error).message);
        setRows([]);
      }
    })();
  }, [user]);

  const localName = (s: Row["services"]) =>
    !s ? "" : (locale === "zh" && s.name_zh) || (locale === "rw" && s.name_rw) || s.name_en;

  const renderTab = (key: keyof typeof TAB_STATUSES) => {
    if (rows === null) return <Skeleton className="h-40" />;
    const items = rows.filter((r) => TAB_STATUSES[key].includes(r.status));
    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <Briefcase className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t(`dashboard.myServices.empty.${key}`)}
            </p>
            <Button asChild size="sm">
              <Link to="/dashboard/services">{t("dashboard.myServices.browse")}</Link>
            </Button>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((r) => (
          <Card key={r.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{localName(r.services)}</CardTitle>
                <StatusBadge status={r.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={(r.progress_step / Math.max(r.progress_total, 1)) * 100} />
              <div className="text-xs text-muted-foreground">
                {t("dashboard.common.created")}: {new Date(r.created_at).toLocaleDateString()}
              </div>
              <Button asChild size="sm" variant="outline" className="w-full">
                <Link to="/dashboard/my-services/$id" params={{ id: r.id }}>
                  {t("dashboard.common.viewDetails")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.myServices.title")}</h1>
      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">{t("dashboard.myServices.tab.active")}</TabsTrigger>
          <TabsTrigger value="completed">{t("dashboard.myServices.tab.completed")}</TabsTrigger>
          <TabsTrigger value="cancelled">{t("dashboard.myServices.tab.cancelled")}</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">
          {renderTab("active")}
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          {renderTab("completed")}
        </TabsContent>
        <TabsContent value="cancelled" className="mt-4">
          {renderTab("cancelled")}
        </TabsContent>
      </Tabs>
    </div>
  );
}
