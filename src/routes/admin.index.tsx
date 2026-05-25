import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { DollarSign, Activity, Users as UsersIcon, UserCog, ShieldCheck } from "lucide-react";
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

export const Route = createFileRoute("/admin/")({ component: AdminOverview });

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
    activeCases: 0,
    totalClients: 0,
    staffCount: 0,
  });
  const [casesByCat, setCasesByCat] = useState<{ category: string; count: number }[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<{ date: string; revenue: number }[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const start30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // Revenue this month — select * so RLS has full row context
      const { data: payMonth, error: e1 } = await supabase
        .from("payments")
        .select("*")
        .gte("created_at", startOfMonth)
        .eq("status", "completed");
      if (e1) console.warn("[admin/overview] payments month:", e1.message);

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

      // --- Compute KPIs ---
      const revenueMonth = (payMonth ?? []).reduce(
        (acc: number, p: { amount_rwf?: number | null }) => acc + (p.amount_rwf ?? 0),
        0,
      );
      setKpis({
        revenueMonth,
        activeCases: activeCount ?? 0,
        totalClients: clientCount ?? 0,
        staffCount: staffCount ?? 0,
      });

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
      setCasesByCat(
        Object.entries(catMap).map(([category, count]) => ({ category, count })),
      );

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={DollarSign}
          label="Revenue this month"
          value={`${kpis.revenueMonth.toLocaleString()} RWF`}
          accent="from-emerald-500/20 to-emerald-500/0"
        />
        <KpiCard
          icon={Activity}
          label="Active cases"
          value={kpis.activeCases.toString()}
          accent="from-blue-500/20 to-blue-500/0"
        />
        <KpiCard
          icon={UsersIcon}
          label="Total clients"
          value={kpis.totalClients.toString()}
          accent="from-violet-500/20 to-violet-500/0"
        />
        <KpiCard
          icon={UserCog}
          label="Staff count"
          value={kpis.staffCount.toString()}
          accent="from-amber-500/20 to-amber-500/0"
        />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="category"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
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
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
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
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v.toLocaleString()} RWF`, "Revenue"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
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
        <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}
