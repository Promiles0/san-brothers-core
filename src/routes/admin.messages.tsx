import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Search, RefreshCw, Inbox, Users, MessageSquare, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MessageThread } from "@/components/messaging/message-thread";

export const Route = createFileRoute("/admin/messages")({ component: AdminMessages });

interface ConvRow {
  id: string;
  client_id: string | null;
  last_message_at: string;
  client: { full_name: string | null; email: string } | null;
  service_request: { service: { name_en: string } | null } | null;
  last_message?: string;
  total?: number;
}

const AVATAR_COLORS = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
];

function initials(name?: string | null, fallback?: string) {
  const src = name?.trim() || fallback || "?";
  return (
    src
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

function avatarColor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function AdminMessages() {
  const [rows, setRows] = useState<ConvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    const { data } = await supabase
      .from("conversations")
      .select(
        "id,client_id,last_message_at,client:users!conversations_client_id_fkey(full_name,email),service_request:service_requests(service:services(name_en))",
      )
      .order("last_message_at", { ascending: false })
      .limit(100);

    const list = (data ?? []) as unknown as ConvRow[];
    await Promise.all(
      list.map(async (c) => {
        const { data: last } = await supabase
          .from("messages")
          .select("content")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        c.last_message = (last?.content as string | undefined) ?? "";
        const { count } = await supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", c.id);
        c.total = count ?? 0;
      }),
    );
    setRows(list);
    if (!selectedId && list.length > 0) setSelectedId(list[0].id);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((c) => {
      return (
        c.client?.full_name?.toLowerCase().includes(q) ||
        c.client?.email?.toLowerCase().includes(q) ||
        c.service_request?.service?.name_en?.toLowerCase().includes(q) ||
        c.last_message?.toLowerCase().includes(q)
      );
    });
  }, [rows, search]);

  const stats = useMemo(() => {
    const totalMessages = rows.reduce((a, r) => a + (r.total ?? 0), 0);
    const last24h = rows.filter(
      (r) => Date.now() - new Date(r.last_message_at).getTime() < 1000 * 60 * 60 * 24,
    ).length;
    return { conversations: rows.length, totalMessages, last24h };
  }, [rows]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 animate-in fade-in duration-300">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Messages</h1>
          <p className="text-sm text-muted-foreground">
            Monitor all client conversations — read-only oversight.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load(true)} disabled={refreshing}>
          <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat
          icon={Users}
          label="Conversations"
          value={loading ? null : stats.conversations}
          tone="primary"
        />
        <MiniStat
          icon={MessageSquare}
          label="Total messages"
          value={loading ? null : stats.totalMessages}
          tone="emerald"
        />
        <MiniStat
          icon={Clock}
          label="Active (24h)"
          value={loading ? null : stats.last24h}
          tone="amber"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-[360px_1fr]">
        <Card className="md:max-h-[72vh] md:overflow-hidden">
          <CardContent className="flex h-full flex-col p-0">
            <div className="border-b border-border p-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search clients, services, messages…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {loading ? (
                <div className="space-y-2 p-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-3 p-8 text-center">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10">
                    {search ? (
                      <Inbox className="h-5 w-5 text-primary" />
                    ) : (
                      <MessageCircle className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {search ? "No conversations match your search." : "No conversations yet."}
                  </p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {filtered.map((c) => {
                    const name = c.client?.full_name ?? c.client?.email ?? "Client";
                    const seed = c.client?.email ?? c.id;
                    const active = selectedId === c.id;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(c.id)}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-md p-2.5 text-left transition-colors",
                            active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                          )}
                        >
                          <div
                            className={cn(
                              "grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold",
                              avatarColor(seed),
                            )}
                          >
                            {initials(c.client?.full_name, c.client?.email)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="truncate text-sm font-medium">{name}</p>
                              <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                                {timeAgo(c.last_message_at)}
                              </span>
                            </div>
                            {c.service_request?.service?.name_en && (
                              <p className="truncate text-[11px] text-muted-foreground">
                                {c.service_request.service.name_en}
                              </p>
                            )}
                            <div className="mt-0.5 flex items-center justify-between gap-2">
                              <p className="truncate text-xs text-muted-foreground">
                                {c.last_message || "No messages yet"}
                              </p>
                              {c.total ? (
                                <Badge
                                  variant="secondary"
                                  className="h-5 min-w-5 px-1.5 text-[10px]"
                                >
                                  {c.total}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            {selectedId ? (
              <MessageThread conversationId={selectedId} />
            ) : (
              <div className="flex h-[60vh] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm">Select a conversation to view messages.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const MINI_TONE: Record<string, string> = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
};

function MiniStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | null;
  tone: keyof typeof MINI_TONE;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("grid h-10 w-10 place-items-center rounded-lg", MINI_TONE[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {value === null ? (
            <Skeleton className="mt-1 h-6 w-12" />
          ) : (
            <p className="text-xl font-bold tabular-nums">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
