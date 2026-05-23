// Requires public.messages and public.conversations tables. SQL:
//
// CREATE TABLE IF NOT EXISTS public.conversations (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   client_id uuid REFERENCES public.users(id),
//   staff_id uuid REFERENCES public.users(id),
//   service_request_id uuid REFERENCES public.service_requests(id),
//   last_message_at timestamptz DEFAULT now(),
//   created_at timestamptz DEFAULT now()
// );
// CREATE TABLE IF NOT EXISTS public.messages (
//   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
//   conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
//   sender_id uuid REFERENCES public.users(id),
//   content text NOT NULL,
//   is_read boolean DEFAULT false,
//   created_at timestamptz DEFAULT now()
// );
// ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
// ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
// (see policies in user spec)

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
}

export function MessageThread({
  conversationId,
  emptyHint = "No messages yet. Start the conversation.",
}: {
  conversationId: string;
  emptyHint?: string;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        setMessages([]);
      } else {
        setMessages((data ?? []) as Message[]);
      }
      setLoading(false);

      // mark unread (not mine) as read
      if (user) {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .eq("conversation_id", conversationId)
          .eq("is_read", false)
          .neq("sender_id", user.id);
      }
    })();

    const channel = supabase
      .channel("messages:" + conversationId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: "conversation_id=eq." + conversationId,
        },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
          if (user && m.sender_id && m.sender_id !== user.id) {
            void supabase.from("messages").update({ is_read: true }).eq("id", m.id);
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void channel.unsubscribe();
    };
  }, [conversationId, user]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async () => {
    const body = text.trim();
    if (!body || !user) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: body,
    });
    if (error) {
      toast.error(error.message);
    } else {
      setText("");
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    }
    setSending(false);
  };

  return (
    <div className="flex h-full min-h-[400px] flex-col">
      <div
        ref={scrollerRef}
        className="flex max-h-[60vh] min-h-[300px] flex-1 flex-col gap-2 overflow-y-auto p-2"
      >
        {loading ? (
            <>
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-10 w-1/2 self-end" />
              <Skeleton className="h-10 w-3/4" />
            </>
          ) : messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{emptyHint}</p>
          ) : (
            messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <div
                  key={m.id}
                  className={cn("flex w-full", mine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2 text-sm shadow-sm",
                      mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p
                      className={cn(
                        "mt-1 text-[10px] opacity-70",
                        mine ? "text-primary-foreground" : "text-muted-foreground",
                      )}
                    >
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="mt-2 flex gap-2 border-t pt-2"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={sending || !text.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
