import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Inbox, Loader2, ShieldAlert, UserPlus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCapabilities } from "@/lib/staff/capability-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/lib/dashboard/status-badge";
import { logAudit } from "@/lib/audit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff/queue/")({ component: ManagerQueuePage });

interface QueueRow {
  id: string;
  status: string;
  priority: string | null;
  service_category: string;
  created_at: string;
  assigned_at: string | null;
  assigned_staff_id: string | null;
  client: { id: string; full_name: string | null; email: string } | null;
  service: { id: string; name_en: string } | null;
  assignee: { id: string; full_name: string | null; staff_id: string | null } | null;
}

interface StaffOption {
  id: string;
  full_name: string | null;
  staff_id: string | null;
  role: string;
}

function ManagerQueuePage() {
  const { hasCapability, isLoading: capsLoading } = useCapabilities();
  const { user } = useAuth();
  const isManager = hasCapability("manage_assignments");

  const [loading, setLoading] = useState(true);
  const [unassigned, setUnassigned] = useState<QueueRow[]>([]);
  const [recent, setRecent] = useState<QueueRow[]>([]);
  const [assignedToday, setAssignedToday] = useState(0);
  const [totalActive, setTotalActive] = useState(0);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [assigning, setAssigning] = useState<QueueRow | null>(null);
  const [pickedStaffId, setPickedStaffId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const SELECT =
    "id,status,priority,service_category,created_at,assigned_at,assigned_staff_id," +
    "client:users!service_requests_client_id_fkey(id,full_name,email)," +
    "service:services!service_requests_service_id_fkey(id,name_en)," +
    "assignee:users!service_requests_assigned_staff_id_fkey(id,full_name,staff_id)";
  const loadAll = async () => {
    setLoading(true);
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [unassignedRes, recentRes, todayRes, activeRes, staffRes] = await Promise.all([
        supabase
          .from("service_requests")
          .select(SELECT)
          .is("assigned_staff_id", null)
          .eq("assignment_status", "unassigned")
          .order("created_at", { ascending: true }),
        supabase
          .from("service_requests")
          .select(SELECT)
          .eq("assignment_status", "assigned")
          .order("assigned_at", { ascending: false })
          .limit(20),
        supabase
          .from("service_requests")
          .select("id", { count: "exact", head: true })
          .gte("assigned_at", startOfDay.toISOString()),
        supabase
          .from("service_requests")
          .select("id", { count: "exact", head: true })
          .not("status", "in", "(completed,rejected,cancelled)"),
        supabase
          .from("users")
          .select("id,full_name,staff_id,role")
          .in("role", ["secretary", "translator", "manager"])
          .eq("status", "active")
          .order("staff_id", { ascending: true }),
      ]);

      if (unassignedRes.error) throw unassignedRes.error;
      if (recentRes.error) throw recentRes.error;
      if (staffRes.error) throw staffRes.error;

      setUnassigned((unassignedRes.data ?? []) as unknown as QueueRow[]);
      setRecent((recentRes.data ?? []) as unknown as QueueRow[]);
      setAssignedToday(todayRes.count ?? 0);
      setTotalActive(activeRes.count ?? 0);
      setStaffOptions((staffRes.data ?? []) as StaffOption[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isManager) return;
    void loadAll();
  }, [isManager]);

  const unassignedCount = unassigned.length;

  const openAssign = (row: QueueRow) => {
    setAssigning(row);
    setPickedStaffId("");
  };

  const submitAssign = async () => {
    if (!assigning || !pickedStaffId || !user) return;
    setSubmitting(true);
    try {
      const staff = staffOptions.find((s) => s.id === pickedStaffId);
      const { error } = await supabase
        .from("service_requests")
        .update({
          assigned_staff_id: pickedStaffId,
          assigned_by: user.id,
          assigned_at: new Date().toISOString(),
          assignment_status: "assigned",
        })
        .eq("id", assigning.id);
      if (error) throw error;
      await logAudit({
        action: "case_assigned",
        target_type: "service_request",
        target_id: assigning.id,
        metadata: {
          assigned_to_staff_id: pickedStaffId,
          assigned_to_name: staff?.full_name ?? null,
          service_category: assigning.service_category,
        },
      });
      toast.success(
        `Assigned to ${staff?.full_name ?? "staff"}${staff?.staff_id ? ` (${staff.staff_id})` : ""}`,
      );
      setAssigning(null);
      setPickedStaffId("");
      await loadAll();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const staffLabel = (s: StaffOption) =>
    `${s.full_name ?? "—"}${s.staff_id ? ` · ${s.staff_id}` : ""}`;

  const formattedStats = useMemo(
    () => [
      {
        label: "Unassigned cases",
        value: unassignedCount,
        accent: "text-rose-600 dark:text-rose-400",
      },
      {
        label: "Assigned today",
        value: assignedToday,
        accent: "text-emerald-600 dark:text-emerald-400",
      },
      {
        label: "Total active cases",
        value: totalActive,
        accent: "text-blue-600 dark:text-blue-400",
      },
    ],
    [unassignedCount, assignedToday, totalActive],
  );

  if (capsLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isManager) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
        <h2 className="text-lg font-semibold">Access denied</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The Manager Queue is only available to staff with the Case Manager role.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Manager Queue</h1>
          <p className="text-sm text-muted-foreground">
            Assign incoming client cases to your team.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadAll()} disabled={loading}>
          <RefreshCw className={cn("mr-1 h-4 w-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {formattedStats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className={cn("mt-1 text-3xl font-bold tabular-nums", s.accent)}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Unassigned cases ({unassignedCount})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : unassigned.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/60" />
              <p className="text-sm font-medium">Queue is clear</p>
              <p className="text-xs text-muted-foreground">
                All incoming cases have been assigned.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Priority</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unassigned.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {r.priority === "urgent" ? (
                        <Badge variant="destructive">Urgent</Badge>
                      ) : (
                        <Badge variant="secondary">Normal</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{r.service?.name_en ?? "—"}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.client?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.client?.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {r.service_category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => openAssign(r)}>
                        <UserPlus className="mr-1 h-4 w-4" />
                        Assign
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recently assigned</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No recent assignments yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned at</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.service?.name_en ?? "—"}</TableCell>
                    <TableCell>{r.client?.full_name ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {r.assignee?.staff_id && (
                          <span className="rounded border bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {r.assignee.staff_id}
                          </span>
                        )}
                        <span className="text-sm">{r.assignee?.full_name ?? "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.assigned_at
                        ? new Date(r.assigned_at).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => openAssign(r)}>
                        Reassign
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={!!assigning}
        onOpenChange={(open) => {
          if (!open && !submitting) {
            setAssigning(null);
            setPickedStaffId("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign to staff</DialogTitle>
          </DialogHeader>
          {assigning && (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <p className="font-medium">{assigning.service?.name_en}</p>
                <p className="text-xs text-muted-foreground">
                  {assigning.client?.full_name} · {assigning.service_category}
                </p>
              </div>
              <Select value={pickedStaffId} onValueChange={setPickedStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a staff member" />
                </SelectTrigger>
                <SelectContent>
                  {staffOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {staffLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssigning(null);
                setPickedStaffId("");
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={() => void submitAssign()} disabled={!pickedStaffId || submitting}>
              {submitting && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Confirm assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
