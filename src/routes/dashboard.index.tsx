import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Sparkles,
  FolderOpen,
  MessageCircle,
  LayoutGrid,
  Bell,
  Plane,
  Calculator,
  Languages,
  Briefcase,
  FileText,
  RefreshCw,
  DollarSign,
  Mic,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";
import { supabase } from "@/lib/supabase";
import { intentLabel } from "@/lib/auth/intent-labels";
import { relativeTime } from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ServiceMeta {
  name_en: string;
  name_zh: string | null;
  name_rw: string | null;
  category?: string | null;
}

interface ActiveService {
  id: string;
  status: string;
  progress_step: number;
  progress_total: number;
  updated_at: string;
  services: ServiceMeta | null;
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export const Route = createFileRoute("/dashboard/")({
  validateSearch: (s: Record<string, unknown>) => ({
    intent: typeof s.intent === "string" ? s.intent : undefined,
  }),
  component: DashboardHome,
});

function DashboardHome() {
  const { user, profile } = useAuth();
  const { t, locale } = useI18n();
  const [active, setActive] = useState<ActiveService[] | null>(null);
  const [counts, setCounts] = useState<{ docs: number; messages: number; claims: number } | null>(
    null,
  );
  const [expiring, setExpiring] = useState<
    | { id: string; visa_expiry_date: string; services: { name_en: string } | null }[]
    | null
  >(null);
  const [notifications, setNotifications] = useState<NotificationItem[] | null>(null);
  const [hasInterpreter, setHasInterpreter] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);

  const tpl = (key: string, vars: Record<string, string | number> = {}) =>
    Object.entries(vars).reduce<string>(
      (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
      t(key),
    );

  useEffect(() => {
    if (!user) return;
    (async () => {

      try {
        const { data, error } = await supabase
          .from("service_requests")
          .select(
            "id,status,progress_step,progress_total,updated_at,services(name_en,name_zh,name_rw,category)",
          )
          .eq("client_id", user.id)
          .not("status", "in", "(completed,rejected,cancelled)")
          .order("updated_at", { ascending: false });
        if (error) throw error;
        setActive((data as unknown as ActiveService[]) ?? []);
      } catch (e) {
        toast.error((e as Error).message);
        setActive([]);
      }

      const [docs, claims, convs, notifs, interp] = await Promise.all([
        supabase
          .from("documents")
          .select("id", { count: "exact", head: true })
          .eq("client_id", user.id),
        supabase
          .from("claims")
          .select("id", { count: "exact", head: true })
          .eq("client_id", user.id)
          .in("status", ["open", "under_review"]),
        supabase.from("conversations").select("id").eq("client_id", user.id),
        supabase
          .from("notifications")
          .select("id,type,title,body,link,is_read,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("interpreter_calls")
          .select("id", { count: "exact", head: true })
          .eq("client_id", user.id),
      ]);

      let unread = 0;
      const convIds = ((convs.data ?? []) as { id: string }[]).map((c) => c.id);
      if (convIds.length) {
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .in("conversation_id", convIds)
          .eq("is_read", false)
          .neq("sender_id", user.id);
        unread = count ?? 0;
      }

      setCounts({
        docs: docs.count ?? 0,
        messages: unread,
        claims: claims.count ?? 0,
      });
      setNotifications((notifs.data ?? []) as NotificationItem[]);
      setHasInterpreter((interp.count ?? 0) > 0);

      try {
        const horizon = new Date();
        horizon.setDate(horizon.getDate() + 90);
        const { data: exp } = await supabase
          .from("service_requests")
          .select("id,visa_expiry_date,services(name_en)")
          .eq("client_id", user.id)
          .not("visa_expiry_date", "is", null)
          .lte("visa_expiry_date", horizon.toISOString().slice(0, 10))
          .order("visa_expiry_date", { ascending: true });
        setExpiring((exp ?? []) as unknown as typeof expiring);
      } catch {
        setExpiring([]);
      }
    })();
  }, [user]);

  const today = new Date().toLocaleDateString(
    locale === "zh" ? "zh-CN" : locale === "rw" ? "rw-RW" : "en-US",
    { weekday: "long", year: "numeric", month: "long", day: "numeric" },
  );

  const localizedName = (s: ServiceMeta | null) =>
    !s ? "" : (locale === "zh" && s.name_zh) || (locale === "rw" && s.name_rw) || s.name_en;

  const firstName = (profile?.full_name ?? user?.email ?? "").split(" ")[0] || "there";

  return (
    <div className="space-y-6">
      {/* WELCOME HEADER */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-primary/5 to-transparent p-6 md:p-8 animate-fade-in">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
                👋 Welcome back, {firstName}!
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{today}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              to="/dashboard/my-services"
              value={active?.length ?? 0}
              label="Active"
              accent="blue"
              loading={active === null}
            />
            <StatCard
              to="/dashboard/documents"
              value={counts.docs}
              label="Documents"
              accent="purple"
            />
            <StatCard
              to="/dashboard/messages"
              value={counts.messages}
              label="Unread"
              accent="orange"
            />
            <StatCard
              to="/dashboard/claims"
              value={counts.claims}
              label="Claims"
              accent="red"
            />
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="grid gap-3 sm:grid-cols-3">
        <QuickAction
          to="/dashboard/services"
          icon={LayoutGrid}
          label="Browse Services"
          gradient="from-blue-500 to-blue-600"
        />
        <QuickAction
          to="/dashboard/documents"
          icon={FolderOpen}
          label="Upload Document"
          gradient="from-purple-500 to-purple-600"
        />
        <QuickAction
          to="/dashboard/messages"
          icon={MessageCircle}
          label="Talk to Support"
          gradient="from-emerald-500 to-emerald-600"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ACTIVE SERVICES */}
        <div className="space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Your Active Services{" "}
              {active && active.length > 0 && (
                <span className="text-muted-foreground">({active.length})</span>
              )}
            </h2>
            {active && active.length > 6 && (
              <Link
                to="/dashboard/my-services"
                className="text-sm font-medium text-primary hover:underline"
              >
                View all →
              </Link>
            )}
          </div>

          {active === null ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-44" />
              <Skeleton className="h-44" />
            </div>
          ) : active.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/10">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">{t("dashboard.home.empty.title")}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("dashboard.home.empty.desc")}
                  </p>
                </div>
                <Button asChild>
                  <Link to="/dashboard/services">{t("dashboard.home.empty.cta")}</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {active.slice(0, 6).map((s, i) => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  name={localizedName(s.services)}
                  delayMs={i * 50}
                />
              ))}
            </div>
          )}

          {/* INTERPRETER BANNER */}
          {hasInterpreter && (
            <Link
              to="/dashboard/interpreter"
              className="group relative block overflow-hidden rounded-xl border border-border bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-5 text-white transition-transform hover:scale-[1.01] animate-fade-in"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex items-center gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-white/15 backdrop-blur">
                  <Mic className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="text-base font-semibold">🎙️ Live Interpreter Available</div>
                  <div className="text-sm text-white/80">First 5 minutes FREE</div>
                </div>
                <div className="hidden items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-700 group-hover:bg-white/95 sm:flex">
                  Start a Call <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          )}
        </div>

        {/* NOTIFICATIONS */}
        {notifications.length > 0 && (
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Bell className="h-4 w-4 text-primary" /> Recent Activity
            </h2>
            <Card>
              <CardContent className="divide-y divide-border p-0">
                {notifications.map((n, i) => (
                  <NotificationRow key={n.id} n={n} delayMs={i * 50} />
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* REMINDERS */}
      {expiring.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 animate-fade-in">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-4 w-4" /> Reminders ({expiring.length})
            </h2>
            {expiring.length > 3 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRemindersOpen((v) => !v)}
                className="h-7 text-xs"
              >
                {remindersOpen ? (
                  <>
                    Hide <ChevronUp className="ml-1 h-3 w-3" />
                  </>
                ) : (
                  <>
                    Show all <ChevronDown className="ml-1 h-3 w-3" />
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {(remindersOpen ? expiring : expiring.slice(0, 3)).map((e) => {
              const days = Math.ceil(
                (new Date(e.visa_expiry_date).getTime() - Date.now()) / 86400000,
              );
              const urgent = days < 30;
              return (
                <div
                  key={e.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm",
                    urgent
                      ? "border-red-500/40 bg-red-500/10"
                      : "border-amber-500/40 bg-amber-500/10",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={urgent ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}>
                      {urgent ? "🔴" : "🟠"}
                    </span>
                    <span className="font-semibold">{e.services?.name_en ?? "Visa"}</span>
                    <span className="text-muted-foreground">
                      {days <= 0
                        ? "Expired"
                        : `expires in ${days} day${days === 1 ? "" : "s"}`}
                    </span>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <Link to="/dashboard/services">Renew →</Link>
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Sub-components ---------- */

const accentMap = {
  blue: {
    border: "border-l-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    glow: "hover:shadow-blue-500/20",
  },
  purple: {
    border: "border-l-purple-500",
    text: "text-purple-600 dark:text-purple-400",
    glow: "hover:shadow-purple-500/20",
  },
  orange: {
    border: "border-l-orange-500",
    text: "text-orange-600 dark:text-orange-400",
    glow: "hover:shadow-orange-500/20",
  },
  red: {
    border: "border-l-red-500",
    text: "text-red-600 dark:text-red-400",
    glow: "hover:shadow-red-500/20",
  },
} as const;

function useCountUp(target: number, duration = 700) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (target <= 0) {
      setN(0);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return n;
}

function StatCard({
  to,
  value,
  label,
  accent,
  loading,
}: {
  to: string;
  value: number;
  label: string;
  accent: keyof typeof accentMap;
  loading?: boolean;
}) {
  const a = accentMap[accent];
  const display = useCountUp(value);
  return (
    <Link
      to={to}
      className={cn(
        "group block rounded-xl border-l-4 border bg-card/80 p-4 backdrop-blur transition-all hover:-translate-y-0.5 hover:shadow-lg",
        a.border,
        a.glow,
      )}
    >
      <div className={cn("text-2xl font-bold md:text-3xl", a.text)}>
        {loading ? "—" : display}
      </div>
      <div className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </Link>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
  gradient,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  gradient: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r p-4 text-white shadow-sm transition-transform hover:scale-[1.02] hover:shadow-md",
        gradient,
      )}
    >
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-white/15 backdrop-blur">
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <ArrowRight className="h-4 w-4 opacity-70 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

const categoryIcon = (cat?: string | null) => {
  const c = (cat ?? "").toLowerCase();
  if (c.includes("visa") || c.includes("permit")) return Plane;
  if (c.includes("account")) return Calculator;
  if (c.includes("trans")) return Languages;
  if (c.includes("consult")) return Briefcase;
  return Sparkles;
};

const statusStyle = (status: string) => {
  switch (status) {
    case "submitted":
      return { label: "Submitted", color: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30", bar: "bg-blue-500", dot: "bg-blue-500" };
    case "under_review":
      return { label: "Under Review", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30", bar: "bg-amber-500", dot: "bg-amber-500" };
    case "awaiting_client":
      return { label: "Awaiting You", color: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30", bar: "bg-orange-500", dot: "bg-orange-500", pulse: true };
    case "verified":
    case "completed":
      return { label: "Approved", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", bar: "bg-emerald-500", dot: "bg-emerald-500" };
    case "rejected":
      return { label: "Rejected", color: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30", bar: "bg-red-500", dot: "bg-red-500" };
    case "free_consultation":
      return { label: "Free Consultation", color: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30", bar: "bg-purple-500", dot: "bg-purple-500" };
    default:
      return { label: status.replace(/_/g, " "), color: "bg-muted text-muted-foreground border-border", bar: "bg-primary", dot: "bg-muted-foreground" };
  }
};

function ServiceCard({
  service,
  name,
  delayMs,
}: {
  service: ActiveService;
  name: string;
  delayMs: number;
}) {
  const Icon = categoryIcon(service.services?.category);
  const st = statusStyle(service.status);
  const pct = Math.round((service.progress_step / Math.max(service.progress_total, 1)) * 100);
  return (
    <Card
      className={cn(
        "group overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg animate-fade-in",
        st.pulse && "ring-2 ring-orange-500/40 animate-[pulse_2.5s_ease-in-out_infinite]",
      )}
      style={{ animationDelay: `${delayMs}ms`, animationFillMode: "both" }}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{name}</div>
              <div className="text-xs text-muted-foreground capitalize">
                {service.services?.category ?? "Service"}
              </div>
            </div>
          </div>
          <Badge variant="outline" className={cn("shrink-0 gap-1.5", st.color)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", st.dot, st.pulse && "animate-pulse")} />
            {st.label}
          </Badge>
        </div>

        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Step {service.progress_step} of {service.progress_total}
            </span>
            <span className="font-medium">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Updated {new Date(service.updated_at).toLocaleDateString()}
          </span>
          <Link
            to="/dashboard/my-services/$id"
            params={{ id: service.id }}
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            View Details <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationRow({ n, delayMs }: { n: NotificationItem; delayMs: number }) {
  const Icon = (() => {
    if (n.type.includes("message")) return MessageCircle;
    if (n.type.includes("status")) return RefreshCw;
    if (n.type.includes("document")) return FileText;
    if (n.type.includes("payment")) return DollarSign;
    if (n.type.includes("interpreter")) return Mic;
    return Bell;
  })();
  const content = (
    <div
      className="flex items-start gap-3 p-3 transition-colors hover:bg-accent/50 animate-fade-in"
      style={{ animationDelay: `${delayMs}ms`, animationFillMode: "both" }}
    >
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{n.title}</div>
        {n.body && <div className="truncate text-xs text-muted-foreground">{n.body}</div>}
        <div className="mt-0.5 text-[11px] text-muted-foreground">{relativeTime(n.created_at)}</div>
      </div>
      {!n.is_read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}
    </div>
  );
  if (n.link) {
    return (
      <Link to={n.link} className="block">
        {content}
      </Link>
    );
  }
  return content;
}
