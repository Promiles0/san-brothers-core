import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Headphones,
  Phone,
  PhoneCall,
  PhoneOff,
  Pause,
  Clock,
  Star,
  Activity,
  Timer,
  TrendingUp,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/interpreter")({ component: AdminInterpreter });

// ── Constants ─────────────────────────────────────────────────────────────────

const LANG: Record<string, { name: string; flag: string }> = {
  en: { name: "English", flag: "🇬🇧" },
  fr: { name: "French", flag: "🇫🇷" },
  zh: { name: "Chinese", flag: "🇨🇳" },
  rw: { name: "Kinyarwanda", flag: "🇷🇼" },
  sw: { name: "Kiswahili", flag: "🇰🇪" },
};

const langLabel = (code: string) => LANG[code]?.name ?? code.toUpperCase();
const langFlag = (code: string) => LANG[code]?.flag ?? "🌐";

const STATUS_META: Record<
  "ringing" | "active" | "on_hold",
  { label: string; icon: typeof Phone; dot: string; chip: string; ring: string }
> = {
  ringing: {
    label: "Ringing",
    icon: PhoneCall,
    dot: "bg-blue-500",
    chip: "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30",
    ring: "ring-blue-500/40",
  },
  active: {
    label: "Active",
    icon: Phone,
    dot: "bg-emerald-500",
    chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
    ring: "ring-emerald-500/40",
  },
  on_hold: {
    label: "On Hold",
    icon: Pause,
    dot: "bg-amber-500",
    chip: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
    ring: "ring-amber-500/40",
  },
};

const AVAIL_META: Record<string, { label: string; chip: string; dot: string }> = {
  online: {
    label: "Online",
    chip: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-500",
  },
  busy: {
    label: "Busy",
    chip: "bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30",
    dot: "bg-rose-500",
  },
  away: {
    label: "Away",
    chip: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30",
    dot: "bg-amber-500",
  },
  offline: {
    label: "Offline",
    chip: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground/60",
  },
};

const fmtDuration = (totalSec: number) => {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface LiveCall {
  id: string;
  client_id: string;
  interpreter_id: string | null;
  language_from: string;
  language_to: string;
  status: "ringing" | "active" | "on_hold";
  answered_at: string | null;
  started_at: string | null;
  created_at: string;
  client: { full_name: string | null; email: string } | null;
  interpreter: { full_name: string | null; email: string } | null;
}

interface InterpreterRow {
  id: string;
  full_name: string | null;
  email: string;
  availability_status: string | null;
  interpreter_languages: { from: string; to: string }[] | null;
  profile_picture_url: string | null;
}

interface CallStatRow {
  id: string;
  status: string;
  started_at: string | null;
  billed_seconds: number | null;
  minutes_deducted: number | null;
  rating: number | null;
  interpreter_id: string | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

function AdminInterpreter() {
  const [calls, setCalls] = useState<LiveCall[]>([]);
  const [interpreters, setInterpreters] = useState<InterpreterRow[]>([]);
  const [todayCalls, setTodayCalls] = useState<CallStatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [tick, setTick] = useState(0);
  const [selectedCall, setSelectedCall] = useState<LiveCall | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // ── Loaders ───────────────────────────────────────────────────────────────
  const todayIso = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);

  const loadCalls = async () => {
    const { data } = await supabase
      .from("interpreter_calls")
      .select(
        "id,client_id,interpreter_id,language_from,language_to,status,answered_at,started_at,created_at,client:users!client_id(full_name,email),interpreter:users!interpreter_id(full_name,email)",
      )
      .in("status", ["ringing", "active", "on_hold"])
      .order("created_at", { ascending: false });
    setCalls((data ?? []) as unknown as LiveCall[]);
  };

  const loadInterpreters = async () => {
    const { data: caps } = await supabase
      .from("staff_capabilities")
      .select("user_id")
      .eq("capability", "handle_live_calls");
    const ids = Array.from(new Set((caps ?? []).map((c: { user_id: string }) => c.user_id)));
    if (ids.length === 0) {
      setInterpreters([]);
      return;
    }
    const { data: users } = await supabase
      .from("users")
      .select("id,full_name,email,availability_status,interpreter_languages,profile_picture_url")
      .in("id", ids);
    setInterpreters((users ?? []) as unknown as InterpreterRow[]);
  };

  const loadTodayCalls = async () => {
    const { data } = await supabase
      .from("interpreter_calls")
      .select("id,status,started_at,billed_seconds,minutes_deducted,rating,interpreter_id")
      .gte("started_at", todayIso);
    setTodayCalls((data ?? []) as unknown as CallStatRow[]);
  };

  useEffect(() => {
    (async () => {
      await Promise.all([loadCalls(), loadInterpreters(), loadTodayCalls()]);
      setLoading(false);
    })();

    const callsCh = supabase
      .channel("admin-interp-calls")
      .on("postgres_changes", { event: "*", schema: "public", table: "interpreter_calls" }, () => {
        void loadCalls();
        void loadTodayCalls();
      })
      .subscribe();

    const usersCh = supabase
      .channel("admin-interp-users")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "users" },
        () => void loadInterpreters(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(callsCh);
      void supabase.removeChannel(usersCh);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived: KPIs ─────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = todayCalls.length;
    const completed = todayCalls.filter((c) => c.status === "completed");
    const avgDur =
      completed.length > 0
        ? completed.reduce((a, c) => a + (c.billed_seconds ?? 0), 0) / completed.length
        : 0;
    const totalMin = completed.reduce((a, c) => a + (c.minutes_deducted ?? 0), 0);
    return { total, completed: completed.length, avgDur, totalMin };
  }, [todayCalls]);

  const hourly = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, "0")}h`,
      calls: 0,
    }));
    todayCalls.forEach((c) => {
      if (!c.started_at) return;
      const h = new Date(c.started_at).getHours();
      buckets[h].calls += 1;
    });
    return buckets;
  }, [todayCalls]);

  // ── Per-interpreter stats ─────────────────────────────────────────────────
  const interpStats = useMemo(() => {
    const map = new Map<string, { count: number; ratings: number[] }>();
    todayCalls.forEach((c) => {
      if (!c.interpreter_id) return;
      const e = map.get(c.interpreter_id) ?? { count: 0, ratings: [] };
      e.count += 1;
      if (typeof c.rating === "number") e.ratings.push(c.rating);
      map.set(c.interpreter_id, e);
    });
    return map;
  }, [todayCalls]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-linear-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/20">
          <Headphones className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Interpreter Monitoring</h1>
          <p className="text-sm text-muted-foreground">
            Live calls, interpreter availability and today's performance.
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Activity}
          label="Total calls today"
          value={String(kpis.total)}
          tone="from-indigo-500/15 to-indigo-500/5 text-indigo-500"
          loading={loading}
        />
        <KpiCard
          icon={CheckCircle2}
          label="Completed"
          value={String(kpis.completed)}
          tone="from-emerald-500/15 to-emerald-500/5 text-emerald-500"
          loading={loading}
        />
        <KpiCard
          icon={Timer}
          label="Avg duration"
          value={fmtDuration(kpis.avgDur)}
          tone="from-amber-500/15 to-amber-500/5 text-amber-500"
          loading={loading}
        />
        <KpiCard
          icon={TrendingUp}
          label="Minutes billed"
          value={kpis.totalMin.toLocaleString()}
          tone="from-rose-500/15 to-rose-500/5 text-rose-500"
          loading={loading}
        />
      </div>

      {/* Section 1: Live calls */}
      <Card className="overflow-hidden border-border/60">
        <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 bg-linear-to-b from-muted/40 to-transparent">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500/60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <CardTitle className="text-base">Live calls</CardTitle>
            <Badge variant="secondary" className="ml-1">
              {calls.length}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">Real-time</span>
        </CardHeader>
        <CardContent className="p-4">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : calls.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-muted">
                <PhoneOff className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No active calls right now</p>
              <p className="text-xs text-muted-foreground">
                Incoming and ongoing calls will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {calls.map((c) => (
                <LiveCallCard key={c.id} call={c} tick={tick} onView={() => setSelectedCall(c)} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: Interpreter availability */}
      <Card className="border-border/60">
        <CardHeader className="border-b border-border/60">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Interpreter availability</CardTitle>
            <Badge variant="secondary">{interpreters.length}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : interpreters.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No interpreters configured yet.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {interpreters.map((u) => {
                const stat = interpStats.get(u.id);
                const avg =
                  stat && stat.ratings.length > 0
                    ? stat.ratings.reduce((a, b) => a + b, 0) / stat.ratings.length
                    : null;
                const meta = AVAIL_META[u.availability_status ?? "offline"] ?? AVAIL_META.offline;
                const initial = (u.full_name?.[0] ?? u.email?.[0] ?? "I").toUpperCase();
                return (
                  <div
                    key={u.id}
                    className="group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 transition-shadow hover:shadow-md"
                  >
                    <div
                      className={cn(
                        "absolute inset-x-0 top-0 h-0.5",
                        u.availability_status === "online"
                          ? "bg-linear-to-r from-emerald-500 via-emerald-400 to-emerald-500"
                          : u.availability_status === "busy"
                            ? "bg-rose-500/70"
                            : u.availability_status === "away"
                              ? "bg-amber-500/70"
                              : "bg-border",
                      )}
                    />
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="h-11 w-11 ring-2 ring-border">
                          <AvatarFallback className="bg-linear-to-br from-primary/30 to-primary/10 text-sm font-semibold">
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={cn(
                            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card",
                            meta.dot,
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-sm font-semibold">{u.full_name ?? u.email}</p>
                          <Badge variant="outline" className={cn("border", meta.chip)}>
                            {meta.label}
                          </Badge>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {(u.interpreter_languages ?? []).slice(0, 4).map((p, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium"
                        >
                          <span>{langFlag(p.from)}</span>
                          <span className="text-muted-foreground">→</span>
                          <span>{langFlag(p.to)}</span>
                        </span>
                      ))}
                      {(u.interpreter_languages?.length ?? 0) === 0 && (
                        <span className="text-[11px] text-muted-foreground">No languages set</span>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        <span className="font-medium text-foreground">{stat?.count ?? 0}</span>{" "}
                        today
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        <span className="font-medium text-foreground">
                          {avg !== null ? avg.toFixed(1) : "—"}
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 3: Hourly chart */}
      <Card className="border-border/60">
        <CardHeader className="border-b border-border/60">
          <CardTitle className="text-base">Calls per hour — today</CardTitle>
        </CardHeader>
        <CardContent className="h-72 pt-4">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly}>
                <defs>
                  <linearGradient id="callsBar" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.15} />
                <XAxis
                  dataKey="hour"
                  stroke="currentColor"
                  strokeOpacity={0.4}
                  fontSize={11}
                  interval={1}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="currentColor"
                  strokeOpacity={0.4}
                  fontSize={11}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="calls" fill="url(#callsBar)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selectedCall} onOpenChange={(o) => !o && setSelectedCall(null)}>
        <DialogContent className="max-w-md">
          {selectedCall && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-block h-2 w-2 rounded-full",
                      STATUS_META[selectedCall.status].dot,
                    )}
                  />
                  Call details
                </DialogTitle>
                <DialogDescription>Live interpreter call overview.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <DetailRow label="Client" value={selectedCall.client?.full_name ?? "—"} />
                <DetailRow
                  label="Interpreter"
                  value={selectedCall.interpreter?.full_name ?? "Unassigned"}
                />
                <DetailRow
                  label="Language pair"
                  value={
                    <span className="flex items-center gap-2">
                      <span>
                        {langFlag(selectedCall.language_from)}{" "}
                        {langLabel(selectedCall.language_from)}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span>
                        {langFlag(selectedCall.language_to)} {langLabel(selectedCall.language_to)}
                      </span>
                    </span>
                  }
                />
                <DetailRow
                  label="Status"
                  value={
                    <Badge className={cn("border", STATUS_META[selectedCall.status].chip)}>
                      {STATUS_META[selectedCall.status].label}
                    </Badge>
                  }
                />
                <DetailRow
                  label="Duration"
                  value={
                    <span className="font-mono">
                      {fmtDuration(
                        selectedCall.answered_at
                          ? (Date.now() - new Date(selectedCall.answered_at).getTime()) / 1000
                          : 0,
                      )}
                    </span>
                  }
                />
                <DetailRow
                  label="Started"
                  value={new Date(selectedCall.created_at).toLocaleString()}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
  loading,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  tone: string;
  loading: boolean;
}) {
  return (
    <Card className="relative overflow-hidden border-border/60">
      <div className={cn("absolute inset-0 bg-linear-to-br opacity-60", tone)} />
      <CardContent className="relative p-5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <div
            className={cn(
              "grid h-8 w-8 place-items-center rounded-lg bg-background/70 backdrop-blur",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4",
                tone.split(" ").find((c) => c.startsWith("text-")),
              )}
            />
          </div>
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums">
          {loading ? <span className="text-muted-foreground">—</span> : value}
        </p>
      </CardContent>
    </Card>
  );
}

function LiveCallCard({
  call,
  tick,
  onView,
}: {
  call: LiveCall;
  tick: number;
  onView: () => void;
}) {
  const meta = STATUS_META[call.status];
  const Icon = meta.icon;
  const duration = call.answered_at
    ? (Date.now() - new Date(call.answered_at).getTime()) / 1000
    : 0;
  // tick is read so the timer re-renders every second
  void tick;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4 transition-shadow hover:shadow-lg",
        call.status === "active" && "ring-1",
        call.status === "active" && meta.ring,
      )}
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-0.5",
          call.status === "active"
            ? "bg-linear-to-r from-emerald-500 via-emerald-300 to-emerald-500"
            : call.status === "ringing"
              ? "bg-linear-to-r from-blue-500 via-blue-300 to-blue-500"
              : "bg-amber-500/70",
        )}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-muted">
            <Icon className="h-4 w-4" />
            {call.status === "ringing" && (
              <span className="absolute inset-0 animate-ping rounded-lg bg-blue-500/30" />
            )}
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight">
              {call.client?.full_name ?? "Client"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              with {call.interpreter?.full_name ?? "Unassigned"}
            </p>
          </div>
        </div>
        <Badge className={cn("border", meta.chip)}>{meta.label}</Badge>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs">
        <span className="flex items-center gap-1.5">
          <span>{langFlag(call.language_from)}</span>
          <span className="font-medium">{langLabel(call.language_from)}</span>
          <span className="text-muted-foreground">→</span>
          <span>{langFlag(call.language_to)}</span>
          <span className="font-medium">{langLabel(call.language_to)}</span>
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span className="font-mono tabular-nums text-foreground">{fmtDuration(duration)}</span>
        </span>
        <Button size="sm" variant="outline" onClick={onView}>
          View
        </Button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}
