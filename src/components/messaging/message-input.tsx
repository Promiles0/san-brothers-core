import { useEffect, useRef, useState } from "react";
import { Paperclip, Send, X, Reply, Lock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export interface ReplyTarget {
  id: string;
  authorName: string;
  preview: string;
}

export function MessageInput({
  onSend,
  onTyping,
  replyTo,
  onCancelReply,
  internalNoteMode,
  onToggleInternal,
  showInternalToggle,
  quickReplies,
  disabled,
}: {
  onSend: (payload: {
    content: string;
    isInternal: boolean;
    replyToId: string | null;
    file?: { url: string; name: string; type: string } | null;
  }) => Promise<void> | void;
  onTyping?: () => void;
  replyTo?: ReplyTarget | null;
  onCancelReply?: () => void;
  internalNoteMode?: boolean;
  onToggleInternal?: (v: boolean) => void;
  showInternalToggle?: boolean;
  quickReplies?: string[];
  disabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [text]);

  const submit = async (overrideFile?: { url: string; name: string; type: string } | null) => {
    const body = text.trim();
    if (!body && !overrideFile) return;
    setSending(true);
    try {
      await onSend({
        content: body || (overrideFile ? overrideFile.name : ""),
        isInternal: !!internalNoteMode,
        replyToId: replyTo?.id ?? null,
        file: overrideFile ?? null,
      });
      setText("");
      onCancelReply?.();
    } finally {
      setSending(false);
    }
  };

  const handleFile = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Max 10MB");
      return;
    }
    setUploading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) throw new Error("Not authenticated");

      // Sanitize filename
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-]/g, "_");
      const timestamp = Date.now();
      const filePath = `clients/${user.id}/${timestamp}-${safeName}`;

      const { error } = await supabase.storage
        .from("client-documents")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;

      const { data } = supabase.storage.from("client-documents").getPublicUrl(filePath);
      await submit({ url: data.publicUrl, name: file.name, type: file.type });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      toast.error(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div
      className={cn(
        "border-t bg-background transition-colors",
        internalNoteMode && "bg-amber-50 dark:bg-amber-950/30",
      )}
    >
      {showInternalToggle && (
        <div className="flex items-center gap-2 px-3 pt-2">
          <Button
            type="button"
            size="sm"
            variant={!internalNoteMode ? "default" : "ghost"}
            onClick={() => onToggleInternal?.(false)}
            className="h-7 gap-1.5 text-xs"
          >
            <MessageSquare className="h-3.5 w-3.5" /> Message
          </Button>
          <Button
            type="button"
            size="sm"
            variant={internalNoteMode ? "default" : "ghost"}
            onClick={() => onToggleInternal?.(true)}
            className={cn(
              "h-7 gap-1.5 text-xs",
              internalNoteMode && "bg-amber-500 text-white hover:bg-amber-600",
            )}
          >
            <Lock className="h-3.5 w-3.5" /> Internal note
          </Button>
          {quickReplies && quickReplies.length > 0 && (
            <QuickReplies items={quickReplies} onPick={(t) => setText((p) => (p ? p + " " + t : t))} />
          )}
        </div>
      )}

      {replyTo && (
        <div className="mx-3 mt-2 flex items-start gap-2 rounded-md border-l-2 border-primary bg-muted/50 px-2 py-1.5">
          <Reply className="mt-0.5 h-3.5 w-3.5 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-primary">Replying to {replyTo.authorName}</p>
            <p className="truncate text-xs text-muted-foreground">{replyTo.preview}</p>
          </div>
          <button
            type="button"
            onClick={onCancelReply}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Cancel reply"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="flex items-end gap-2 p-3"
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-9 w-9 shrink-0"
          disabled={disabled || uploading}
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTyping?.();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={
            internalNoteMode ? "Add internal note (only staff can see)" : "Type a message…"
          }
          rows={1}
          disabled={disabled || sending}
          className="min-h-9 resize-none py-2"
        />
        <Button
          type="submit"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={disabled || sending || !text.trim()}
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function QuickReplies({ items, onPick }: { items: string[]; onPick: (t: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative ml-auto">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        onClick={() => setOpen((v) => !v)}
      >
        Quick replies ▾
      </Button>
      {open && (
        <div className="absolute right-0 bottom-full z-10 mb-1 w-72 rounded-md border bg-popover p-1 shadow-md">
          {items.map((q) => (
            <button
              type="button"
              key={q}
              onClick={() => {
                onPick(q);
                setOpen(false);
              }}
              className="block w-full rounded px-2 py-1.5 text-left text-xs hover:bg-accent"
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const STAFF_QUICK_REPLIES = [
  "Your documents have been received ✓",
  "We need more information from you",
  "Your case is under review",
  "Please schedule a call with us",
  "Your application has been approved ✓",
  "Additional documents required",
];
