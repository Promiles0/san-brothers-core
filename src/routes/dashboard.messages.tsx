import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MessageThread } from "@/components/messaging/message-thread";

export const Route = createFileRoute("/dashboard/messages")({
  component: MessagesPage,
});

interface ConversationRow {
  id: string;
  staff_id: string | null;
  client_id: string | null;
  service_request_id: string | null;
  last_message_at: string;
  staff: { full_name: string | null; email: string } | null;
  service_request: { service: { name_en: string } | null } | null;
  last_message?: string;
  unread?: number;
}

function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("conversations")
      .select(
        "id,staff_id,client_id,service_request_id,last_message_at,staff:users!conversations_staff_id_fkey(full_name,email),service_request:service_requests(service:services(name_en))",
      )
      .eq("client_id", user.id)
      .order("last_message_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as unknown as ConversationRow[];

    // enrich with last message and unread counts
    await Promise.all(
      rows.map(async (c) => {
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
          .neq("sender_id", user.id);
        c.unread = count ?? 0;
      }),
    );

    setConversations(rows);
    if (!selectedId && rows.length > 0) setSelectedId(rows[0].id);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const startNew = async () => {
    if (!user) return;
    setCreating(true);
    try {
      // find any service request with an assigned staff member
      const { data: req } = await supabase
        .from("service_requests")
        .select("id,assigned_staff_id")
        .eq("client_id", user.id)
        .not("assigned_staff_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!req?.assigned_staff_id) {
        toast.error("No staff member is assigned to you yet. Submit a service request first.");
        return;
      }
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("client_id", user.id)
        .eq("staff_id", req.assigned_staff_id)
        .maybeSingle();
      if (existing?.id) {
        setSelectedId(existing.id);
        return;
      }
      const { data: created, error } = await supabase
        .from("conversations")
        .insert({
          client_id: user.id,
          staff_id: req.assigned_staff_id,
          service_request_id: req.id,
        })
        .select("id")
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      await load();
      setSelectedId(created.id);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Messages</h1>
        <Button size="sm" onClick={startNew} disabled={creating}>
          <Plus className="h-4 w-4" /> Start new conversation
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <Card className="md:max-h-[70vh] md:overflow-y-auto">
          <CardContent className="p-2">
            {loading ? (
              <div className="space-y-2 p-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-6 text-center">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">No conversations yet.</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {conversations.map((c) => (
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
                        <p className="truncate text-sm font-medium">
                          {c.staff?.full_name || c.staff?.email || "Staff"}
                        </p>
                        {c.unread ? (
                          <Badge variant="default" className="h-5 min-w-5 px-1.5">
                            {c.unread}
                          </Badge>
                        ) : null}
                      </div>
                      {c.service_request?.service?.name_en && (
                        <p className="truncate text-xs text-muted-foreground">
                          {c.service_request.service.name_en}
                        </p>
                      )}
                      <p className="truncate text-xs text-muted-foreground">
                        {c.last_message || "No messages yet"}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            {selectedId ? (
              <MessageThread conversationId={selectedId} />
            ) : (
              <div className="flex h-[400px] items-center justify-center text-sm text-muted-foreground">
                Select a conversation to view messages.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
