import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Headphones,
  Phone,
  DollarSign,
  Clock,
  PhoneCall,
  Star,
  ArrowRight,
  CalendarClock,
  Video,
  MapPin,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { logAudit } from "@/lib/audit";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getStaffEarningsThisMonth,
  getStaffEarningsHistory,
  type StaffEarnings,
  type EarningsHistoryRow,
} from "@/lib/pricing/earnings";

export const Route = createFileRoute("/staff/interpreter/")({
  component: LiveCallsPage,
});

interface ActiveCall {
  id: string;
  language_from: string;
  language_to: string;
  status: "ringing" | "active" | "on_hold";
  client: { full_name: string | null } | { full_name: string | null }[] | null;
}

const STATUS_VARIANT: Record<ActiveCall["status"], { label: string; className: string }> = {
  ringing: { label: "Ringing", className: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
  active: { label: "Active", className: "bg-green-500/15 text-green-700 dark:text-green-300" },
  on_hold: { label: "On Hold", className: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function LiveCallsPage() {
  const { profile } = useAuth();
  const [calls, setCalls] = useState<ActiveCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [earnings, setEarnings] = useState<StaffEarnings | null>(null);
  const [history, setHistory] = useState<EarningsHistoryRow[]>([]);
  const [earningsLoading, setEarningsLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;

    const fetchActive = async () => {
      const { data, error } = await supabase
        .from("interpreter_calls")
        .select("id,language_from,language_to,status,client:users!client_id(full_name)")
        .eq("interpreter_id", profile.id)
        .in("status", ["ringing", "active", "on_hold"])
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (!error) setCalls((data ?? []) as unknown as ActiveCall[]);
      setLoading(false);
    };
    void fetchActive();

    const fetchEarnings = async () => {
      try {
        const [e, h] = await Promise.all([
          getStaffEarningsThisMonth(profile.id),
          getStaffEarningsHistory(profile.id, 10),
        ]);
        if (cancelled) return;
        setEarnings(e);
        setHistory(h);
      } catch {
        // earnings best-effort
      } finally {
        if (!cancelled) setEarningsLoading(false);
      }
    };
    void fetchEarnings();

    const channel = supabase
      .channel("staff-live-calls:" + profile.id)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "interpreter_calls",
          filter: `interpreter_id=eq.${profile.id}`,
        },
        () => void fetchActive(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Headphones className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Calls</h1>
          <p className="text-sm text-muted-foreground">
            Your active and completed interpreter calls
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={<PhoneCall className="h-4 w-4" />}
          label="Total Calls"
          value={earnings?.callCount ?? 0}
          loading={earningsLoading}
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Total Minutes"
          value={earnings ? `${earnings.totalMinutes} min` : "0 min"}
          loading={earningsLoading}
        />
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          label="Total Earned"
          value={earnings ? `$${earnings.totalEarned.toFixed(2)}` : "$0.00"}
          loading={earningsLoading}
          highlight
        />
      </div>

      {/* Earnings summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4 text-primary" />
            Your Earnings This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          {earningsLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : earnings ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 text-sm">
                <Row
                  label="Rate per minute (set by admin)"
                  value={`$${earnings.ratePerMinute.toFixed(2)}`}
                />
                <Row label="Calls handled" value={String(earnings.callCount)} />
                <Row label="Minutes" value={`${earnings.totalMinutes} min`} />
                <Row label="Total earned" value={`$${earnings.totalEarned.toFixed(2)}`} bold />
              </div>
              <div className="flex flex-col justify-between gap-3 rounded-lg border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">
                  Earnings update automatically after each completed call. Rate is set by the admin
                  and applies to all interpreters.
                </p>
                <Button variant="outline" size="sm" className="w-fit" asChild>
                  <Link to="/staff/interpreter">
                    View detailed history <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No earnings data yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Active calls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4 text-primary" />
            Active Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ) : calls.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
                <Phone className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No active calls right now.</p>
              <p className="text-xs text-muted-foreground">
                Incoming calls will appear as an overlay notification.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {calls.map((call) => {
                const meta = STATUS_VARIANT[call.status];
                const clientObj = Array.isArray(call.client) ? call.client[0] : call.client;
                const clientName = clientObj?.full_name ?? "Client";
                return (
                  <div key={call.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{clientName}</p>
                      <Badge className={meta.className}>{meta.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {call.language_from} → {call.language_to}
                    </p>
                    <Button asChild size="sm" className="w-full gap-1.5">
                      <Link to="/staff/interpreter/$callId" params={{ callId: call.id }}>
                        <Phone className="h-3.5 w-3.5" /> Join Call
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ScheduledBookingsCard />



      {/* Recent calls history */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-primary" />
            Recent Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          {earningsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : history.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No completed calls yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="text-right">Earned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtDate(row.created_at)}
                      </TableCell>
                      <TableCell className="text-sm">{row.client_name ?? "—"}</TableCell>
                      <TableCell className="text-sm tabular-nums">
                        {row.durationMinutes} min
                      </TableCell>
                      <TableCell>
                        {row.rating != null ? (
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={
                                  "h-3 w-3 " +
                                  (i < row.rating!
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted-foreground/30")
                                }
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium tabular-nums">
                        ${row.earnedUsd.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  loading,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  loading?: boolean;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/40 bg-primary/5" : undefined}>
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={
            "grid h-10 w-10 place-items-center rounded-lg " +
            (highlight ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")
          }
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-5 w-16" />
          ) : (
            <p className="text-lg font-bold tabular-nums">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b py-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={"tabular-nums " + (bold ? "font-bold text-foreground" : "")}>{value}</span>
    </div>
  );
}

// ── Scheduled Bookings (staff management) ────────────────────────────────────
interface BookingRow {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  language_from: string;
  language_to: string;
  booking_type: "remote" | "onsite";
  status: "pending" | "confirmed" | "rejected" | "cancelled" | "completed";
  location_type: string | null;
  location_address: string | null;
  location_notes: string | null;
  client_notes: string | null;
  client: { full_name: string | null; email: string | null } | null;
}

type Tab = "pending" | "confirmed" | "all";

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay() === 0 ? 6 : x.getDay() - 1;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function ScheduledBookingsCard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<BookingRow[] | null>(null);
  const [tab, setTab] = useState<Tab>("pending");
  const [rejecting, setRejecting] = useState<BookingRow | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("interpreter_bookings")
      .select(
        "id,scheduled_at,duration_minutes,language_from,language_to,booking_type,status,location_type,location_address,location_notes,client_notes,client:users!client_id(full_name,email)",
      )
      .order("scheduled_at", { ascending: true })
      .limit(200);
    setRows((data ?? []) as unknown as BookingRow[]);
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = (rows ?? []).filter((r) => {
    if (tab === "pending") return r.status === "pending";
    if (tab === "confirmed") return r.status === "confirmed";
    return true;
  });

  const pendingCount = (rows ?? []).filter((r) => r.status === "pending").length;
  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const isThisWeek = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= weekStart.getTime() && t < weekEnd.getTime();
  };
  const remoteWeek = (rows ?? []).filter(
    (r) => r.booking_type === "remote" && isThisWeek(r.scheduled_at) && r.status !== "cancelled",
  ).length;
  const onsiteWeek = (rows ?? []).filter(
    (r) => r.booking_type === "onsite" && isThisWeek(r.scheduled_at) && r.status !== "cancelled",
  ).length;

  const confirm = async (b: BookingRow) => {
    if (!user) return;
    setBusyId(b.id);
    const { error } = await supabase
      .from("interpreter_bookings")
      .update({
        status: "confirmed",
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", b.id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success("Booking confirmed");
    void logAudit({
      action: "booking_confirmed",
      target_type: "interpreter_booking",
      target_id: b.id,
      metadata: { booking_type: b.booking_type, scheduled_at: b.scheduled_at },
    });
    void load();
  };

  const submitReject = async () => {
    if (!rejecting || !user || !rejectReason.trim()) return;
    setBusyId(rejecting.id);
    const { error } = await supabase
      .from("interpreter_bookings")
      .update({ status: "rejected", rejection_reason: rejectReason.trim() })
      .eq("id", rejecting.id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success("Booking rejected");
    void logAudit({
      action: "booking_rejected",
      target_type: "interpreter_booking",
      target_id: rejecting.id,
      metadata: { reason: rejectReason.trim() },
    });
    setRejecting(null);
    setRejectReason("");
    void load();
  };

  const complete = async (b: BookingRow) => {
    setBusyId(b.id);
    const { error } = await supabase
      .from("interpreter_bookings")
      .update({ status: "completed" })
      .eq("id", b.id);
    setBusyId(null);
    if (error) return toast.error(error.message);
    toast.success("Marked completed");
    void logAudit({
      action: "booking_completed",
      target_type: "interpreter_booking",
      target_id: b.id,
      metadata: {},
    });
    void load();
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("en-GB", {
      timeZone: "Africa/Kigali",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4 text-primary" />
            Scheduled Bookings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              icon={<CalendarClock className="h-4 w-4" />}
              label="Pending"
              value={pendingCount}
              highlight={pendingCount > 0}
            />
            <StatCard
              icon={<Video className="h-4 w-4" />}
              label="Remote this week"
              value={remoteWeek}
            />
            <StatCard
              icon={<MapPin className="h-4 w-4" />}
              label="On-site this week"
              value={onsiteWeek}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(["pending", "confirmed", "all"] as Tab[]).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={tab === t ? "default" : "outline"}
                onClick={() => setTab(t)}
                className="capitalize"
              >
                {t}
                {t === "pending" && pendingCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 text-xs text-amber-700 dark:text-amber-300">
                    {pendingCount}
                  </span>
                )}
              </Button>
            ))}
          </div>

          {rows == null ? (
            <Skeleton className="h-32 w-full" />
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No bookings to show.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Language Pair</TableHead>
                    <TableHead>Date &amp; Time (CAT)</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b) => {
                    const remote = b.booking_type === "remote";
                    const past = new Date(b.scheduled_at).getTime() < Date.now();
                    return (
                      <TableRow key={b.id}>
                        <TableCell>
                          <Badge
                            className={cn(
                              "gap-1",
                              remote
                                ? "bg-purple-500/15 text-purple-700 dark:text-purple-300"
                                : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                            )}
                          >
                            {remote ? (
                              <Video className="h-3 w-3" />
                            ) : (
                              <MapPin className="h-3 w-3" />
                            )}
                            {remote ? "Remote" : "On-Site"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {b.client?.full_name ?? b.client?.email ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {b.language_from.toUpperCase()} → {b.language_to.toUpperCase()}
                        </TableCell>
                        <TableCell className="text-sm">{fmt(b.scheduled_at)}</TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {b.duration_minutes >= 60
                            ? `${(b.duration_minutes / 60).toFixed(
                                b.duration_minutes % 60 === 0 ? 0 : 1,
                              )} hr`
                            : `${b.duration_minutes} min`}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                          {remote
                            ? "—"
                            : `${b.location_type ?? ""}${
                                b.location_address ? " · " + b.location_address : ""
                              }`}
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate text-xs text-muted-foreground">
                          {b.client_notes ?? b.location_notes ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {b.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {b.status === "pending" && (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                                disabled={busyId === b.id}
                                onClick={() => void confirm(b)}
                              >
                                <Check className="h-3.5 w-3.5" /> Confirm
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/40"
                                disabled={busyId === b.id}
                                onClick={() => {
                                  setRejecting(b);
                                  setRejectReason("");
                                }}
                              >
                                <X className="h-3.5 w-3.5" /> Reject
                              </Button>
                            </div>
                          )}
                          {b.status === "confirmed" && past && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === b.id}
                              onClick={() => void complete(b)}
                            >
                              Mark Completed
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject booking</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Please provide a reason. The client will see this message.
          </p>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. No interpreter available for that time slot."
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => void submitReject()}
              disabled={!rejectReason.trim() || busyId === rejecting?.id}
            >
              Reject booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
