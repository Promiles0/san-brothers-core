import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, MessageCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MessageThread } from "@/components/messaging/message-thread";
import { DEPARTMENTS, getDepartment, type DepartmentKey } from "@/lib/messaging/departments";

export const Route = createFileRoute("/dashboard/messages")({ component: MessagesPage });

interface Row {
  id: string;
  client_id: string | null;
  department: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
  last_message_at: string;
  claimer_name: string | null;
  last_message?: string;
  unread?: number;
}

function MessagesPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [creating, setCreating] = useState<DepartmentKey | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("conversations")
      .select("id,client_id,department,claimed_by,claimed_at,last_message_at")
      .eq("client_id", user.id)
      .order("last_message_at", { ascending: false });
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
          .select("content,system_message")
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
    const claimerIds = list.filter((c) => c.claimed_by).map((c) => c.claimed_by as string);
    if (claimerIds.length > 0) {
      const { data: claimers } = await supabase
        .from("users")
        .select("id,full_name")
        .in("id", claimerIds);
      list.forEach((c) => {
        c.claimer_name = claimers?.find((u) => u.id === c.claimed_by)?.full_name ?? null;
      });
    }
    setRows(list);
    if (!selectedId && list.length > 0) setSelectedId(list[0].id);
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
  };

  const selected = useMemo(() => rows.find((r) => r.id === selectedId), [rows, selectedId]);
  const selectedDep = selected ? getDepartment(selected.department) : null;
  const claimerName = selected?.claimer_name ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <Button size="sm" onClick={() => setPicking(true)}>
          <Plus className="h-4 w-4" /> New message
        </Button>
      </div>

      {picking ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" onClick={() => setPicking(false)}>
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
                  onClick={() => void startConversation(d.key)}
                  disabled={creating !== null}
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
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-[320px_1fr]">
          <Card className="md:max-h-[70vh] md:overflow-y-auto">
            <CardContent className="p-2">
              {loading ? (
                <div className="space-y-2 p-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : rows.length === 0 ? (
                <div className="flex flex-col items-center gap-3 p-6 text-center">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10">
                    <MessageCircle className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">No conversations yet.</p>
                  <Button size="sm" onClick={() => setPicking(true)}>
                    Start one
                  </Button>
                </div>
              ) : (
                <ul className="space-y-1">
                  {rows.map((c) => {
                    const dep = getDepartment(c.department);
                    const handler = c.claimer_name;
                    return (
                      <li key={c.id}>
                        <button
                          onClick={() => setSelectedId(c.id)}
                          className={cn(
                            "w-full rounded-md p-3 text-left transition-colors",
                            selectedId === c.id
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-accent/50",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="flex items-center gap-2 truncate text-sm font-medium">
                              <span>{dep.icon}</span>
                              {handler ?? dep.label}
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
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4">
              {selected && selectedDep ? (
                <>
                  <div className="flex items-center gap-3 border-b pb-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-lg">
                      {selectedDep.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {claimerName ?? selectedDep.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {claimerName
                          ? `Handled by ${claimerName}`
                          : selected.claimed_by
                            ? "Connecting…"
                            : `Connecting you with ${selectedDep.label}…`}
                      </p>
                    </div>
                  </div>
                  <MessageThread conversationId={selected.id} />
                </>
              ) : (
                <div className="flex h-[400px] items-center justify-center text-sm text-muted-foreground">
                  Select a conversation to view messages.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
