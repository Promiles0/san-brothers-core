import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Briefcase,
  Plane,
  Calculator,
  Languages,
  MessageSquare,
  Search,
  List,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/my-services/")({
  component: MyServicesList,
});

interface Row {
  id: string;
  status: string;
  service_category: string;
  progress_step: number;
  progress_total: number;
  created_at: string;
  updated_at: string;
  services: { name_en: string; name_zh: string | null; name_rw: string | null } | null;
}

const CATEGORY_FILTERS = ["all", "visa", "accounting", "consultancy", "translation"] as const;
type CategoryFilter = (typeof CATEGORY_FILTERS)[number];

const STATUS_CONFIG: Record<string, { label: string; dot: string; pulse: boolean }> = {
  submitted: { label: "Submitted", dot: "bg-blue-500", pulse: false },
  under_review: { label: "Under Review", dot: "bg-yellow-500", pulse: true },
  awaiting_client: { label: "Awaiting You", dot: "bg-orange-500", pulse: true },
  verified: { label: "Verified", dot: "bg-blue-600", pulse: false },
  submitted_to_authority: { label: "Submitted", dot: "bg-purple-500", pulse: false },
  completed: { label: "Approved", dot: "bg-green-500", pulse: false },
  rejected: { label: "Rejected", dot: "bg-red-500", pulse: false },
  cancelled: { label: "Cancelled", dot: "bg-gray-400", pulse: false },
  free_consultation: { label: "Free Consultation", dot: "bg-purple-400", pulse: false },
};

const CATEGORY_CONFIG: Record<
  string,
  {
    icon: React.ElementType;
    color: string;
    bg: string;
    border: string;
    text: string;
    label: string;
  }
> = {
  visa: {
    icon: Plane,
    color: "#3B82F6",
    bg: "bg-blue-500/10",
    border: "border-l-blue-500",
    text: "text-blue-600 dark:text-blue-400",
    label: "Visa",
  },
  accounting: {
    icon: Calculator,
    color: "#10B981",
    bg: "bg-emerald-500/10",
    border: "border-l-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "Accounting",
  },
  translation: {
    icon: Languages,
    color: "#8B5CF6",
    bg: "bg-violet-500/10",
    border: "border-l-violet-500",
    text: "text-violet-600 dark:text-violet-400",
    label: "Translation",
  },
  consultancy: {
    icon: Briefcase,
    color: "#F59E0B",
    bg: "bg-amber-500/10",
    border: "border-l-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    label: "Consultancy",
  },
};

const ACTIVE_STATUSES = [
  "submitted",
  "under_review",
  "awaiting_client",
  "verified",
  "submitted_to_authority",
];
const COMPLETED_STATUSES = ["completed"];
const CANCELLED_STATUSES = ["cancelled", "rejected"];

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status] ?? { label: status.replace(/_/g, " "), dot: "bg-gray-400", pulse: false }
  );
}

function getCatConfig(cat: string) {
  return CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG.visa;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
}

// ─────────── SERVICE CARD ───────────
function ServiceCard({ row, locale }: { row: Row; locale: string }) {
  const navigate = useNavigate();
  const catKey = row.service_category || "visa";
  const cat = getCatConfig(catKey);
  const status = getStatusConfig(row.status);
  const pct =
    row.progress_total > 0 ? Math.round((row.progress_step / row.progress_total) * 100) : 0;
  const isAwaiting = row.status === "awaiting_client";
  const name = !row.services
    ? "Service"
    : (locale === "zh" && row.services.name_zh) ||
      (locale === "rw" && row.services.name_rw) ||
      row.services.name_en;
  const Icon = cat.icon;

  return (
    <div
      className={`relative rounded-xl border-l-4 ${cat.border} bg-white dark:bg-gray-900 border border-l-4 border-gray-200 dark:border-gray-800 shadow-sm transition-all duration-200 hover:shadow-md overflow-hidden ${isAwaiting ? "ring-2 ring-orange-400/50 ring-offset-1 dark:ring-offset-gray-900 awaiting-pulse" : ""}`}
    >
      {/* Action required banner */}
      {isAwaiting && (
        <div className="bg-orange-500 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-white">
          Action Required
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${cat.bg}`}
            >
              <Icon className={`h-5 w-5 ${cat.text}`} />
            </div>
            <div>
              <div className="font-semibold text-gray-900 dark:text-white leading-tight">
                {name}
              </div>
              <div className={`text-xs font-medium ${cat.text}`}>{cat.label}</div>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200">
            <span
              className={`h-1.5 w-1.5 rounded-full ${status.dot} ${status.pulse ? "animate-pulse" : ""} flex-shrink-0`}
            />
            {status.label}
          </span>
        </div>

        {/* Progress */}
        <div className="mb-3">
          <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              Step {row.progress_step} of {row.progress_total}
            </span>
            <span className="font-semibold">{pct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: cat.color }}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <span>📅 Created: {formatDate(row.created_at)}</span>
          <span>🕐 Updated: {timeAgo(row.updated_at)}</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100 text-xs"
            asChild
          >
            <Link to="/dashboard/my-services/$id" params={{ id: row.id }}>
              View Details →
            </Link>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            onClick={() => void navigate({ to: "/dashboard/messages" } as never)}
          >
            <MessageSquare className="mr-1 h-3.5 w-3.5" /> Message
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────── CALENDAR VIEW ───────────
function CalendarView({ rows, locale }: { rows: Row[]; locale: string }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthName = new Date(year, month, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Adjust so Monday = 0
  const startOffset = (firstDay + 6) % 7;

  // Build map: dateStr -> rows
  const dateMap = useMemo(() => {
    const map: Record<string, Row[]> = {};
    rows.forEach((r) => {
      const d = r.created_at.slice(0, 10);
      if (!map[d]) map[d] = [];
      map[d].push(r);
    });
    return map;
  }, [rows]);

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDate(null);
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const cells: (null | number)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedRows = selectedDate ? (dateMap[selectedDate] ?? []) : [];

  return (
    <div className="space-y-4">
      {/* Calendar header */}
      <div className="flex items-center justify-between rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <button
          onClick={prevMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-900 dark:text-white">{monthName}</span>
          <button
            onClick={goToday}
            className="rounded-md border border-gray-200 dark:border-gray-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Today
          </button>
        </div>
        <button
          onClick={nextMonth}
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Grid */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
            <div
              key={d}
              className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400"
            >
              {d}
            </div>
          ))}
        </div>

        {/* Cells */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${i}`}
                  className="min-h-[60px] border-b border-r border-gray-50 dark:border-gray-800/60 last:border-r-0"
                />
              );
            }
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayRows = dateMap[dateStr] ?? [];
            const isToday = dateStr === todayStr;
            const isSelected = dateStr === selectedDate;
            const hasServices = dayRows.length > 0;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`relative min-h-[60px] flex flex-col items-center pt-2 gap-1 border-b border-r border-gray-50 dark:border-gray-800/60 transition-colors
                  ${(i + 1) % 7 === 0 ? "border-r-0" : ""}
                  ${isSelected ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/40"}
                `}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors
                  ${isToday ? "bg-blue-600 text-white" : isSelected ? "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200" : "text-gray-700 dark:text-gray-300"}`}
                >
                  {day}
                </span>
                {hasServices && (
                  <div className="flex flex-wrap justify-center gap-0.5 pb-1">
                    {dayRows.slice(0, 3).map((r, idx) => {
                      const cat = getCatConfig(r.service_category || "visa");
                      return (
                        <span
                          key={idx}
                          className={`h-1.5 w-1.5 rounded-full`}
                          style={{ background: cat.color }}
                        />
                      );
                    })}
                    {dayRows.length > 3 && (
                      <span className="text-[9px] font-bold text-gray-400">
                        +{dayRows.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected date panel */}
      {selectedDate && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-4 py-3">
            <span className="font-semibold text-gray-900 dark:text-white">
              {new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {selectedRows.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              No services on this date.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {selectedRows.map((r) => {
                const cat = getCatConfig(r.service_category || "visa");
                const status = getStatusConfig(r.status);
                const name = !r.services
                  ? "Service"
                  : (locale === "zh" && r.services.name_zh) ||
                    (locale === "rw" && r.services.name_rw) ||
                    r.services.name_en;
                const Icon = cat.icon;
                return (
                  <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${cat.bg}`}
                      >
                        <Icon className={`h-4 w-4 ${cat.text}`} />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {name}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                          {status.label}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="text-xs shrink-0" asChild>
                      <Link to="/dashboard/my-services/$id" params={{ id: r.id }}>
                        View →
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: cfg.color }} />
            {cfg.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────── SKELETON CARDS ───────────
function SkeletonCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-3"
        >
          <div className="flex gap-3">
            <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
              <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
          <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-8 flex-1 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
            <div className="h-8 flex-1 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────── MAIN COMPONENT ───────────
function MyServicesList() {
  const { user } = useAuth();
  const { locale } = useI18n();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [catFilter, setCatFilter] = useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("service_requests")
          .select(
            "id,status,service_category,progress_step,progress_total,created_at,updated_at,services(name_en,name_zh,name_rw)",
          )
          .eq("client_id", user.id)
          .order("updated_at", { ascending: false });
        if (error) throw error;
        setRows((data as unknown as Row[]) ?? []);
      } catch (e) {
        toast.error((e as Error).message);
        setRows([]);
      }
    })();
  }, [user]);

  const counts = useMemo(() => {
    if (!rows)
      return {
        active: 0,
        completed: 0,
        cancelled: 0,
        submitted: 0,
        under_review: 0,
        awaiting_client: 0,
      };
    return {
      active: rows.filter((r) => ACTIVE_STATUSES.includes(r.status)).length,
      completed: rows.filter((r) => COMPLETED_STATUSES.includes(r.status)).length,
      cancelled: rows.filter((r) => CANCELLED_STATUSES.includes(r.status)).length,
      submitted: rows.filter((r) => r.status === "submitted").length,
      under_review: rows.filter((r) => r.status === "under_review").length,
      awaiting_client: rows.filter((r) => r.status === "awaiting_client").length,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return null;
    const name = (r: Row) =>
      !r.services
        ? ""
        : (locale === "zh" && r.services.name_zh) ||
          (locale === "rw" && r.services.name_rw) ||
          r.services.name_en;
    return rows.filter((r) => {
      if (catFilter !== "all" && r.service_category !== catFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (search && !name(r).toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [rows, catFilter, statusFilter, search, locale]);

  const catCounts = useMemo(() => {
    if (!rows) return {} as Record<string, number>;
    return rows.reduce(
      (acc, r) => {
        acc[r.service_category] = (acc[r.service_category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [rows]);

  return (
    <div className="space-y-5">
      <style>{`
        @keyframes awaiting-ring {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249,115,22,0.4); }
          50% { box-shadow: 0 0 0 6px rgba(249,115,22,0); }
        }
        .awaiting-pulse { animation: awaiting-ring 2s ease-in-out infinite; }
      `}</style>

      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            My Services
          </h1>
          {rows && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {counts.active} active · {counts.completed} completed · {counts.cancelled} cancelled
            </p>
          )}
        </div>
        {/* View toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-1 self-start">
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${view === "list" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
          >
            <List className="h-3.5 w-3.5" /> List
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${view === "calendar" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Calendar
          </button>
        </div>
      </div>

      {/* ── Status Summary Bar ── */}
      {rows && rows.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {[
            {
              key: "submitted",
              label: "Submitted",
              color:
                "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700",
              dot: "bg-blue-500",
              count: counts.submitted,
            },
            {
              key: "under_review",
              label: "Under Review",
              color:
                "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700",
              dot: "bg-yellow-500",
              count: counts.under_review,
            },
            {
              key: "awaiting_client",
              label: "Awaiting You",
              color:
                "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-700",
              dot: "bg-orange-500",
              count: counts.awaiting_client,
            },
            {
              key: "completed",
              label: "Completed",
              color:
                "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700",
              dot: "bg-green-500",
              count: counts.completed,
            },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(statusFilter === s.key ? null : s.key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all ${s.color} ${statusFilter === s.key ? "ring-2 ring-offset-1 dark:ring-offset-gray-900 ring-current" : "opacity-80 hover:opacity-100"}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
              {s.count} {s.label}
            </button>
          ))}
          {statusFilter && (
            <button
              onClick={() => setStatusFilter(null)}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
      )}

      {/* ── Filter Tabs + Search ── */}
      {view === "list" && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Category tabs */}
          <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-0.5">
            {CATEGORY_FILTERS.map((c) => {
              const cfg = c === "all" ? null : getCatConfig(c);
              const count = c === "all" ? (rows?.length ?? 0) : (catCounts[c] ?? 0);
              return (
                <button
                  key={c}
                  onClick={() => setCatFilter(c)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${catFilter === c ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"}`}
                >
                  {c === "all" ? "All" : cfg?.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${catFilter === c ? "bg-white/20 dark:bg-black/20" : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services..."
              className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 py-2 pl-9 pr-8 text-xs text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {rows === null ? (
        <SkeletonCards />
      ) : view === "calendar" ? (
        <CalendarView rows={rows} locale={locale} />
      ) : filtered && filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 py-14 text-center">
          {search || catFilter !== "all" || statusFilter ? (
            <>
              <Search className="h-8 w-8 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-500">No services match your filters.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setCatFilter("all");
                  setStatusFilter(null);
                }}
              >
                Clear Filters
              </Button>
            </>
          ) : (
            <>
              <Briefcase className="h-10 w-10 text-gray-300 dark:text-gray-600" />
              <div className="space-y-1">
                <p className="font-medium text-gray-900 dark:text-white">No services yet</p>
                <p className="text-sm text-gray-500">Browse and request your first service!</p>
              </div>
              <Button asChild size="sm">
                <Link to="/dashboard/services" search={undefined}>
                  Browse Services →
                </Link>
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(filtered ?? []).map((r, i) => (
            <div key={r.id} style={{ animationDelay: `${i * 50}ms` }} className="animate-fade-in">
              <ServiceCard row={r} locale={locale} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
