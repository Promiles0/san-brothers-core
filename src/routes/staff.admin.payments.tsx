import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/staff/admin/payments")({ component: Page });

interface PayRow {
  id: string;
  amount_rwf: number | null;
  method: string | null;
  status: string;
  created_at: string;
  reference: string | null;
  client: { full_name: string | null; email: string } | null;
}

function Page() {
  const [rows, setRows] = useState<PayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ total: 0, count: 0, refunded: 0 });

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
      let count = 0;
      list.forEach((p) => {
        if (p.status === "completed") {
          total += p.amount_rwf ?? 0;
          count++;
        }
        if (p.status === "refunded") refunded += p.amount_rwf ?? 0;
      });
      setTotals({ total, count, refunded });
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Organization-wide payments and refunds.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Completed total
            </p>
            <p className="mt-2 text-2xl font-bold">{totals.total.toLocaleString()} RWF</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Transactions
            </p>
            <p className="mt-2 text-2xl font-bold">{totals.count}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Refunded</p>
            <p className="mt-2 text-2xl font-bold">{totals.refunded.toLocaleString()} RWF</p>
          </CardContent>
        </Card>
      </div>

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
                    <TableCell>{(p.amount_rwf ?? 0).toLocaleString()} RWF</TableCell>
                    <TableCell className="capitalize">{p.method ?? "—"}</TableCell>
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
                    <TableCell className="text-muted-foreground text-xs">
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
