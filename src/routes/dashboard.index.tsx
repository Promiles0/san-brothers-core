import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, FolderOpen, MessageCircle, LayoutGrid, FileText, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/lib/dashboard/status-badge";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";
import { supabase } from "@/lib/supabase";
import { intentLabel } from "@/lib/auth/intent-labels";
import { toast } from "sonner";

interface ActiveService {
  id: string;
  status: string;
  progress_step: number;
  progress_total: number;
  updated_at: string;
  services: { name_en: string; name_zh: string | null; name_rw: string | null } | null;
}

export const Route = createFileRoute("/dashboard/")({
  validateSearch: (s: Record<string, unknown>) => ({
    intent: typeof s.intent === "string" ? s.intent : undefined,
  }),
  component: DashboardHome,
});
function DashboardHome() {
  const { user, profile } = useAuth();
  const { t, locale } = useI18n();
  const { intent } = useSearch({ from: "/dashboard/" });
  const [active, setActive] = useState<ActiveService[] | null>(null);
  const [counts, setCounts] = useState({ docs: 0, messages: 0 });
  const [expiring, setExpiring] = useState<
    { id: string; visa_expiry_date: string; services: { name_en: string } | null }[]
  >([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("service_requests")
          .select(
            "id,status,progress_step,progress_total,updated_at,services(name_en,name_zh,name_rw)",
          )
          .eq("client_id", user.id)
          .not("status", "in", "(completed,rejected,cancelled)")
          .order("updated_at", { ascending: false });
        if (error) throw error;
        setActive((data as unknown as ActiveService[]) ?? []);
      } catch (e) {
        toast.error((e as Error).message);
        setActive([]);
      }
      const { count } = await supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("client_id", user.id);
      setCounts({ docs: count ?? 0, messages: 0 });

      try {
        const horizon = new Date();
        horizon.setDate(horizon.getDate() + 90);
        const { data: exp } = await supabase
          .from("service_requests")
          .select("id,visa_expiry_date,services(name_en)")
          .eq("client_id", user.id)
          .not("visa_expiry_date", "is", null)
          .lte("visa_expiry_date", horizon.toISOString().slice(0, 10))
          .order("visa_expiry_date", { ascending: true });
        setExpiring((exp ?? []) as unknown as typeof expiring);
      } catch {
        setExpiring([]);
      }
    })();
  }, [user]);

  const today = new Date().toLocaleDateString(
    locale === "zh" ? "zh-CN" : locale === "rw" ? "rw-RW" : "en-US",
    {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    },
  );

  const localizedName = (s: ActiveService["services"]) =>
    !s ? "" : (locale === "zh" && s.name_zh) || (locale === "rw" && s.name_rw) || s.name_en;

  return (
    <div className="space-y-6">
      {/* WELCOME */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {t("dashboard.home.welcome").replace(
                  "{name}",
                  profile?.full_name ?? user?.email ?? "",
                )}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{today}</p>
            </div>
            <div className="flex gap-3">
              <Stat label={t("dashboard.home.activeServices")} value={active?.length ?? "—"} />
              <Stat label={t("dashboard.home.documents")} value={counts.docs} />
              <Stat label={t("dashboard.home.unreadMessages")} value={counts.messages} />
            </div>
          </div>
          {intent ? (
            <div className="mt-4 rounded-md bg-primary/10 px-3 py-2 text-sm">
              {t("dashboard.home.intentBanner").replace("{name}", intentLabel(intent) ?? intent)}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* VISA EXPIRY REMINDERS */}
      {expiring.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reminders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {expiring.map((e) => {
              const days = Math.ceil(
                (new Date(e.visa_expiry_date).getTime() - Date.now()) / 86400000,
              );
              const tone =
                days < 30
                  ? "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300"
                  : days < 60
                    ? "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300"
                    : "border-yellow-500/40 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300";
              return (
                <div
                  key={e.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm ${tone}`}
                >
                  <div>
                    <span className="font-semibold">
                      {days <= 0 ? "Expired" : `${days} day${days === 1 ? "" : "s"} until expiry`}
                    </span>
                    <span className="ml-2 text-foreground/80">
                      · {e.services?.name_en ?? "Visa"}
                    </span>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/dashboard/services">Renew now</Link>
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ACTIVE SERVICES */}
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-lg font-semibold">{t("dashboard.home.yourActiveServices")}</h2>
          {active === null ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-40" />
              <Skeleton className="h-40" />
            </div>
          ) : active.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">{t("dashboard.home.empty.title")}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("dashboard.home.empty.desc")}
                  </p>
                </div>
                <Button asChild>
                  <Link to="/dashboard/services">{t("dashboard.home.empty.cta")}</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {active.map((s) => (
                <Card key={s.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{localizedName(s.services)}</CardTitle>
                      <StatusBadge status={s.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Progress value={(s.progress_step / Math.max(s.progress_total, 1)) * 100} />
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("dashboard.common.step")} {s.progress_step} / {s.progress_total}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("dashboard.common.lastUpdated")}:{" "}
                      {new Date(s.updated_at).toLocaleDateString()}
                    </p>
                    <Button asChild size="sm" variant="outline" className="w-full">
                      <Link to="/dashboard/my-services/$id" params={{ id: s.id }}>
                        {t("dashboard.common.continue")} →
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* NOTIFICATIONS PANEL */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("dashboard.home.notifications")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t("dashboard.home.noNotifications")}</p>
          </CardContent>
        </Card>
      </div>

      {/* QUICK ACTIONS */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">{t("dashboard.home.quickActions")}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <QuickAction
            to="/dashboard/services"
            icon={LayoutGrid}
            label={t("dashboard.home.requestNew")}
          />
          <QuickAction
            to="/dashboard/documents"
            icon={FolderOpen}
            label={t("dashboard.home.uploadDoc")}
          />
          <QuickAction
            to="/dashboard/messages"
            icon={MessageCircle}
            label={t("dashboard.home.talkSupport")}
          />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-center min-w-[80px]">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent"
    >
      <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm font-medium">{label}</span>
      <Plus className="ml-auto h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
