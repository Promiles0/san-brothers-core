import { useState, useEffect, useRef } from "react";
import { ArrowRight, Sparkles, X, Send, Minimize2, Maximize2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePortal } from "@/lib/portal-context";
import { useI18n } from "@/lib/providers/i18n-provider";
import { useShouldShowChatWidget } from "@/lib/hooks/useShouldShowChatWidget";

type MessageError = "network" | "rate_limit" | "generic" | null;

interface Message {
  role: "user" | "assistant";
  content: string;
  error?: MessageError;
  retryOf?: string;
}

interface SystemPromptConfig {
  greeting: string;
  quickActions: string[];
  systemPrompt: string;
}

/**
 * AI Chat Widget Component
 *
 * A floating chat widget that appears on public pages and dashboards.
 * Portal-aware: shows different greetings and system prompts based on the current portal.
 *
 * Features:
 * - Floating button in bottom-right corner
 * - Portal-aware greeting and quick actions
 * - Conversation history (last 10 messages)
 * - Typing indicator while waiting for response
 * - Minimize/close functionality
 * - Mobile responsive
 * - Dark mode compatible
 */
export function AIChatWidget() {
  const { current: currentPortal } = usePortal();
  const { t } = useI18n();
  const shouldShow = useShouldShowChatWidget();

  // Don't render widget on restricted routes (staff, admin)
  if (!shouldShow) {
    return null;
  }

  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get portal-specific configuration
  const getSystemPromptConfig = (): SystemPromptConfig => {
    const basePrompt = `You are a knowledgeable, professional, and friendly AI assistant for San Brothers Company Ltd — a professional services firm in Kigali, Rwanda.

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

    switch (currentPortal) {
      case "translate":
        return {
          greeting: "Hi! Need help with translation? Ask me anything.",
          quickActions: ["Book Interpreter", "Translate Document", "See Pricing"],
          systemPrompt:
            basePrompt +
            `

You are specifically helping with translation and interpretation services.
Services: Live Interpreter calls, Document Translation, Certified Translation.
Languages: English, Chinese (中文), Kinyarwanda, French, Arabic and more.
First 5 minutes of live interpretation are FREE.`,
        };

      case "consultancy":
        return {
          greeting: "Hi! I'm your business consultant assistant.",
          quickActions: ["Register Company", "Business Planning", "Get Consultation"],
          systemPrompt:
            basePrompt +
            `

You are specifically helping with business consultancy services.
Services: Company Registration, Document Processing, Trade & Investment, Business Planning, Administrative Support.
Serving businesses in Rwanda and internationally.`,
        };

      default: // san-brothers
        return {
          greeting: "Hi! I'm the San Brothers assistant. How can I help?",
          quickActions: ["Browse Services", "Contact Us", "Get a Quote"],
          systemPrompt:
            basePrompt +
            `

Services offered:
- Visa & Permits: Tourist, Business, Student Visa, Work Permit
- Translation: Document Translation, Live Interpreter, Certified Translation
- Accounting: Bookkeeping, Tax Filing, Financial Reporting, Audit Support
- Business Consultancy: Company Registration, Business Planning, Trade & Investment
Partner: Best of the Best Company Ltd (Product Shipping, China Sourcing, Scholarships)`,
        };
    }
  };

  const config = getSystemPromptConfig();
  const apiConfigured = Boolean(
    import.meta.env.VITE_ANTHROPIC_API_KEY &&
    import.meta.env.VITE_ANTHROPIC_API_KEY !== "your-key-here",
  );

  // Initialize with greeting message
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greetingMessage: Message = {
        role: "assistant",
        content: config.greeting,
      };
      setMessages([greetingMessage]);
      setHasUnread(false);
    }
  }, [isOpen, config.greeting, messages.length]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /**
   * Sends a message to the AI and gets a response
   */
  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim()) return;

    // Add user message to conversation
    const newUserMessage: Message = { role: "user", content: userMessage };
    setMessages((prev) => [...prev, newUserMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

      // If no API key or placeholder, show fallback message
      if (!apiKey || apiKey === "your-key-here") {
        const fallbackMessage: Message = {
          role: "assistant",
          content:
            "Our AI assistant is coming soon! For now, please contact us at sanbrothersgroup@gmail.com or call +250 788 687 288.",
        };
        setMessages((prev) => [...prev, fallbackMessage]);
        setIsLoading(false);
        return;
      }

      // Keep last 10 messages for context (including the new user message)
      const conversationHistory = messages
        .concat([newUserMessage])
        .filter((msg) => !msg.error)
        .slice(-10)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }));

      // Call Claude API
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          system: config.systemPrompt,
          messages: conversationHistory,
        }),
      });

      if (response.status === 429) {
        throw Object.assign(new Error("rate_limit"), { kind: "rate_limit" as const });
      }
      if (!response.ok) {
        throw Object.assign(new Error(`API error: ${response.status}`), {
          kind: "generic" as const,
        });
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.content[0].text,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const kind = (error as { kind?: string })?.kind;
      let errorContent: string;
      let errorType: MessageError;
      if (kind === "rate_limit") {
        errorType = "rate_limit";
        errorContent =
          "I'm getting a lot of questions right now — please try again in a moment, or contact us directly at sanbrothersgroup@gmail.com.";
      } else if (error instanceof TypeError) {
        // fetch network failure
        errorType = "network";
        errorContent =
          "Sorry, I'm having trouble connecting. Please contact us at sanbrothersgroup@gmail.com";
      } else {
        errorType = "generic";
        errorContent =
          "Sorry, something went wrong. Please contact us at sanbrothersgroup@gmail.com";
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorContent,
          error: errorType,
          retryOf: userMessage,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewConversation = () => {
    setMessages([{ role: "assistant", content: config.greeting }]);
  };

  /**
   * Handles quick action clicks
   */
  const handleQuickAction = (action: string) => {
    sendMessage(action);
  };

  /**
   * Handles Enter key in input field
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setHasUnread(false);
          }}
          className="chat-launcher fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-3 py-2.5 text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl sm:px-4"
          aria-label="Open chat"
        >
          <div className="relative grid h-8 w-8 place-items-center rounded-full bg-primary-foreground/15">
            <Sparkles className="h-4 w-4" />
            {hasUnread && (
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-destructive" />
              </span>
            )}
          </div>
          <span className="hidden font-bold min-[360px]:inline">Ask AI</span>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-0 right-0 z-50 flex h-[min(650px,100dvh)] w-full flex-col overflow-hidden border border-border bg-background shadow-2xl sm:bottom-6 sm:right-6 sm:max-w-[400px] sm:rounded-2xl">
          {/* Header */}
          <div className="chat-header relative flex items-center justify-between bg-gradient-to-r from-primary to-primary/80 p-4 text-primary-foreground">
            <div className="flex flex-1 items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-primary-foreground/15">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="flex items-center gap-2 font-bold">
                  San Brothers AI <span className="h-2 w-2 rounded-full bg-success" />
                  <span className="text-[10px] font-medium opacity-80">Online</span>
                </h3>
                <p className="text-xs opacity-70">Powered by Claude · {currentPortal}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={startNewConversation}
                className="rounded-full p-2 hover:bg-primary-foreground/10"
                aria-label="New conversation"
                title="New conversation"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="rounded-full p-2 hover:bg-primary-foreground/10"
                aria-label={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? (
                  <Maximize2 className="h-4 w-4" />
                ) : (
                  <Minimize2 className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 hover:bg-primary-foreground/10"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          {!isMinimized && (
            <>
              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {!apiConfigured && messages.length <= 1 ? (
                  <div className="rounded-lg border border-consultancy/30 bg-consultancy/10 px-3 py-2 text-xs text-foreground">
                    ⚠ AI assistant not yet configured.{" "}
                    <a className="font-semibold text-primary underline" href="/contact">
                      Contact us
                    </a>
                  </div>
                ) : null}
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`group flex items-start gap-2 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-[10px] font-black text-primary-foreground">
                        SB
                      </div>
                    ) : null}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "rounded-tl-sm border border-border bg-card text-foreground shadow-sm"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <span className="mt-1 hidden text-[9px] opacity-60 group-hover:block">
                        Just now
                      </span>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2">
                      <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-full bg-foreground animate-bounce" />
                        <div className="h-2 w-2 rounded-full bg-foreground animate-bounce delay-100" />
                        <div className="h-2 w-2 rounded-full bg-foreground animate-bounce delay-200" />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        San Brothers is typing...
                      </span>
                    </div>
                  </div>
                )}

                {/* Quick Actions (shown after greeting) */}
                {messages.length === 1 && !isLoading && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Quick questions:
                    </p>
                    {config.quickActions.map((action) => (
                      <Button
                        key={action}
                        variant="outline"
                        onClick={() => handleQuickAction(action)}
                        className="group h-auto w-full justify-between rounded-xl border-border bg-card px-3 py-2.5 text-xs text-foreground hover:border-primary/30 hover:bg-accent"
                      >
                        {action}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </Button>
                    ))}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-border bg-background p-4">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Type your message..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className="h-11 flex-1 rounded-full border-border px-4 focus-visible:border-primary/30"
                  />
                  <Button
                    onClick={() => sendMessage(inputValue)}
                    disabled={isLoading || !inputValue.trim()}
                    size="icon"
                    className="h-11 w-11 shrink-0 rounded-full"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 text-center text-[10px] text-muted-foreground">
                  10 message limit · AI may make mistakes ·{" "}
                  <a href="/contact" className="font-semibold text-primary hover:underline">
                    Contact us
                  </a>
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
