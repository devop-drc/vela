/**
 * Vela Assistant — a Facebook-Messenger-style chat backed by the `chat` edge
 * function (Gemini), constrained to help with Vela + how to use/navigate the
 * app. Conversation history persists in localStorage.
 *
 * Two presentations share the same panel:
 *  - <VelaChat/>       desktop floating button → Popover card (opens upward)
 *  - <VelaChatPanel/>  standalone panel, used by the mobile /chat page
 */
import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  MessageScroller, MessageScrollerProvider, MessageScrollerViewport,
  MessageScrollerContent, MessageScrollerItem, MessageScrollerButton,
} from "@/components/ui/message-scroller";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { MessageCircle, Send, Sparkles, X, RotateCcw } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useTranslation } from "react-i18next";

type Msg = { role: "user" | "assistant"; content: string };

const HISTORY_KEY = "vela:chat:history:v1";

const GREETING_EN = "Hi! I'm the Vela assistant 👋 Ask me anything about Vela, or how to do something in the app — like adding a product, connecting Instagram, or designing your storefront.";
const GREETING_SQ = "Përshëndetje! Jam asistenti i Vela 👋 Më pyet çdo gjë për Vela, ose si të bësh diçka në aplikacion — si të shtosh një produkt, të lidhësh Instagramin, ose të dizajnosh dyqanin.";

const SUGGESTIONS_EN = ["How do I add a product?", "How do I connect Instagram?", "How do I design my storefront?"];
const SUGGESTIONS_SQ = ["Si të shtoj një produkt?", "Si e lidh Instagramin?", "Si e dizajnoj dyqanin?"];

const loadHistory = (): Msg[] | null => {
  try { const s = localStorage.getItem(HISTORY_KEY); const a = s ? JSON.parse(s) : null; return Array.isArray(a) && a.length ? a : null; } catch { return null; }
};

/** The chat itself: header + messages + input. Fills its container. */
export const VelaChatPanel = ({ onClose, className, autoFocus = true }: {
  onClose?: () => void;
  className?: string;
  autoFocus?: boolean;
}) => {
  const { i18n } = useTranslation();
  const sq = i18n.language?.startsWith("sq");
  const greeting = (): Msg => ({ role: "assistant", content: sq ? GREETING_SQ : GREETING_EN });

  const [messages, setMessages] = useState<Msg[]>(() => loadHistory() ?? [greeting()]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist history (cap at 40 turns).
  useEffect(() => {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-40))); } catch { /* private mode */ }
  }, [messages]);

  useEffect(() => { if (autoFocus) setTimeout(() => inputRef.current?.focus(), 120); }, [autoFocus]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("chat", { body: { messages: next } });
      const reply = (!error && data?.reply)
        ? data.reply
        : (sq ? "Më vjen keq, diçka shkoi keq. Provo përsëri." : "Sorry, something went wrong. Please try again.");
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: sq ? "Nuk munda të lidhem. Provo përsëri." : "I couldn't connect. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const resetChat = () => {
    setMessages([greeting()]);
    try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
    setTimeout(() => inputRef.current?.focus(), 60);
  };

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden bg-card", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-primary/5 px-4 py-3">
        <span className="relative">
          <img src="/vela-icon.svg" alt="Vela" className="h-10 w-10 rounded-full ring-1 ring-border" />
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-success" />
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold leading-tight">
            Vela {sq ? "Asistenti" : "Assistant"}
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </p>
          <p className="text-xs text-success">{sq ? "Në linjë · zakonisht përgjigjet menjëherë" : "Online · usually replies instantly"}</p>
        </div>
        <div className="ml-auto flex items-center gap-0.5">
          <button onClick={resetChat} aria-label={sq ? "Bisedë e re" : "New chat"} title={sq ? "Bisedë e re" : "New chat"} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <RotateCcw className="h-4 w-4" />
          </button>
          {onClose && (
            <button onClick={onClose} aria-label={sq ? "Mbyll" : "Close"} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages — auto-scrolling message scroller */}
      <MessageScrollerProvider autoScroll>
        <MessageScroller>
          <MessageScrollerViewport className="p-4">
            <MessageScrollerContent className="gap-3" aria-busy={loading}>
              {messages.map((m, i) => (
                <MessageScrollerItem
                  key={i}
                  messageId={i}
                  scrollAnchor={m.role === "user"}
                  className={cn("flex items-end gap-2", m.role === "user" ? "flex-row-reverse" : "flex-row")}
                >
                  {m.role === "assistant" && <img src="/vela-icon.svg" alt="" className="h-6 w-6 shrink-0 rounded-full ring-1 ring-border" />}
                  <div
                    className={cn(
                      "max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                      m.role === "user" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted text-foreground",
                    )}
                  >
                    {m.content}
                  </div>
                </MessageScrollerItem>
              ))}
              {loading && (
                <div className="flex items-end gap-2">
                  <img src="/vela-icon.svg" alt="" className="h-6 w-6 shrink-0 rounded-full ring-1 ring-border" />
                  <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3.5 py-3">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60" />
                  </div>
                </div>
              )}
              {messages.length === 1 && !loading && (
                <div className="mt-1 flex flex-wrap gap-2">
                  {(sq ? SUGGESTIONS_SQ : SUGGESTIONS_EN).map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary">
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      {/* Input */}
      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 border-t p-3">
        <Input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={sq ? "Shkruaj një mesazh…" : "Type a message…"}
          className="h-10 rounded-full border-transparent bg-muted/60 focus-visible:border-input focus-visible:bg-background"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          aria-label={sq ? "Dërgo" : "Send"}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {loading ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
};

/** Floating chat button → popover card (desktop presentation). */
export const VelaChat = () => {
  const { i18n } = useTranslation();
  const sq = i18n.language?.startsWith("sq");
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={sq ? "Bisedo me Vela" : "Chat with Vela"}
          className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-1 ring-inset ring-primary-foreground/25 transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="end"
        sideOffset={14}
        className="h-[min(560px,calc(100dvh-7rem))] w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border p-0 shadow-2xl sm:w-[384px]"
      >
        <VelaChatPanel onClose={() => setOpen(false)} className="h-full" autoFocus={open} />
      </PopoverContent>
    </Popover>
  );
};
