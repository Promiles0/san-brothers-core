import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/lib/dashboard/status-badge";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/claims/")({
  component: ClaimsList,
});

interface Row {
  id: string;
  reason_category: string;
  description: string;
  status: string;
  created_at: string;
  service_requests: { services: { name_en: string; name_zh: string | null; name_rw: string | null } | null } | null;
}

const TABS: Record<string, string[]> = {
  open: ["open", "under_review"],
  resolved: ["resolved"],
  rejected: ["rejected"],
};

function ClaimsList() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("claims")
          .select("id,reason_category,description,status,created_at,service_requests(services(name_en,name_zh,name_rw))")
          .eq("client_id", user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;
        setRows((data as unknown as Row[]) ?? []);
      } catch (e) {
        toast.error((e as Error).message);
        setRows([]);
      }
    })();
  }, [user]);

  const renderTab = (key: keyof typeof TABS) => {
    if (rows === null) return <Skeleton className="h-40" />;
    const items = rows.filter((r) => TABS[key].includes(r.status));
    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <ShieldAlert className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t(`dashboard.claims.empty.${key}`)}</p>
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((r) => {
          const svcName = r.service_requests?.services
            ? (locale === "zh" && r.service_requests.services.name_zh) || (locale === "rw" && r.service_requests.services.name_rw) || r.service_requests.services.name_en
            : null;
          return (
            <Card key={r.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm">{t(`dashboard.claims.reason.${r.reason_category}`)}</CardTitle>
                  <StatusBadge status={r.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
                {svcName && <p className="text-xs text-muted-foreground">{t("dashboard.claims.related")}: {svcName}</p>}
                <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                <Button asChild size="sm" variant="outline" className="w-full">
                  <Link to="/dashboard/claims/$id" params={{ id: r.id }}>{t("dashboard.common.viewDetails")}</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.claims.title")}</h1>
        <Button asChild><Link to="/dashboard/claims/new">+ {t("dashboard.claims.newCta")}</Link></Button>
      </div>
      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">{t("dashboard.claims.tab.open")}</TabsTrigger>
          <TabsTrigger value="resolved">{t("dashboard.claims.tab.resolved")}</TabsTrigger>
          <TabsTrigger value="rejected">{t("dashboard.claims.tab.rejected")}</TabsTrigger>
        </TabsList>
        <TabsContent value="open" className="mt-4">{renderTab("open")}</TabsContent>
        <TabsContent value="resolved" className="mt-4">{renderTab("resolved")}</TabsContent>
        <TabsContent value="rejected" className="mt-4">{renderTab("rejected")}</TabsContent>
      </Tabs>
    </div>
  );
}
