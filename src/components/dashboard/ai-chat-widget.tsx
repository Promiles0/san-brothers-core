// NOTE: Requires VITE_ANTHROPIC_API_KEY in .env (frontend-exposed).
// SECURITY: Exposing an Anthropic key in the browser is insecure — recommend
// proxying through a server function before production.
import { useState, useRef, useEffect } from "react";
import { ArrowRight, Sparkles, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "How do I apply for a tourist visa to Rwanda?",
  "What documents do I need for company registration?",
  "How much does document translation cost?",
  "Can I get a live interpreter for a video call?",
];

const SYSTEM_PROMPT = `You are a knowledgeable, professional, and friendly AI assistant for San Brothers Company Ltd — a professional services firm in Kigali, Rwanda.

COMPANY INFO:
- Name: San Brothers Company Ltd
- Location: Florida House, 2nd Floor, KN 70 Street, Kigali, Rwanda
- Phone: +250 788 687 288, +250 788 453 192
- China office: +86 155 7739 0044
- Email: sanbrothersgroup@gmail.com
- Hours: Mon–Fri, 8:00–18:00 CAT
- Website: san-brothers.aroi-dev00.workers.dev

SERVICES:
1. Visa & Permits: Tourist Visa (from RWF 45,000), Business Visa (from RWF 65,000), Student Visa (from RWF 50,000), Work Permit (from RWF 120,000)
2. Accounting: Bookkeeping (from RWF 35,000/mo), Tax Filing (from RWF 40,000), Financial Reporting (from RWF 55,000), Audit Support (from RWF 70,000)
3. Translation: Document Translation (from RWF 8,000/page), Legal Translation (from RWF 15,000/page), Live Interpreter (from $0.80/min), Multilingual Support (from RWF 80,000/mo)
4. Business Consultancy: Company Registration (from RWF 150,000), Business Planning (from RWF 200,000), Trade Advisory (from RWF 100,000), Admin Support (from RWF 45,000/mo)

LANGUAGES: English, Chinese (中文), Kinyarwanda, French, Arabic

PARTNER: Best of the Best Company Ltd — China sourcing, product shipping, scholarships

RULES:
- Be concise and helpful. Max 3 sentences per reply unless user asks for details.
- Always recommend creating an account at /auth/register for specific quotes.
- For urgent/specific cases: direct to sanbrothersgroup@gmail.com or call.
- Never invent prices beyond what is listed above. Say "contact us for exact pricing" for custom quotes.
- Be warm but professional. Use the user's language if they write in French, Chinese, or Kinyarwanda.`;

function FormattedMessage({ content }: { content: string }) {
  return <>{content.split("\n").map((line, index) => {
    const isBullet = line.startsWith("- ") || line.startsWith("• ");
    const parts = line.replace(/^[-•] /, "").split(/(\*\*[^*]+\*\*)/g);
    return <div key={`${line}-${index}`} className={isBullet ? "flex gap-2" : undefined}>{isBullet ? <span aria-hidden="true">•</span> : null}<span>{parts.map((part, partIndex) => part.startsWith("**") && part.endsWith("**") ? <strong key={partIndex}>{part.slice(2, -2)}</strong> : part)}</span></div>;
  })}</>;
}

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
  const apiConfigured = Boolean(import.meta.env.VITE_ANTHROPIC_API_KEY);

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
        <Button
          onClick={() => setOpen(true)}
          aria-label="Open AI assistant"
          className="chat-launcher fixed bottom-6 right-6 z-50 h-auto rounded-full px-3 py-2.5 shadow-lg transition hover:scale-105 hover:shadow-xl sm:px-4"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary-foreground/15"><Sparkles className="h-4 w-4" /></span>
          <span className="hidden font-bold min-[360px]:inline">Ask AI</span>
          <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" /><span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" /></span>
        </Button>
      )}

      {open && (
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-100 flex-col border-l border-border bg-background shadow-2xl">
          <header className="chat-header relative flex items-center justify-between bg-gradient-to-r from-primary to-primary/80 px-4 py-4 text-primary-foreground">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-primary-foreground/15 text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-bold">San Brothers AI <span className="h-2 w-2 rounded-full bg-success" /><span className="text-[10px] font-medium opacity-80">Online</span></div>
                <div className="text-xs opacity-70">Powered by Claude</div>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={() => setOpen(false)} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <div className="space-y-4">
                {!apiConfigured ? <div className="rounded-lg border border-consultancy/30 bg-consultancy/10 px-3 py-2 text-xs text-foreground">⚠ AI assistant not yet configured. <a className="font-semibold text-primary underline" href="/contact">Contact us</a></div> : null}
                <div className="flex items-start gap-2">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary font-black text-primary-foreground">SB</div>
                  <div className="rounded-2xl rounded-tl-sm border border-border bg-card px-3 py-3 text-sm leading-relaxed text-foreground shadow-sm">Hi! I&apos;m your San Brothers AI assistant. I can help with visa questions, accounting services, company registration, translation, and more.</div>
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick questions:</p>
                <div className="space-y-2">
                  {SUGGESTIONS.map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      onClick={() => send(s)}
                      className="group h-auto w-full justify-between whitespace-normal rounded-xl border-border bg-card px-3 py-3 text-left text-xs text-foreground hover:border-primary/30 hover:bg-accent"
                    >
                      <span>{s}</span><ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn("group flex items-start gap-2", m.role === "user" ? "justify-end" : "justify-start")}
              >
                {m.role === "assistant" ? <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-[10px] font-black text-primary-foreground">SB</div> : null}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "rounded-tl-sm border border-border bg-card text-foreground shadow-sm",
                  )}
                >
                  <FormattedMessage content={m.content} />
                  <span className="mt-1 hidden text-[9px] opacity-60 group-hover:block">Just now</span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2 text-sm">
                  <span className="inline-flex gap-1">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" />
                  </span>
                  <span className="text-xs text-muted-foreground">San Brothers is typing...</span>
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
                  className="h-11 rounded-full border-border px-4 focus-visible:border-primary/30"
                />
                <Button type="submit" size="icon" className="h-11 w-11 shrink-0 rounded-full" disabled={loading || !input.trim()}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>
            )}
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              10 message limit · AI may make mistakes · <a href="/contact" className="font-semibold text-primary hover:underline">Contact us</a>
            </p>
          </div>
        </div>
      )}
    </>
  );
}
