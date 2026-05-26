import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  MessageCircle,
  RefreshCw,
  FileText,
  Briefcase,
  UserPlus,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/notifications";

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

const iconForType = (type: string) => {
  if (type.includes("message")) return MessageCircle;
  if (type.includes("status")) return RefreshCw;
  if (type.includes("document")) return FileText;
  if (type.includes("client")) return UserPlus;
  if (type.includes("payment")) return DollarSign;
  if (type.includes("case") || type.includes("conversation")) return Briefcase;
  return Bell;
};

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const unreadCount = useMemo(() => items.filter((n) => !n.is_read).length, [items]);

  // Browser tab title prefix
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = unreadCount > 0 ? `(${unreadCount}) ${base}` : base;
  }, [unreadCount]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!cancelled) setItems((data ?? []) as Notification[]);
    })();

    const channel = supabase
      .channel("notifications:" + user.id)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: "user_id=eq." + user.id,
        },
        (payload) => {
          const n = payload.new as Notification;
          setItems((prev) =>
            prev.some((p) => p.id === n.id) ? prev : [n, ...prev].slice(0, 20),
          );
          toast(n.title, {
            description: n.body ?? undefined,
            action: n.link
              ? {
                  label: "View",
                  onClick: () => navigate({ to: n.link! as never }),
                }
              : undefined,
          });
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: "user_id=eq." + user.id,
        },
        (payload) => {
          const n = payload.new as Notification;
          setItems((prev) => prev.map((p) => (p.id === n.id ? n : p)));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  const markAllRead = async () => {
    if (!user) return;
    const ids = items.filter((n) => !n.is_read).map((n) => n.id);
    if (!ids.length) return;
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
  };

  const handleClick = async (n: Notification) => {
    setOpen(false);
    if (!n.is_read) {
      setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, is_read: true } : p)));
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    }
    if (n.link) navigate({ to: n.link as never });
  };

  const visible = items.slice(0, 10);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-4 min-w-4 px-1 text-[10px]"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[calc(100vw-2rem)] max-w-sm p-0 sm:w-96"
      >
        <div className="flex items-center justify-between border-b p-3">
          <p className="text-sm font-semibold">Notifications</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={markAllRead}
            disabled={unreadCount === 0}
          >
            Mark all as read
          </Button>
        </div>
        <ScrollArea className="max-h-[60vh]">
          {visible.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No notifications yet
            </p>
          ) : (
            <ul className="divide-y">
              {visible.map((n) => {
                const Icon = iconForType(n.type);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className={cn(
                        "flex w-full items-start gap-3 p-3 text-left text-sm transition-colors hover:bg-accent",
                        !n.is_read && "bg-accent/30",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-1 h-2 w-2 shrink-0 rounded-full",
                          n.is_read ? "bg-transparent" : "bg-primary",
                        )}
                      />
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "truncate",
                            n.is_read ? "font-normal" : "font-semibold",
                          )}
                        >
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="line-clamp-2 text-xs text-muted-foreground">
                            {n.body}
                          </p>
                        )}
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {relativeTime(n.created_at)}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
        <div className="border-t p-2 text-center">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => {
              setOpen(false);
            }}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
