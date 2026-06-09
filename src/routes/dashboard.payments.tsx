import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Download,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Wallet,
  Receipt,
  Copy,
  Plane,
  Calculator,
  Languages,
  Briefcase,
  FileText,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/lib/providers/i18n-provider";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard/payments")({
  component: PaymentsPage,
});

interface PaymentRow {
  id: string;
  amount_rwf: number;
  currency: string;
  method: string;
  status: string;
  reference: string | null;
  created_at: string;
  service_request: {
    service: {
      name_en: string;
      name_zh: string | null;
      name_rw: string | null;
      category?: string | null;
    } | null;
  } | null;
}

const USD_RATE = 1285; // approx RWF per USD for display

const methodStyle: Record<string, string> = {
  stripe: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  momo: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  paypal: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
  crypto: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  office: "bg-muted text-muted-foreground border-border",
};

const statusMeta: Record<
  string,
  { label: string; cls: string; icon: typeof CheckCircle2 }
> = {
  completed: {
    label: "Completed",
    cls: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
    icon: CheckCircle2,
  },
  pending: {
    label: "Pending",
    cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    icon: Clock,
  },
  failed: {
    label: "Failed",
    cls: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    icon: XCircle,
  },
  refunded: {
    label: "Refunded",
    cls: "bg-muted text-muted-foreground border-border",
    icon: Receipt,
  },
};

function serviceIcon(category?: string | null) {
  switch ((category ?? "").toLowerCase()) {
    case "visa":
    case "immigration":
      return { Icon: Plane, color: "text-sky-500 bg-sky-500/10" };
    case "accounting":
    case "tax":
      return { Icon: Calculator, color: "text-emerald-500 bg-emerald-500/10" };
    case "translation":
      return { Icon: Languages, color: "text-violet-500 bg-violet-500/10" };
    case "consultancy":
      return { Icon: Briefcase, color: "text-orange-500 bg-orange-500/10" };
    default:
      return { Icon: FileText, color: "text-muted-foreground bg-muted" };
  }
}

function PaymentsPage() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const [rows, setRows] = useState<PaymentRow[] | null>(null);
  const [filter, setFilter] = useState<"all" | "completed" | "pending" | "failed">("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("payments")
        .select(
          "id,amount_rwf,currency,method,status,reference,created_at,service_request:service_requests(service:services(name_en,name_zh,name_rw,category))",
        )
        .eq("client_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        setRows([]);
        return;
      }
      setRows((data as unknown as PaymentRow[]) ?? []);
    })();
  }, [user]);

  const localName = (r: PaymentRow) => {
    const s = r.service_request?.service;
    if (!s) return "—";
    return (locale === "zh" && s.name_zh) || (locale === "rw" && s.name_rw) || s.name_en;
  };

  const stats = useMemo(() => {
    const list = rows ?? [];
    const completed = list.filter((r) => r.status === "completed");
    const pending = list.filter((r) => r.status === "pending");
    const totalRwf = completed.reduce((acc, r) => acc + (r.amount_rwf || 0), 0);
    return {
      totalRwf,
      totalUsd: Math.round(totalRwf / USD_RATE),
      pendingCount: pending.length,
      completedCount: completed.length,
      txCount: list.length,
    };
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (
          !localName(r).toLowerCase().includes(q) &&
          !(r.reference ?? "").toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [rows, filter, query, locale]);

  const grouped = useMemo(() => {
    const map = new Map<string, PaymentRow[]>();
    for (const r of filtered) {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const exportCsv = () => {
    if (!rows || rows.length === 0) return;
    const head = ["Date", "Service", "Method", "Amount (RWF)", "Status", "Reference"];
    const lines = [head.join(",")];
    for (const r of rows) {
      lines.push(
        [
          new Date(r.created_at).toISOString().slice(0, 10),
          `"${localName(r).replace(/"/g, "'")}"`,
          r.method,
          r.amount_rwf,
          r.status,
          r.reference ?? "",
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payments_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyRef = (ref: string) => {
    navigator.clipboard.writeText(ref);
    toast.success("Reference copied");
  };

  const monthLabel = (key: string) => {
    const [y, m] = key.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t("dashboard.payments.title")}
          </h1>
          <p className="text-sm text-muted-foreground">Your payments and billing history</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows?.length}>
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Wallet}
          label="Total Paid"
          value={
            rows === null
              ? "…"
              : `$${stats.totalUsd.toLocaleString()}`
          }
          sub={rows === null ? "" : `${stats.totalRwf.toLocaleString()} RWF`}
          accent="border-l-green-500"
          loading={rows === null}
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={rows === null ? "…" : String(stats.pendingCount)}
          sub="payments"
          accent="border-l-amber-500"
          loading={rows === null}
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={rows === null ? "…" : String(stats.completedCount)}
          sub="payments"
          accent="border-l-emerald-500"
          loading={rows === null}
        />
        <StatCard
          icon={Receipt}
          label="Transactions"
          value={rows === null ? "…" : String(stats.txCount)}
          sub="all time"
          accent="border-l-blue-500"
          loading={rows === null}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "completed", "pending", "failed"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition",
              filter === k
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card hover:bg-accent border-border",
            )}
          >
            {k}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      {rows === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-muted">
              <CreditCard className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">No payments yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Your payment history will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([key, items]) => (
            <section key={key} className="space-y-2">
              <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
                <span className="font-semibold">{monthLabel(key)}</span>
                <div className="h-px flex-1 bg-border" />
                <span>
                  {items.length} {items.length === 1 ? "transaction" : "transactions"}
                </span>
              </div>
              <div className="space-y-2">
                {items.map((r) => {
                  const { Icon, color } = serviceIcon(r.service_request?.service?.category);
                  const sm = statusMeta[r.status] ?? statusMeta.pending;
                  const StatusIcon = sm.icon;
                  const usd = Math.round((r.amount_rwf || 0) / USD_RATE);
                  return (
                    <div
                      key={r.id}
                      className="group flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4 transition hover:border-primary/30 hover:shadow-sm"
                    >
                      <div className={cn("grid h-10 w-10 place-items-center rounded-lg", color)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold">{localName(r)}</span>
                          <span
                            className={cn(
                              "rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              methodStyle[r.method] ?? methodStyle.office,
                            )}
                          >
                            {r.method}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span>{new Date(r.created_at).toLocaleDateString()}</span>
                          {r.reference && (
                            <>
                              <span>·</span>
                              <button
                                onClick={() => copyRef(r.reference!)}
                                className="flex items-center gap-1 hover:text-foreground"
                                title="Copy reference"
                              >
                                <span className="font-mono">
                                  {r.reference.length > 14
                                    ? r.reference.slice(0, 14) + "…"
                                    : r.reference}
                                </span>
                                <Copy className="h-3 w-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">
                          {r.currency === "USD"
                            ? `$${usd.toLocaleString()}`
                            : `${r.amount_rwf.toLocaleString()} ${r.currency}`}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          ≈ {r.amount_rwf.toLocaleString()} RWF
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1 border capitalize",
                          sm.cls,
                        )}
                      >
                        <StatusIcon className="h-3 w-3" /> {sm.label}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toast.message("Receipt coming soon")}
                        title="Download receipt"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  loading,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  sub?: string;
  accent: string;
  loading?: boolean;
}) {
  return (
    <Card className={cn("border-l-4 transition hover:shadow-md", accent)}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-muted">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          {loading ? (
            <Skeleton className="mt-1 h-5 w-20" />
          ) : (
            <div className="text-lg font-bold leading-tight">{value}</div>
          )}
          {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
