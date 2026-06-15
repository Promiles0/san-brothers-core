import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  ClipboardList,
  DollarSign,
  Download,
  FileClock,
  Package,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  UserCog,
  UserPlus,
  Users as UsersIcon,
  type LucideIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/")({ component: AdminOverview });

const fmtUSD = (v: number) =>
  "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Statuses that mean a case is still active (not terminal)
const ACTIVE_STATUSES = [
  "submitted",
  "under_review",
  "awaiting_client",
  "verified",
  "submitted_to_authority",
  "processing",
  "pending_review",
  "in_progress",
];

function AdminOverview() {
  const { profile } = useAuth();
  const [kpis, setKpis] = useState({
    revenueMonth: 0,
    lastMonthRevenue: 0,
    activeCases: 0,
    totalClients: 0,
    staffCount: 0,
    unassignedCases: 0,
  });
  const [casesByCat, setCasesByCat] = useState<{ category: string; count: number }[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<{ date: string; revenue: number }[]>([]);
  const [recentActivity, setRecentActivity] = useState<
    {
      id: string;
      action: string;
      target_type: string | null;
      target_id: string | null;
      user_id: string | null;
      created_at: string;
      staffName?: string;
    }[]
  >([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const start30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Revenue this month — select * so RLS has full row context
      const { data: payMonth, error: e1 } = await supabase
        .from("payments")
        .select("*")
        .gte("created_at", startOfMonth)
        .eq("status", "completed");
      if (e1) console.warn("[admin/overview] payments month:", e1.message);

      const { data: payLastMonth, error: e1b } = await supabase
        .from("payments")
        .select("*")
        .gte("created_at", startOfLastMonth)
        .lt("created_at", endOfLastMonth)
        .eq("status", "completed");
      if (e1b) console.warn("[admin/overview] payments last month:", e1b.message);

      // Active cases — use positive IN list to avoid PostgREST not.in quoting issues
      const { count: activeCount, error: e2 } = await supabase
        .from("service_requests")
        .select("id", { count: "exact", head: true })
        .in("status", ACTIVE_STATUSES);
      if (e2) console.warn("[admin/overview] active cases:", e2.message);

      // Client count
      const { count: clientCount, error: e3 } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .eq("role", "client");
      if (e3) console.warn("[admin/overview] client count:", e3.message);

      // Staff count
      const { count: staffCount, error: e4 } = await supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .neq("role", "client");
      if (e4) console.warn("[admin/overview] staff count:", e4.message);

      // Cases by category this week
      const { data: weekCases, error: e5 } = await supabase
        .from("service_requests")
        .select("service_category")
        .gte("created_at", startOfWeek);
      if (e5) console.warn("[admin/overview] week cases:", e5.message);

      // Revenue last 30 days — select * so RLS has full row context
      const { data: pay30, error: e6 } = await supabase
        .from("payments")
        .select("*")
        .gte("created_at", start30)
        .eq("status", "completed");
      if (e6) console.warn("[admin/overview] payments 30d:", e6.message);

      const { count: unassignedCount, error: e7 } = await supabase
        .from("service_requests")
        .select("id", { count: "exact", head: true })
        .is("assigned_staff_id", null)
        .not("status", "in", '("completed","cancelled","rejected")');
      if (e7) console.warn("[admin/overview] unassigned cases:", e7.message);

      const { data: auditRows, error: e8 } = await supabase
        .from("audit_log")
        .select("id,action,target_type,target_id,user_id,created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      if (e8) console.warn("[admin/overview] recent activity:", e8.message);

      const userIds = Array.from(
        new Set(
          ((auditRows ?? []) as { user_id: string | null }[]).map((r) => r.user_id).filter(Boolean),
        ),
      ) as string[];
      const { data: activityUsers } =
        userIds.length > 0
          ? await supabase.from("users").select("id,full_name,email").in("id", userIds)
          : { data: [] };
      const userMap = new Map(
        ((activityUsers ?? []) as { id: string; full_name: string | null; email: string }[]).map(
          (u) => [u.id, u.full_name ?? u.email],
        ),
      );

      // --- Compute KPIs ---
      const revenueMonth = (payMonth ?? []).reduce(
        (acc: number, p: { amount_rwf?: number | null }) => acc + (p.amount_rwf ?? 0),
        0,
      );
      const lastMonthRevenue = (payLastMonth ?? []).reduce(
        (acc: number, p: { amount_rwf?: number | null }) => acc + (p.amount_rwf ?? 0),
        0,
      );
      setKpis({
        revenueMonth,
        lastMonthRevenue,
        activeCases: activeCount ?? 0,
        totalClients: clientCount ?? 0,
        staffCount: staffCount ?? 0,
        unassignedCases: unassignedCount ?? 0,
      });
      setRecentActivity(
        (
          (auditRows ?? []) as {
            id: string;
            action: string;
            target_type: string | null;
            target_id: string | null;
            user_id: string | null;
            created_at: string;
          }[]
        ).map((row) => ({ ...row, staffName: row.user_id ? userMap.get(row.user_id) : undefined })),
      );

      // --- Cases by category ---
      const catMap: Record<string, number> = {
        visa: 0,
        accounting: 0,
        translation: 0,
        consultancy: 0,
      };
      (weekCases ?? []).forEach((r: { service_category: string }) => {
        if (r.service_category in catMap) catMap[r.service_category]++;
      });
      setCasesByCat(Object.entries(catMap).map(([category, count]) => ({ category, count })));

      // --- Revenue trend buckets ---
      const buckets: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        buckets[d.toISOString().slice(0, 10)] = 0;
      }
      (pay30 ?? []).forEach((p: { amount_rwf?: number | null; created_at: string }) => {
        const k = p.created_at.slice(0, 10);
        if (k in buckets) buckets[k] += p.amount_rwf ?? 0;
      });
      setRevenueTrend(
        Object.entries(buckets).map(([date, revenue]) => ({ date: date.slice(5), revenue })),
      );
    })();
  }, []);

  const revenueDelta =
    kpis.lastMonthRevenue > 0
      ? Math.round(((kpis.revenueMonth - kpis.lastMonthRevenue) / kpis.lastMonthRevenue) * 100)
      : null;

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          Command Center
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Welcome back, {profile?.full_name?.split(" ")[0] ?? "Admin"}.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Operational pulse of San Brothers — live data from your organization.
        </p>
      </div>

      {kpis.unassignedCases > 0 && (
        <Link
          to="/admin/cases"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 transition-colors hover:bg-amber-500/15 dark:text-amber-300"
        >
          <span className="font-medium">
            {kpis.unassignedCases} cases are unassigned - assign them now
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider">Open cases</span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={DollarSign}
          label="Revenue this month"
          value={fmtUSD(kpis.revenueMonth)}
          accent="from-emerald-500/20 to-emerald-500/0"
          to="/admin/revenue"
          trend={revenueDelta}
        />
        <KpiCard
          icon={Activity}
          label="Active cases"
          value={kpis.activeCases.toString()}
          accent="from-blue-500/20 to-blue-500/0"
          to="/admin/cases"
        />
        <KpiCard
          icon={UsersIcon}
          label="Total clients"
          value={kpis.totalClients.toString()}
          accent="from-violet-500/20 to-violet-500/0"
          to="/admin/clients"
        />
        <KpiCard
          icon={UserCog}
          label="Staff count"
          value={kpis.staffCount.toString()}
          accent="from-amber-500/20 to-amber-500/0"
          to="/admin/staff"
        />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Assign Unassigned Cases", to: "/admin/cases", Icon: ClipboardList },
            { label: "Invite Staff", to: "/admin/staff", Icon: UserPlus },
            { label: "Update Pricing", to: "/admin/pricing", Icon: DollarSign },
            { label: "View Audit Log", to: "/admin/audit", Icon: FileClock },
            { label: "Manage Services", to: "/admin/services", Icon: Package },
            { label: "Export Revenue", to: "/admin/revenue", Icon: Download },
          ].map(({ label, to, Icon }) => (
            <Button key={label} variant="outline" size="sm" asChild>
              <Link to={to as never} className="gap-2">
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cases by category — this week</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={casesByCat}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.3} />
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
                    fontSize={12}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue trend — last 30 days</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.3} />
                  <XAxis dataKey="date" stroke="currentColor" strokeOpacity={0.3} fontSize={11} />
                  <YAxis
                    stroke="currentColor"
                    strokeOpacity={0.3}
                    fontSize={11}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [fmtUSD(v), "Revenue"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#6366f1"
                    fill="#6366f1"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/audit">View full audit log</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity yet.</p>
          ) : (
            <div className="divide-y divide-border">
              {recentActivity.map((entry) => (
                <div
                  key={entry.id}
                  className="grid gap-2 py-3 text-sm md:grid-cols-[150px_1fr_auto] md:items-center"
                >
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{entry.staffName ?? "System"}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.target_type ?? "target"}{" "}
                      {entry.target_id ? entry.target_id.slice(0, 8) : ""}
                    </p>
                  </div>
                  <Badge className={activityBadgeClass(entry.action)}>
                    {entry.action.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function activityBadgeClass(action: string) {
  if (action === "status_changed") return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/15";
  if (action === "role_changed") return "bg-purple-500/10 text-purple-500 hover:bg-purple-500/15";
  if (action === "pricing_updated")
    return "bg-amber-500/10 text-amber-600 dark:text-amber-300 hover:bg-amber-500/15";
  if (action === "staff_activated")
    return "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15";
  if (action === "staff_deactivated") return "bg-red-500/10 text-red-500 hover:bg-red-500/15";
  if (action.startsWith("minute_package_"))
    return "bg-orange-500/10 text-orange-500 hover:bg-orange-500/15";
  return "bg-gray-500/10 text-gray-500 dark:text-gray-300 hover:bg-gray-500/15";
}

function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
  to,
  trend,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: string;
  to: string;
  trend?: number | null;
}) {
  return (
    <Link to={to as never} className="block">
      <Card className="relative overflow-hidden transition-colors hover:bg-accent/40">
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
          <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
          {typeof trend === "number" && (
            <p
              className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${
                trend >= 0 ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {trend >= 0 ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              {Math.abs(trend)}% vs last month
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
