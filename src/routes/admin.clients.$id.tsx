import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
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
import { StatusBadge } from "@/lib/dashboard/status-badge";

export const Route = createFileRoute("/admin/clients/$id")({ component: AdminClientDetail });

interface ClientRow {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
  status: string;
  created_at: string;
  last_login_at: string | null;
  preferred_language: string | null;
}

interface RequestRow {
  id: string;
  status: string;
  service_category: string;
  created_at: string;
  service: { name_en: string } | null;
}

interface PaymentRow {
  id: string;
  amount_rwf: number | null;
  method: string | null;
  status: string;
  created_at: string;
  reference: string | null;
}

function AdminClientDetail() {
  const { id } = Route.useParams();
  const [client, setClient] = useState<ClientRow | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: clientData }, { data: reqData }, { data: payData }] = await Promise.all([
        supabase
          .from("users")
          .select("id,email,full_name,phone,role,status,created_at,last_login_at,preferred_language")
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("service_requests")
          .select("id,status,service_category,created_at,service:services(name_en)")
          .eq("client_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("payments")
          .select("id,amount_rwf,method,status,created_at,reference")
          .eq("client_id", id)
          .order("created_at", { ascending: false }),
      ]);
      setClient(clientData as ClientRow | null);
      setRequests((reqData as unknown as RequestRow[]) ?? []);
      setPayments((payData as PaymentRow[]) ?? []);
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-4">
        <Link to="/admin/clients" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to clients
        </Link>
        <p className="text-sm text-muted-foreground">Client not found.</p>
      </div>
    );
  }

  const totalPaid = payments
    .filter((p) => p.status === "completed")
    .reduce((acc, p) => acc + (p.amount_rwf ?? 0), 0);

  return (
    <div className="space-y-6">
      <Link
        to="/admin/clients"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to clients
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{client.full_name ?? client.email}</h1>
          <p className="text-sm text-muted-foreground">{client.email}</p>
        </div>
        <Badge variant={client.status === "active" ? "default" : "secondary"} className="capitalize">
          {client.status}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Phone", value: client.phone ?? "—" },
          { label: "Language", value: client.preferred_language ?? "—" },
          { label: "Joined", value: new Date(client.created_at).toLocaleDateString() },
          { label: "Total paid", value: `${totalPaid.toLocaleString()} RWF` },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
              <p className="mt-1 font-semibold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service requests ({requests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No service requests.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.service?.name_en ?? "—"}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">
                      {r.service_category}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payments ({payments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium tabular-nums">
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
                      {new Date(p.created_at).toLocaleDateString()}
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
