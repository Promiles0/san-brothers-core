import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Crown, Loader2, Search, Trophy, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
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
  // "approve_accounting",
  // ✂️ DELETE THIS LINE:
  // "approve_consultancy",
  // ✂️ DELETE THIS LINE:
  // "manage_consultancy_cases",
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
  staff_id: string | null;
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

const CAPABILITY_DESCRIPTIONS: Partial<Record<Capability, string>> = {
  handle_visa: "Can see and manage visa cases",
  handle_accounting: "Can see and manage accounting cases",
  handle_translation: "Can see translation cases and documents",
  handle_live_calls: "Can handle live interpreter call requests",
  handle_consultancy: "Can see and manage consultancy cases",
  register_clients_manually: "Can create client accounts manually",
  handle_claims: "Can view and respond to client claims",
  approve_visa: "Can approve/reject visa applications",
  view_financial_reports: "Can access revenue and payment reports",
  manage_staff: "Can invite, edit, and deactivate staff",
  manage_pricing: "Can edit interpreter rates and packages",
  manage_services_catalog: "Can add/edit/disable services",
  view_audit_log: "Can view the full system audit trail",
};

const CAPABILITY_GROUPS = [
  {
    title: "SERVICE HANDLING",
    color:
      "border-l-blue-500 bg-blue-500/5 data-[checked=true]:border-blue-500 data-[checked=true]:bg-blue-500/10",
    capabilities: [
      "handle_visa",
      "handle_accounting",
      "handle_consultancy",
      "handle_translation",
      "handle_live_calls",
    ] as Capability[],
  },
  {
    title: "CLIENT MANAGEMENT",
    color:
      "border-l-emerald-500 bg-emerald-500/5 data-[checked=true]:border-emerald-500 data-[checked=true]:bg-emerald-500/10",
    capabilities: ["register_clients_manually", "handle_claims", "approve_visa"] as Capability[],
  },
  {
    title: "ADMIN ACCESS",
    color:
      "border-l-orange-500 bg-orange-500/5 data-[checked=true]:border-orange-500 data-[checked=true]:bg-orange-500/10",
    capabilities: [
      "view_financial_reports",
      "manage_staff",
      "manage_pricing",
      "manage_services_catalog",
      "view_audit_log",
    ] as Capability[],
  },
];

const PRESET_LABELS: Record<string, string> = {
  visa_officer: "Visa Officer",
  accountant: "Accountant",
  translator: "Translator",
  manager: "Manager",
  admin_full: "Full Admin",
};

function initialsFor(u: UserRow) {
  const source = u.full_name?.trim() || u.email;
  const parts = source.split(/\s+/);
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function daysSince(iso: string | null | undefined) {
  if (!iso) return Infinity;
  return (Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000);
}

function roleBadgeClass(role: string) {
  if (role === "admin") return "bg-red-500/10 text-red-500 hover:bg-red-500/15";
  if (role === "manager") return "bg-blue-500/10 text-blue-500 hover:bg-blue-500/15";
  if (role === "translator") return "bg-purple-500/10 text-purple-500 hover:bg-purple-500/15";
  return "bg-gray-500/10 text-gray-500 dark:text-gray-400 hover:bg-gray-500/15";
}

function workloadClass(active: number) {
  if (active > 6) return "bg-red-500";
  if (active >= 3) return "bg-amber-500";
  return "bg-emerald-500";
}

function activeTextClass(days: number) {
  if (days < 1) return "text-emerald-500";
  if (days <= 7) return "text-amber-500";
  return "text-red-400";
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
  const [caseCounts, setCaseCounts] = useState<
    Record<string, { active: number; completed: number }>
  >({});
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    full_name: "",
    email: "",
    role: "secretary" as StaffRole,
  });
  const [inviting, setInviting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "cases" | "last_active">("last_active");
  const [editingStaffIdFor, setEditingStaffIdFor] = useState<string | null>(null);
  const [staffIdDraft, setStaffIdDraft] = useState("");
  const [managerIds, setManagerIds] = useState<Set<string>>(new Set());
  const [pendingManagerSwap, setPendingManagerSwap] = useState<{
    newUser: UserRow;
    currentUser: UserRow;
  } | null>(null);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("users")
      .select("id,email,full_name,role,status,created_at,staff_id")
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
    setSelectedCaps(
      new Set(
        (data ?? [])
          .map((r: { capability: Capability }) => r.capability)
          .filter((c: Capability) => c !== "manage_assignments"),
      ),
    );
  }, []);

  const fetchManagers = useCallback(async () => {
    const { data } = await supabase
      .from("staff_capabilities")
      .select("user_id")
      .eq("capability", "manage_assignments");
    setManagerIds(new Set((data ?? []).map((r: { user_id: string }) => r.user_id)));
  }, []);

  useEffect(() => {
    fetchManagers();
  }, [fetchManagers]);

  const saveStaffId = async (user: UserRow, newValue: string) => {
    const trimmed = newValue.trim();
    setEditingStaffIdFor(null);
    if (trimmed === (user.staff_id ?? "")) return;
    const prev = user.staff_id;
    setStaff((s) => s.map((u) => (u.id === user.id ? { ...u, staff_id: trimmed || null } : u)));
    const { error } = await supabase
      .from("users")
      .update({ staff_id: trimmed || null })
      .eq("id", user.id);
    if (error) {
      setStaff((s) => s.map((u) => (u.id === user.id ? { ...u, staff_id: prev } : u)));
      toast.error(error.message);
    } else {
      toast.success("Staff ID updated");
      void logAudit({
        action: "staff_id_changed",
        target_type: "user",
        target_id: user.id,
        metadata: { from: prev, to: trimmed || null },
      });
    }
  };

  const applyManager = async (newUser: UserRow, currentUser: UserRow | null) => {
    if (currentUser) {
      const { error: delErr } = await supabase
        .from("staff_capabilities")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("capability", "manage_assignments");
      if (delErr) return toast.error(delErr.message);
    }
    const { error: insErr } = await supabase.from("staff_capabilities").insert({
      user_id: newUser.id,
      capability: "manage_assignments",
      granted_by: profile?.id ?? null,
    });
    if (insErr) return toast.error(insErr.message);
    toast.success(`${newUser.full_name ?? newUser.email} is now Case Manager`);
    void logAudit({
      action: "manager_assigned",
      target_type: "user",
      target_id: newUser.id,
      metadata: { previous: currentUser?.id ?? null },
    });
    await fetchManagers();
    if (selectedStaffId === newUser.id) await fetchCapsFor(newUser.id);
  };

  const removeManager = async (user: UserRow) => {
    const { error } = await supabase
      .from("staff_capabilities")
      .delete()
      .eq("user_id", user.id)
      .eq("capability", "manage_assignments");
    if (error) return toast.error(error.message);
    toast.success("Manager role removed");
    void logAudit({
      action: "manager_removed",
      target_type: "user",
      target_id: user.id,
    });
    await fetchManagers();
    if (selectedStaffId === user.id) await fetchCapsFor(user.id);
  };

  const handleManagerToggle = (user: UserRow, makeManager: boolean) => {
    if (!makeManager) {
      void removeManager(user);
      return;
    }
    const current = staff.find((s) => managerIds.has(s.id) && s.id !== user.id);
    if (current) {
      setPendingManagerSwap({ newUser: user, currentUser: current });
    } else {
      void applyManager(user, null);
    }
  };

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
    void logAudit({
      action: "role_changed",
      target_type: "user",
      target_id: editingUser.id,
      metadata: {
        name: editingUser.full_name ?? editingUser.email,
        from: editingUser.role,
        to: editRole,
      },
    });
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
      .eq("user_id", selectedStaffId)
      .neq("capability", "manage_assignments");
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
  const maxActiveCases = Math.max(1, ...staff.map((u) => caseCounts[u.id]?.active ?? 0));
  const filteredStaff = useMemo(
    () =>
      [...staff]
        .filter(
          (u) =>
            (filterRole === "all" || u.role === filterRole) &&
            (filterStatus === "all" || u.status === filterStatus) &&
            (searchQuery === "" ||
              u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              u.email.toLowerCase().includes(searchQuery.toLowerCase())),
        )
        .sort((a, b) => {
          if (sortBy === "cases")
            return (caseCounts[b.id]?.completed ?? 0) - (caseCounts[a.id]?.completed ?? 0);
          if (sortBy === "last_active")
            return (lastActive[b.id] ?? "").localeCompare(lastActive[a.id] ?? "");
          return (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email);
        }),
    [caseCounts, filterRole, filterStatus, lastActive, searchQuery, sortBy, staff],
  );
  const topPerformer = useMemo(
    () =>
      [...staff].sort(
        (a, b) => (caseCounts[b.id]?.completed ?? 0) - (caseCounts[a.id]?.completed ?? 0),
      )[0],
    [caseCounts, staff],
  );
  const mostActive = useMemo(
    () =>
      [...staff].sort(
        (a, b) => (caseCounts[b.id]?.active ?? 0) - (caseCounts[a.id]?.active ?? 0),
      )[0],
    [caseCounts, staff],
  );
  const needsAttentionCount = staff.filter(
    (u) =>
      daysSince(lastActive[u.id]) > 7 ||
      ((caseCounts[u.id]?.active ?? 0) === 0 && (caseCounts[u.id]?.completed ?? 0) === 0),
  ).length;

  const vacantStaffIds = useMemo(
    () =>
      staff
        .filter((u) => u.staff_id && u.status !== "active")
        .map((u) => ({ id: u.staff_id as string, name: u.full_name ?? u.email, status: u.status })),
    [staff],
  );
  const currentManager = useMemo(
    () => staff.find((s) => managerIds.has(s.id)) ?? null,
    [staff, managerIds],
  );

  const toggleStatus = async (u: UserRow) => {
    const next = u.status === "active" ? "inactive" : "active";
    setStaff((prev) => prev.map((s) => (s.id === u.id ? { ...s, status: next } : s)));
    const { error } = await supabase.from("users").update({ status: next }).eq("id", u.id);
    if (error) {
      toast.error(error.message);
      setStaff((prev) => prev.map((s) => (s.id === u.id ? { ...s, status: u.status } : s)));
    } else {
      toast.success(`Account ${next}`);
      void logAudit({
        action: next === "active" ? "staff_activated" : "staff_deactivated",
        target_type: "user",
        target_id: u.id,
        metadata: { name: u.full_name ?? u.email },
      });
    }
  };

  const handleInvite = async () => {
    if (!inviteForm.email.trim() || !inviteForm.full_name.trim())
      return toast.error("Name and email required");
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
          <p className="text-sm text-muted-foreground">
            Manage staff accounts, roles, and capabilities.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-1.5 h-4 w-4" /> Invite staff
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
        <div className="relative min-w-64 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email..."
            className="h-9 pl-9"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {STAFF_ROLES.map((role) => (
              <SelectItem key={role} value={role} className="capitalize">
                {role}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="invited">Invited</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="h-9 w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last_active">Last Active</SelectItem>
            <SelectItem value="cases">Most Cases Completed</SelectItem>
            <SelectItem value="name">Name A-Z</SelectItem>
          </SelectContent>
        </Select>
        <p className="ml-auto text-sm text-muted-foreground">
          {filteredStaff.length} of {staff.length} staff
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="overflow-hidden border-amber-500/20 bg-gradient-to-br from-amber-500/15 to-background">
          <CardContent className="p-4">
            <Trophy className="h-5 w-5 text-amber-500" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Top Performer
            </p>
            <p className="mt-1 font-semibold">
              {topPerformer?.full_name ?? topPerformer?.email ?? "No staff yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {topPerformer ? (caseCounts[topPerformer.id]?.completed ?? 0) : 0} cases completed
            </p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-blue-500/20 bg-gradient-to-br from-blue-500/15 to-background">
          <CardContent className="p-4">
            <Activity className="h-5 w-5 text-blue-500" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Most Active
            </p>
            <p className="mt-1 font-semibold">
              {mostActive?.full_name ?? mostActive?.email ?? "No staff yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {mostActive ? (caseCounts[mostActive.id]?.active ?? 0) : 0} active cases
            </p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-red-500/20 bg-gradient-to-br from-red-500/15 to-background">
          <CardContent className="p-4">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Inactive Staff
            </p>
            <p className="mt-1 text-2xl font-bold">{needsAttentionCount}</p>
            <p className="text-xs text-muted-foreground">members need check-in</p>
          </CardContent>
        </Card>
      </div>

      {vacantStaffIds.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-amber-700 dark:text-amber-300">
              Vacant Staff IDs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-xs text-muted-foreground">
              These IDs belong to inactive staff and can be reassigned.
            </p>
            <div className="flex flex-wrap gap-2">
              {vacantStaffIds.map((v) => (
                <span
                  key={v.id}
                  className="inline-flex items-center gap-1.5 rounded border border-amber-500/30 bg-background px-2 py-1 font-mono text-xs"
                  title={`${v.name} — ${v.status}`}
                >
                  {v.id}
                  <span className="font-sans text-[10px] text-muted-foreground">({v.status})</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                  <TableHead className="text-center">Active</TableHead>
                  <TableHead className="text-center">Completed</TableHead>
                  <TableHead>Active?</TableHead>
                  <TableHead>Last active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStaff.map((u) => {
                  const activeCases = caseCounts[u.id]?.active ?? 0;
                  const completedCases = caseCounts[u.id]?.completed ?? 0;
                  const recentDays = daysSince(lastActive[u.id]);
                  const workloadWidth = Math.round((activeCases / maxActiveCases) * 100);

                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {initialsFor(u)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate">{u.full_name ?? u.email}</p>
                              {managerIds.has(u.id) && (
                                <Crown
                                  className="h-3.5 w-3.5 text-amber-500"
                                  aria-label="Case Manager"
                                />
                              )}
                              {editingStaffIdFor === u.id ? (
                                <Input
                                  autoFocus
                                  value={staffIdDraft}
                                  onChange={(e) => setStaffIdDraft(e.target.value)}
                                  onBlur={() => saveStaffId(u, staffIdDraft)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveStaffId(u, staffIdDraft);
                                    if (e.key === "Escape") setEditingStaffIdFor(null);
                                  }}
                                  className="h-6 w-24 px-2 py-0 font-mono text-xs"
                                  placeholder="SB-001"
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingStaffIdFor(u.id);
                                    setStaffIdDraft(u.staff_id ?? "");
                                  }}
                                  className="rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                                  title="Click to edit Staff ID"
                                >
                                  {u.staff_id ?? "— set ID —"}
                                </button>
                              )}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                            <div className="mt-2 h-0.5 w-full rounded-full bg-muted">
                              <div
                                className={`h-0.5 rounded-full ${workloadClass(activeCases)}`}
                                style={{ width: `${workloadWidth}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`capitalize ${roleBadgeClass(u.role)}`}
                        >
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${activeCases > 0 ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
                          />
                          {activeCases}
                        </span>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">
                        <span className="inline-flex items-center justify-center gap-2">
                          {completedCases}
                          {completedCases > 3 && (
                            <Badge className="bg-amber-500/15 text-[10px] text-amber-600 dark:text-amber-300">
                              Top performer
                            </Badge>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={u.status === "active"}
                            onCheckedChange={() => toggleStatus(u)}
                          />
                          <span className="inline-flex items-center gap-1.5 text-xs capitalize text-muted-foreground">
                            <span
                              className={`h-2 w-2 rounded-full ${
                                u.status === "active"
                                  ? "bg-emerald-500"
                                  : u.status === "invited"
                                    ? "bg-amber-500"
                                    : "bg-red-500"
                              }`}
                            />
                            {u.status}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className={`text-xs ${activeTextClass(recentDays)}`}>
                        {lastActive[u.id] ? (
                          <span>
                            {recentDays < 1 ? "● Online recently" : timeAgo(lastActive[u.id]!)}
                          </span>
                        ) : (
                          <span className="text-red-400">No activity</span>
                        )}
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
                  );
                })}
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

              {selectedStaff && (
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border-2 border-amber-500/40 bg-amber-500/5 p-4 transition-colors hover:bg-amber-500/10">
                  <Checkbox
                    checked={managerIds.has(selectedStaff.id)}
                    onCheckedChange={(v) => handleManagerToggle(selectedStaff, !!v)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-amber-500" />
                      <span className="font-semibold">Case Manager</span>
                      {currentManager && currentManager.id !== selectedStaff.id && (
                        <Badge variant="secondary" className="text-[10px]">
                          Currently: {currentManager.full_name ?? currentManager.email}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Receives all client cases, assigns to staff, handles client messages and
                      claims. Only one staff member can hold this role.
                    </p>
                  </div>
                </label>
              )}
              <div className="flex flex-wrap gap-2">
                {Object.entries(PRESETS).map(([preset, caps]) => {
                  const active =
                    caps.length === selectedCaps.size && caps.every((cap) => selectedCaps.has(cap));

                  return (
                    <Button
                      key={preset}
                      type="button"
                      variant={active ? "default" : "outline"}
                      size="sm"
                      className="rounded-full"
                      onClick={() => setSelectedCaps(new Set(caps))}
                    >
                      {PRESET_LABELS[preset]}
                    </Button>
                  );
                })}
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                {CAPABILITY_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.title}
                    </p>
                    <div className="space-y-2">
                      {group.capabilities.map((cap) => {
                        const checked = selectedCaps.has(cap);

                        return (
                          <label
                            key={cap}
                            data-checked={checked}
                            className={`flex cursor-pointer gap-3 rounded-md border border-l-4 border-border p-3 text-sm transition-colors hover:bg-accent ${group.color}`}
                          >
                            <Checkbox checked={checked} onCheckedChange={() => toggleCap(cap)} />
                            <span>
                              <span className="block font-medium">{cap.replace(/_/g, " ")}</span>
                              <span className="mt-0.5 block text-xs text-muted-foreground">
                                {CAPABILITY_DESCRIPTIONS[cap]}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
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

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite staff member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Full name</Label>
              <Input
                value={inviteForm.full_name}
                onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(v) => setInviteForm({ ...inviteForm, role: v as StaffRole })}
              >
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviting}>
              {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingManagerSwap} onOpenChange={(o) => !o && setPendingManagerSwap(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Case Manager role?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove the Manager role from{" "}
            <span className="font-semibold text-foreground">
              {pendingManagerSwap?.currentUser.full_name ?? pendingManagerSwap?.currentUser.email}
            </span>{" "}
            and assign it to{" "}
            <span className="font-semibold text-foreground">
              {pendingManagerSwap?.newUser.full_name ?? pendingManagerSwap?.newUser.email}
            </span>
            . Continue?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingManagerSwap(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!pendingManagerSwap) return;
                const swap = pendingManagerSwap;
                setPendingManagerSwap(null);
                await applyManager(swap.newUser, swap.currentUser);
              }}
            >
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
