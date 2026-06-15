import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
const STATUSES = [
  "all",
  "submitted",
  "under_review",
  "awaiting_client",
  "verified",
  "completed",
  "rejected",
  "cancelled",
];
const PRIORITIES = ["low", "normal", "high", "urgent"];

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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStaff, setBulkStaff] = useState("");
  const [bulkPriority, setBulkPriority] = useState("");
  const [assigningCase, setAssigningCase] = useState<CaseRow | null>(null);
  const [quickStaff, setQuickStaff] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: cases }, { data: users }] = await Promise.all([
        supabase
          .from("service_requests")
          .select(
            "id,status,service_category,priority,notes,created_at,updated_at,client_id,assigned_staff_id",
          )
          .order("updated_at", { ascending: false })
          .limit(500),
        supabase.from("users").select("id,full_name,email,role"),
      ]);

      const userMap = new Map<string, { full_name: string | null; email: string; role: string }>();
      for (const u of (users ?? []) as {
        id: string;
        full_name: string | null;
        email: string;
        role: string;
      }[]) {
        userMap.set(u.id, u);
      }
      setStaffList(
        ((users ?? []) as { id: string; full_name: string | null; email: string; role: string }[])
          .filter((u) => u.role !== "client")
          .map((u) => ({ id: u.id, name: u.full_name ?? u.email })),
      );

      const joined: CaseRow[] = (
        (cases ?? []) as Omit<CaseRow, "clientName" | "clientEmail" | "staffName">[]
      ).map((c) => {
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

  const selectedCases = filtered.filter((row) => selectedIds.has(row.id));

  const updateAssignedStaff = async (ids: string[], assigneeId: string) => {
    if (ids.length === 0 || !assigneeId) return;
    const assignee = staffList.find((s) => s.id === assigneeId);
    const { error } = await supabase
      .from("service_requests")
      .update({ assigned_staff_id: assigneeId })
      .in("id", ids);
    if (error) return toast.error(error.message);
    setRows((prev) =>
      prev.map((row) =>
        ids.includes(row.id)
          ? { ...row, assigned_staff_id: assigneeId, staffName: assignee?.name ?? row.staffName }
          : row,
      ),
    );
    setSelectedIds(new Set());
    setBulkStaff("");
    setAssigningCase(null);
    setQuickStaff("");
    toast.success(ids.length === 1 ? "Case assigned" : "Cases assigned");
  };

  const updatePriority = async (ids: string[], priority: string) => {
    if (ids.length === 0 || !priority) return;
    const { error } = await supabase.from("service_requests").update({ priority }).in("id", ids);
    if (error) return toast.error(error.message);
    setRows((prev) => prev.map((row) => (ids.includes(row.id) ? { ...row, priority } : row)));
    setSelectedIds(new Set());
    setBulkPriority("");
    toast.success(ids.length === 1 ? "Priority updated" : "Priorities updated");
  };

  const exportSelected = () => {
    const rowsToExport = selectedCases.length > 0 ? selectedCases : filtered;
    const csv = [
      ["id", "client", "category", "status", "assigned_staff", "priority", "updated_at"],
      ...rowsToExport.map((row) => [
        row.id,
        row.clientName ?? row.clientEmail ?? "",
        row.service_category,
        row.status,
        row.staffName ?? "Unassigned",
        row.priority ?? "normal",
        row.updated_at,
      ]),
    ]
      .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cases_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cases</h1>
        <p className="text-sm text-muted-foreground">
          All service requests — read-only monitoring.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search client or case ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40">
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
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s === "all" ? "All statuses" : s.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={staffId} onValueChange={setStaffId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All staff" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All staff</SelectItem>
            {staffList.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-40"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-40"
        />
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <span className="font-medium">{selectedIds.size} cases selected:</span>
          <Select
            value={bulkStaff}
            onValueChange={(value) => {
              setBulkStaff(value);
              void updateAssignedStaff(Array.from(selectedIds), value);
            }}
          >
            <SelectTrigger className="h-9 w-48">
              <SelectValue placeholder="Assign to..." />
            </SelectTrigger>
            <SelectContent>
              {staffList.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={bulkPriority}
            onValueChange={(value) => {
              setBulkPriority(value);
              void updatePriority(Array.from(selectedIds), value);
            }}
          >
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Change Priority" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p} className="capitalize">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportSelected}>
            <Download className="mr-1.5 h-4 w-4" />
            Export
          </Button>
        </div>
      )}

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
            <p className="text-sm text-muted-foreground">No cases match the filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onCheckedChange={(checked) =>
                        setSelectedIds(checked ? new Set(filtered.map((row) => row.id)) : new Set())
                      }
                    />
                  </TableHead>
                  <TableHead>Case</TableHead>
                  <TableHead onClick={() => toggleSort("clientName")} className="cursor-pointer">
                    Client
                  </TableHead>
                  <TableHead
                    onClick={() => toggleSort("service_category")}
                    className="cursor-pointer"
                  >
                    Category
                  </TableHead>
                  <TableHead onClick={() => toggleSort("status")} className="cursor-pointer">
                    Status
                  </TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead onClick={() => toggleSort("updated_at")} className="cursor-pointer">
                    Updated
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => {
                  const unassigned = !r.assigned_staff_id;

                  return (
                    <TableRow
                      key={r.id}
                      className={`cursor-pointer ${unassigned ? "border-l-4 border-l-amber-500 bg-amber-500/5" : ""}`}
                      onClick={() => setOpenCase(r)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(r.id)}
                          onCheckedChange={(checked) =>
                            setSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(r.id);
                              else next.delete(r.id);
                              return next;
                            })
                          }
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs">{r.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-medium">
                        {r.clientName ?? r.clientEmail ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {r.service_category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusBadgeClass(r.status)}>
                          {r.status.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {r.staffName ?? (
                          <span className="inline-flex items-center gap-2">
                            <span className="text-xs italic text-amber-600 dark:text-amber-300">
                              Unassigned
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAssigningCase(r);
                              }}
                            >
                              Assign
                            </Button>
                          </span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={r.priority ?? "normal"}
                          onValueChange={(value) => updatePriority([r.id], value)}
                        >
                          <SelectTrigger className="h-8 w-28 border-0 bg-transparent p-0 shadow-none">
                            <Badge className={priorityBadgeClass(r.priority ?? "normal")}>
                              {(r.priority ?? "normal").replace(/_/g, " ")}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {PRIORITIES.map((p) => (
                              <SelectItem key={p} value={p} className="capitalize">
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.updated_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
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
                  <p className="mt-1 rounded border border-border bg-muted/30 p-2">
                    {openCase.notes}
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" asChild>
                  <Link to="/staff/visa/$id" params={{ id: openCase.id }}>
                    View full case
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Admin view — monitoring only. Case actions are handled by assigned staff.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!assigningCase} onOpenChange={(o) => !o && setAssigningCase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign case {assigningCase?.id.slice(0, 8)}</DialogTitle>
          </DialogHeader>
          <Select value={quickStaff} onValueChange={setQuickStaff}>
            <SelectTrigger>
              <SelectValue placeholder="Select staff member" />
            </SelectTrigger>
            <SelectContent>
              {staffList.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigningCase(null)}>
              Cancel
            </Button>
            <Button
              disabled={!assigningCase || !quickStaff}
              onClick={() => assigningCase && updateAssignedStaff([assigningCase.id], quickStaff)}
            >
              Assign
            </Button>
          </DialogFooter>
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

function statusBadgeClass(status: string) {
  if (status === "submitted") return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/15";
  if (status === "under_review") return "bg-purple-500/10 text-purple-500 hover:bg-purple-500/15";
  if (status === "completed") return "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15";
  if (status === "cancelled") return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/15";
  if (status === "awaiting_client")
    return "bg-amber-500/10 text-amber-600 dark:text-amber-300 hover:bg-amber-500/15";
  if (status === "free_consultation") return "bg-teal-500/10 text-teal-500 hover:bg-teal-500/15";
  if (status === "in_progress") return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/15";
  return "bg-muted text-muted-foreground hover:bg-muted";
}

function priorityBadgeClass(priority: string) {
  if (priority === "urgent") return "bg-red-500 text-white hover:bg-red-500";
  if (priority === "high")
    return "bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20";
  if (priority === "low") return "bg-muted text-muted-foreground hover:bg-muted";
  return "bg-primary/10 text-primary hover:bg-primary/15";
}
