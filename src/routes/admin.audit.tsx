import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export const Route = createFileRoute("/admin/audit")({ component: AdminAudit });

interface AuditRow {
  id: string;
  action: string;
  target_id: string | null;
  user_id: string | null;
  created_at: string;
}

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
}

function AdminAudit() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: auditData }, { data: userData }] = await Promise.all([
        supabase
          .from("audit_log")
          .select("id,action,target_id,user_id,created_at")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase.from("users").select("id,email,full_name").neq("role", "client"),
      ]);
      setRows((auditData as AuditRow[]) ?? []);
      setUsers((userData as UserRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const nameById = useMemo(() => {
    const m: Record<string, string> = {};
    users.forEach((u) => {
      m[u.id] = u.full_name ?? u.email;
    });
    return m;
  }, [users]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return rows;
    const q = filter.toLowerCase();
    return rows.filter(
      (a) =>
        a.action.toLowerCase().includes(q) ||
        (a.user_id && nameById[a.user_id]?.toLowerCase().includes(q)),
    );
  }, [rows, filter, nameById]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-muted-foreground">Complete record of all system actions.</p>
        </div>
        <Input
          placeholder="Filter by action or staff…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {loading ? "Loading…" : `${filtered.length} entries`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Target ID</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.action}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {a.target_id ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {a.user_id ? (nameById[a.user_id] ?? a.user_id.slice(0, 8)) : "System"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(a.created_at).toLocaleString()}
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
