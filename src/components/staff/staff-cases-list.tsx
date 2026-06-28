import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search,
  ArrowUpDown,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Inbox,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/lib/dashboard/status-badge";
import { useI18n } from "@/lib/providers/i18n-provider";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ServiceCategory } from "@/lib/types/database";

interface CaseRow {
  id: string;
  status: string;
  progress_step: number;
  progress_total: number;
  assigned_staff_id: string | null;
  priority: string;
  created_at: string;
  client: {
    id: string;
    full_name: string | null;
    email: string;
    phone: string | null;
    tin_number: string | null;
  } | null;
  service: { id: string; name_en: string } | null;
}

type Filter = "all" | "awaiting" | "completed";
type Sort = "newest" | "oldest" | "awaiting" | "name";

const AVATAR_COLORS = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
];

function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export function StaffCasesList({
  category,
  basePath,
  title,
}: {
  category: ServiceCategory;
  basePath: string;
  title: string;
}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const [rows, setRows] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [search, setSearch] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let q = supabase
        .from("service_requests")
        .select(
          "id,status,progress_step,progress_total,assigned_staff_id,priority,created_at,client:users(id,full_name,email,phone,tin_number),service:services(id,name_en)",
        )
        .eq("service_category", category)
        .eq("assigned_staff_id", user.id)
        .order("created_at", { ascending: false });
      if (filter === "awaiting") q = q.eq("status", "awaiting_client");
      else if (filter === "completed") q = q.eq("status", "completed");
      const { data, error } = await q;
      if (error) throw error;
      setRows((data ?? []) as unknown as CaseRow[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [category, filter, user?.id]);

  const filtered = useMemo(() => {
    let list = rows.filter((r) => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        r.client?.full_name?.toLowerCase().includes(s) ||
        r.client?.email?.toLowerCase().includes(s) ||
        r.client?.phone?.toLowerCase().includes(s) ||
        r.client?.tin_number?.toLowerCase().includes(s)
      );
    });
    if (sort === "oldest") list = [...list].sort((a, b) => a.created_at.localeCompare(b.created_at));
    else if (sort === "newest")
      list = [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
    else if (sort === "name")
      list = [...list].sort((a, b) =>
        (a.client?.full_name ?? "").localeCompare(b.client?.full_name ?? ""),
      );
    else if (sort === "awaiting")
      list = [...list].sort(
        (a, b) =>
          (b.status === "awaiting_client" ? 1 : 0) - (a.status === "awaiting_client" ? 1 : 0),
      );
    return list;
  }, [rows, search, sort]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="all">{t("staff.cases.all")}</TabsTrigger>
            <TabsTrigger value="awaiting">{t("staff.cases.awaiting")}</TabsTrigger>
            <TabsTrigger value="completed">{t("staff.cases.completed")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-64 pl-8"
              placeholder={t("staff.cases.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
            <SelectTrigger className="w-44">
              <ArrowUpDown className="mr-1 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t("staff.cases.sortNewest")}</SelectItem>
              <SelectItem value="oldest">{t("staff.cases.sortOldest")}</SelectItem>
              <SelectItem value="awaiting">{t("staff.cases.sortAwaiting")}</SelectItem>
              <SelectItem value="name">{t("staff.cases.sortName")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/60" />
            <p className="font-medium">{t("staff.cases.empty")}</p>
            <p className="text-sm text-muted-foreground">{t("staff.cases.emptyHint")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.map((r) => {
            const isAwaiting = r.status === "awaiting_client";
            const pct = r.progress_total
              ? Math.round((r.progress_step / r.progress_total) * 100)
              : 0;
            return (
              <Card
                key={r.id}
                className={cn(
                  "group relative overflow-hidden transition hover:shadow-md hover:-translate-y-0.5",
                  isAwaiting &&
                    "border-orange-500/60 ring-2 ring-orange-500/20 animate-[pulse_2.5s_ease-in-out_infinite]",
                )}
              >
                {isAwaiting && (
                  <div className="flex items-center gap-1.5 bg-orange-500/15 px-4 py-1 text-xs font-semibold text-orange-700 dark:text-orange-300">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {t("staff.cases.actionRequired")}
                  </div>
                )}
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                        avatarColor(r.client?.email ?? r.id),
                      )}
                    >
                      {initials(r.client?.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">
                            {r.client?.full_name ?? "—"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {r.client?.email}
                          </p>
                        </div>
                        <div className="text-right text-xs">
                          <p className="font-medium">{r.service?.name_en}</p>
                          <p className="text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={r.status} />
                    {r.priority === "urgent" && (
                      <Badge variant="destructive">{t("staff.cases.urgent")}</Badge>
                    )}
                    {r.progress_total > 0 && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {t("staff.home.step")} {r.progress_step}/{r.progress_total}
                      </span>
                    )}
                  </div>

                  {r.progress_total > 0 && (
                    <div>
                      <Progress value={pct} className="h-1.5" />
                      <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums">
                        {pct}%
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <Button asChild size="sm" className="flex-1">
                      <Link to={`${basePath}/${r.id}` as never}>
                        {t("staff.cases.openCase")} →
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/staff/messages">
                        <MessageSquare className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>

                  {r.status === "completed" && (
                    <CheckCircle2 className="pointer-events-none absolute right-3 top-3 h-5 w-5 text-emerald-500/50" />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
