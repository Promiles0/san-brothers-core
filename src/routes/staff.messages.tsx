import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Inbox, MessageCircle, Forward, LogOut, CheckCircle2, Pause, Play } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MessageThread } from "@/components/messaging/message-thread";
import { ForwardModal } from "@/components/messaging/forward-modal";
import { AvailabilityToggle } from "@/components/messaging/availability-toggle";
import { DEPARTMENTS, departmentsForRole, getDepartment } from "@/lib/messaging/departments";
import { createNotification } from "@/lib/notifications";

export const Route = createFileRoute("/staff/messages")({ component: StaffMessagesPage });

interface Row {
  id: string;
  client_id: string | null;
  department: string | null;
  status: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  hold_start: string | null;
  hold_reason: string | null;
  last_message_at: string;
  client: { full_name: string | null; email: string } | null;
  claimer: { full_name: string | null; email: string } | null;
  last_message?: string;
  unread?: number;
}

function StaffMessagesPage() {
  const { user, profile } = useAuth();
  const role = profile?.role ?? "secretary";
  const allowedDepartments = useMemo(() => departmentsForRole(role), [role]);
  const isAdmin = role === "admin" || role === "manager";

  const [tab, setTab] = useState("incoming");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [forwardOpen, setForwardOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("conversations")
      .select(
        "id,client_id,department,status,claimed_by,claimed_at,hold_start,hold_reason,last_message_at,client:users!conversations_client_id_fkey(full_name,email),claimer:users!conversations_claimed_by_fkey(full_name,email)",
      )
      .order("last_message_at", { ascending: false })
      .limit(200);
    if (!isAdmin) query = query.in("department", allowedDepartments);
    const { data, error } = await query;
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (data ?? []) as unknown as Row[];
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
          .eq("conversation_id", c.id)
          .eq("is_read", false)
          .or("system_message.is.null,system_message.eq.false")
          .neq("sender_id", user.id);
        c.unread = count ?? 0;
      }),
    );
    setRows(list);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    if (!user) return;
    const channel = supabase
      .channel("staff-conv-" + user.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () =>
        void load(),
      )
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () =>
        void load(),
      )
      .subscribe();
    return () => {
      void channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role]);

  const incoming = rows.filter((r) => !r.claimed_by && r.status !== "closed");
  const mine = rows.filter((r) => r.claimed_by === user?.id && r.status !== "closed");
  const all = rows;

  const selected = useMemo(() => rows.find((r) => r.id === selectedId), [rows, selectedId]);
  const canReply = selected?.claimed_by === user?.id && selected?.status !== "closed";

  const insertSystem = async (conversationId: string, content: string) => {
    if (!user) return;
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
      system_message: true,
      message_type: "system",
    });
  };

  const claim = async (id: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("conversations")
      .update({ claimed_by: user.id, claimed_at: new Date().toISOString(), status: "open" })
      .eq("id", id)
      .is("claimed_by", null);
    if (error) {
      toast.error(error.message);
      return;
    }
    await insertSystem(
      id,
      `${profile?.full_name ?? profile?.email ?? "Staff"} joined the conversation`,
    );
    toast.success("Conversation claimed");
    setSelectedId(id);
    setTab("mine");
    await load();
  };

  const release = async (id: string) => {
    if (!user || !selected) return;
    const { error } = await supabase
      .from("conversations")
      .update({ claimed_by: null, claimed_at: null, hold_start: null, hold_reason: null })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await insertSystem(
      id,
      `${profile?.full_name ?? profile?.email ?? "Staff"} released this conversation`,
    );
    toast.success("Released back to department");
    await load();
  };

  const close = async (id: string) => {
    const { error } = await supabase
      .from("conversations")
      .update({ status: "closed" })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await insertSystem(id, "Conversation marked as resolved");
    toast.success("Conversation closed");
    await load();
  };

  const forward = async (
    staff: { id: string; full_name: string | null; email: string },
    note: string,
  ) => {
    if (!user || !selected) return;
    const { error } = await supabase
      .from("conversations")
      .update({
        claimed_by: staff.id,
        claimed_at: new Date().toISOString(),
        forwarded_to: staff.id,
        forwarded_at: new Date().toISOString(),
        forwarded_by: user.id,
        hold_start: null,
        hold_reason: null,
      })
      .eq("id", selected.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    const fromName = profile?.full_name ?? profile?.email ?? "Staff";
    const toName = staff.full_name ?? staff.email;
    await insertSystem(
      selected.id,
      `Conversation forwarded from ${fromName} to ${toName}${note ? ` — Note: ${note}` : ""}`,
    );
    toast.success(`Forwarded to ${toName}`);
    await load();
  };

  const toggleHold = async (id: string, on: boolean) => {
    const patch = on
      ? { hold_start: new Date().toISOString(), hold_reason: "manual" }
      : { hold_start: null, hold_reason: null };
    const { error } = await supabase.from("conversations").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    await insertSystem(id, on ? "Session placed on hold (billing paused)" : "Session resumed");
    toast.success(on ? "On hold" : "Resumed");
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <AvailabilityToggle />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="incoming" className="gap-2">
            <Inbox className="h-4 w-4" /> Incoming
            {incoming.length > 0 && (
              <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
                {incoming.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="mine" className="gap-2">
            <MessageCircle className="h-4 w-4" /> My conversations
            {mine.length > 0 && (
              <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
                {mine.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All department</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="mt-4">
          <IncomingList loading={loading} rows={incoming} onClaim={claim} />
        </TabsContent>

        <TabsContent value="mine" className="mt-4">
          <div className="grid gap-4 md:grid-cols-[320px_1fr]">
            <Card className="md:max-h-[70vh] md:overflow-y-auto">
              <CardContent className="p-2">
                <ConvList
                  loading={loading}
                  rows={mine}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  emptyText="You haven't claimed any conversations."
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3 p-4">
                {selected ? (
                  <>
                    <ConvHeader row={selected} />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setForwardOpen(true)}>
                        <Forward className="h-4 w-4" /> Forward
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void release(selected.id)}>
                        <LogOut className="h-4 w-4" /> Release
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void close(selected.id)}>
                        <CheckCircle2 className="h-4 w-4" /> Close
                      </Button>
                      {selected.department === "translation" &&
                        (selected.hold_start ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void toggleHold(selected.id, false)}
                          >
                            <Play className="h-4 w-4" /> Resume
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void toggleHold(selected.id, true)}
                          >
                            <Pause className="h-4 w-4" /> Hold session
                          </Button>
                        ))}
                    </div>
                    {selected.hold_start && <HoldBanner startedAt={selected.hold_start} />}
                    <MessageThread
                      conversationId={selected.id}
                      readOnly={!canReply}
                      readOnlyHint="Claim the conversation to reply."
                    />
                  </>
                ) : (
                  <div className="flex h-[400px] items-center justify-center text-sm text-muted-foreground">
                    Select a conversation to view messages.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <div className="grid gap-4 md:grid-cols-[320px_1fr]">
            <Card className="md:max-h-[70vh] md:overflow-y-auto">
              <CardContent className="p-2">
                <ConvList
                  loading={loading}
                  rows={all}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  showHandler
                  emptyText="No conversations in this department."
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="space-y-3 p-4">
                {selected ? (
                  <>
                    <ConvHeader row={selected} />
                    <MessageThread
                      conversationId={selected.id}
                      readOnly
                      readOnlyHint={
                        selected.claimed_by === user?.id
                          ? "Switch to ‘My conversations' to reply."
                          : selected.claimed_by
                            ? `Handled by ${selected.claimer?.full_name ?? selected.claimer?.email ?? "another staff member"}.`
                            : "Unclaimed — claim it from the Incoming tab to reply."
                      }
                    />
                  </>
                ) : (
                  <div className="flex h-[400px] items-center justify-center text-sm text-muted-foreground">
                    Select a conversation to view.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <ForwardModal
        open={forwardOpen}
        onOpenChange={setForwardOpen}
        excludeId={user?.id}
        onConfirm={forward}
      />
    </div>
  );
}

function IncomingList({
  loading,
  rows,
  onClaim,
}: {
  loading: boolean;
  rows: Row[];
  onClaim: (id: string) => void;
}) {
  if (loading)
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  if (rows.length === 0)
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No unclaimed conversations. 🎉
        </CardContent>
      </Card>
    );
  const sorted = [...rows].sort(
    (a, b) => new Date(a.last_message_at).getTime() - new Date(b.last_message_at).getTime(),
  );
  return (
    <ul className="space-y-2">
      {sorted.map((c) => {
        const dep = getDepartment(c.department);
        return (
          <li key={c.id}>
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{dep.icon}</span>
                    <p className="truncate font-medium">
                      {c.client?.full_name ?? c.client?.email ?? "Client"}
                    </p>
                    <Badge variant="outline">{dep.label}</Badge>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {c.last_message || "No messages yet"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Waiting {timeAgo(c.last_message_at)}
                  </p>
                </div>
                <Button size="sm" onClick={() => onClaim(c.id)}>
                  Claim
                </Button>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

function ConvList({
  loading,
  rows,
  selectedId,
  onSelect,
  emptyText,
  showHandler,
}: {
  loading: boolean;
  rows: Row[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  emptyText: string;
  showHandler?: boolean;
}) {
  if (loading)
    return (
      <div className="space-y-2 p-2">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  if (rows.length === 0)
    return (
      <p className="p-6 text-center text-sm text-muted-foreground">{emptyText}</p>
    );
  return (
    <ul className="space-y-1">
      {rows.map((c) => {
        const dep = getDepartment(c.department);
        return (
          <li key={c.id}>
            <button
              onClick={() => onSelect(c.id)}
              className={cn(
                "w-full rounded-md p-3 text-left transition-colors",
                selectedId === c.id ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 truncate text-sm font-medium">
                  <span>{dep.icon}</span>
                  {c.client?.full_name ?? c.client?.email ?? "Client"}
                </p>
                {c.unread ? (
                  <Badge variant="default" className="h-5 min-w-5 px-1.5">
                    {c.unread}
                  </Badge>
                ) : null}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {c.last_message || "No messages yet"}
              </p>
              {showHandler && (
                <p className="truncate text-[11px] text-muted-foreground">
                  {c.claimed_by
                    ? `Handled by ${c.claimer?.full_name ?? c.claimer?.email}`
                    : `Unclaimed · ${dep.label}`}
                </p>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function ConvHeader({ row }: { row: Row }) {
  const dep = getDepartment(row.department);
  return (
    <div className="flex items-center gap-3 border-b pb-3">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-lg">
        {dep.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">
          {row.client?.full_name ?? row.client?.email ?? "Client"}
        </p>
        <p className="text-xs text-muted-foreground">
          {dep.label}
          {row.claimed_by &&
            ` · Handled by ${row.claimer?.full_name ?? row.claimer?.email ?? "staff"}`}
        </p>
      </div>
      {row.status === "closed" && <Badge variant="secondary">Closed</Badge>}
    </div>
  );
}

function HoldBanner({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return (
    <div className="flex items-center justify-between rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
      <span>Session on hold — billing paused</span>
      <span className="font-mono">{mm}:{ss}</span>
    </div>
  );
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// Suppress unused import warning when DEPARTMENTS not directly used.
void DEPARTMENTS;
