import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCapabilities, type Capability } from "@/lib/staff/capability-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/staff/admin")({ component: AdminPage });

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

interface ServiceRow {
  id: string;
  name_en: string;
  category: string;
  price_min_rwf: number | null;
  price_max_rwf: number | null;
  estimated_days_min: number | null;
  estimated_days_max: number | null;
  is_active: boolean;
}

interface AuditRow {
  id: string;
  action: string;
  target_id: string | null;
  user_id: string | null;
  created_at: string;
}

function AdminPage() {
  const { profile } = useAuth();
  const { hasCapability, isLoading: capsLoading } = useCapabilities();
  const navigate = useNavigate();

  const allowed = profile?.role === "admin" || hasCapability("manage_staff");

  useEffect(() => {
    if (!capsLoading && profile && !allowed) {
      navigate({ to: "/staff" });
    }
  }, [capsLoading, profile, allowed, navigate]);

  // KPIs
  const [kpis, setKpis] = useState({
    clients: 0,
    activeCases: 0,
    openClaims: 0,
    staff: 0,
  });

  // Staff
  const [staff, setStaff] = useState<UserRow[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState<StaffRole>("secretary");
  const [savingRole, setSavingRole] = useState(false);

  // Capabilities
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedCaps, setSelectedCaps] = useState<Set<Capability>>(new Set());
  const [capsSaving, setCapsSaving] = useState(false);

  // Audit
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [auditFilter, setAuditFilter] = useState("");

  // Services
  const [services, setServices] = useState<ServiceRow[]>([]);

  const fetchKpis = useCallback(async () => {
    const [clients, cases, claims, staffCount] = await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }).eq("role", "client"),
      supabase
        .from("service_requests")
        .select("id", { count: "exact", head: true })
        .not("status", "in", "(completed,cancelled,rejected)"),
      supabase.from("claims").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("users").select("id", { count: "exact", head: true }).neq("role", "client"),
    ]);
    setKpis({
      clients: clients.count ?? 0,
      activeCases: cases.count ?? 0,
      openClaims: claims.count ?? 0,
      staff: staffCount.count ?? 0,
    });
  }, []);

  const fetchStaff = useCallback(async () => {
    setStaffLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("id,email,full_name,role,status,created_at")
      .neq("role", "client")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setStaff((data as UserRow[]) ?? []);
    setStaffLoading(false);
  }, []);

  const fetchAudit = useCallback(async () => {
    const { data, error } = await supabase
      .from("audit_log")
      .select("id,action,target_id,user_id,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      // ignore (table may be empty / RLS)
      setAudit([]);
      return;
    }
    setAudit((data as AuditRow[]) ?? []);
  }, []);

  const fetchServices = useCallback(async () => {
    const { data, error } = await supabase
      .from("services")
      .select("id,name_en,category,price_min_rwf,price_max_rwf,estimated_days_min,estimated_days_max,is_active")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    setServices((data as ServiceRow[]) ?? []);
  }, []);

  const fetchCapsFor = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("staff_capabilities")
      .select("capability")
      .eq("user_id", userId);
    setSelectedCaps(new Set((data ?? []).map((r: { capability: Capability }) => r.capability)));
  }, []);

  useEffect(() => {
    if (!allowed) return;
    fetchKpis();
    fetchStaff();
    fetchAudit();
    fetchServices();
  }, [allowed, fetchKpis, fetchStaff, fetchAudit, fetchServices]);

  useEffect(() => {
    if (selectedStaffId) fetchCapsFor(selectedStaffId);
    else setSelectedCaps(new Set());
  }, [selectedStaffId, fetchCapsFor]);

  const handleOpenEdit = (u: UserRow) => {
    setEditingUser(u);
    setEditRole((STAFF_ROLES.includes(u.role as StaffRole) ? u.role : "secretary") as StaffRole);
  };

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
    fetchKpis();
  };

  const toggleCap = (cap: Capability) => {
    setSelectedCaps((prev) => {
      const next = new Set(prev);
      if (next.has(cap)) next.delete(cap);
      else next.add(cap);
      return next;
    });
  };

  const applyPreset = (preset: string) => {
    const caps = PRESETS[preset];
    if (caps) setSelectedCaps(new Set(caps));
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

  const toggleServiceActive = async (svc: ServiceRow) => {
    const next = !svc.is_active;
    setServices((prev) => prev.map((s) => (s.id === svc.id ? { ...s, is_active: next } : s)));
    const { error } = await supabase
      .from("services")
      .update({ is_active: next })
      .eq("id", svc.id);
    if (error) {
      toast.error(error.message);
      // revert
      setServices((prev) =>
        prev.map((s) => (s.id === svc.id ? { ...s, is_active: !next } : s)),
      );
    }
  };

  const filteredAudit = useMemo(() => {
    if (!auditFilter.trim()) return audit;
    const q = auditFilter.toLowerCase();
    return audit.filter((a) => a.action.toLowerCase().includes(q));
  }, [audit, auditFilter]);

  const selectedStaff = staff.find((s) => s.id === selectedStaffId);

  if (capsLoading || !profile) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!allowed) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-sm text-muted-foreground">
          Manage staff, capabilities, services, and audit history.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi title="Total clients" value={kpis.clients} />
        <Kpi title="Active cases" value={kpis.activeCases} />
        <Kpi title="Open claims" value={kpis.openClaims} />
        <Kpi title="Staff members" value={kpis.staff} />
      </div>

      <Tabs defaultValue="staff" className="space-y-4">
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="capabilities">Capabilities</TabsTrigger>
          <TabsTrigger value="audit">Audit log</TabsTrigger>
          <TabsTrigger value="pricing">Services & pricing</TabsTrigger>
        </TabsList>

        {/* Staff */}
        <TabsContent value="staff">
          <Card>
            <CardHeader>
              <CardTitle>Staff members</CardTitle>
            </CardHeader>
            <CardContent>
              {staffLoading ? (
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
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {staff.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.full_name ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize">{u.status}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString()}
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
                            <Button size="sm" onClick={() => handleOpenEdit(u)}>
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
        </TabsContent>

        {/* Capabilities */}
        <TabsContent value="capabilities">
          <Card>
            <CardHeader>
              <CardTitle>Capability assignment</CardTitle>
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

                <Select onValueChange={applyPreset} disabled={!selectedStaffId}>
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
                        className="flex items-center gap-2 rounded-md border border-border p-2 text-sm hover:bg-accent"
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
                  Select a staff member to manage their capabilities.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit log */}
        <TabsContent value="audit">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Audit log</CardTitle>
              <Input
                placeholder="Filter by action…"
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
                className="max-w-xs"
              />
            </CardHeader>
            <CardContent>
              {filteredAudit.length === 0 ? (
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
                    {filteredAudit.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.action}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {a.target_id ?? "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {a.user_id ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(a.created_at).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services & pricing */}
        <TabsContent value="pricing">
          <Card>
            <CardHeader>
              <CardTitle>Services & pricing</CardTitle>
            </CardHeader>
            <CardContent>
              {services.length === 0 ? (
                <p className="text-sm text-muted-foreground">No services configured.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price min (RWF)</TableHead>
                      <TableHead>Price max (RWF)</TableHead>
                      <TableHead>Days min</TableHead>
                      <TableHead>Days max</TableHead>
                      <TableHead className="text-right">Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name_en}</TableCell>
                        <TableCell className="capitalize">{s.category}</TableCell>
                        <TableCell>{s.price_min_rwf?.toLocaleString() ?? "—"}</TableCell>
                        <TableCell>{s.price_max_rwf?.toLocaleString() ?? "—"}</TableCell>
                        <TableCell>{s.estimated_days_min ?? "—"}</TableCell>
                        <TableCell>{s.estimated_days_max ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <Switch
                            checked={s.is_active}
                            onCheckedChange={() => toggleServiceActive(s)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit role dialog */}
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

function Kpi({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
