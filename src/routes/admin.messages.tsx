import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

function AdminMessages() {
  const [rows, setRows] = useState<ConvRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
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
      if (list.length > 0) setSelectedId(list[0].id);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Messages</h1>
        <p className="text-sm text-muted-foreground">Monitor all client conversations — read-only.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-[340px_1fr]">
        <Card className="md:max-h-[70vh] md:overflow-y-auto">
          <CardContent className="p-2">
            {loading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-6 text-center">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">No conversations yet.</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {rows.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
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
                          {c.client?.full_name ?? c.client?.email ?? "Client"}
                        </p>
                        {c.total ? (
                          <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
                            {c.total}
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
