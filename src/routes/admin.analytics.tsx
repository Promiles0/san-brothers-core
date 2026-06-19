import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  Lightbulb,
  Loader2,
  TrendingUp,
  Trophy,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/admin/analytics")({ component: AdminAnalytics });

interface ServiceRow {
  id: string;
  slug: string | null;
  name_en: string | null;
  category: string | null;
  price_min_rwf: number | null;
  price_max_rwf: number | null;
  sort_order: number | null;
}

interface RequestRow {
  id: string;
  service_id: string | null;
  service_category: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

interface PaymentRow {
  service_request_id: string | null;
  amount_rwf: number | null;
  status: string;
  created_at: string;
}

interface ServiceStat {
  id: string;
  name: string;
  category: string;
  total: number;
  completed: number;
  cancelled: number;
  rejected: number;
  inProgress: number;
  revenue: number;
  avgDays: number | null;
  priceMin: number | null;
  priceMax: number | null;
  completionRate: number | null;
  avgRevenuePerCase: number | null;
  recent30: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  visa: "#3B82F6",
  accounting: "#10B981",
  consultancy: "#F59E0B",
  translation: "#8B5CF6",
};

const CATEGORY_BADGE: Record<string, string> = {
  visa: "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30",
  accounting: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
  consultancy: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
  translation: "bg-violet-500/15 text-violet-600 dark:text-violet-300 border-violet-500/30",
};

const fmtRWF = (v: number) => "RWF " + Math.round(v).toLocaleString("en-US");
const fmtCompact = (v: number) =>
  v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}k` : `${v}`;

type SortKey = "name" | "total" | "completed" | "rate" | "avgDays" | "revenue" | "avgRev";

function AdminAnalytics() {
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    (async () => {
      try {
        const [svc, req, pay] = await Promise.all([
          supabase
            .from("services")
            .select("id, slug, name_en, category, price_min_rwf, price_max_rwf, sort_order")
            .order("sort_order", { ascending: true }),
          supabase
            .from("service_requests")
            .select("id, service_id, service_category, status, created_at, completed_at"),
          supabase
            .from("payments")
            .select("service_request_id, amount_rwf, status, created_at")
            .eq("status", "completed"),
        ]);
        if (svc.error) console.warn("services err", svc.error);
        if (req.error) console.warn("requests err", req.error);
        if (pay.error) console.warn("payments err", pay.error);
        setServices((svc.data ?? []) as ServiceRow[]);
        setRequests((req.data ?? []) as RequestRow[]);
        setPayments((pay.data ?? []) as PaymentRow[]);
      } catch (e) {
        console.warn("analytics fetch failed", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const stats: ServiceStat[] = useMemo(() => {
    const reqToService = new Map<string, string | null>();
    for (const r of requests) reqToService.set(r.id, r.service_id);

    const revBySvc = new Map<string, number>();
    for (const p of payments) {
      if (!p.service_request_id || !p.amount_rwf) continue;
      const sid = reqToService.get(p.service_request_id);
      if (!sid) continue;
      revBySvc.set(sid, (revBySvc.get(sid) ?? 0) + p.amount_rwf);
    }

    const now = Date.now();
    const dayMs = 1000 * 60 * 60 * 24;
    const cutoff30 = now - 30 * dayMs;

    return services.map((s) => {
      const myReqs = requests.filter((r) => r.service_id === s.id);
      const completed = myReqs.filter((r) => r.status === "completed");
      const cancelled = myReqs.filter((r) => r.status === "cancelled").length;
      const rejected = myReqs.filter((r) => r.status === "rejected").length;
      const inProgress = myReqs.length - completed.length - cancelled - rejected;
      const recent30 = myReqs.filter((r) => new Date(r.created_at).getTime() >= cutoff30).length;

      const completedDays = completed
        .filter((r) => r.completed_at)
        .map(
          (r) =>
            (new Date(r.completed_at as string).getTime() - new Date(r.created_at).getTime()) /
            dayMs,
        );
      const avgDays =
        completedDays.length > 0
          ? completedDays.reduce((a, b) => a + b, 0) / completedDays.length
          : null;

      const decided = completed.length + cancelled + rejected;
      const completionRate = decided > 0 ? (completed.length / decided) * 100 : null;
      const revenue = revBySvc.get(s.id) ?? 0;
      const avgRevenuePerCase = completed.length > 0 ? revenue / completed.length : null;

      return {
        id: s.id,
        name: s.name_en ?? s.slug ?? "Untitled",
        category: s.category ?? "other",
        total: myReqs.length,
        completed: completed.length,
        cancelled,
        rejected,
        inProgress,
        revenue,
        avgDays,
        priceMin: s.price_min_rwf,
        priceMax: s.price_max_rwf,
        completionRate,
        avgRevenuePerCase,
        recent30,
      };
    });
  }, [services, requests, payments]);

  // Summary metrics
  const summary = useMemo(() => {
    const totalRev = stats.reduce((a, s) => a + s.revenue, 0);
    const bestRev = stats.reduce<ServiceStat | null>(
      (best, s) => (s.revenue > 0 && (!best || s.revenue > best.revenue) ? s : best),
      null,
    );
    const mostReq = stats.reduce<ServiceStat | null>(
      (best, s) => (s.total > 0 && (!best || s.total > best.total) ? s : best),
      null,
    );
    const bestRate = stats.reduce<ServiceStat | null>(
      (best, s) =>
        s.completionRate !== null && s.total >= 3 &&
        (!best || (s.completionRate ?? 0) > (best.completionRate ?? 0))
          ? s
          : best,
      null,
    );
    const needs = stats.filter(
      (s) =>
        s.recent30 === 0 ||
        (s.total >= 3 && s.completionRate !== null && s.completionRate < 50),
    ).length;
    return { totalRev, bestRev, mostReq, bestRate, needs };
  }, [stats]);

  // Filtered + sorted table rows
  const tableRows = useMemo(() => {
    let rows = stats;
    if (categoryFilter !== "all") rows = rows.filter((r) => r.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    }
    const dir = sortDir === "asc" ? 1 : -1;
    const sorted = [...rows].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "total":
          return (a.total - b.total) * dir;
        case "completed":
          return (a.completed - b.completed) * dir;
        case "rate":
          return ((a.completionRate ?? -1) - (b.completionRate ?? -1)) * dir;
        case "avgDays":
          return ((a.avgDays ?? Number.POSITIVE_INFINITY) - (b.avgDays ?? Number.POSITIVE_INFINITY)) * dir;
        case "avgRev":
          return ((a.avgRevenuePerCase ?? -1) - (b.avgRevenuePerCase ?? -1)) * dir;
        case "revenue":
        default:
          return (a.revenue - b.revenue) * dir;
      }
    });
    return sorted;
  }, [stats, categoryFilter, search, sortKey, sortDir]);

  const revenueChartData = useMemo(
    () =>
      [...stats]
        .filter((s) => s.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .map((s) => ({ name: s.name, revenue: s.revenue, category: s.category })),
    [stats],
  );

  const categoryChartData = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of stats) {
      map.set(s.category, (map.get(s.category) ?? 0) + s.revenue);
    }
    return Array.from(map.entries())
      .map(([category, revenue]) => ({ category, revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [stats]);

  const insights = useMemo(() => {
    const out: string[] = [];
    if (summary.totalRev > 0 && summary.bestRev) {
      const pct = (summary.bestRev.revenue / summary.totalRev) * 100;
      if (pct > 40) {
        out.push(
          `${summary.bestRev.name} accounts for ${pct.toFixed(0)}% of total revenue — consider whether pricing or capacity should scale with this.`,
        );
      }
    }
    const never = stats.filter((s) => s.total === 0);
    if (never.length > 0) {
      const sample = never.slice(0, 2).map((s) => s.name).join(", ");
      out.push(
        `${never.length === 1 ? sample + " has" : sample + (never.length > 2 ? ` and ${never.length - 2} other services have` : " have")} never been requested. Consider reviewing pricing, visibility, or removing from the catalog.`,
      );
    }
    for (const s of stats) {
      if (s.total >= 3 && s.completionRate !== null && s.completionRate < 50) {
        out.push(
          `${s.name} has a completion rate of only ${s.completionRate.toFixed(0)}% — investigate common rejection or cancellation reasons.`,
        );
      }
    }
    const avgList = stats.filter((s) => s.avgDays !== null).map((s) => s.avgDays as number).sort((a, b) => a - b);
    if (avgList.length >= 3) {
      const median = avgList[Math.floor(avgList.length / 2)];
      for (const s of stats) {
        if (s.avgDays !== null && median > 0 && s.avgDays > median * 2) {
          out.push(
            `${s.name} takes significantly longer to complete (${s.avgDays.toFixed(1)} days vs ${median.toFixed(1)} day median) — review the process for bottlenecks.`,
          );
        }
      }
    }
    return out.slice(0, 6);
  }, [stats, summary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const SortBtn = ({ k, children }: { k: SortKey; children: React.ReactNode }) => {
    const active = sortKey === k;
    const Icon = !active ? ArrowUpDown : sortDir === "desc" ? ArrowDown : ArrowUp;
    return (
      <button
        type="button"
        onClick={() => {
          if (sortKey === k) setSortDir(sortDir === "desc" ? "asc" : "desc");
          else {
            setSortKey(k);
            setSortDir("desc");
          }
        }}
        className="inline-flex items-center gap-1 text-left font-medium hover:text-foreground"
      >
        {children}
        <Icon className={`h-3 w-3 ${active ? "text-foreground" : "text-muted-foreground/50"}`} />
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Service Performance Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Revenue, volume, and completion metrics per service — find what's working and what needs attention.
        </p>
      </div>

      {/* Section 1 — Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={Trophy}
          accent="from-emerald-500/20 to-emerald-500/0"
          label="Best revenue service"
          primary={summary.bestRev?.name ?? "—"}
          secondary={summary.bestRev ? fmtRWF(summary.bestRev.revenue) : "No revenue yet"}
        />
        <SummaryCard
          icon={TrendingUp}
          accent="from-blue-500/20 to-blue-500/0"
          label="Most requested"
          primary={summary.mostReq?.name ?? "—"}
          secondary={summary.mostReq ? `${summary.mostReq.total} requests` : "No requests yet"}
        />
        <SummaryCard
          icon={CheckCircle2}
          accent="from-violet-500/20 to-violet-500/0"
          label="Highest completion rate"
          primary={summary.bestRate?.name ?? "—"}
          secondary={
            summary.bestRate && summary.bestRate.completionRate !== null
              ? `${summary.bestRate.completionRate.toFixed(0)}%`
              : "Needs 3+ decided cases"
          }
        />
        <SummaryCard
          icon={AlertTriangle}
          accent="from-amber-500/20 to-amber-500/0"
          label="Needs attention"
          primary={`${summary.needs} service${summary.needs === 1 ? "" : "s"}`}
          secondary="Low completion or no recent requests"
        />
      </div>

      {/* Section 2 — Revenue by service chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue by Service</CardTitle>
          <p className="text-xs text-muted-foreground">All-time, completed payments only</p>
        </CardHeader>
        <CardContent className="h-[420px]">
          {mounted && revenueChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={revenueChartData}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 16, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.2} />
                <XAxis
                  type="number"
                  stroke="currentColor"
                  strokeOpacity={0.3}
                  fontSize={11}
                  tickFormatter={(v: number) => fmtCompact(v)}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="currentColor"
                  strokeOpacity={0.3}
                  fontSize={11}
                  width={150}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [fmtRWF(v), "Revenue"]}
                />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                  {revenueChartData.map((d, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[d.category] ?? "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No revenue data yet.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3 — Performance table */}
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-base">Service Performance</CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search services..."
                className="h-9 sm:w-56"
              />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 sm:w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  <SelectItem value="visa">Visa</SelectItem>
                  <SelectItem value="accounting">Accounting</SelectItem>
                  <SelectItem value="consultancy">Consultancy</SelectItem>
                  <SelectItem value="translation">Translation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortBtn k="name">Service</SortBtn>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">
                    <SortBtn k="total">Total Cases</SortBtn>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortBtn k="completed">Completed</SortBtn>
                  </TableHead>
                  <TableHead className="text-right">Cancelled/Rejected</TableHead>
                  <TableHead className="text-right">
                    <SortBtn k="rate">Completion Rate</SortBtn>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortBtn k="avgDays">Avg Days</SortBtn>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortBtn k="revenue">Total Revenue</SortBtn>
                  </TableHead>
                  <TableHead className="text-right">
                    <SortBtn k="avgRev">Avg Rev/Case</SortBtn>
                  </TableHead>
                  <TableHead className="text-right">Price Range</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-10 text-center text-sm text-muted-foreground">
                      No services match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  tableRows.map((s) => {
                    const flagged =
                      s.total >= 3 && s.completionRate !== null && s.completionRate < 50;
                    const rateBadge =
                      s.completionRate === null
                        ? null
                        : s.completionRate >= 80
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30"
                          : s.completionRate >= 50
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30"
                            : "bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30";
                    const priceRange =
                      s.priceMin && s.priceMax
                        ? `${s.priceMin.toLocaleString()} – ${s.priceMax.toLocaleString()}`
                        : s.priceMin
                          ? `from ${s.priceMin.toLocaleString()}`
                          : "—";
                    return (
                      <TableRow
                        key={s.id}
                        className={flagged ? "border-l-2 border-red-500" : ""}
                      >
                        <TableCell className="font-semibold">{s.name}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={CATEGORY_BADGE[s.category] ?? ""}
                          >
                            {s.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{s.total}</TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                          {s.completed}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-red-600 dark:text-red-400">
                          {s.cancelled + s.rejected || <span className="text-muted-foreground">0</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.completionRate === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <Badge variant="outline" className={rateBadge ?? ""}>
                              {s.completionRate.toFixed(0)}%
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {s.avgDays === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            `${s.avgDays.toFixed(1)} days`
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">
                          {s.revenue > 0 ? fmtRWF(s.revenue) : <span className="font-normal text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {s.avgRevenuePerCase === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            fmtRWF(s.avgRevenuePerCase)
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                          {priceRange}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Section 4 — Category comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Category Comparison</CardTitle>
          <p className="text-xs text-muted-foreground">Which business line drives the most revenue</p>
        </CardHeader>
        <CardContent className="h-64">
          {mounted && categoryChartData.some((c) => c.revenue > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.2} />
                <XAxis
                  dataKey="category"
                  stroke="currentColor"
                  strokeOpacity={0.3}
                  fontSize={12}
                  tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)}
                />
                <YAxis
                  stroke="currentColor"
                  strokeOpacity={0.3}
                  fontSize={11}
                  tickFormatter={(v: number) => fmtCompact(v)}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [fmtRWF(v), "Revenue"]}
                />
                <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                  {categoryChartData.map((d, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[d.category] ?? "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No category revenue yet.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 5 — Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4 text-amber-500" />
            Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Everything looks balanced — no notable concentration, gaps, or bottlenecks detected.
            </p>
          ) : (
            <ul className="space-y-2">
              {insights.map((i, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 rounded-md border-l-2 border-amber-500 bg-amber-500/5 px-3 py-2 text-sm"
                >
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span>{i}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  primary,
  secondary,
  accent,
}: {
  icon: typeof Trophy;
  label: string;
  primary: string;
  secondary: string;
  accent: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent}`}
        aria-hidden
      />
      <CardContent className="relative p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mt-3 truncate text-lg font-bold tracking-tight" title={primary}>
          {primary}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{secondary}</p>
      </CardContent>
    </Card>
  );
}
