import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { exportCsv } from "@/lib/admin/download-zip";

export const Route = createFileRoute("/admin/audit")({ component: AdminAudit });

interface AuditRow {
  id: string;
  action: string;
  target_id: string | null;
  target_type: string | null;
  user_id: string | null;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
}

const PAGE = 50;

function actionBucket(action: string) {
  const a = action.toLowerCase();
  if (a.includes("create") || a.includes("insert")) return "create";
  if (a.includes("update") || a.includes("edit") || a.includes("changed")) return "update";
  if (a.includes("delete") || a.includes("remove") || a.includes("rejected")) return "delete";
  if (a.includes("login") || a.includes("logout")) return "login";
  if (a.includes("download") || a.includes("export")) return "download";
  return "other";
}

// Specific per-action colors (extends the bucket fallback below).
const SPECIFIC_ACTION_COLORS: Record<string, string> = {
  status_changed: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  pricing_updated: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  staff_activated: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  staff_deactivated: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  role_changed: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
  minute_package_created:
    "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  minute_package_updated:
    "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  minute_package_deleted:
    "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  review_approved:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  review_rejected: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  note_added: "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/30",
};

const BUCKET_COLORS: Record<string, string> = {
  create: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  update: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  delete: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
  login: "bg-muted text-muted-foreground",
  download: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
  other: "bg-muted text-muted-foreground",
};

function colorFor(action: string) {
  return SPECIFIC_ACTION_COLORS[action] ?? BUCKET_COLORS[actionBucket(action)];
}


function AdminAudit() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [staffId, setStaffId] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(0);

  useEffect(() => {
    (async () => {
      const [{ data: auditData, error: auditErr }, { data: userData }] = await Promise.all([
        supabase
          .from("audit_log")
          .select("id,action,target_id,target_type,user_id,ip_address,metadata,created_at")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase.from("users").select("id,email,full_name").neq("role", "client"),
      ]);
      if (auditErr) {
        console.error("[admin/audit]", auditErr.message, auditErr.code);
        setQueryError(`${auditErr.message} (${auditErr.code ?? "unknown"})`);
      }
      setRows((auditData as AuditRow[]) ?? []);
      setUsers((userData as UserRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const nameById = useMemo(() => {
    const m: Record<string, string> = {};
    users.forEach((u) => (m[u.id] = u.full_name ?? u.email));
    return m;
  }, [users]);

  const filtered = useMemo(() => {
    const q = filter.toLowerCase();
    return rows.filter((a) => {
      if (staffId !== "all" && a.user_id !== staffId) return false;
      if (type !== "all" && a.action !== type) return false;
      if (dateFrom && a.created_at < dateFrom) return false;
      if (dateTo && a.created_at > dateTo + "T23:59:59") return false;
      if (
        q &&
        !a.action.toLowerCase().includes(q) &&
        !(a.user_id && nameById[a.user_id]?.toLowerCase().includes(q)) &&
        !JSON.stringify(a.metadata ?? {})
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [rows, filter, staffId, type, dateFrom, dateTo, nameById]);

  // Distinct action types actually present in the data
  const distinctActions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.action));
    return Array.from(set).sort();
  }, [rows]);

  // Staff who actually have entries (intersect users list with audit user_ids)
  const staffWithEntries = useMemo(() => {
    const ids = new Set<string>();
    rows.forEach((r) => r.user_id && ids.add(r.user_id));
    return users.filter((u) => ids.has(u.id));
  }, [rows, users]);

  const pageRows = filtered.slice(page * PAGE, (page + 1) * PAGE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE));

  const hasActiveFilters =
    filter !== "" || staffId !== "all" || type !== "all" || dateFrom !== "" || dateTo !== "";

  const clearFilters = () => {
    setFilter("");
    setStaffId("all");
    setType("all");
    setDateFrom("");
    setDateTo("");
    setPage(0);
  };

  const handleExport = () => {
    exportCsv(
      filtered.map((a) => ({
        timestamp: a.created_at,
        action: a.action,
        type: actionBucket(a.action),
        staff: a.user_id ? (nameById[a.user_id] ?? a.user_id) : "System",
        target_type: a.target_type ?? "",
        target_id: a.target_id ?? "",
        ip: a.ip_address ?? "",
        details: JSON.stringify(a.metadata ?? {}),
      })),
      `audit_log_${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-muted-foreground">Complete record of all system actions.</p>
        </div>
        <Button size="sm" variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
          <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Search action or staff…"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
          className="max-w-xs"
        />
        <Select
          value={staffId}
          onValueChange={(v) => {
            setStaffId(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All staff</SelectItem>
            {staffWithEntries.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.full_name ?? u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={type}
          onValueChange={(v) => {
            setType(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {distinctActions.map((a) => (
              <SelectItem key={a} value={a}>
                {a}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value);
            setPage(0);
          }}
          className="w-40"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value);
            setPage(0);
          }}
          className="w-40"
        />
        {hasActiveFilters && (
          <Button size="sm" variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {loading
              ? "Loading…"
              : hasActiveFilters
                ? `${filtered.length} of ${rows.length} entries · page ${page + 1} of ${totalPages}`
                : `${filtered.length} entries · page ${page + 1} of ${totalPages}`}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : queryError ? (
            <div className="rounded border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
              <p className="font-medium">Failed to load audit log</p>
              <p className="mt-1 font-mono text-xs">{queryError}</p>
              <p className="mt-2 text-muted-foreground">
                If this is a permissions error, run the following SQL in Supabase:
              </p>
              <pre className="mt-1 rounded bg-muted p-2 text-xs">{`CREATE POLICY "Admins read audit log" ON public.audit_log\nFOR SELECT TO authenticated\nUSING (EXISTS (\n  SELECT 1 FROM public.users\n  WHERE id = auth.uid() AND role = 'admin'\n));`}</pre>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries match the filters.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.map((a) => {
                    const t = actionType(a.action);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(a.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          {a.user_id ? (nameById[a.user_id] ?? a.user_id.slice(0, 8)) : "System"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`${ACTION_COLORS[t]} text-xs`}>
                            {a.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {a.target_type ? `${a.target_type}:` : ""}
                          {a.target_id ? a.target_id.slice(0, 8) : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {a.ip_address ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
