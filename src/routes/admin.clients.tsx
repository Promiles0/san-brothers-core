import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
}

type SortKey = "full_name" | "email" | "created_at" | "totalCases";

function AdminClients() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDetailView = pathname !== "/admin/clients";

  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data }, { data: caseData }] = await Promise.all([
        supabase
          .from("users")
          .select("id,email,full_name,phone,status,created_at,last_login_at")
          .eq("role", "client")
          .order("created_at", { ascending: false }),
        supabase.from("service_requests").select("client_id"),
      ]);
      const counts = new Map<string, number>();
      for (const c of (caseData ?? []) as { client_id: string | null }[]) {
        if (c.client_id) counts.set(c.client_id, (counts.get(c.client_id) ?? 0) + 1);
      }
      setRows(
        ((data ?? []) as Omit<ClientRow, "totalCases">[]).map((r) => ({
          ...r,
          totalCases: counts.get(r.id) ?? 0,
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
      const cmp = typeof va === "number" && typeof vb === "number"
        ? va - vb
        : String(va).localeCompare(String(vb));
      return sortAsc ? cmp : -cmp;
    });
  }, [rows, search, status, sortKey, sortAsc]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc(!sortAsc);
    else { setSortKey(k); setSortAsc(false); }
  };

  if (isDetailView) return <Outlet />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground">All registered clients — read-only monitoring.</p>
        </div>
        <div className="flex gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{loading ? "Loading…" : `${filtered.length} clients`}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clients found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={() => toggleSort("full_name")} className="cursor-pointer">Name</TableHead>
                  <TableHead onClick={() => toggleSort("email")} className="cursor-pointer">Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead onClick={() => toggleSort("totalCases")} className="cursor-pointer text-center">Cases</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead onClick={() => toggleSort("created_at")} className="cursor-pointer">Joined</TableHead>
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
                    <TableCell className="text-center tabular-nums">{c.totalCases}</TableCell>
                    <TableCell>
                      <Badge variant={c.status === "active" ? "default" : "secondary"} className="capitalize">{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.last_login_at ? new Date(c.last_login_at).toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell>
                      <Link to="/admin/clients/$id" params={{ id: c.id }} className="text-xs text-primary hover:underline">View →</Link>
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
