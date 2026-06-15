import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Eye, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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

export const Route = createFileRoute("/admin/clients")({ component: AdminClients });

interface ClientRow {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  last_login_at: string | null;
  totalCases: number;
  totalSpent: number;
  lastService: string | null;
  cases: ClientCase[];
}

interface ClientCase {
  id: string;
  service_category: string;
  status: string;
  created_at: string;
}

type SortKey = "full_name" | "email" | "created_at" | "totalCases" | "totalSpent";

const fmtRwf = (value: number) =>
  `${value.toLocaleString("en-US", { maximumFractionDigits: 0 })} RWF`;

function AdminClients() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDetailView = pathname !== "/admin/clients";

  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: caseData }, { data: paymentData }] = await Promise.all([
        supabase
          .from("users")
          .select("id,email,full_name,phone,status,created_at,last_login_at")
          .eq("role", "client")
          .order("created_at", { ascending: false }),
        supabase
          .from("service_requests")
          .select("id,client_id,service_category,status,created_at")
          .order("created_at", { ascending: false }),
        supabase.from("payments").select("client_id,amount_rwf,status"),
      ]);
      const counts = new Map<string, number>();
      const casesByClient = new Map<string, ClientCase[]>();
      for (const c of (caseData ?? []) as (ClientCase & { client_id: string | null })[]) {
        if (c.client_id) counts.set(c.client_id, (counts.get(c.client_id) ?? 0) + 1);
        if (c.client_id) {
          const list = casesByClient.get(c.client_id) ?? [];
          list.push({
            id: c.id,
            service_category: c.service_category,
            status: c.status,
            created_at: c.created_at,
          });
          casesByClient.set(c.client_id, list);
        }
      }
      const spentByClient = new Map<string, number>();
      for (const p of (paymentData ?? []) as {
        client_id: string | null;
        amount_rwf: number | null;
        status: string;
      }[]) {
        if (p.client_id && p.status === "completed") {
          spentByClient.set(
            p.client_id,
            (spentByClient.get(p.client_id) ?? 0) + (p.amount_rwf ?? 0),
          );
        }
      }
      setRows(
        (
          (data ?? []) as Omit<ClientRow, "totalCases" | "totalSpent" | "lastService" | "cases">[]
        ).map((r) => ({
          ...r,
          totalCases: counts.get(r.id) ?? 0,
          totalSpent: spentByClient.get(r.id) ?? 0,
          lastService: casesByClient.get(r.id)?.[0]?.service_category ?? null,
          cases: casesByClient.get(r.id) ?? [],
        })),
      );
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const f = rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (q) {
        return (
          r.full_name?.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.phone?.toLowerCase().includes(q)
        );
      }
      return true;
    });
    return f.sort((a, b) => {
      const va = (a[sortKey] ?? "") as string | number;
      const vb = (b[sortKey] ?? "") as string | number;
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb));
      return sortAsc ? cmp : -cmp;
    });
  }, [rows, search, status, sortKey, sortAsc]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc(!sortAsc);
    else {
      setSortKey(k);
      setSortAsc(false);
    }
  };

  const activeThisMonth = rows.filter((r) => {
    if (!r.last_login_at) return false;
    const login = new Date(r.last_login_at);
    const now = new Date();
    return login.getMonth() === now.getMonth() && login.getFullYear() === now.getFullYear();
  }).length;
  const neverLoggedIn = rows.filter((r) => !r.last_login_at).length;

  if (isDetailView) return <Outlet />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground">
            All registered clients — read-only monitoring.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="invited">Invited</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Search by name, email, or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-72"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Clients
            </p>
            <p className="mt-2 text-2xl font-bold">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active This Month
            </p>
            <p className="mt-2 text-2xl font-bold text-emerald-500">{activeThisMonth}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Never Logged In
            </p>
            <p className="mt-2 text-2xl font-bold text-amber-500">{neverLoggedIn}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {loading ? "Loading…" : `${filtered.length} clients`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clients found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => toggleSort("full_name")} className="cursor-pointer">
                    Name
                  </TableHead>
                  <TableHead onClick={() => toggleSort("email")} className="cursor-pointer">
                    Email
                  </TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead
                    onClick={() => toggleSort("totalCases")}
                    className="cursor-pointer text-center"
                  >
                    Cases
                  </TableHead>
                  <TableHead onClick={() => toggleSort("totalSpent")} className="cursor-pointer">
                    Total Spent
                  </TableHead>
                  <TableHead>Last Service</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead onClick={() => toggleSort("created_at")} className="cursor-pointer">
                    Joined
                  </TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{c.email}</TableCell>
                    <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
                    <TableCell className="text-center tabular-nums">
                      <span
                        className={
                          c.totalCases === 0
                            ? "text-muted-foreground"
                            : c.totalCases >= 6
                              ? "font-bold"
                              : ""
                        }
                      >
                        {c.totalCases}
                      </span>
                      {c.totalCases >= 6 && (
                        <Badge className="ml-2 bg-primary/10 text-primary">Power User</Badge>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">{fmtRwf(c.totalSpent)}</TableCell>
                    <TableCell>
                      {c.lastService ? (
                        <Badge variant="outline" className="capitalize">
                          {c.lastService}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={c.status === "active" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.last_login_at ? (
                        new Date(c.last_login_at).toLocaleDateString()
                      ) : (
                        <span className="font-medium text-amber-500">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => setSelectedClient(c)}>
                        <Eye className="mr-1.5 h-4 w-4" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{selectedClient?.full_name ?? selectedClient?.email}</SheetTitle>
          </SheetHeader>
          {selectedClient && (
            <div className="mt-6 space-y-6">
              <div className="grid gap-3 text-sm">
                <Info label="Email" value={selectedClient.email} />
                <Info label="Phone" value={selectedClient.phone ?? "—"} />
                <Info
                  label="Joined"
                  value={new Date(selectedClient.created_at).toLocaleDateString()}
                />
                <Info
                  label="Last login"
                  value={
                    selectedClient.last_login_at
                      ? new Date(selectedClient.last_login_at).toLocaleString()
                      : "Never"
                  }
                />
                <Info label="Total payments" value={fmtRwf(selectedClient.totalSpent)} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Cases
                </p>
                <div className="mt-2 space-y-2">
                  {selectedClient.cases.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No cases yet.</p>
                  ) : (
                    selectedClient.cases.map((item) => (
                      <div key={item.id} className="rounded-lg border border-border p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-mono text-xs">{item.id.slice(0, 8)}</span>
                          <Badge variant="outline" className="capitalize">
                            {item.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="mt-2 capitalize">{item.service_category}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/admin/messages">
                    <MessageCircle className="mr-1.5 h-4 w-4" />
                    Send Message
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/admin/clients/$id" params={{ id: selectedClient.id }}>
                    Open full profile
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}
