import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AvatarBubble } from "./avatar-bubble";
import { smartTime } from "./utils";
import { getDepartment } from "@/lib/messaging/departments";

export interface ConversationListItem {
  id: string;
  name: string;
  department: string | null;
  last_message: string;
  last_message_at: string;
  unread: number;
  online?: boolean;
  status?: string | null;
  priority?: string | null;
  meta?: string | null;
}

export function ConversationList({
  items,
  loading,
  selectedId,
  onSelect,
  emptyText = "No conversations yet.",
  enableSearch = true,
}: {
  items: ConversationListItem[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  emptyText?: string;
  enableSearch?: boolean;
}) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.toLowerCase().trim()), 120);
    return () => clearTimeout(t);
  }, [q]);

  const filtered = useMemo(() => {
    const list = debounced
      ? items.filter(
          (i) =>
            i.name.toLowerCase().includes(debounced) ||
            i.last_message.toLowerCase().includes(debounced),
        )
      : items;
    return [...list].sort((a, b) => {
      if ((b.unread > 0 ? 1 : 0) !== (a.unread > 0 ? 1 : 0))
        return (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0);
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });
  }, [items, debounced]);

  return (
    <div className="flex h-full flex-col">
      {enableSearch && (
        <div className="border-b p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search messages"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-9 pl-8"
            />
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-2 p-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <ul>
            {filtered.map((c) => {
              const dep = getDepartment(c.department);
              const active = selectedId === c.id;
              const preview =
                c.last_message.length > 50 ? c.last_message.slice(0, 50) + "…" : c.last_message;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => onSelect(c.id)}
                    className={cn(
                      "flex w-full items-start gap-3 border-b px-3 py-3 text-left transition-colors",
                      active ? "bg-accent" : "hover:bg-accent/50",
                    )}
                  >
                    <AvatarBubble name={c.name} online={c.online} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{c.name}</p>
                        <span
                          className={cn(
                            "shrink-0 text-[11px]",
                            c.unread > 0
                              ? "font-medium text-primary"
                              : "text-muted-foreground",
                          )}
                        >
                          {smartTime(c.last_message_at)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p
                          className={cn(
                            "min-w-0 flex-1 truncate text-xs",
                            c.unread > 0
                              ? "font-medium text-foreground"
                              : "text-muted-foreground",
                          )}
                        >
                          {preview || "No messages yet"}
                        </p>
                        {c.unread > 0 && (
                          <Badge className="h-5 min-w-5 rounded-full px-1.5 text-[10px]">
                            {c.unread > 99 ? "99+" : c.unread}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <Badge variant="outline" className="h-4 gap-1 px-1.5 text-[10px]">
                          <span>{dep.icon}</span>
                          {dep.label}
                        </Badge>
                        {c.priority === "urgent" && (
                          <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                            Urgent
                          </Badge>
                        )}
                        {c.status === "resolved" || c.status === "closed" ? (
                          <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                            Resolved
                          </Badge>
                        ) : null}
                        {c.meta && (
                          <span className="truncate text-[10px] text-muted-foreground">
                            · {c.meta}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
