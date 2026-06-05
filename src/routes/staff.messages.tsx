import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Inbox, MessageCircle, Forward, LogOut, CheckCircle2, Pause, Play, Flag } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ConversationList,
  type ConversationListItem,
} from "@/components/messaging/conversation-list";
import { ChatWindow } from "@/components/messaging/chat-window";
import { ForwardModal } from "@/components/messaging/forward-modal";
import { AvailabilityToggle } from "@/components/messaging/availability-toggle";
import { departmentsForRole, getDepartment } from "@/lib/messaging/departments";
import { createNotification } from "@/lib/notifications";

export const Route = createFileRoute("/staff/messages")({ component: StaffMessagesPage });

interface Row {
  id: string;
  client_id: string | null;
  department: string | null;
  status: string | null;
  priority: string | null;
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

type FilterTab = "incoming" | "mine" | "all";

function StaffMessagesPage() {
  const { user, profile } = useAuth();
  const role = profile?.role ?? "secretary";
  const allowedDepartments = useMemo(() => departmentsForRole(role), [role]);
  const isAdmin = role === "admin" || role === "manager";

  const [tab, setTab] = useState<FilterTab>("incoming");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [forwardOpen, setForwardOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("conversations")
      .select(
        "id,client_id,department,status,priority,claimed_by,claimed_at,hold_start,hold_reason,last_message_at,client:users!conversations_client_id_fkey(full_name,email),claimer:users!conversations_claimed_by_fkey(full_name,email)",
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void channel.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role]);

  const incoming = rows.filter((r) => !r.claimed_by && r.status !== "closed");
  const mine = rows.filter((r) => r.claimed_by === user?.id && r.status !== "closed");

  const filteredRows = tab === "incoming" ? incoming : tab === "mine" ? mine : rows;

  const items = useMemo<ConversationListItem[]>(
    () =>
      filteredRows.map((c) => ({
        id: c.id,
        name: c.client?.full_name ?? c.client?.email ?? "Client",
        department: c.department,
        last_message: c.last_message ?? "",
        last_message_at: c.last_message_at,
        unread: c.unread ?? 0,
        status: c.status,
        priority: c.priority,
        meta: c.claimed_by && c.claimed_by !== user?.id
          ? `Handled by ${c.claimer?.full_name ?? c.claimer?.email ?? "staff"}`
          : null,
      })),
    [filteredRows, user],
  );

  const selected = useMemo(() => rows.find((r) => r.id === selectedId), [rows, selectedId]);
  const selectedDep = selected ? getDepartment(selected.department) : null;
  const canReply =
    !!selected && selected.claimed_by === user?.id && selected.status !== "closed";

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
    if (error) return toast.error(error.message);
    await insertSystem(
      id,
      `${profile?.full_name ?? profile?.email ?? "Staff"} joined the conversation`,
    );
    toast.success("Conversation claimed");
    setSelectedId(id);
    setTab("mine");
    setMobileView("chat");
    await load();
  };

  const release = async (id: string) => {
    const { error } = await supabase
      .from("conversations")
      .update({ claimed_by: null, claimed_at: null, hold_start: null, hold_reason: null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    await insertSystem(
      id,
      `${profile?.full_name ?? profile?.email ?? "Staff"} released this conversation`,
    );
    toast.success("Released");
    await load();
  };

  const close = async (id: string) => {
    const { error } = await supabase
      .from("conversations")
      .update({ status: "closed" })
      .eq("id", id);
    if (error) return toast.error(error.message);
    await insertSystem(id, "Conversation marked as resolved");
    toast.success("Closed");
    await load();
  };

  const togglePriority = async (id: string, current: string | null) => {
    const next = current === "urgent" ? "normal" : "urgent";
    const { error } = await supabase
      .from("conversations")
      .update({ priority: next })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(next === "urgent" ? "Marked urgent" : "Priority cleared");
    await load();
  };

  const toggleHold = async (id: string, on: boolean) => {
    const patch = on
      ? { hold_start: new Date().toISOString(), hold_reason: "manual" }
      : { hold_start: null, hold_reason: null };
    const { error } = await supabase.from("conversations").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    await insertSystem(id, on ? "Session placed on hold" : "Session resumed");
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
    if (error) return toast.error(error.message);
    const fromName = profile?.full_name ?? profile?.email ?? "Staff";
    const toName = staff.full_name ?? staff.email;
    await insertSystem(
      selected.id,
      `Conversation forwarded from ${fromName} to ${toName}${note ? ` — Note: ${note}` : ""}`,
    );
    void createNotification({
      user_id: staff.id,
      type: "conversation_forwarded",
      title: `${fromName} forwarded a conversation to you`,
      body: note || undefined,
      link: "/staff/messages",
    });
    toast.success(`Forwarded to ${toName}`);
    await load();
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMobileView("chat");
  };

  return (
    <div className="-mx-4 -mt-4 h-[calc(100vh-4rem)] md:mx-0 md:mt-0">
      <div className="mb-3 hidden flex-wrap items-center justify-between gap-2 px-1 md:flex">
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <AvailabilityToggle />
      </div>

      <Card className="grid h-full min-h-0 grid-cols-1 overflow-hidden md:grid-cols-[340px_1fr]">
        {/* List */}
        <div
          className={cn(
            "flex min-h-0 flex-col border-r",
            mobileView === "chat" ? "hidden md:flex" : "flex",
          )}
        >
          <div className="border-b p-2">
            <div className="mb-2 flex items-center justify-between gap-2 md:hidden">
              <h2 className="text-base font-semibold">Messages</h2>
              <AvailabilityToggle />
            </div>
            <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="incoming" className="gap-1 text-xs">
                  <Inbox className="h-3.5 w-3.5" /> Inbox
                  {incoming.length > 0 && (
                    <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
                      {incoming.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="mine" className="gap-1 text-xs">
                  <MessageCircle className="h-3.5 w-3.5" /> Mine
                  {mine.length > 0 && (
                    <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
                      {mine.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex-1 overflow-hidden">
            <ConversationList
              items={items}
              loading={loading}
              selectedId={selectedId}
              onSelect={handleSelect}
              emptyText={
                tab === "incoming"
                  ? "No unclaimed conversations. 🎉"
                  : tab === "mine"
                    ? "You haven't claimed any conversations."
                    : "No conversations."
              }
            />
          </div>
        </div>

        {/* Chat */}
        <div
          className={cn(
            "flex min-h-0 flex-col",
            mobileView === "list" ? "hidden md:flex" : "flex",
          )}
        >
          {selected && selectedDep ? (
            <ChatWindow
              conversationId={selected.id}
              counterpartName={selected.client?.full_name ?? selected.client?.email ?? "Client"}
              counterpartId={selected.client_id}
              subtitle={selectedDep.label}
              mode="staff"
              canReply={canReply}
              readOnlyHint={
                !selected.claimed_by
                  ? "Claim this conversation to reply."
                  : selected.claimed_by !== user?.id
                    ? `Handled by ${selected.claimer?.full_name ?? "another staff member"}.`
                    : "Conversation closed."
              }
              showBackButton
              onBack={() => setMobileView("list")}
              notifyLink="/dashboard/messages"
              headerExtra={
                <div className="hidden items-center gap-1 md:flex">
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-8 w-8",
                      selected.priority === "urgent" && "text-destructive",
                    )}
                    onClick={() => void togglePriority(selected.id, selected.priority)}
                    title="Priority"
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                </div>
              }
              beforeMessages={
                <StaffActionBar
                  selected={selected}
                  canReply={canReply}
                  onClaim={() => void claim(selected.id)}
                  onRelease={() => void release(selected.id)}
                  onClose={() => void close(selected.id)}
                  onForward={() => setForwardOpen(true)}
                  onHold={(on) => void toggleHold(selected.id, on)}
                />
              }
            />
          ) : (
            <div className="grid h-full place-items-center p-6 text-center">
              <div className="space-y-3">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10">
                  <MessageCircle className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Select a conversation to view messages.
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      <ForwardModal
        open={forwardOpen}
        onOpenChange={setForwardOpen}
        excludeId={user?.id}
        onConfirm={forward}
      />
    </div>
  );
}

function StaffActionBar({
  selected,
  canReply,
  onClaim,
  onRelease,
  onClose,
  onForward,
  onHold,
}: {
  selected: Row;
  canReply: boolean;
  onClaim: () => void;
  onRelease: () => void;
  onClose: () => void;
  onForward: () => void;
  onHold: (on: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b bg-muted/30 px-3 py-2">
      {!selected.claimed_by ? (
        <Button size="sm" onClick={onClaim}>Claim</Button>
      ) : (
        <>
          {canReply && (
            <>
              <Button size="sm" variant="outline" onClick={onForward}>
                <Forward className="h-3.5 w-3.5" /> Forward
              </Button>
              <Button size="sm" variant="outline" onClick={onRelease}>
                <LogOut className="h-3.5 w-3.5" /> Release
              </Button>
              <Button size="sm" variant="outline" onClick={onClose}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Close
              </Button>
              {selected.department === "translation" &&
                (selected.hold_start ? (
                  <Button size="sm" variant="outline" onClick={() => onHold(false)}>
                    <Play className="h-3.5 w-3.5" /> Resume
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => onHold(true)}>
                    <Pause className="h-3.5 w-3.5" /> Hold
                  </Button>
                ))}
            </>
          )}
          {selected.status === "closed" && (
            <Badge variant="secondary">Closed</Badge>
          )}
        </>
      )}
      {selected.hold_start && (
        <Badge variant="outline" className="border-amber-500/40 text-amber-700">
          On hold
        </Badge>
      )}
    </div>
  );
}
