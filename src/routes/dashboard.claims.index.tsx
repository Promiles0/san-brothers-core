import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ShieldAlert,
  AlertOctagon,
  Clock,
  XCircle,
  CheckCircle2,
  CreditCard,
  Star,
  FileQuestion,
  MessageCircle,
  ArrowRight,
  Plus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/claims/")({
  component: ClaimsList,
});

interface Row {
  id: string;
  reason_category: string;
  description: string;
  status: string;
  created_at: string;
  service_requests: {
    services: { name_en: string; name_zh: string | null; name_rw: string | null } | null;
  } | null;
}

const TABS: Record<string, string[]> = {
  open: ["open", "under_review"],
  resolved: ["resolved"],
  rejected: ["rejected"],
};

const reasonIcon = (r: string) => {
  switch (r) {
    case "long_delay":
      return Clock;
    case "service_incorrect":
    case "service_not_delivered":
      return XCircle;
    case "refund_request":
      return CreditCard;
    case "quality_issue":
      return Star;
    default:
      return FileQuestion;
  }
};

const statusStyle: Record<
  string,
  { border: string; badge: string; label: string; pulse?: boolean }
> = {
  open: {
    border: "border-l-red-500",
    badge: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    label: "Open",
    pulse: true,
  },
  under_review: {
    border: "border-l-amber-500",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    label: "Under Review",
  },
  resolved: {
    border: "border-l-emerald-500",
    badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    label: "Resolved",
  },
  rejected: {
    border: "border-l-muted-foreground",
    badge: "bg-muted text-muted-foreground border-border",
    label: "Rejected",
  },
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
          .select(
            "id,reason_category,description,status,created_at,service_requests(services(name_en,name_zh,name_rw))",
          )
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

  const counts = useMemo(() => {
    const r = rows ?? [];
    return {
      open: r.filter((x) => TABS.open.includes(x.status)).length,
      resolved: r.filter((x) => TABS.resolved.includes(x.status)).length,
      rejected: r.filter((x) => TABS.rejected.includes(x.status)).length,
    };
  }, [rows]);

  const renderTab = (key: keyof typeof TABS) => {
    if (rows === null)
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      );
    const items = rows.filter((r) => TABS[key].includes(r.status));
    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            </div>
            <div>
              <p className="text-base font-semibold">No {key} claims</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                {key === "open"
                  ? "Everything looks good! If you have an issue with a service, you can open a claim."
                  : t(`dashboard.claims.empty.${key}`)}
              </p>
            </div>
            {key === "open" && (
              <Button asChild size="sm">
                <Link to="/dashboard/claims/new" search={{} as never}>
                  <Plus className="mr-1 h-4 w-4" /> Open a Claim
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((r) => {
          const Icon = reasonIcon(r.reason_category);
          const style = statusStyle[r.status] ?? statusStyle.open;
          const svcName = r.service_requests?.services
            ? (locale === "zh" && r.service_requests.services.name_zh) ||
              (locale === "rw" && r.service_requests.services.name_rw) ||
              r.service_requests.services.name_en
            : null;
          return (
            <Card
              key={r.id}
              className={cn(
                "border-l-4 transition hover:shadow-md animate-in fade-in duration-300",
                style.border,
              )}
            >
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">
                        {t(`dashboard.claims.reason.${r.reason_category}`)}
                      </div>
                      {svcName && (
                        <div className="text-xs text-muted-foreground">Related to: {svcName}</div>
                      )}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                      style.badge,
                    )}
                  >
                    {style.pulse && (
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                      </span>
                    )}
                    {style.label}
                  </div>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">"{r.description}"</p>
                <p className="text-xs text-muted-foreground">
                  Opened {new Date(r.created_at).toLocaleDateString()}
                </p>
                <div className="flex gap-2 pt-1">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link to="/dashboard/claims/$id" params={{ id: r.id }}>
                      View Details <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/dashboard/messages">
                      <MessageCircle className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10">
            <ShieldAlert className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t("dashboard.claims.title")}</h1>
            <p className="text-sm text-muted-foreground">Claims & disputes</p>
          </div>
        </div>
        <Button asChild>
          <Link to="/dashboard/claims/new" search={{} as never}>
            <Plus className="mr-1 h-4 w-4" /> {t("dashboard.claims.newCta")}
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open" className="gap-1.5">
            {rows && counts.open > 0 && <AlertOctagon className="h-3.5 w-3.5 text-red-500" />}
            {t("dashboard.claims.tab.open")} ({counts.open})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            {t("dashboard.claims.tab.resolved")} ({counts.resolved})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            {t("dashboard.claims.tab.rejected")} ({counts.rejected})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="open" className="mt-4">
          {renderTab("open")}
        </TabsContent>
        <TabsContent value="resolved" className="mt-4">
          {renderTab("resolved")}
        </TabsContent>
        <TabsContent value="rejected" className="mt-4">
          {renderTab("rejected")}
        </TabsContent>
      </Tabs>
    </div>
  );
}
