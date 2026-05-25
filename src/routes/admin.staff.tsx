import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { type Capability } from "@/lib/staff/capability-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/staff")({ component: AdminStaff });

type StaffRole = "secretary" | "manager" | "translator" | "admin";
const STAFF_ROLES: StaffRole[] = ["secretary", "manager", "translator", "admin"];

const ALL_CAPABILITIES: Capability[] = [
  "handle_visa",
  "handle_accounting",
  "handle_consultancy",
  "handle_translation",
  "handle_live_calls",
  "register_clients_manually",
  "approve_visa",
  "approve_accounting",
  "view_financial_reports",
  "manage_staff",
  "manage_pricing",
  "manage_services_catalog",
  "view_audit_log",
  "handle_claims",
];

const PRESETS: Record<string, Capability[]> = {
  visa_officer: ["handle_visa", "approve_visa", "register_clients_manually"],
  accountant: ["handle_accounting", "approve_accounting", "view_financial_reports"],
  translator: ["handle_translation", "handle_live_calls"],
  manager: [
    "handle_visa",
    "handle_accounting",
    "handle_consultancy",
    "approve_visa",
    "approve_accounting",
    "view_financial_reports",
    "handle_claims",
    "register_clients_manually",
  ],
  admin_full: ALL_CAPABILITIES,
};

interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  status: string;
  created_at: string;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function AdminStaff() {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState<StaffRole>("secretary");
  const [savingRole, setSavingRole] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedCaps, setSelectedCaps] = useState<Set<Capability>>(new Set());
  const [capsSaving, setCapsSaving] = useState(false);
  const [lastActive, setLastActive] = useState<Record<string, string | null>>({});
  const [caseCounts, setCaseCounts] = useState<Record<string, { active: number; completed: number }>>({});
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ full_name: "", email: "", role: "secretary" as StaffRole });
  const [inviting, setInviting] = useState(false);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("users")
      .select("id,email,full_name,role,status,created_at")
      .neq("role", "client")
      .order("created_at", { ascending: false });
    const rows = (data as UserRow[]) ?? [];
    setStaff(rows);

    const { data: caseData } = await supabase
      .from("service_requests")
      .select("assigned_staff_id,status");
    const counts: Record<string, { active: number; completed: number }> = {};
    for (const r of (caseData ?? []) as { assigned_staff_id: string | null; status: string }[]) {
      if (!r.assigned_staff_id) continue;
      const c = counts[r.assigned_staff_id] ?? { active: 0, completed: 0 };
      if (r.status === "completed") c.completed++;
      else if (!["cancelled", "rejected"].includes(r.status)) c.active++;
      counts[r.assigned_staff_id] = c;
    }
    setCaseCounts(counts);

    const activityMap: Record<string, string | null> = {};
    await Promise.all(
      rows.map(async (u) => {
        const { data: lastA } = await supabase
          .from("audit_log")
          .select("created_at")
          .eq("user_id", u.id)
          .order("created_at", { ascending: false })
          .limit(1);
        activityMap[u.id] = (lastA?.[0] as { created_at: string } | undefined)?.created_at ?? null;
      }),
    );
    setLastActive(activityMap);
    setLoading(false);
  }, []);

  const fetchCapsFor = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("staff_capabilities")
      .select("capability")
      .eq("user_id", userId);
    setSelectedCaps(new Set((data ?? []).map((r: { capability: Capability }) => r.capability)));
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  useEffect(() => {
    if (selectedStaffId) fetchCapsFor(selectedStaffId);
    else setSelectedCaps(new Set());
  }, [selectedStaffId, fetchCapsFor]);

  const handleSaveRole = async () => {
    if (!editingUser) return;
    setSavingRole(true);
    const { error } = await supabase
      .from("users")
      .update({ role: editRole })
      .eq("id", editingUser.id);
    setSavingRole(false);
    if (error) return toast.error(error.message);
    toast.success("Role updated");
    setEditingUser(null);
    fetchStaff();
  };

  const toggleCap = (cap: Capability) => {
    setSelectedCaps((prev) => {
      const next = new Set(prev);
      if (next.has(cap)) next.delete(cap);
      else next.add(cap);
      return next;
    });
  };

  const saveCapabilities = async () => {
    if (!selectedStaffId) return;
    setCapsSaving(true);
    const { error: delErr } = await supabase
      .from("staff_capabilities")
      .delete()
      .eq("user_id", selectedStaffId);
    if (delErr) {
      setCapsSaving(false);
      return toast.error(delErr.message);
    }
    const rows = Array.from(selectedCaps).map((capability) => ({
      user_id: selectedStaffId,
      capability,
      granted_by: profile?.id ?? null,
    }));
    if (rows.length > 0) {
      const { error: insErr } = await supabase.from("staff_capabilities").insert(rows);
      if (insErr) {
        setCapsSaving(false);
        return toast.error(insErr.message);
      }
    }
    setCapsSaving(false);
    toast.success("Capabilities saved");
  };

  const selectedStaff = staff.find((s) => s.id === selectedStaffId);

  const toggleStatus = async (u: UserRow) => {
    const next = u.status === "active" ? "inactive" : "active";
    setStaff((prev) => prev.map((s) => (s.id === u.id ? { ...s, status: next } : s)));
    const { error } = await supabase.from("users").update({ status: next }).eq("id", u.id);
    if (error) {
      toast.error(error.message);
      setStaff((prev) => prev.map((s) => (s.id === u.id ? { ...s, status: u.status } : s)));
    } else toast.success(`Account ${next}`);
  };

  const handleInvite = async () => {
    if (!inviteForm.email.trim() || !inviteForm.full_name.trim()) return toast.error("Name and email required");
    setInviting(true);
    const { error } = await supabase.from("users").insert({
      email: inviteForm.email,
      full_name: inviteForm.full_name,
      role: inviteForm.role,
      status: "invited",
      signup_source: "admin_invite",
    });
    setInviting(false);
    if (error) return toast.error(error.message);
    toast.success("Staff invited");
    setInviteOpen(false);
    setInviteForm({ full_name: "", email: "", role: "secretary" });
    fetchStaff();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Staff</h1>
          <p className="text-sm text-muted-foreground">Manage staff accounts, roles, and capabilities.</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-1.5 h-4 w-4" /> Invite staff
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Staff members</CardTitle>
          <Badge variant="secondary">{staff.length} members</Badge>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : staff.length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.full_name ?? u.email}
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.status === "active" ? "default" : "secondary"}
                        className="capitalize"
                      >
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {lastActive[u.id] ? timeAgo(lastActive[u.id]!) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedStaffId(u.id)}
                        >
                          Capabilities
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingUser(u);
                            setEditRole(
                              (STAFF_ROLES.includes(u.role as StaffRole)
                                ? u.role
                                : "secretary") as StaffRole,
                            );
                          }}
                        >
                          Edit role
                        </Button>
                      </div>
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
          <CardTitle className="text-base">Capability assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={selectedStaffId ?? ""}
              onValueChange={(v) => setSelectedStaffId(v || null)}
            >
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name ?? u.email} ({u.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              onValueChange={(preset) => {
                const caps = PRESETS[preset];
                if (caps) setSelectedCaps(new Set(caps));
              }}
              disabled={!selectedStaffId}
            >
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Apply preset" />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(PRESETS).map((p) => (
                  <SelectItem key={p} value={p}>
                    {p.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={saveCapabilities}
              disabled={!selectedStaffId || capsSaving}
              className="ml-auto"
            >
              {capsSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save capabilities
            </Button>
          </div>

          {selectedStaffId ? (
            <>
              {selectedStaff && (
                <p className="text-sm text-muted-foreground">
                  Editing capabilities for{" "}
                  <span className="font-medium text-foreground">
                    {selectedStaff.full_name ?? selectedStaff.email}
                  </span>
                </p>
              )}
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {ALL_CAPABILITIES.map((cap) => (
                  <label
                    key={cap}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm hover:bg-accent"
                  >
                    <Checkbox
                      checked={selectedCaps.has(cap)}
                      onCheckedChange={() => toggleCap(cap)}
                    />
                    <span>{cap.replace(/_/g, " ")}</span>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a staff member above to manage their capabilities.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingUser} onOpenChange={(o) => !o && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit role</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {editingUser?.full_name ?? editingUser?.email}
            </p>
            <Select value={editRole} onValueChange={(v) => setEditRole(v as StaffRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAFF_ROLES.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={savingRole}>
              {savingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
