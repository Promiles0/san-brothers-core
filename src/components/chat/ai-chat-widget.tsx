import { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Send, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { usePortal } from "@/lib/portal-context";
import { useI18n } from "@/lib/providers/i18n-provider";
import { useShouldShowChatWidget } from "@/lib/hooks/useShouldShowChatWidget";

interface Message {
  role: "user" | "assistant";
  content: string;
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
    const basePrompt = `You are a helpful assistant for San Brothers Company Ltd, a professional services company in Kigali, Rwanda (Florida House, 2nd Floor, KN 70 Street).
Contact: +250 788 687 288, +250 788 453 192, sanbrothersgroup@gmail.com
Hours: Mon-Fri 8:00-18:00 CAT

Always be helpful, professional, and concise.
If you cannot help, direct them to contact San Brothers directly.
Never make up information about services or prices.`;

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
          model: "claude-3-5-haiku-20241022",
          max_tokens: 1024,
          system: config.systemPrompt,
          messages: conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.content[0].text,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        role: "assistant",
        content:
          "Sorry, I'm having trouble right now. Please contact us at sanbrothersgroup@gmail.com",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
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
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-110 hover:shadow-xl"
          aria-label="Open chat"
        >
          <div className="relative">
            <MessageCircle className="h-6 w-6" />
            {hasUnread && (
              <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-red-500 animate-pulse" />
            )}
          </div>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[500px] w-full max-w-[400px] flex-col rounded-lg border border-border bg-card shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-primary p-4 text-primary-foreground">
            <div className="flex-1">
              <h3 className="font-semibold">San Brothers Assistant</h3>
              <p className="text-xs opacity-90">{currentPortal}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="rounded p-1 hover:bg-primary/80"
                aria-label={isMinimized ? "Maximize" : "Minimize"}
              >
                {isMinimized ? (
                  <Maximize2 className="h-4 w-4" />
                ) : (
                  <Minimize2 className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setMessages([]);
                }}
                className="rounded p-1 hover:bg-primary/80"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          {!isMinimized && (
            <>
              <div className="flex-1 overflow-y-auto space-y-4 p-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-xs rounded-lg px-4 py-2 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))}

                {/* Typing Indicator */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-lg bg-muted px-4 py-2">
                      <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-full bg-foreground animate-bounce" />
                        <div className="h-2 w-2 rounded-full bg-foreground animate-bounce delay-100" />
                        <div className="h-2 w-2 rounded-full bg-foreground animate-bounce delay-200" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Actions (shown after greeting) */}
                {messages.length === 1 && !isLoading && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {config.quickActions.map((action) => (
                      <button
                        key={action}
                        onClick={() => handleQuickAction(action)}
                        className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground hover:bg-secondary/80 transition-colors"
                      >
                        {action}
                      </button>
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
                    className="flex-1"
                  />
                  <Button
                    onClick={() => sendMessage(inputValue)}
                    disabled={isLoading || !inputValue.trim()}
                    size="sm"
                    className="px-3"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
