import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { exportCsv } from "@/lib/admin/download-zip";

export const Route = createFileRoute("/admin/revenue")({ component: AdminRevenue });

interface PayRow {
  id: string;
  amount_rwf: number | null;
  method: string | null;
  status: string;
  created_at: string;
  reference: string | null;
  service_request_id: string | null;
  client: { full_name: string | null; email: string } | null;
}

interface CaseInfo {
  id: string;
  service_category: string;
}

const PIE_COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"];

const fmtUSD = (v: number) =>
  "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function AdminRevenue() {
  const [rows, setRows] = useState<PayRow[]>([]);
  const [cases, setCases] = useState<CaseInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [methodFilter, setMethodFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    (async () => {
      const [{ data: pays }, { data: cs }] = await Promise.all([
        supabase
          .from("payments")
          .select("id,amount_rwf,method,status,created_at,reference,service_request_id,client:client_id(full_name,email)")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase.from("service_requests").select("id,service_category"),
      ]);
      setRows(((pays as unknown) as PayRow[]) ?? []);
      setCases(((cs as unknown) as CaseInfo[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const completed = rows.filter((p) => p.status === "completed");

  const kpis = useMemo(() => {
    const now = new Date();
    const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 86400 * 1000).toISOString();
    const total = completed.reduce((a, p) => a + (p.amount_rwf ?? 0), 0);
    const month = completed.filter((p) => p.created_at >= monthAgo).reduce((a, p) => a + (p.amount_rwf ?? 0), 0);
    const week = completed.filter((p) => p.created_at >= weekAgo).reduce((a, p) => a + (p.amount_rwf ?? 0), 0);
    const caseIds = new Set(completed.map((p) => p.service_request_id).filter(Boolean));
    const avgPerCase = caseIds.size > 0 ? total / caseIds.size : 0;
    return { total, month, week, avgPerCase };
  }, [completed]);

  const monthlyTrend = useMemo(() => {
    const buckets: Record<string, number> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets[d.toISOString().slice(0, 7)] = 0;
    }
    completed.forEach((p) => {
      const k = p.created_at.slice(0, 7);
      if (k in buckets) buckets[k] += p.amount_rwf ?? 0;
    });
    return Object.entries(buckets).map(([m, revenue]) => ({ month: m.slice(5), revenue }));
  }, [completed]);

  const byCategory = useMemo(() => {
    const caseMap = new Map(cases.map((c) => [c.id, c.service_category]));
    const buckets: Record<string, number> = {};
    completed.forEach((p) => {
      const cat = (p.service_request_id && caseMap.get(p.service_request_id)) || "other";
      buckets[cat] = (buckets[cat] ?? 0) + (p.amount_rwf ?? 0);
    });
    return Object.entries(buckets).map(([category, revenue]) => ({ category, revenue }));
  }, [completed, cases]);

  const byMethod = useMemo(() => {
    const buckets: Record<string, number> = {};
    completed.forEach((p) => {
      const m = p.method ?? "other";
      buckets[m] = (buckets[m] ?? 0) + (p.amount_rwf ?? 0);
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [completed]);

  const filtered = rows.filter((p) => {
    if (methodFilter !== "all" && p.method !== methodFilter) return false;
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (dateFrom && p.created_at < dateFrom) return false;
    if (dateTo && p.created_at > dateTo + "T23:59:59") return false;
    return true;
  });

  const handleExport = () => {
    exportCsv(
      filtered.map((p) => ({
        date: p.created_at,
        client: p.client?.full_name ?? p.client?.email ?? "",
        amount_usd: p.amount_rwf ?? 0,
        method: p.method ?? "",
        status: p.status,
        reference: p.reference ?? "",
      })),
      `payments_${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Revenue</h1>
        <p className="text-sm text-muted-foreground">Organization-wide payments and analytics.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total revenue", value: fmtUSD(kpis.total) },
          { label: "This month", value: fmtUSD(kpis.month) },
          { label: "This week", value: fmtUSD(kpis.week) },
          { label: "Avg per case", value: fmtUSD(Math.round(kpis.avgPerCase)) },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</p>
              <p className="mt-2 text-2xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Revenue — last 12 months</CardTitle></CardHeader>
          <CardContent className="h-64">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.3} />
                  <XAxis dataKey="month" stroke="currentColor" strokeOpacity={0.3} fontSize={11} />
                  <YAxis stroke="currentColor" strokeOpacity={0.3} fontSize={11} tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => fmtUSD(v)} />
                  <Line type="monotone" dataKey="revenue" stroke="#6366f1" fill="#6366f1" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Revenue by category</CardTitle></CardHeader>
          <CardContent className="h-64">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCategory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.3} />
                  <XAxis dataKey="category" stroke="currentColor" strokeOpacity={0.3} fontSize={11} />
                  <YAxis stroke="currentColor" strokeOpacity={0.3} fontSize={11} tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => fmtUSD(v)} />
                  <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Revenue by payment method</CardTitle></CardHeader>
        <CardContent className="h-64">
          {mounted && byMethod.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byMethod} dataKey="value" nameKey="name" outerRadius={90} label={(e) => e.name}>
                  {byMethod.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmtUSD(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Payments</CardTitle>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2">
            <Select value={methodFilter} onValueChange={setMethodFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All methods" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                <SelectItem value="momo">MoMo</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="office">Office / Cash</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
          </div>

          {loading ? (
            <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments match the filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{p.client?.full_name ?? p.client?.email ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">{fmtUSD(p.amount_rwf ?? 0)}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{p.method ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "completed" ? "default" : p.status === "refunded" ? "destructive" : "secondary"} className="capitalize">{p.status}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{p.reference ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
