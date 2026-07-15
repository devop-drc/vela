/**
 * Message Scroller — a chat/message scroll container that follows the live edge.
 *
 * API-compatible with shadcn's `message-scroller` (MessageScrollerProvider /
 * MessageScroller / MessageScrollerViewport / MessageScrollerContent /
 * MessageScrollerItem / MessageScrollerButton). Behaviour: with `autoScroll`,
 * it sticks to the bottom as new content arrives, but only while the reader is
 * already near the bottom — if they scroll up, following backs off and their
 * position is preserved. `MessageScrollerButton` (and `scrollToEnd`) re-engage
 * following.
 *
 * NOTE: the official shadcn registry item was not reachable from this project's
 * CLI (404 on every registry path); this is a faithful local implementation.
 */
import * as React from "react";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Ctx = {
  autoScroll: boolean;
  viewportRef: React.RefObject<HTMLDivElement>;
  atBottom: boolean;
  atBottomRef: React.MutableRefObject<boolean>;
  setAtBottom: (v: boolean) => void;
  scrollToEnd: (behavior?: ScrollBehavior) => void;
};

const MessageScrollerContext = React.createContext<Ctx | null>(null);
const useMessageScroller = () => {
  const ctx = React.useContext(MessageScrollerContext);
  if (!ctx) throw new Error("MessageScroller components must be used within <MessageScrollerProvider>");
  return ctx;
};

export function MessageScrollerProvider({
  autoScroll = false,
  children,
}: {
  autoScroll?: boolean;
  defaultScrollPosition?: "top" | "bottom";
  scrollPreviousItemPeek?: number;
  children: React.ReactNode;
}) {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const atBottomRef = React.useRef(true);
  const [atBottom, setAtBottomState] = React.useState(true);

  const setAtBottom = React.useCallback((v: boolean) => {
    atBottomRef.current = v;
    setAtBottomState(v);
  }, []);

  const scrollToEnd = React.useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
    setAtBottom(true);
  }, [setAtBottom]);

  const value = React.useMemo(
    () => ({ autoScroll, viewportRef, atBottom, atBottomRef, setAtBottom, scrollToEnd }),
    [autoScroll, atBottom, setAtBottom, scrollToEnd],
  );

  return <MessageScrollerContext.Provider value={value}>{children}</MessageScrollerContext.Provider>;
}

export const MessageScroller = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("relative flex min-h-0 flex-1 flex-col", className)} {...props} />
  ),
);
MessageScroller.displayName = "MessageScroller";

export const MessageScrollerViewport = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, _ref) => {
    const { viewportRef, setAtBottom, atBottomRef, autoScroll } = useMessageScroller();

    const NEAR = 56; // px from the bottom still counts as "at bottom"

    const handleScroll = React.useCallback(() => {
      const el = viewportRef.current;
      if (!el) return;
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      setAtBottom(dist <= NEAR);
    }, [setAtBottom, viewportRef]);

    // Follow the live edge: when content grows and the reader was already near
    // the bottom, jump to the new bottom. A MutationObserver catches new
    // messages, streamed text, images loading, etc.
    React.useEffect(() => {
      const el = viewportRef.current;
      if (!el || !autoScroll) return; // non-chat lists stay at the top
      el.scrollTop = el.scrollHeight; // start pinned to the newest
      const stick = () => { if (atBottomRef.current) el.scrollTop = el.scrollHeight; };
      const obs = new MutationObserver(stick);
      obs.observe(el, { childList: true, subtree: true, characterData: true });
      return () => obs.disconnect();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoScroll]);

    return (
      <div ref={viewportRef} onScroll={handleScroll} className={cn("min-h-0 flex-1 overflow-y-auto", className)} {...props}>
        {children}
      </div>
    );
  },
);
MessageScrollerViewport.displayName = "MessageScrollerViewport";

export const MessageScrollerContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex flex-col", className)} {...props} />,
);
MessageScrollerContent.displayName = "MessageScrollerContent";

export const MessageScrollerItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { messageId?: string | number; scrollAnchor?: boolean }
>(({ className, messageId, scrollAnchor, ...props }, ref) => (
  <div
    ref={ref}
    data-message-id={messageId}
    data-scroll-anchor={scrollAnchor ? "true" : undefined}
    className={className}
    {...props}
  />
));
MessageScrollerItem.displayName = "MessageScrollerItem";

export const MessageScrollerButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const { atBottom, scrollToEnd } = useMessageScroller();
  if (atBottom) return null;
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => scrollToEnd()}
      aria-label="Scroll to latest"
      className={cn(
        "absolute bottom-3 left-1/2 z-10 grid h-9 w-9 -translate-x-1/2 place-items-center rounded-full border bg-card text-foreground shadow-md transition-colors hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      {...props}
    >
      <ArrowDown className="h-4 w-4" />
    </button>
  );
});
MessageScrollerButton.displayName = "MessageScrollerButton";

// Convenience placeholder matching the docs' `<Message />` slot — the consumer
// renders their own bubble as the item's child instead.
export const Message = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
