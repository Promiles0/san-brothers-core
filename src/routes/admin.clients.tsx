import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
}

function AdminClients() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDetailView = pathname !== "/admin/clients";

  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("users")
        .select("id,email,full_name,phone,status,created_at,last_login_at")
        .eq("role", "client")
        .order("created_at", { ascending: false });
      setRows((data as ClientRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.full_name?.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.phone?.toLowerCase().includes(q)
    );
  });

  if (isDetailView) return <Outlet />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground">All registered clients — read-only monitoring.</p>
        </div>
        <Input
          placeholder="Search by name, email, or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
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
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
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
                      {c.last_login_at ? new Date(c.last_login_at).toLocaleDateString() : "Never"}
                    </TableCell>
                    <TableCell>
                      <Link
                        to="/admin/clients/$id"
                        params={{ id: c.id }}
                        className="text-xs text-primary hover:underline"
                      >
                        View →
                      </Link>
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
