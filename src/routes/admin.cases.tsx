import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { StatusBadge } from "@/lib/dashboard/status-badge";

export const Route = createFileRoute("/admin/cases")({ component: AdminCases });

interface CaseRow {
  id: string;
  status: string;
  service_category: string;
  created_at: string;
  updated_at: string;
  client_id: string | null;
  assigned_staff_id: string | null;
  clientName: string | null;
  clientEmail: string | null;
  staffName: string | null;
}

const CATEGORIES = ["all", "visa", "accounting", "translation", "consultancy"];

function AdminCases() {
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  useEffect(() => {
    (async () => {
      let q = supabase
        .from("service_requests")
        .select("id, status, service_category, created_at, updated_at, client_id, assigned_staff_id")
        .order("updated_at", { ascending: false })
        .limit(300);

      if (category !== "all") {
        q = q.eq("service_category", category);
      }

      const [{ data: cases }, { data: users }] = await Promise.all([
        q,
        supabase.from("users").select("id, full_name, email"),
      ]);

      const userMap = new Map<string, { full_name: string | null; email: string }>();
      for (const u of users ?? []) {
        userMap.set(u.id, { full_name: u.full_name, email: u.email });
      }

      const joined: CaseRow[] = (cases ?? []).map((c: any) => {
        const client = c.client_id ? userMap.get(c.client_id) : undefined;
        const staff = c.assigned_staff_id ? userMap.get(c.assigned_staff_id) : undefined;
        return {
          ...c,
          clientName: client?.full_name ?? null,
          clientEmail: client?.email ?? null,
          staffName: staff?.full_name ?? null,
        };
      });

      setRows(joined);
      setLoading(false);
    })();
  }, [category]);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.clientName?.toLowerCase().includes(q) ||
      r.clientEmail?.toLowerCase().includes(q) ||
      r.service_category.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cases</h1>
        <p className="text-sm text-muted-foreground">All service requests — read-only monitoring.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search client, category, or status…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">
                {c === "all" ? "All categories" : c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {loading ? "Loading…" : `${filtered.length} cases`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cases found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead>Last updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.clientName ?? r.clientEmail ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {r.service_category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.staffName ?? <span className="text-xs italic">Unassigned</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.updated_at).toLocaleDateString()}
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
