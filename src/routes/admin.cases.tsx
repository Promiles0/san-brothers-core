import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/lib/dashboard/status-badge";

export const Route = createFileRoute("/admin/cases")({ component: AdminCases });

interface CaseRow {
  id: string;
  status: string;
  service_category: string;
  priority: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client_id: string | null;
  assigned_staff_id: string | null;
  clientName: string | null;
  clientEmail: string | null;
  staffName: string | null;
}

const CATEGORIES = ["all", "visa", "accounting", "translation", "consultancy"];
const STATUSES = ["all", "submitted", "under_review", "awaiting_client", "verified", "completed", "rejected", "cancelled"];

type SortKey = "updated_at" | "created_at" | "status" | "service_category" | "clientName";

function AdminCases() {
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [staffId, setStaffId] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [openCase, setOpenCase] = useState<CaseRow | null>(null);
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: cases }, { data: users }] = await Promise.all([
        supabase
          .from("service_requests")
          .select("id,status,service_category,priority,notes,created_at,updated_at,client_id,assigned_staff_id")
          .order("updated_at", { ascending: false })
          .limit(500),
        supabase.from("users").select("id,full_name,email,role"),
      ]);

      const userMap = new Map<string, { full_name: string | null; email: string; role: string }>();
      for (const u of (users ?? []) as { id: string; full_name: string | null; email: string; role: string }[]) {
        userMap.set(u.id, u);
      }
      setStaffList(
        ((users ?? []) as { id: string; full_name: string | null; email: string; role: string }[])
          .filter((u) => u.role !== "client")
          .map((u) => ({ id: u.id, name: u.full_name ?? u.email })),
      );

      const joined: CaseRow[] = ((cases ?? []) as Omit<CaseRow, "clientName" | "clientEmail" | "staffName">[]).map((c) => {
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
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const f = rows.filter((r) => {
      if (category !== "all" && r.service_category !== category) return false;
      if (status !== "all" && r.status !== status) return false;
      if (staffId !== "all" && r.assigned_staff_id !== staffId) return false;
      if (dateFrom && r.created_at < dateFrom) return false;
      if (dateTo && r.created_at > dateTo + "T23:59:59") return false;
      if (q) {
        return (
          r.clientName?.toLowerCase().includes(q) ||
          r.clientEmail?.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
        );
      }
      return true;
    });
    return f.sort((a, b) => {
      const va = (a[sortKey] ?? "") as string;
      const vb = (b[sortKey] ?? "") as string;
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [rows, search, category, status, staffId, dateFrom, dateTo, sortKey, sortAsc]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc(!sortAsc);
    else {
      setSortKey(k);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cases</h1>
        <p className="text-sm text-muted-foreground">All service requests — read-only monitoring.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search client or case ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">{c === "all" ? "All categories" : c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">{s === "all" ? "All statuses" : s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={staffId} onValueChange={setStaffId}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All staff" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All staff</SelectItem>
            {staffList.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{loading ? "Loading…" : `${filtered.length} cases`}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cases match the filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case</TableHead>
                  <TableHead onClick={() => toggleSort("clientName")} className="cursor-pointer">Client</TableHead>
                  <TableHead onClick={() => toggleSort("service_category")} className="cursor-pointer">Category</TableHead>
                  <TableHead onClick={() => toggleSort("status")} className="cursor-pointer">Status</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead onClick={() => toggleSort("updated_at")} className="cursor-pointer">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpenCase(r)}>
                    <TableCell className="font-mono text-xs">{r.id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{r.clientName ?? r.clientEmail ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{r.service_category}</Badge>
                    </TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.staffName ?? <span className="text-xs italic">Unassigned</span>}
                    </TableCell>
                    <TableCell>
                      {r.priority === "urgent" ? (
                        <Badge variant="destructive">Urgent</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Normal</span>
                      )}
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

      <Dialog open={!!openCase} onOpenChange={(o) => !o && setOpenCase(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Case {openCase?.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          {openCase && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Client" value={openCase.clientName ?? openCase.clientEmail ?? "—"} />
                <Field label="Category" value={openCase.service_category} />
                <Field label="Status" value={openCase.status.replace(/_/g, " ")} />
                <Field label="Priority" value={openCase.priority ?? "normal"} />
                <Field label="Assigned to" value={openCase.staffName ?? "Unassigned"} />
                <Field label="Created" value={new Date(openCase.created_at).toLocaleString()} />
                <Field label="Updated" value={new Date(openCase.updated_at).toLocaleString()} />
              </div>
              {openCase.notes && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">Notes</p>
                  <p className="mt-1 rounded border border-border bg-muted/30 p-2">{openCase.notes}</p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" asChild>
                  <Link to="/staff/visa/$id" params={{ id: openCase.id }}>View full case</Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Admin view — monitoring only. Case actions are handled by assigned staff.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 capitalize">{value}</p>
    </div>
  );
}
