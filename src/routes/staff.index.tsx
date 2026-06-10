import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Star,
  ClipboardList,
  Clock,
  CheckCircle2,
  MessageSquare,
  Zap,
  FolderOpen,
  Calendar as CalendarIcon,
  Phone,
  Plus,
  UserPlus,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useCapabilities } from "@/lib/staff/capability-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/lib/dashboard/status-badge";
import { useI18n } from "@/lib/providers/i18n-provider";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff/")({ component: StaffHome });

type CategoryKey = "visa" | "accounting" | "consultancy" | "translation";
const CAP_TO_CAT: Record<string, CategoryKey> = {
  handle_visa: "visa",
  handle_accounting: "accounting",
  handle_consultancy: "consultancy",
  handle_translation: "translation",
};

interface Row {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  assigned_staff_id: string | null;
  service_category: string;
  progress_step?: number | null;
  progress_total?: number | null;
  client: { full_name: string | null } | null;
  service: { name_en: string } | null;
  basePath: string;
}

interface RecentCallRow {
  id: string;
  language_from: string;
  language_to: string;
  billed_seconds: number;
  ended_at: string | null;
  rating: number | null;
  client: { full_name: string | null } | { full_name: string | null }[] | null;
}

const fmtSeconds = (s: number) => {
  const m = Math.floor(Math.max(0, s) / 60);
  const sec = Math.max(0, s) % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const clientFirstName = (client: RecentCallRow["client"]) => {
  const obj = Array.isArray(client) ? client[0] : client;
  return obj?.full_name?.split(" ")[0] ?? "—";
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3.5 w-3.5",
            i < rating ? "fill-amber-400 text-amber-400" : "fill-muted text-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}

const FLAG: Record<string, string> = { en: "🇬🇧", zh: "🇨🇳", fr: "🇫🇷", rw: "🇷🇼", sw: "🇰🇪" };

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  to,
  loading,
}: {
  icon: typeof ClipboardList;
  label: string;
  value: number | string;
  tone: "blue" | "amber" | "green" | "violet";
  to?: string;
  loading?: boolean;
}) {
  const tones = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  } as const;
  const Inner = (
    <Card className="transition hover:shadow-md hover:-translate-y-0.5">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          {loading ? (
            <Skeleton className="h-7 w-12" />
          ) : (
            <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
          )}
          <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
  return to ? (
    <Link to={to as never} className="block">
      {Inner}
    </Link>
  ) : (
    Inner
  );
}

function StaffHome() {
  const { user, profile } = useAuth();
  const { capabilities, hasCapability } = useCapabilities();
  const { t } = useI18n();
  const canHandleCalls = hasCapability("handle_live_calls");

  const [today, setToday] = useState<Row[]>([]);
  const [pending, setPending] = useState<Row[]>([]);
  const [recent, setRecent] = useState<Row[]>([]);
  const [weekRows, setWeekRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentCalls, setRecentCalls] = useState<RecentCallRow[]>([]);
  const [completedToday, setCompletedToday] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [awaitingClient, setAwaitingClient] = useState(0);

  const myCats = useMemo(
    () => capabilities.filter((c) => CAP_TO_CAT[c]).map((c) => CAP_TO_CAT[c]),
    [capabilities],
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const startOfWeek = (() => {
          const d = new Date();
          const day = (d.getDay() + 6) % 7;
          d.setDate(d.getDate() - day);
          d.setHours(0, 0, 0, 0);
          return d;
        })();
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 7);

        const sel =
          "id,status,created_at,updated_at,assigned_staff_id,service_category,progress_step,progress_total,client:users(full_name),service:services(name_en)";

        const orParts: string[] = [`assigned_staff_id.eq.${user.id}`];
        if (myCats.length > 0) {
          orParts.push(`and(assigned_staff_id.is.null,service_category.in.(${myCats.join(",")}))`);
        }
        const [todayQ, pendingQ, weekQ, recentQ, doneQ, msgQ, awaitQ] = await Promise.all([
          supabase
            .from("service_requests")
            .select(sel)
            .not("status", "in", "(completed,rejected,cancelled)")
            .or(orParts.join(","))
            .or(`created_at.gte.${todayStr},updated_at.gte.${todayStr}`)
            .order("updated_at", { ascending: false })
            .limit(10),
          supabase
            .from("service_requests")
            .select(sel)
            .eq("assigned_staff_id", user.id)
            .in("status", ["awaiting_client", "under_review"])
            .order("updated_at", { ascending: false })
            .limit(20),
          supabase
            .from("service_requests")
            .select(sel)
            .eq("assigned_staff_id", user.id)
            .gte("updated_at", startOfWeek.toISOString())
            .lt("updated_at", endOfWeek.toISOString()),
          supabase
            .from("service_requests")
            .select(sel)
            .eq("assigned_staff_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(5),
          supabase
            .from("service_requests")
            .select("id", { count: "exact", head: true })
            .eq("assigned_staff_id", user.id)
            .eq("status", "completed")
            .gte("updated_at", `${todayStr}T00:00:00`),
          supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false),
          supabase
            .from("service_requests")
            .select("id", { count: "exact", head: true })
            .eq("assigned_staff_id", user.id)
            .eq("status", "awaiting_client"),
        ]);

        if (cancelled) return;
        const mapRow = (r: Record<string, unknown>): Row => ({
          ...(r as unknown as Row),
          basePath: `/staff/${r.service_category as string}`,
        });
        setToday(((todayQ.data ?? []) as Record<string, unknown>[]).map(mapRow));
        setPending(((pendingQ.data ?? []) as Record<string, unknown>[]).map(mapRow));
        setWeekRows(((weekQ.data ?? []) as Record<string, unknown>[]).map(mapRow));
        setRecent(((recentQ.data ?? []) as Record<string, unknown>[]).map(mapRow));
        setCompletedToday(doneQ.count ?? 0);
        setUnreadMsgs(msgQ.count ?? 0);
        setAwaitingClient(awaitQ.count ?? 0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, myCats]);

  useEffect(() => {
    if (!canHandleCalls || !profile?.id) return;
    void (async () => {
      const { data } = await supabase
        .from("interpreter_calls")
        .select(
          "id,language_from,language_to,billed_seconds,ended_at,rating,client:users!client_id(full_name)",
        )
        .eq("interpreter_id", profile.id)
        .eq("status", "completed")
        .order("ended_at", { ascending: false })
        .limit(5);
      if (data) setRecentCalls(data as unknown as RecentCallRow[]);
    })();
  }, [profile?.id, canHandleCalls]);

  const greet = (() => {
    const h = new Date().getHours();
    if (h < 12) return t("staff.home.morning");
    if (h < 18) return t("staff.home.afternoon");
    return t("staff.home.evening");
  })();

  const week = useMemo(() => {
    const d = new Date();
    const day = (d.getDay() + 6) % 7;
    const monday = new Date(d);
    monday.setDate(monday.getDate() - day);
    monday.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(monday);
      x.setDate(x.getDate() + i);
      return x;
    });
  }, []);

  const todayKey = new Date().toISOString().slice(0, 10);
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
              {greet}, {firstName}! 👋
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {profile?.role}
              </Badge>
              <Badge variant="secondary">
                {capabilities.length} {t("staff.home.activeCapabilities")}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border bg-background/60 px-3 py-2 text-sm backdrop-blur">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="font-medium">{t("staff.home.online")}</span>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ClipboardList}
          label={t("staff.home.casesToday")}
          value={today.length}
          tone="blue"
          loading={loading}
        />
        <StatCard
          icon={Clock}
          label={t("staff.home.pending")}
          value={pending.length}
          tone="amber"
          loading={loading}
        />
        <StatCard
          icon={CheckCircle2}
          label={t("staff.home.completedToday")}
          value={completedToday}
          tone="green"
          loading={loading}
        />
        <StatCard
          icon={MessageSquare}
          label={t("staff.home.messages")}
          value={unreadMsgs}
          tone="violet"
          to="/staff/messages"
          loading={loading}
        />
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {/* Today queue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4 text-primary" />
                {t("staff.home.todaysQueue")}
              </CardTitle>
              <Badge variant="secondary">{today.length}</Badge>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-24 w-full" />
              ) : today.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {t("staff.home.queueEmpty")} ✅
                </p>
              ) : (
                <ul className="divide-y">
                  {today.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 py-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {initials(r.client?.full_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {r.client?.full_name ?? "—"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.service?.name_en}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                      <Button asChild size="sm" variant="ghost">
                        <Link to={`${r.basePath}/${r.id}` as never}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Pending actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-amber-500" />
                {t("staff.home.pendingActions")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <>
                  <Link
                    to="/staff/visa"
                    className="flex items-center justify-between rounded-md border-l-4 border-amber-500 bg-amber-500/5 px-3 py-2 text-sm transition hover:bg-amber-500/10"
                  >
                    <span>
                      <span className="font-semibold">{pending.length}</span>{" "}
                      {t("staff.home.casesAwaitingReview")}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                  <Link
                    to="/staff/messages"
                    className="flex items-center justify-between rounded-md border-l-4 border-orange-500 bg-orange-500/5 px-3 py-2 text-sm transition hover:bg-orange-500/10"
                  >
                    <span>
                      <span className="font-semibold">{awaitingClient}</span>{" "}
                      {t("staff.home.clientsAwaitingResponse")}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                  <Link
                    to="/staff/messages"
                    className="flex items-center justify-between rounded-md border-l-4 border-violet-500 bg-violet-500/5 px-3 py-2 text-sm transition hover:bg-violet-500/10"
                  >
                    <span>
                      <span className="font-semibold">{unreadMsgs}</span>{" "}
                      {t("staff.home.unreadNotifications")}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </>
              )}
            </CardContent>
          </Card>

          {/* Recent cases */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderOpen className="h-4 w-4 text-primary" />
                {t("staff.home.recentCases")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : recent.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {t("staff.home.noRecentCases")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {recent.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border p-3 transition hover:bg-muted/40"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {initials(r.client?.full_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {r.client?.full_name ?? "—"} ·{" "}
                          <span className="text-muted-foreground">{r.service?.name_en}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.updated_at ?? r.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                          {r.progress_total
                            ? ` · ${t("staff.home.step")} ${r.progress_step ?? 0}/${r.progress_total}`
                            : ""}
                        </p>
                      </div>
                      <StatusBadge status={r.status} />
                      <Button asChild size="sm" variant="outline">
                        <Link to={`${r.basePath}/${r.id}` as never}>{t("staff.home.open")}</Link>
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarIcon className="h-4 w-4 text-primary" />
                {t("staff.home.thisWeek")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1">
                {week.map((d) => {
                  const key = d.toISOString().slice(0, 10);
                  const dayRows = weekRows.filter(
                    (r) => (r.updated_at ?? "").slice(0, 10) === key,
                  );
                  const isToday = key === todayKey;
                  return (
                    <div
                      key={key}
                      className={cn(
                        "flex min-h-20 flex-col rounded-md border p-1.5 text-xs",
                        isToday && "border-primary bg-primary/5 ring-1 ring-primary/30",
                      )}
                    >
                      <div className={cn("font-medium", isToday && "text-primary")}>
                        {d.toLocaleDateString(undefined, { weekday: "short" })}
                      </div>
                      <div className="text-muted-foreground">{d.getDate()}</div>
                      <div className="mt-auto flex flex-wrap gap-0.5">
                        {Array.from({ length: Math.min(dayRows.length, 5) }).map((_, i) => (
                          <span
                            key={i}
                            className="inline-block h-1.5 w-1.5 rounded-full bg-primary"
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {weekRows.filter((r) => (r.updated_at ?? "").slice(0, 10) === todayKey).length}{" "}
                {t("staff.home.casesHandledToday")}
              </p>
            </CardContent>
          </Card>

          {canHandleCalls && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Phone className="h-4 w-4 text-primary" />
                  {t("staff.home.recentCalls")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentCalls.length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    {t("staff.home.noCalls")}
                  </p>
                ) : (
                  <ul className="divide-y text-sm">
                    {recentCalls.map((row) => (
                      <li key={row.id} className="flex items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{clientFirstName(row.client)}</p>
                          <p className="text-xs text-muted-foreground">
                            {FLAG[row.language_from] ?? row.language_from} →{" "}
                            {FLAG[row.language_to] ?? row.language_to}
                          </p>
                        </div>
                        <div className="shrink-0 text-right text-xs">
                          <p className="tabular-nums">{fmtSeconds(row.billed_seconds)}</p>
                          <p className="text-muted-foreground">
                            {row.ended_at
                              ? new Date(row.ended_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "—"}
                          </p>
                        </div>
                        {row.rating != null && <Stars rating={row.rating} />}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <Card className="border-dashed">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm font-medium text-muted-foreground">
            {t("staff.home.quickActions")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link to="/staff/clients/new">
                <Plus className="mr-1.5 h-4 w-4" />
                {t("staff.home.newCase")}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/staff/clients/new">
                <UserPlus className="mr-1.5 h-4 w-4" />
                {t("staff.home.registerClient")}
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/staff/visa">
                <FolderOpen className="mr-1.5 h-4 w-4" />
                {t("staff.home.viewAllCases")}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
