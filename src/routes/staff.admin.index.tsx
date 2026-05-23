import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import {
  DollarSign,
  Activity,
  Users as UsersIcon,
  Star,
  ScrollText,
  UserCog,
  AlertCircle,
  ShieldCheck,
  Wrench,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { type Capability } from "@/lib/staff/capability-context";
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

export const Route = createFileRoute("/staff/admin/")({ component: AdminDashboard });

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

interface PendingRow {
  id: string;
  service_category: string;
  created_at: string;
  client: { full_name: string | null; email: string } | null;
}

interface StaffPerfRow extends UserRow {
  assigned: number;
  completedThisMonth: number;
  lastActive: string | null;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function fmtRwf(n: number) {
  return `${(n ?? 0).toLocaleString()} RWF`;
}

function AdminDashboard() {
  const { profile } = useAuth();

  // KPIs
  const [kpis, setKpis] = useState({
    revenueMonth: 0,
    activeCases: 0,
    utilization: 0,
  });

  // Charts
  const [casesByCat, setCasesByCat] = useState<{ category: string; count: number }[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<{ date: string; revenue: number }[]>([]);

  // Panels
  const [recentAudit, setRecentAudit] = useState<AuditRow[]>([]);
  const [todayAudit, setTodayAudit] = useState<AuditRow[]>([]);
  const [pending, setPending] = useState<PendingRow[]>([]);

  // Staff
  const [staff, setStaff] = useState<UserRow[]>([]);
  const [staffPerf, setStaffPerf] = useState<StaffPerfRow[]>([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState<StaffRole>("secretary");
  const [savingRole, setSavingRole] = useState(false);

  // Capabilities
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedCaps, setSelectedCaps] = useState<Set<Capability>>(new Set());
  const [capsSaving, setCapsSaving] = useState(false);

  // Audit table
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [auditFilter, setAuditFilter] = useState("");

  // Services
  const [services, setServices] = useState<ServiceRow[]>([]);

  // Name lookup for audit entries
  const nameById = useMemo(() => {
    const m: Record<string, string> = {};
    staff.forEach((s) => {
      m[s.id] = s.full_name ?? s.email;
    });
    return m;
  }, [staff]);

  const fetchAll = useCallback(async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const start30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Revenue this month
    const { data: payMonth } = await supabase
      .from("payments")
      .select("amount_rwf,status,created_at")
      .gte("created_at", startOfMonth)
      .eq("status", "completed");
    const revenueMonth = (payMonth ?? []).reduce(
      (acc, p: { amount_rwf: number | null }) => acc + (p.amount_rwf ?? 0),
      0,
    );

    // Active cases
    const { count: activeCount } = await supabase
      .from("service_requests")
      .select("id", { count: "exact", head: true })
      .not("status", "in", "(completed,cancelled,rejected)");

    // Utilization: assigned / total staff
    const { count: totalStaff } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .neq("role", "client");
    const { count: assignedCount } = await supabase
      .from("service_requests")
      .select("id", { count: "exact", head: true })
      .not("assigned_staff_id", "is", null)
      .not("status", "in", "(completed,cancelled,rejected)");
    const utilization = totalStaff && totalStaff > 0
      ? Math.min(100, Math.round(((assignedCount ?? 0) / totalStaff) * 100))
      : 0;

    setKpis({
      revenueMonth,
      activeCases: activeCount ?? 0,
      utilization,
    });

    // Cases by category this week
    const { data: weekCases } = await supabase
      .from("service_requests")
      .select("service_category,created_at")
      .gte("created_at", startOfWeek);
    const catMap: Record<string, number> = {
      visa: 0,
      accounting: 0,
      translation: 0,
      consultancy: 0,
    };
    (weekCases ?? []).forEach((r: { service_category: string }) => {
      if (r.service_category in catMap) catMap[r.service_category]++;
    });
    setCasesByCat(
      Object.entries(catMap).map(([category, count]) => ({ category, count })),
    );

    // Revenue last 30 days
    const { data: pay30 } = await supabase
      .from("payments")
      .select("amount_rwf,status,created_at")
      .gte("created_at", start30.toISOString())
      .eq("status", "completed");
    const buckets: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const k = d.toISOString().slice(0, 10);
      buckets[k] = 0;
    }
    (pay30 ?? []).forEach((p: { amount_rwf: number | null; created_at: string }) => {
      const k = p.created_at.slice(0, 10);
      if (k in buckets) buckets[k] += p.amount_rwf ?? 0;
    });
    setRevenueTrend(
      Object.entries(buckets).map(([date, revenue]) => ({
        date: date.slice(5),
        revenue,
      })),
    );

    // Recent audit (last 10)
    const { data: recentA } = await supabase
      .from("audit_log")
      .select("id,action,target_id,user_id,created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    setRecentAudit((recentA as AuditRow[]) ?? []);

    // Today audit
    const { data: todayA } = await supabase
      .from("audit_log")
      .select("id,action,target_id,user_id,created_at")
      .gte("created_at", startOfDay)
      .order("created_at", { ascending: false })
      .limit(20);
    setTodayAudit((todayA as AuditRow[]) ?? []);

    // Pending approvals
    const { data: pend } = await supabase
      .from("service_requests")
      .select("id,service_category,created_at,client:client_id(full_name,email)")
      .eq("status", "verified")
      .order("created_at", { ascending: false })
      .limit(10);
    setPending((pend as unknown as PendingRow[]) ?? []);
  }, []);

  const fetchStaff = useCallback(async () => {
    setStaffLoading(true);
    const { data } = await supabase
      .from("users")
      .select("id,email,full_name,role,status,created_at")
      .neq("role", "client")
      .order("created_at", { ascending: false });
    const staffRows = (data as UserRow[]) ?? [];
    setStaff(staffRows);

    // Build performance rows
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const perf: StaffPerfRow[] = await Promise.all(
      staffRows.map(async (u) => {
        const [{ count: assigned }, { count: completed }, { data: lastA }] = await Promise.all([
          supabase
            .from("service_requests")
            .select("id", { count: "exact", head: true })
            .eq("assigned_staff_id", u.id),
          supabase
            .from("service_requests")
            .select("id", { count: "exact", head: true })
            .eq("assigned_staff_id", u.id)
            .eq("status", "completed")
            .gte("completed_at", startOfMonth),
          supabase
            .from("audit_log")
            .select("created_at")
            .eq("user_id", u.id)
            .order("created_at", { ascending: false })
            .limit(1),
        ]);
        return {
          ...u,
          assigned: assigned ?? 0,
          completedThisMonth: completed ?? 0,
          lastActive: (lastA?.[0] as { created_at: string } | undefined)?.created_at ?? null,
        };
      }),
    );
    setStaffPerf(perf);
    setStaffLoading(false);
  }, []);

  const fetchAudit = useCallback(async () => {
    const { data } = await supabase
      .from("audit_log")
      .select("id,action,target_id,user_id,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setAudit((data as AuditRow[]) ?? []);
  }, []);

  const fetchServices = useCallback(async () => {
    const { data, error } = await supabase
      .from("services")
      .select(
        "id,name_en,category,price_min_rwf,price_max_rwf,estimated_days_min,estimated_days_max,is_active",
      )
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
    fetchAll();
    fetchStaff();
    fetchAudit();
    fetchServices();
  }, [fetchAll, fetchStaff, fetchAudit, fetchServices]);

  useEffect(() => {
    if (selectedStaffId) fetchCapsFor(selectedStaffId);
    else setSelectedCaps(new Set());
  }, [selectedStaffId, fetchCapsFor]);

  // After mount, scroll to hash if present
  useEffect(() => {
    const id = window.location.hash.replace("#", "");
    if (id) {
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, []);

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

  const caseHref = (cat: string) => {
    if (cat === "visa") return "/staff/visa";
    if (cat === "accounting") return "/staff/accounting";
    if (cat === "translation") return "/staff/translation";
    if (cat === "consultancy") return "/staff/consultancy";
    return "/staff";
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          Command Center
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          Welcome back, {profile?.full_name?.split(" ")[0] ?? "Admin"}.
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Operational pulse of San Brothers — live data from your organization.
        </p>
      </div>

      {/* TOP ROW — KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={DollarSign}
          label="Revenue this month"
          value={fmtRwf(kpis.revenueMonth)}
          accent="from-emerald-500/20 to-emerald-500/0"
        />
        <KpiCard
          icon={Activity}
          label="Active cases"
          value={kpis.activeCases.toString()}
          accent="from-blue-500/20 to-blue-500/0"
        />
        <KpiCard
          icon={UsersIcon}
          label="Staff utilization"
          value={`${kpis.utilization}%`}
          accent="from-violet-500/20 to-violet-500/0"
        />
        <KpiCard
          icon={Star}
          label="Client satisfaction"
          value="Coming soon"
          muted
          accent="from-amber-500/20 to-amber-500/0"
        />
      </div>

      {/* SECOND ROW — Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cases by category — this week</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={casesByCat}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="category"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(v: string) => v.charAt(0).toUpperCase() + v.slice(1)}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue trend — last 30 days</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => fmtRwf(v)}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* THIRD ROW — Panels */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ScrollText className="h-4 w-4" /> Recent audit
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAudit.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (
              <ul className="space-y-3">
                {recentAudit.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{a.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.user_id ? nameById[a.user_id] ?? "System" : "System"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {timeAgo(a.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" /> Staff activity today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayAudit.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity today.</p>
            ) : (
              <ul className="space-y-3">
                {todayAudit.slice(0, 8).map((a) => (
                  <li key={a.id} className="text-sm">
                    <p className="font-medium">
                      {a.user_id ? nameById[a.user_id] ?? "Unknown" : "System"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.action} · {timeAgo(a.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" /> Pending approvals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing waiting.</p>
            ) : (
              <ul className="space-y-3">
                {pending.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {p.client?.full_name ?? p.client?.email ?? "—"}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {p.service_category} · {timeAgo(p.created_at)}
                      </p>
                    </div>
                    <Button asChild size="sm" variant="ghost" className="shrink-0">
                      <Link to={`${caseHref(p.service_category)}/$id`} params={{ id: p.id }}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* STAFF PERFORMANCE */}
      <Card id="staff" className="scroll-mt-20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <UserCog className="h-4 w-4" /> Staff performance
          </CardTitle>
          <Badge variant="secondary">{staff.length} members</Badge>
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
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Assigned</TableHead>
                  <TableHead className="text-right">Completed (mo.)</TableHead>
                  <TableHead className="text-right">Avg response</TableHead>
                  <TableHead>Last active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffPerf.map((u) => (
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
                    <TableCell className="text-right tabular-nums">{u.assigned}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {u.completedThisMonth}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">—</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {u.lastActive ? timeAgo(u.lastActive) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedStaffId(u.id);
                            document
                              .getElementById("capabilities")
                              ?.scrollIntoView({ behavior: "smooth" });
                          }}
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

      {/* CAPABILITIES */}
      <Card id="capabilities" className="scroll-mt-20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Capability assignment
          </CardTitle>
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

      {/* AUDIT */}
      <Card id="audit" className="scroll-mt-20">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="h-4 w-4" /> Audit log
          </CardTitle>
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
                    <TableCell className="text-muted-foreground">
                      {a.user_id ? nameById[a.user_id] ?? a.user_id.slice(0, 8) : "—"}
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

      {/* PRICING */}
      <Card id="pricing" className="scroll-mt-20">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Services &amp; pricing
          </CardTitle>
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

function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
  muted,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  accent: string;
  muted?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent}`}
        aria-hidden
      />
      <CardContent className="relative p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <p
          className={`mt-3 text-2xl font-bold tracking-tight ${
            muted ? "text-muted-foreground" : ""
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
