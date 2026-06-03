// NOTE: Requires VITE_ANTHROPIC_API_KEY in .env (frontend-exposed).
// SECURITY: Exposing an Anthropic key in the browser is insecure — recommend
// proxying through a server function before production.
import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What documents do I need for a tourist visa?",
  "How long does company registration take?",
  "What is the status of my application?",
];

const SYSTEM_PROMPT =
  "You are a helpful assistant for San Brothers, a professional services company in Kigali, Rwanda. You help clients with questions about visa applications, accounting services, company registration, and document translation. Be concise, friendly, and professional. Always recommend contacting the team for specific case questions.";

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const limitReached = messages.length >= 10;

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading || limitReached) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;
      if (!apiKey) throw new Error("Missing VITE_ANTHROPIC_API_KEY");
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          system: SYSTEM_PROMPT,
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const reply =
        data?.content?.[0]?.text ??
        data?.content
          ?.map((c: { text?: string }) => c.text)
          .filter(Boolean)
          .join("\n") ??
        "";
      setMessages((m) => [...m, { role: "assistant", content: reply || "(no response)" }]);
    } catch (e) {
      console.error(e);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Sorry, I'm having trouble connecting." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI assistant"
          className="fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-100 flex-col border-l border-border bg-background shadow-2xl">
          <header className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">San Brothers AI Assistant</div>
                <div className="text-xs text-muted-foreground">Powered by Claude</div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Hi! Ask me about visa, accounting, registration, or translation services.
                </p>
                <div className="space-y-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="w-full rounded-md border border-border bg-card px-3 py-2 text-left text-xs transition hover:bg-accent"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-lg bg-muted px-3 py-2 text-sm">
                  <span className="inline-flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-border p-3">
            {limitReached ? (
              <Button variant="outline" className="w-full" onClick={() => setMessages([])}>
                <RotateCcw className="h-4 w-4" /> Start new conversation
              </Button>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send(input);
                }}
                className="flex items-center gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question…"
                  disabled={loading}
                />
                <Button type="submit" size="icon" disabled={loading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            )}
            <p className="mt-2 text-[10px] text-muted-foreground">
              {messages.length}/10 messages · AI replies may be inaccurate.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
