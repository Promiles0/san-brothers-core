import { useState } from "react";
import { Lock, Reply, Check, CheckCheck, Smile, FileText, Download, Languages, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/providers/i18n-provider";

const LOCALE_TO_LANGUAGE: Record<string, string> = {
  en: "English",
  zh: "Chinese (Simplified)",
  rw: "Kinyarwanda",
  fr: "French",
  ar: "Arabic",
};


export interface MessageRecord {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  content: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  system_message?: boolean | null;
  is_internal?: boolean | null;
  reply_to_message_id?: string | null;
  reactions?: Record<string, string[]> | null;
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  sender_name?: string | null;
}

const REACTIONS = ["👍", "✅", "🙏", "❤️", "😊"];

export function MessageBubble({
  m,
  mine,
  prev,
  onReply,
  onReact,
  replyTarget,
}: {
  m: MessageRecord;
  mine: boolean;
  prev?: MessageRecord;
  onReply?: (m: MessageRecord) => void;
  onReact?: (m: MessageRecord, emoji: string) => void;
  replyTarget?: MessageRecord | null;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  if (m.system_message) {
    return (
      <div className="my-2 text-center">
        <p className="text-[11px] italic text-muted-foreground">{m.content}</p>
      </div>
    );
  }

  const showHeader =
    !prev ||
    prev.sender_id !== m.sender_id ||
    prev.system_message !== m.system_message ||
    new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 5 * 60_000;

  const time = new Date(m.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const reactionEntries = Object.entries(m.reactions ?? {}).filter(
    ([, uids]) => Array.isArray(uids) && uids.length > 0,
  );

  return (
    <div className={cn("group flex w-full gap-2", mine ? "justify-end" : "justify-start")}>
      <div className={cn("flex max-w-[80%] flex-col", mine ? "items-end" : "items-start")}>
        {showHeader && !mine && m.sender_name && (
          <p className="mb-0.5 px-1 text-[11px] font-medium text-muted-foreground">
            {m.sender_name}
          </p>
        )}
        <div className="relative">
          <div
            className={cn(
              "rounded-2xl px-3 py-2 text-sm shadow-sm",
              m.is_internal
                ? "border border-amber-500/40 bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-100"
                : mine
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground",
              mine ? "rounded-br-md" : "rounded-bl-md",
            )}
          >
            {m.is_internal && (
              <div className="mb-1 flex items-center gap-1 text-[10px] font-medium opacity-80">
                <Lock className="h-3 w-3" /> Internal note · staff only
              </div>
            )}

            {replyTarget && (
              <div
                className={cn(
                  "mb-1 rounded-md border-l-2 px-2 py-1 text-[11px]",
                  mine
                    ? "border-primary-foreground/50 bg-primary-foreground/10"
                    : "border-primary bg-background/50",
                )}
              >
                <p className="truncate opacity-80">
                  {replyTarget.sender_name ?? "Reply"}: {replyTarget.content.slice(0, 80)}
                </p>
              </div>
            )}

            {m.file_url && (
              <a
                href={m.file_url}
                target="_blank"
                rel="noreferrer"
                className="mb-1 block"
              >
                {m.file_type?.startsWith("image/") ? (
                  <img
                    src={m.file_url}
                    alt={m.file_name ?? "attachment"}
                    className="max-h-60 rounded-md object-cover"
                  />
                ) : (
                  <div
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs",
                      mine ? "border-primary-foreground/30" : "border-border",
                    )}
                  >
                    <FileText className="h-4 w-4" />
                    <span className="flex-1 truncate">{m.file_name ?? "Attachment"}</span>
                    <Download className="h-3.5 w-3.5" />
                  </div>
                )}
              </a>
            )}

            {m.content && (
              <p className="whitespace-pre-wrap wrap-break-word">{m.content}</p>
            )}

            <div
              className={cn(
                "mt-1 flex items-center justify-end gap-1 text-[10px]",
                mine && !m.is_internal ? "text-primary-foreground/80" : "text-muted-foreground",
              )}
            >
              <span>{time}</span>
              {mine && !m.is_internal && (
                m.is_read ? (
                  <CheckCheck className="h-3 w-3 text-sky-300" />
                ) : (
                  <Check className="h-3 w-3" />
                )
              )}
            </div>
          </div>

          {/* Hover actions */}
          <div
            className={cn(
              "absolute -top-3 z-10 hidden gap-1 rounded-full border bg-popover px-1 py-0.5 shadow-sm group-hover:flex",
              mine ? "left-0 -translate-x-full pl-1" : "right-0 translate-x-full pr-1",
            )}
          >
            <button
              type="button"
              onClick={() => setPickerOpen((v) => !v)}
              className="rounded p-1 hover:bg-accent"
              aria-label="React"
            >
              <Smile className="h-3.5 w-3.5" />
            </button>
            {onReply && (
              <button
                type="button"
                onClick={() => onReply(m)}
                className="rounded p-1 hover:bg-accent"
                aria-label="Reply"
              >
                <Reply className="h-3.5 w-3.5" />
              </button>
            )}
            {pickerOpen && (
              <div className="absolute top-full left-1/2 mt-1 flex -translate-x-1/2 gap-0.5 rounded-full border bg-popover px-1.5 py-1 shadow-md">
                {REACTIONS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className="rounded p-0.5 text-base hover:bg-accent"
                    onClick={() => {
                      onReact?.(m, e);
                      setPickerOpen(false);
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {reactionEntries.length > 0 && (
          <div className={cn("mt-1 flex flex-wrap gap-1", mine ? "justify-end" : "justify-start")}>
            {reactionEntries.map(([emoji, uids]) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onReact?.(m, emoji)}
                className="flex items-center gap-1 rounded-full border bg-background px-1.5 py-0.5 text-[11px] hover:bg-accent"
              >
                <span>{emoji}</span>
                <span className="text-muted-foreground">{uids.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
