import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  Briefcase,
  Calendar,
  ArrowUpRight,
  Inbox,
  BarChart3,
  Activity,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCapabilities } from "@/lib/staff/capability-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/lib/dashboard/status-badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff/reports")({ component: Page });

type Range = "7d" | "30d" | "90d";

interface CaseRow {
  id: string;
  status: string;
  service_category: string;
  priority: string;
  created_at: string;
  completed_at: string | null;
  client: { full_name: string | null; email: string } | null;
  service: { name_en: string } | null;
}

const CATEGORY_META: Record<string, { label: string; color: string; bar: string }> = {
  visa: { label: "Visa", color: "text-blue-600 dark:text-blue-400", bar: "bg-blue-500" },
  accounting: {
    label: "Accounting",
    color: "text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
  },
  translation: {
    label: "Translation",
    color: "text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
  },
  consultancy: {
    label: "Consultancy",
    color: "text-violet-600 dark:text-violet-400",
    bar: "bg-violet-500",
  },
};

function Page() {
  const { hasCapability, isLoading: capLoading } = useCapabilities();
  const navigate = useNavigate();
  const [range, setRange] = useState<Range>("30d");
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!capLoading && !hasCapability("view_financial_reports")) navigate({ to: "/staff" });
  }, [capLoading, hasCapability, navigate]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
      const since = new Date();
      since.setDate(since.getDate() - days);
      const { data } = await supabase
        .from("service_requests")
        .select(
          "id,status,service_category,priority,created_at,completed_at,client:users(full_name,email),service:services(name_en)",
        )
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(500);
      setRows((data ?? []) as unknown as CaseRow[]);
      setLoading(false);
    })();
  }, [range]);

  const stats = useMemo(() => {
    const completed = rows.filter((r) => r.status === "completed");
    const inProgress = rows.filter((r) => r.status !== "completed" && r.status !== "cancelled");
    const urgent = rows.filter((r) => r.priority === "urgent").length;
    const durations = completed
      .filter((r) => r.completed_at)
      .map((r) => {
        const start = new Date(r.created_at).getTime();
        const end = new Date(r.completed_at as string).getTime();
        return (end - start) / (1000 * 60 * 60 * 24);
      });
    const avgDays = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const completionRate = rows.length ? (completed.length / rows.length) * 100 : 0;
    return {
      total: rows.length,
      completed: completed.length,
      inProgress: inProgress.length,
      urgent,
      avgDays,
      completionRate,
    };
  }, [rows]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.service_category, (map.get(r.service_category) ?? 0) + 1));
    const arr = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const max = arr[0]?.[1] ?? 1;
    return { arr, max };
  }, [rows]);

  const topServices = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => {
      const name = r.service?.name_en ?? "Unknown";
      map.set(name, (map.get(name) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [rows]);

  const recentCompleted = useMemo(
    () => rows.filter((r) => r.status === "completed").slice(0, 8),
    [rows],
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Performance Reports</h1>
          <p className="text-sm text-muted-foreground">
            Operational metrics across the selected window.
          </p>
        </div>
        <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
          <TabsList>
            <TabsTrigger value="7d">7 days</TabsTrigger>
            <TabsTrigger value="30d">30 days</TabsTrigger>
            <TabsTrigger value="90d">90 days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Briefcase}
          tone="primary"
          title="Total cases"
          value={loading ? null : stats.total}
          hint="Created in window"
        />
        <Stat
          icon={CheckCircle2}
          tone="emerald"
          title="Completed"
          value={loading ? null : stats.completed}
          hint={`${stats.completionRate.toFixed(0)}% completion rate`}
        />
        <Stat
          icon={Activity}
          tone="amber"
          title="In progress"
          value={loading ? null : stats.inProgress}
          hint={`${stats.urgent} urgent`}
        />
        <Stat
          icon={Clock}
          tone="violet"
          title="Avg duration"
          value={loading ? null : `${stats.avgDays.toFixed(1)}d`}
          hint="Created → completed"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Cases by category
            </CardTitle>
            <Badge variant="secondary">{stats.total} total</Badge>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : byCategory.arr.length === 0 ? (
              <Empty label="No cases in this window" />
            ) : (
              <div className="space-y-3">
                {byCategory.arr.map(([cat, count]) => {
                  const meta = CATEGORY_META[cat] ?? {
                    label: cat,
                    color: "text-muted-foreground",
                    bar: "bg-muted-foreground",
                  };
                  const pct = (count / byCategory.max) * 100;
                  return (
                    <div key={cat} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className={cn("font-medium capitalize", meta.color)}>
                          {meta.label}
                        </span>
                        <span className="tabular-nums text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full transition-all", meta.bar)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Top services
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
              </div>
            ) : topServices.length === 0 ? (
              <Empty label="No data yet" />
            ) : (
              <ol className="space-y-2">
                {topServices.map(([name, count], i) => (
                  <li
                    key={name}
                    className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/30 px-3 py-2"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {i + 1}
                      </span>
                      <span className="truncate text-sm">{name}</span>
                    </div>
                    <Badge variant="secondary" className="tabular-nums">
                      {count}
                    </Badge>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Recently completed
          </CardTitle>
          <Button asChild size="sm" variant="ghost">
            <Link to="/staff">
              View all <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentCompleted.length === 0 ? (
            <Empty label="No completed cases yet" />
          ) : (
            <ul className="divide-y divide-border">
              {recentCompleted.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {r.client?.full_name ?? r.client?.email ?? "—"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.service?.name_en} ·{" "}
                      {CATEGORY_META[r.service_category]?.label ?? r.service_category}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={r.status} />
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {r.completed_at
                        ? new Date(r.completed_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const TONE: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

function Stat({
  icon: Icon,
  title,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: number | string | null;
  hint?: string;
  tone: keyof typeof TONE;
}) {
  return (
    <Card className="relative overflow-hidden transition hover:shadow-md hover:-translate-y-0.5">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
            {value === null ? (
              <Skeleton className="mt-2 h-7 w-20" />
            ) : (
              <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
            )}
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <div className={cn("grid h-9 w-9 place-items-center rounded-lg", TONE[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
      <Inbox className="h-8 w-8 opacity-60" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
