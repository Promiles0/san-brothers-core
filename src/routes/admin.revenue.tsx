import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export const Route = createFileRoute("/admin/revenue")({ component: AdminRevenue });

interface PayRow {
  id: string;
  amount_rwf: number | null;
  method: string | null;
  status: string;
  created_at: string;
  reference: string | null;
  client: { full_name: string | null; email: string } | null;
}

function AdminRevenue() {
  const [rows, setRows] = useState<PayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ total: 0, count: 0, refunded: 0, pending: 0 });
  const [trend, setTrend] = useState<{ date: string; revenue: number }[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("payments")
        .select(
          "id,amount_rwf,method,status,created_at,reference,client:client_id(full_name,email)",
        )
        .order("created_at", { ascending: false })
        .limit(200);

      const list = (data as unknown as PayRow[]) ?? [];
      setRows(list);

      let total = 0;
      let refunded = 0;
      let pending = 0;
      let count = 0;
      list.forEach((p) => {
        if (p.status === "completed") {
          total += p.amount_rwf ?? 0;
          count++;
        }
        if (p.status === "refunded") refunded += p.amount_rwf ?? 0;
        if (p.status === "pending") pending += p.amount_rwf ?? 0;
      });
      setTotals({ total, count, refunded, pending });

      const now = new Date();
      const buckets: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        buckets[d.toISOString().slice(0, 10)] = 0;
      }
      list.forEach((p) => {
        if (p.status === "completed") {
          const k = p.created_at.slice(0, 10);
          if (k in buckets) buckets[k] += p.amount_rwf ?? 0;
        }
      });
      setTrend(
        Object.entries(buckets).map(([date, revenue]) => ({ date: date.slice(5), revenue })),
      );

      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Revenue</h1>
        <p className="text-sm text-muted-foreground">Organization-wide payments and refunds.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Completed total", value: `${totals.total.toLocaleString()} RWF`, cls: "" },
          { label: "Transactions", value: totals.count.toString(), cls: "" },
          { label: "Refunded", value: `${totals.refunded.toLocaleString()} RWF`, cls: "text-destructive" },
          { label: "Pending", value: `${totals.pending.toLocaleString()} RWF`, cls: "text-amber-600" },
        ].map(({ label, value, cls }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
              <p className={`mt-2 text-2xl font-bold ${cls}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue trend — last 30 days</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent payments</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.client?.full_name ?? p.client?.email ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {(p.amount_rwf ?? 0).toLocaleString()} RWF
                    </TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {p.method ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          p.status === "completed"
                            ? "default"
                            : p.status === "refunded"
                              ? "destructive"
                              : "secondary"
                        }
                        className="capitalize"
                      >
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.reference ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString()}
                    </TableCell>
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
