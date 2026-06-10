import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  MessageSquare,
  LayoutGrid,
  Table2,
  Inbox,
  Mail,
  Phone,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useCapabilities } from "@/lib/staff/capability-context";
import { useAllowedCategories, getCategoryLabel } from "@/lib/staff/capability-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/lib/providers/i18n-provider";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff/clients/")({ component: Page });

interface Client {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  tin_number: string | null;
  is_walk_in: boolean | null;
  created_by_staff_id: string | null;
  created_at: string;
}

const AVATAR_COLORS = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
];

const initials = (name?: string | null) =>
  !name
    ? "?"
    : name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("");

function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function Page() {
  const { hasCapability, isLoading: capLoading } = useCapabilities();
  const allowedCategories = useAllowedCategories();
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    if (!capLoading && allowedCategories !== null && allowedCategories.length === 0)
      navigate({ to: "/staff" });
  }, [capLoading, allowedCategories, navigate]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "walkin" | "online">("all");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [rows, setRows] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<Record<string, { services: number; docs: number }>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      let list: Client[] = [];

      if (allowedCategories === null) {
        // Admin: fetch all clients
        let q = supabase
          .from("users")
          .select("id,full_name,email,phone,tin_number,is_walk_in,created_by_staff_id,created_at")
          .eq("role", "client")
          .order("created_at", { ascending: false })
          .limit(200);
        if (filter === "walkin") q = q.or("is_walk_in.eq.true,email.ilike.%+walkin%");
        if (filter === "online")
          q = q.not("email", "ilike", "%+walkin%").or("is_walk_in.is.null,is_walk_in.eq.false");
        if (search.trim()) {
          const s = `%${search.trim()}%`;
          q = q.or(`full_name.ilike.${s},email.ilike.${s},phone.ilike.${s},tin_number.ilike.${s}`);
        }
        const { data } = await q;
        if (cancelled) return;
        list = (data ?? []) as Client[];
      } else {
        // Step 1: get distinct client IDs from service_requests in allowed categories
        const { data: srData } = await supabase
          .from("service_requests")
          .select("client_id")
          .in("service_category", allowedCategories);
        const clientIds = [...new Set((srData ?? []).map((r) => r.client_id))];
        if (clientIds.length === 0) {
          list = [];
        } else {
          // Step 2: fetch those clients
          let q = supabase
            .from("users")
            .select("id,full_name,email,phone,tin_number,is_walk_in,created_by_staff_id,created_at")
            .eq("role", "client")
            .in("id", clientIds)
            .order("created_at", { ascending: false })
            .limit(200);
          if (filter === "walkin") q = q.or("is_walk_in.eq.true,email.ilike.%+walkin%");
          if (filter === "online")
            q = q
              .not("email", "ilike", "%+walkin%")
              .or("is_walk_in.is.null,is_walk_in.eq.false");
          if (search.trim()) {
            const s = `%${search.trim()}%`;
            q = q.or(
              `full_name.ilike.${s},email.ilike.${s},phone.ilike.${s},tin_number.ilike.${s}`,
            );
          }
          const { data } = await q;
          if (cancelled) return;
          list = (data ?? []) as Client[];
        }
      }

      setRows(list);
      setLoading(false);

      // Fetch counts in parallel (best-effort)
      const ids = list.map((c) => c.id);
      if (ids.length > 0) {
        const [svc, docs] = await Promise.all([
          supabase
            .from("service_requests")
            .select("client_id")
            .in("client_id", ids)
            .not("status", "in", "(completed,rejected,cancelled)"),
          supabase.from("documents").select("client_id").in("client_id", ids),
        ]);
        if (cancelled) return;
        const map: Record<string, { services: number; docs: number }> = {};
        ids.forEach((id) => (map[id] = { services: 0, docs: 0 }));
        ((svc.data ?? []) as { client_id: string }[]).forEach((r) => {
          if (map[r.client_id]) map[r.client_id].services++;
        });
        ((docs.data ?? []) as { client_id: string }[]).forEach((r) => {
          if (map[r.client_id]) map[r.client_id].docs++;
        });
        setCounts(map);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [search, filter, allowedCategories]);

  const isWalkIn = (c: Client) => c.is_walk_in === true || c.email.includes("+walkin");

  const stats = useMemo(() => {
    return {
      total: rows.length,
      walkin: rows.filter(isWalkIn).length,
      online: rows.filter((c) => !isWalkIn(c)).length,
    };
  }, [rows]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {t("staff.clients.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {stats.total} {t("staff.clients.total")} · {stats.online} {t("staff.clients.online")} ·{" "}
            {stats.walkin} {t("staff.clients.walkin")}
          </p>
        </div>
        <Button asChild>
          <Link to="/staff/clients/new">
            <Plus className="mr-1 h-4 w-4" />
            {t("staff.clients.register")}
          </Link>
        </Button>
      </div>

      {allowedCategories !== null && allowedCategories.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm">
          <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-muted-foreground">Showing clients based on your capabilities:</span>
          <span className="font-medium">
            {allowedCategories.map(getCategoryLabel).join(" · ")}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList>
            <TabsTrigger value="all">{t("staff.cases.all")}</TabsTrigger>
            <TabsTrigger value="walkin">{t("staff.clients.walkin")}</TabsTrigger>
            <TabsTrigger value="online">{t("staff.clients.online")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-72 pl-8"
              placeholder={t("staff.clients.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex rounded-md border p-0.5">
            <button
              onClick={() => setView("cards")}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1 text-xs",
                view === "cards" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              {t("staff.clients.cards")}
            </button>
            <button
              onClick={() => setView("table")}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1 text-xs",
                view === "table" ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              <Table2 className="h-3.5 w-3.5" />
              {t("staff.clients.table")}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        view === "cards" ? (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : (
          <Skeleton className="h-64 w-full" />
        )
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <Inbox className="h-10 w-10 text-muted-foreground/60" />
            <p className="font-medium">{t("staff.clients.empty")}</p>
          </CardContent>
        </Card>
      ) : view === "cards" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((c) => {
            const walkIn = isWalkIn(c);
            const cc = counts[c.id];
            return (
              <Card
                key={c.id}
                className="transition hover:shadow-md hover:-translate-y-0.5"
              >
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold",
                        avatarColor(c.email),
                      )}
                    >
                      {initials(c.full_name)}
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                          walkIn ? "bg-muted-foreground/50" : "bg-emerald-500",
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-semibold">{c.full_name ?? "—"}</p>
                        {walkIn ? (
                          <Badge
                            variant="outline"
                            className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30"
                          >
                            {t("staff.clients.walkin")}
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"
                          >
                            {t("staff.clients.online")}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />
                        {c.email}
                      </p>
                      {c.phone && (
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" />
                          {c.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
                    <span>
                      {t("staff.clients.since")}{" "}
                      {new Date(c.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <span>
                      {cc?.services ?? 0} {t("staff.clients.services")} · {cc?.docs ?? 0}{" "}
                      {t("staff.clients.docs")}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild size="sm" className="flex-1">
                      <Link to="/staff/clients/$id" params={{ id: c.id }}>
                        {t("staff.clients.viewProfile")} →
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link to="/staff/messages">
                        <MessageSquare className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("staff.clients.name")}</TableHead>
                  <TableHead>{t("staff.clients.email")}</TableHead>
                  <TableHead>{t("staff.clients.phone")}</TableHead>
                  <TableHead>TIN</TableHead>
                  <TableHead>{t("staff.clients.type")}</TableHead>
                  <TableHead>{t("staff.clients.created")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.full_name ?? "—"}</TableCell>
                    <TableCell
                      className={c.email.includes("+walkin") ? "italic text-muted-foreground" : ""}
                    >
                      {c.email}
                    </TableCell>
                    <TableCell>{c.phone ?? "—"}</TableCell>
                    <TableCell>{c.tin_number ?? "—"}</TableCell>
                    <TableCell>
                      {isWalkIn(c) ? (
                        <Badge
                          className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30"
                          variant="outline"
                        >
                          {t("staff.clients.walkin")}
                        </Badge>
                      ) : (
                        <Badge
                          className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"
                          variant="outline"
                        >
                          {t("staff.clients.online")}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Link
                        to="/staff/clients/$id"
                        params={{ id: c.id }}
                        className="text-primary hover:underline text-sm"
                      >
                        {t("staff.clients.view")} →
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
