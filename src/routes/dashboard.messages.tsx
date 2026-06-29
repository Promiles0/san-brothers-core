import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, MessageCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ConversationList,
  type ConversationListItem,
} from "@/components/messaging/conversation-list";
import { ChatWindow, CLIENT_AUTO_REPLY } from "@/components/messaging/chat-window";
import { DEPARTMENTS, getDepartment, type DepartmentKey } from "@/lib/messaging/departments";

export const Route = createFileRoute("/dashboard/messages")({ component: MessagesPage });

interface Row {
  id: string;
  client_id: string | null;
  department: string | null;
  claimed_by: string | null;
  claimer_name: string | null;
  last_message_at: string;
  last_message?: string;
  unread?: number;
  status?: string | null;
  priority?: string | null;
}

function MessagesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");
  const [picking, setPicking] = useState(false);
  const [creating, setCreating] = useState<DepartmentKey | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("conversations")
      .select("id,client_id,department,claimed_by,last_message_at,status,priority")
      .eq("client_id", user.id)
      .eq("conversation_type", "client_manager")
      .order("last_message_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const list = (data ?? []) as Row[];
    await Promise.all(
      list.map(async (c) => {
        const { data: last } = await supabase
          .from("messages")
          .select("content,is_internal")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(5);
        const firstVisible = (last ?? []).find(
          (m) => !(m as { is_internal?: boolean }).is_internal,
        );
        c.last_message = (firstVisible?.content as string | undefined) ?? "";
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
    const claimerIds = list.filter((c) => c.claimed_by).map((c) => c.claimed_by as string);
    if (claimerIds.length > 0) {
      const { data: claimers } = await supabase
        .from("users")
        .select("id,full_name,email")
        .in("id", claimerIds);
      list.forEach((c) => {
        const m = claimers?.find((u) => u.id === c.claimed_by);
        c.claimer_name =
          (m as { full_name: string | null } | undefined)?.full_name ??
          (m as { email: string } | undefined)?.email ??
          null;
      });
    }
    setRows(list);
    if (!selectedId && list.length > 0 && window.innerWidth >= 768) setSelectedId(list[0].id);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    if (!user) return;
    const channel = supabase
      .channel("client-conv-" + user.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations", filter: `client_id=eq.${user.id}` },
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
  }, [user]);

  const startConversation = async (dep: DepartmentKey) => {
    if (!user) return;
    setCreating(dep);
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        client_id: user.id,
        department: dep,
        last_message_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    setCreating(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conversation started");
    setPicking(false);
    await load();
    setSelectedId(data.id);
    setMobileView("chat");
  };

  const listItems = useMemo<ConversationListItem[]>(
    () =>
      rows.map((c) => {
        const dep = getDepartment(c.department);
        return {
          id: c.id,
          name: c.claimer_name ?? dep.label,
          department: c.department,
          last_message: c.last_message ?? "",
          last_message_at: c.last_message_at,
          unread: c.unread ?? 0,
          status: c.status,
          priority: c.priority,
        };
      }),
    [rows],
  );

  const selected = useMemo(() => rows.find((r) => r.id === selectedId), [rows, selectedId]);
  const selectedDep = selected ? getDepartment(selected.department) : null;
  const counterpartName = selected?.claimer_name ?? selectedDep?.label ?? "Support";

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMobileView("chat");
  };

  return (
    <div className="-mx-4 -mt-4 h-[calc(100vh-4rem)] md:mx-0 md:mt-0">
      <div className="mb-3 hidden items-center justify-between px-1 md:flex">
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <Button size="sm" onClick={() => setPicking(true)}>
          <Plus className="h-4 w-4" /> New message
        </Button>
      </div>

      {picking ? (
        <DepartmentPicker
          onPick={(d) => void startConversation(d)}
          onClose={() => setPicking(false)}
          disabled={creating !== null}
        />
      ) : (
        <Card className="grid h-full min-h-0 grid-cols-1 overflow-hidden md:grid-cols-[320px_1fr]">
          {/* List */}
          <div
            className={cn("min-h-0 border-r", mobileView === "chat" ? "hidden md:block" : "block")}
          >
            <div className="flex items-center justify-between border-b px-3 py-2 md:hidden">
              <h2 className="text-base font-semibold">Messages</h2>
              <Button size="sm" onClick={() => setPicking(true)}>
                <Plus className="h-4 w-4" /> New
              </Button>
            </div>
            <ConversationList
              items={listItems}
              loading={loading}
              selectedId={selectedId}
              onSelect={handleSelect}
              emptyText="No conversations yet. Tap New to start one."
            />
          </div>

          {/* Chat */}
          <div className={cn("min-h-0", mobileView === "list" ? "hidden md:block" : "block")}>
            {selected && selectedDep ? (
              <ChatWindow
                conversationId={selected.id}
                counterpartName={counterpartName}
                counterpartId={selected.claimed_by}
                subtitle={selectedDep.label}
                mode="client"
                showBackButton
                onBack={() => setMobileView("list")}
                autoReplyText={CLIENT_AUTO_REPLY}
                notifyLink="/staff/messages"
              />
            ) : (
              <div className="grid h-full place-items-center p-6 text-center">
                <div className="space-y-3">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10">
                    <MessageCircle className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Select a conversation or start a new one.
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

function DepartmentPicker({
  onPick,
  onClose,
  disabled,
}: {
  onPick: (d: DepartmentKey) => void;
  onClose: () => void;
  disabled: boolean;
}) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-2">
        <Button size="icon" variant="ghost" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">Choose a department</h2>
          <p className="text-sm text-muted-foreground">
            We'll route your message to the right team.
          </p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {DEPARTMENTS.map((d) => (
          <button
            key={d.key}
            onClick={() => onPick(d.key)}
            disabled={disabled}
            className="flex items-start gap-3 rounded-lg border bg-card p-4 text-left transition-colors hover:border-primary hover:bg-accent/40 disabled:opacity-60"
          >
            <div className="text-2xl">{d.icon}</div>
            <div className="min-w-0">
              <p className="font-medium">{d.label}</p>
              <p className="text-xs text-muted-foreground">{d.description}</p>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
