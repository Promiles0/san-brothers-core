import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { ArrowLeft, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { createNotification } from "@/lib/notifications";
import { MessageBubble, type MessageRecord } from "./message-bubble";
import { MessageInput, STAFF_QUICK_REPLIES, type ReplyTarget } from "./message-input";
import { TypingIndicator } from "./typing-indicator";
import { AvatarBubble } from "./avatar-bubble";
import { dateSeparator, sameLocalDay } from "./utils";

export interface ChatWindowProps {
  conversationId: string;
  counterpartName: string;
  counterpartId: string | null;
  subtitle?: string | null;
  mode: "client" | "staff";
  canReply?: boolean;
  readOnlyHint?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  headerExtra?: React.ReactNode;
  beforeMessages?: React.ReactNode;
  autoReplyText?: string | null;
  notifyLink?: string;
}

export function ChatWindow(props: ChatWindowProps) {
  const {
    conversationId,
    counterpartName,
    counterpartId,
    subtitle,
    mode,
    canReply = true,
    readOnlyHint,
    showBackButton,
    onBack,
    headerExtra,
    beforeMessages,
    autoReplyText,
    notifyLink,
  } = props;

  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState<ReplyTarget | null>(null);
  const [internalMode, setInternalMode] = useState(false);
  const [typingName, setTypingName] = useState<string | null>(null);
  const [counterpartOnline, setCounterpartOnline] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presenceRef = useRef<RealtimeChannel | null>(null);

  const senderName = profile?.full_name ?? profile?.email ?? "Someone";

  const scrollToBottom = useCallback((smooth = true) => {
    requestAnimationFrame(() => {
      const el = scrollerRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    });
  }, []);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    await supabase
      .from("messages")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("is_read", false)
      .neq("sender_id", user.id);
  }, [conversationId, user]);

  // Load + realtime
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setReply(null);
    setInternalMode(false);
    setMessages([]);

    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        setLoading(false);
        return;
      }
      // Fetch sender names
      const list = (data ?? []) as MessageRecord[];
      const senderIds = Array.from(
        new Set(list.map((m) => m.sender_id).filter((x): x is string => !!x)),
      );
      if (senderIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id,full_name,email")
          .in("id", senderIds);
        const map = new Map(
          (users ?? []).map((u) => [
            (u as { id: string }).id,
            (u as { full_name: string | null; email: string }).full_name ??
              (u as { email: string }).email,
          ]),
        );
        list.forEach((m) => {
          if (m.sender_id) m.sender_name = map.get(m.sender_id) ?? null;
        });
      }
      setMessages(list);
      setLoading(false);
      scrollToBottom(false);
      void markAllRead();
    })();

    const channel = supabase
      .channel("conv-msgs:" + conversationId)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: "conversation_id=eq." + conversationId,
        },
        async (payload) => {
          const m = payload.new as MessageRecord;
          if (m.sender_id && !m.sender_name) {
            const { data: u } = await supabase
              .from("users")
              .select("full_name,email")
              .eq("id", m.sender_id)
              .maybeSingle();
            if (u)
              m.sender_name =
                (u as { full_name: string | null }).full_name ??
                (u as { email: string }).email;
          }
          setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
          scrollToBottom();
          if (user && m.sender_id && m.sender_id !== user.id && !m.system_message) {
            void supabase
              .from("messages")
              .update({ is_read: true, read_at: new Date().toISOString() })
              .eq("id", m.id);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: "conversation_id=eq." + conversationId,
        },
        (payload) => {
          const m = payload.new as MessageRecord;
          setMessages((prev) => prev.map((p) => (p.id === m.id ? { ...p, ...m } : p)));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void channel.unsubscribe();
    };
  }, [conversationId, user, markAllRead, scrollToBottom]);

  // Presence + typing
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("presence:" + conversationId, {
      config: { presence: { key: user.id } },
    });
    presenceRef.current = ch;
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<
        string,
        Array<{ userId: string; typing?: boolean; name?: string }>
      >;
      let online = false;
      let typing: string | null = null;
      for (const key of Object.keys(state)) {
        if (key === user.id) continue;
        const entries = state[key];
        if (entries?.length) {
          online = true;
          const t = entries.find((e) => e.typing);
          if (t) typing = t.name ?? "Someone";
        }
      }
      setCounterpartOnline(online);
      setTypingName(typing);
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ userId: user.id, name: senderName, typing: false });
      }
    });
    return () => {
      void ch.unsubscribe();
      presenceRef.current = null;
    };
  }, [conversationId, user, senderName]);

  const broadcastTyping = useCallback(() => {
    const ch = presenceRef.current;
    if (!ch || !user) return;
    void ch.track({ userId: user.id, name: senderName, typing: true });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      void ch.track({ userId: user.id, name: senderName, typing: false });
    }, 2500);
  }, [user, senderName]);

  const handleSend = useCallback<
    NonNullable<React.ComponentProps<typeof MessageInput>["onSend"]>
  >(
    async ({ content, isInternal, replyToId, file }) => {
      if (!user) return;
      // Filter content client-side too if internal mode but client (defensive)
      const insert: Record<string, unknown> = {
        conversation_id: conversationId,
        sender_id: user.id,
        content,
        is_internal: mode === "staff" ? isInternal : false,
        reply_to_message_id: replyToId,
      };
      if (file) {
        insert.file_url = file.url;
        insert.file_name = file.name;
        insert.file_type = file.type;
      }
      const { error } = await supabase.from("messages").insert(insert);
      if (error) {
        toast.error(error.message);
        return;
      }
      void supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

      // Notify counterpart only if they aren't currently viewing
      if (!isInternal && counterpartId && !counterpartOnline) {
        void createNotification({
          user_id: counterpartId,
          type: mode === "client" ? "new_message" : "message_received",
          title: `New message from ${senderName}`,
          body: content.slice(0, 120),
          link: notifyLink ?? (mode === "client" ? "/staff/messages" : "/dashboard/messages"),
        });
      }
    },
    [
      conversationId,
      counterpartId,
      counterpartOnline,
      mode,
      notifyLink,
      senderName,
      user,
    ],
  );

  // Auto-reply when staff offline (client mode only)
  useEffect(() => {
    if (mode !== "client" || !autoReplyText || loading) return;
    const clientMsgs = messages.filter((m) => !m.system_message && m.sender_id === user?.id);
    if (clientMsgs.length !== 1) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      const { data: conv } = await supabase
        .from("conversations")
        .select("auto_reply_sent")
        .eq("id", conversationId)
        .maybeSingle();
      if ((conv as { auto_reply_sent?: boolean } | null)?.auto_reply_sent) return;
      const { data: onlineStaff } = await supabase
        .from("users")
        .select("id")
        .in("role", ["admin", "manager", "secretary", "translator"])
        .eq("availability_status", "online")
        .limit(1);
      if (onlineStaff && onlineStaff.length > 0) return;
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: null,
        content: autoReplyText,
        system_message: true,
        message_type: "auto_reply",
      });
      await supabase
        .from("conversations")
        .update({ auto_reply_sent: true })
        .eq("id", conversationId);
    }, 3000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [messages, mode, autoReplyText, loading, conversationId, user]);

  const handleReact = useCallback(
    async (m: MessageRecord, emoji: string) => {
      if (!user) return;
      const current = { ...(m.reactions ?? {}) } as Record<string, string[]>;
      const uids = current[emoji] ?? [];
      const has = uids.includes(user.id);
      current[emoji] = has ? uids.filter((u) => u !== user.id) : [...uids, user.id];
      if (current[emoji].length === 0) delete current[emoji];
      setMessages((prev) =>
        prev.map((p) => (p.id === m.id ? { ...p, reactions: current } : p)),
      );
      await supabase.from("messages").update({ reactions: current }).eq("id", m.id);
    },
    [user],
  );

  const visibleMessages = useMemo(() => {
    if (mode === "staff") return messages;
    return messages.filter((m) => !m.is_internal);
  }, [messages, mode]);

  const messageById = useMemo(() => {
    const map = new Map<string, MessageRecord>();
    messages.forEach((m) => map.set(m.id, m));
    return map;
  }, [messages]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-3 py-2">
        {showBackButton && (
          <Button size="icon" variant="ghost" className="h-9 w-9 md:hidden" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <AvatarBubble name={counterpartName} size={36} online={counterpartOnline} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{counterpartName}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {counterpartOnline ? (
              <span className="text-emerald-600">Online</span>
            ) : (
              subtitle || "Offline"
            )}
          </p>
        </div>
        {headerExtra}
        <Button size="icon" variant="ghost" className="h-9 w-9">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </div>

      {beforeMessages}

      {/* Messages */}
      <div ref={scrollerRef} className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="ml-auto h-10 w-1/2" />
            <Skeleton className="h-10 w-3/4" />
          </div>
        ) : visibleMessages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No messages yet. Start the conversation.
          </p>
        ) : (
          visibleMessages.map((m, idx) => {
            const prev = visibleMessages[idx - 1];
            const showDate = !prev || !sameLocalDay(prev.created_at, m.created_at);
            const target = m.reply_to_message_id
              ? messageById.get(m.reply_to_message_id) ?? null
              : null;
            return (
              <div key={m.id}>
                {showDate && (
                  <div className="my-3 text-center">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {dateSeparator(m.created_at)}
                    </span>
                  </div>
                )}
                <MessageBubble
                  m={m}
                  prev={prev}
                  mine={m.sender_id === user?.id}
                  onReply={canReply ? (mm) => setReply({
                    id: mm.id,
                    authorName: mm.sender_name ?? "User",
                    preview: mm.content.slice(0, 80),
                  }) : undefined}
                  onReact={canReply ? handleReact : undefined}
                  replyTarget={target}
                />
              </div>
            );
          })
        )}
        {typingName && (
          <div className="pt-1">
            <TypingIndicator name={typingName} />
          </div>
        )}
      </div>

      {/* Input */}
      {canReply ? (
        <MessageInput
          onSend={handleSend}
          onTyping={broadcastTyping}
          replyTo={reply}
          onCancelReply={() => setReply(null)}
          showInternalToggle={mode === "staff"}
          internalNoteMode={internalMode}
          onToggleInternal={setInternalMode}
          quickReplies={mode === "staff" ? STAFF_QUICK_REPLIES : undefined}
        />
      ) : (
        <div className="border-t bg-muted/30 p-3 text-center text-xs text-muted-foreground">
          {readOnlyHint ?? "Read-only view."}
        </div>
      )}
    </div>
  );
}

export const CLIENT_AUTO_REPLY =
  "Thank you for your message! Our team is currently offline. We'll get back to you within 24 hours (Mon–Fri 8:00–18:00 CAT). For urgent matters, call +250 788 687 288.";
