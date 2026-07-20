import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/ui-app/StatusBadge";
import { EmptyState } from "@/components/ui-app/EmptyState";
import { orderStatusTone, toneText } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeHub } from "@/contexts/RealtimeHubContext";
import { MessageScroller, MessageScrollerProvider, MessageScrollerViewport } from "@/components/ui/message-scroller";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Package,
  AlertTriangle,
  Activity,
  Send,
  ChevronDown,
  ChevronUp,
  XCircle,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

// ── Types ────────────────────────────────────────────────────────────

interface Order {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  total_amount: number;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  quantity: number;
  price_at_purchase: number;
  product?: { name: string } | null;
}

interface Dispute {
  id: string;
  order_id: string;
  customer_email: string;
  reason: string;
  message: string | null;
  status: string;
  reply_message: string | null;
  created_at: string;
  updated_at: string;
}

interface ActivityItem {
  id: string;
  type: "new_order" | "status_change" | "low_stock";
  message: string;
  timestamp: string;
}

const ORDER_STATUSES = [
  "Pending",
  "Order Seen",
  "Order Packaged",
  "Given to Courier",
  "Fulfilled",
  "Problematic",
  "Cancelled",
] as const;

const LAST_SEEN_KEY = "notifications-last-seen";

// ── Helpers ──────────────────────────────────────────────────────────

function timeAgo(dateStr: string, t: (key: string, opts?: any) => string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return t("notifications.just_now");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("notifications.minutes_ago", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("notifications.hours_ago", { count: hours });
  const days = Math.floor(hours / 24);
  return t("notifications.days_ago", { count: days });
}


const STATUS_LABEL_KEYS: Record<string, string> = {
  "Pending": "notifications.status_pending",
  "Order Seen": "notifications.status_order_seen",
  "Order Packaged": "notifications.status_order_packaged",
  "Given to Courier": "notifications.status_given_to_courier",
  "Fulfilled": "notifications.status_fulfilled",
  "Problematic": "notifications.status_problematic",
  "Cancelled": "notifications.status_cancelled",
};

function statusLabel(status: string, t: (key: string) => string): string {
  const key = STATUS_LABEL_KEYS[status];
  return key ? t(key) : status;
}

function formatAmount(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "\u20ac",
    GBP: "\u00a3",
    ALL: "L",
  };
  const sym = symbols[currency] || currency + " ";
  return `${sym}${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ── Sub-components ───────────────────────────────────────────────────

function OrderCard({
  order,
  isNew,
  onStatusChange,
}: {
  order: Order;
  isNew: boolean;
  onStatusChange: (id: string, status: string) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const fetchItems = useCallback(async () => {
    if (items.length > 0) return;
    setLoadingItems(true);
    const { data } = await supabase
      .from("order_items")
      .select("*, product:products(name)")
      .eq("order_id", order.id);
    if (data) setItems(data as unknown as OrderItem[]);
    setLoadingItems(false);
  }, [order.id, items.length]);

  const toggleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) fetchItems();
  };

  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div
      data-reveal
      className={cn(
        "border rounded-lg p-3 transition-all duration-300 animate-in fade-in-0 slide-in-from-bottom-1",
        isNew && "animate-pulse-once ring-2 ring-primary/40 bg-primary/5"
      )}
    >
      <button
        onClick={toggleExpand}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">
            {order.customer_name || order.customer_email || t("notifications.anonymous")}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatAmount(order.total_amount, order.currency)} &middot;{" "}
            {timeAgo(order.created_at, t)}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          <StatusBadge tone={orderStatusTone(order.status)} size="sm">
            {statusLabel(order.status, t)}
          </StatusBadge>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 border-t pt-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
          {loadingItems ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Spinner className="h-3.5 w-3.5" />
              {t("common.loading")}
            </div>
          ) : (
            <>
              {items.length > 0 && (
                <div className="space-y-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between text-xs"
                    >
                      <span className="truncate mr-2">
                        {(item.product as { name: string } | null)?.name ||
                          t("notifications.unknown_product")}{" "}
                        x{item.quantity}
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        {formatAmount(
                          item.price_at_purchase * item.quantity,
                          order.currency
                        )}
                      </span>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalQuantity} {t("common.items")} {t("notifications.reserved")}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Select
                  value={order.status}
                  onValueChange={(v) => onStatusChange(order.id, v)}
                >
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">
                        {statusLabel(s, t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {order.status !== "Cancelled" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 text-xs px-2"
                    onClick={() => onStatusChange(order.id, "Cancelled")}
                  >
                    <XCircle className="h-3 w-3 mr-1" />
                    {t("common.cancel")}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DisputeCard({
  dispute,
  onReply,
  onToggleStatus,
}: {
  dispute: Dispute;
  onReply: (id: string, message: string) => void;
  onToggleStatus: (id: string, status: string) => void;
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState("");

  const handleSend = () => {
    if (!replyText.trim()) return;
    onReply(dispute.id, replyText.trim());
    setReplyText("");
  };

  return (
    <div data-reveal className="border rounded-lg p-3 animate-in fade-in-0 slide-in-from-bottom-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">
            {dispute.customer_email}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {dispute.reason}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          <StatusBadge tone={dispute.status === "Open" ? "danger" : "success"} size="sm">
            {dispute.status === "Open" ? t("notifications.open") : t("notifications.resolved")}
          </StatusBadge>
          <span className="text-[10px] text-muted-foreground">
            {timeAgo(dispute.created_at, t)}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 border-t pt-3 space-y-2 animate-in fade-in-0 slide-in-from-top-1 duration-200">
          {/* Chat bubbles */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {/* Customer message */}
            {dispute.message && (
              <div className="flex justify-start">
                <div className="bg-muted text-sm rounded-lg rounded-tl-none px-3 py-2 max-w-[85%]">
                  {dispute.message}
                </div>
              </div>
            )}
            {!dispute.message && (
              <div className="flex justify-start">
                <div className="bg-muted text-sm rounded-lg rounded-tl-none px-3 py-2 max-w-[85%]">
                  {dispute.reason}
                </div>
              </div>
            )}

            {/* Seller reply */}
            {dispute.reply_message && (
              <div className="flex justify-end">
                <div className="bg-primary text-primary-foreground text-sm rounded-lg rounded-tr-none px-3 py-2 max-w-[85%]">
                  {dispute.reply_message}
                </div>
              </div>
            )}
          </div>

          {/* Reply input */}
          <div className="flex gap-2">
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={t("notifications.type_reply")}
              className="h-8 flex-1 text-xs"
            />
            <Button
              size="sm"
              className="h-8 px-2"
              onClick={handleSend}
              disabled={!replyText.trim()}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Status toggle */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs w-full"
            onClick={() =>
              onToggleStatus(
                dispute.id,
                dispute.status === "Open" ? "Resolved" : "Open"
              )
            }
          >
            {t("notifications.mark_as")} {dispute.status === "Open" ? t("notifications.resolved") : t("notifications.open")}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export default function NotificationSidebar({ asPage = false, linkTo }: { asPage?: boolean; linkTo?: string } = {}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  // businessId is resolved & cached once by AuthProvider (hydrates instantly
  // from localStorage) — no local getSession→businesses waterfall needed here.
  const { businessId } = useAuth();
  const { subscribe } = useRealtimeHub();
  const [open, setOpen] = useState(false);
  // Distinguishes "still loading the first fetch" from a genuinely empty list
  // so we don't flash a false "nothing here" state before data arrives.
  const [firstLoadDone, setFirstLoadDone] = useState(false);

  // Data state
  const [orders, setOrders] = useState<Order[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);

  // Track newly arrived order ids for highlight animation
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const newOrderTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Unread count
  const [lastSeen, setLastSeen] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(LAST_SEEN_KEY);
      return stored ? Number(stored) : 0;
    } catch {
      return 0;
    }
  });

  const unreadCounts = useMemo(() => {
    const ts = lastSeen;
    const orders_ = orders.filter(
      (o) => new Date(o.created_at).getTime() > ts
    ).length;
    const disputes_ = disputes.filter(
      (d) => new Date(d.created_at).getTime() > ts
    ).length;
    const activity_ = activity.filter(
      (a) => new Date(a.timestamp).getTime() > ts
    ).length;
    return { orders: orders_, disputes: disputes_, activity: activity_ };
  }, [orders, disputes, activity, lastSeen]);

  // Mark as seen when the sheet opens (or immediately in page mode)
  useEffect(() => {
    if (open || asPage) {
      const now = Date.now();
      setLastSeen(now);
      try {
        localStorage.setItem(LAST_SEEN_KEY, String(now));
      } catch {}
    }
  }, [open, asPage]);

  // ── Fetch orders ────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    if (!businessId) return;
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setOrders(data as Order[]);
  }, [businessId]);

  // ── Fetch disputes ──────────────────────────────────────────────────
  const fetchDisputes = useCallback(async () => {
    if (!businessId) return;
    const { data } = await supabase
      .from("order_disputes")
      .select("*, order:orders!inner(business_id)")
      .eq("order.business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setDisputes(data as unknown as Dispute[]);
  }, [businessId]);

  // ── Fetch activity ──────────────────────────────────────────────────
  const fetchActivity = useCallback(async () => {
    if (!businessId) return;
    const items: ActivityItem[] = [];

    // Recent orders
    const { data: recentOrders } = await supabase
      .from("orders")
      .select("id, customer_name, total_amount, currency, status, created_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(10);

    if (recentOrders) {
      for (const o of recentOrders) {
        items.push({
          id: `order-${o.id}`,
          type: "new_order",
          message: t("notifications.new_order_from", { name: o.customer_name || t("notifications.anonymous"), amount: formatAmount(o.total_amount, o.currency) }),
          timestamp: o.created_at,
        });
      }
    }

    // Low stock products
    const { data: lowStock } = await supabase
      .from("products")
      .select("id, name, inventory")
      .eq("business_id", businessId)
      .lt("inventory", 10)
      .gt("inventory", 0)
      .order("inventory", { ascending: true })
      .limit(10);

    if (lowStock) {
      for (const p of lowStock) {
        items.push({
          id: `stock-${p.id}`,
          type: "low_stock",
          message: t("notifications.low_on_stock", { name: p.name, count: p.inventory }),
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Sort by timestamp desc
    items.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    setActivity(items);
  }, [businessId, t]);

  // Initial data load
  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    Promise.all([fetchOrders(), fetchDisputes(), fetchActivity()]).finally(() => {
      if (!cancelled) setFirstLoadDone(true);
    });
    return () => {
      cancelled = true;
    };
  }, [businessId, fetchOrders, fetchDisputes, fetchActivity]);

  // Slow safety-net refresh only (5 min) — realtime subscriptions below
  // deliver the actual updates. Frequent polling was redundant DB load.
  useEffect(() => {
    if (!businessId) return;
    const interval = setInterval(fetchActivity, 300000);
    return () => clearInterval(interval);
  }, [businessId, fetchActivity]);

  // ── Real-time subscriptions (via the shared hub channel) ────────────
  useEffect(() => {
    if (!businessId) return;

    const unsubOrders = subscribe("orders", (payload) => {
      if (payload.eventType === "INSERT") {
        const newOrder = payload.new as Order;
        setOrders((prev) => [newOrder, ...prev].slice(0, 20));
        // Highlight new order
        setNewOrderIds((prev) => new Set(prev).add(newOrder.id));
        if (newOrderTimer.current) clearTimeout(newOrderTimer.current);
        newOrderTimer.current = setTimeout(() => {
          setNewOrderIds(new Set());
        }, 3000);
      } else if (payload.eventType === "UPDATE") {
        const updated = payload.new as Order;
        setOrders((prev) =>
          prev.map((o) => (o.id === updated.id ? updated : o))
        );
      } else if (payload.eventType === "DELETE") {
        const deleted = payload.old as { id: string };
        setOrders((prev) => prev.filter((o) => o.id !== deleted.id));
      }
    });

    const unsubDisputes = subscribe("order_disputes", (payload) => {
      if (payload.eventType === "INSERT") {
        const newDispute = payload.new as Dispute;
        setDisputes((prev) => [newDispute, ...prev].slice(0, 20));
      } else if (payload.eventType === "UPDATE") {
        const updated = payload.new as Dispute;
        setDisputes((prev) =>
          prev.map((d) => (d.id === updated.id ? updated : d))
        );
      } else if (payload.eventType === "DELETE") {
        const deleted = payload.old as { id: string };
        setDisputes((prev) => prev.filter((d) => d.id !== deleted.id));
      }
    });

    return () => {
      unsubOrders();
      unsubDisputes();
      if (newOrderTimer.current) clearTimeout(newOrderTimer.current);
    };
  }, [businessId, subscribe]);

  // ── Handlers ────────────────────────────────────────────────────────
  const handleOrderStatusChange = useCallback(
    async (orderId: string, newStatus: string) => {
      // Optimistic update
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);
      if (error) {
        // Revert on failure
        fetchOrders();
      }
    },
    [fetchOrders]
  );

  const handleDisputeReply = useCallback(
    async (disputeId: string, message: string) => {
      // Optimistic update
      setDisputes((prev) =>
        prev.map((d) =>
          d.id === disputeId ? { ...d, reply_message: message } : d
        )
      );
      const { error } = await supabase
        .from("order_disputes")
        .update({ reply_message: message })
        .eq("id", disputeId);
      if (error) {
        fetchDisputes();
      }
    },
    [fetchDisputes]
  );

  const handleDisputeToggleStatus = useCallback(
    async (disputeId: string, newStatus: string) => {
      setDisputes((prev) =>
        prev.map((d) =>
          d.id === disputeId ? { ...d, status: newStatus } : d
        )
      );
      const { error } = await supabase
        .from("order_disputes")
        .update({ status: newStatus })
        .eq("id", disputeId);
      if (error) {
        fetchDisputes();
      }
    },
    [fetchDisputes]
  );

  // ── Render ──────────────────────────────────────────────────────────

  // Show a loading affordance until the first fetch resolves; only then does an
  // empty list mean "genuinely nothing here".
  const loading = !!businessId && !firstLoadDone;

  const triggerButton = (
        <button
          aria-label={t("notifications.title")}
          onClick={linkTo ? () => navigate(linkTo) : undefined}
          className="flex h-12 items-center gap-1.5 rounded-full bg-primary px-3.5 text-primary-foreground shadow-lg transition-transform hover:scale-105 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {/* Per-type counters */}
          {(unreadCounts.orders > 0 || unreadCounts.disputes > 0 || unreadCounts.activity > 0) && (
            <span className="flex items-center gap-1">
              {unreadCounts.orders > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-info px-1 text-[10px] font-bold text-info-foreground" aria-label={`${unreadCounts.orders} ${t("notifications.orders")}`}>
                  {unreadCounts.orders > 99 ? "99+" : unreadCounts.orders}
                </span>
              )}
              {unreadCounts.disputes > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground" aria-label={`${unreadCounts.disputes} ${t("notifications.disputes")}`}>
                  {unreadCounts.disputes > 99 ? "99+" : unreadCounts.disputes}
                </span>
              )}
              {unreadCounts.activity > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-success px-1 text-[10px] font-bold text-success-foreground" aria-label={`${unreadCounts.activity} ${t("notifications.activity")}`}>
                  {unreadCounts.activity > 99 ? "99+" : unreadCounts.activity}
                </span>
              )}
            </span>
          )}
        </button>
  );

  const tabsPanel = (
        <Tabs defaultValue="orders" className="flex min-h-0 flex-1 flex-col pt-2">
          <TabsList className="mx-4 mb-2 grid grid-cols-3">
            <TabsTrigger value="orders" className="text-xs">
              <Package className="h-3.5 w-3.5 mr-1" />
              {t("notifications.orders")}
            </TabsTrigger>
            <TabsTrigger value="disputes" className="text-xs">
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              {t("notifications.disputes")}
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs">
              <Activity className="h-3.5 w-3.5 mr-1" />
              {t("notifications.activity")}
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="flex-1 m-0 min-h-0">
            <MessageScrollerProvider><MessageScroller className="h-full"><MessageScrollerViewport className="px-4 pb-4">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Spinner className="h-5 w-5 text-muted-foreground" />
                </div>
              ) : orders.length === 0 ? (
                <EmptyState
                  compact
                  icon={Package}
                  title={t("notifications.no_orders")}
                  description={t("notifications.no_orders_desc")}
                />
              ) : (
                <div className="space-y-2 pb-2">
                  {orders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      isNew={newOrderIds.has(order.id)}
                      onStatusChange={handleOrderStatusChange}
                    />
                  ))}
                </div>
              )}
            </MessageScrollerViewport></MessageScroller></MessageScrollerProvider>
          </TabsContent>

          {/* Disputes Tab */}
          <TabsContent value="disputes" className="flex-1 m-0 min-h-0">
            <MessageScrollerProvider><MessageScroller className="h-full"><MessageScrollerViewport className="px-4 pb-4">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Spinner className="h-5 w-5 text-muted-foreground" />
                </div>
              ) : disputes.length === 0 ? (
                <EmptyState
                  compact
                  icon={AlertTriangle}
                  title={t("notifications.no_disputes")}
                  description={t("notifications.no_disputes_desc")}
                />
              ) : (
                <div className="space-y-2 pb-2">
                  {disputes.map((dispute) => (
                    <DisputeCard
                      key={dispute.id}
                      dispute={dispute}
                      onReply={handleDisputeReply}
                      onToggleStatus={handleDisputeToggleStatus}
                    />
                  ))}
                </div>
              )}
            </MessageScrollerViewport></MessageScroller></MessageScrollerProvider>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="flex-1 m-0 min-h-0">
            <MessageScrollerProvider><MessageScroller className="h-full"><MessageScrollerViewport className="px-4 pb-4">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Spinner className="h-5 w-5 text-muted-foreground" />
                </div>
              ) : activity.length === 0 ? (
                <EmptyState
                  compact
                  icon={Activity}
                  title={t("notifications.no_activity")}
                  description={t("notifications.no_activity_desc")}
                />
              ) : (
                <div className="space-y-2 pb-2">
                  {activity.map((item) => (
                    <div
                      key={item.id}
                      data-reveal
                      className="flex items-start gap-2 border rounded-lg p-3 animate-in fade-in-0 slide-in-from-bottom-1"
                    >
                      <div className="mt-0.5 shrink-0">
                        {item.type === "new_order" && (
                          <Package className={cn("h-4 w-4", toneText.info)} />
                        )}
                        {item.type === "status_change" && (
                          <Activity className="h-4 w-4 text-primary" />
                        )}
                        {item.type === "low_stock" && (
                          <AlertTriangle className={cn("h-4 w-4", toneText.warning)} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{item.message}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {timeAgo(item.timestamp, t)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </MessageScrollerViewport></MessageScroller></MessageScrollerProvider>
          </TabsContent>
        </Tabs>
  );

  // Page mode (mobile /notifications route): the panel fills its container —
  // no popover, no floating trigger, the page chrome provides title/back.
  if (asPage) {
    return <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card">{tabsPanel}</div>;
  }

  // Mobile: the floating bell keeps its live unread badges but navigates to
  // the dedicated /notifications page instead of opening a cramped popover.
  if (linkTo) return triggerButton;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={14}
        className="flex h-[min(600px,calc(100dvh-7rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border p-0 shadow-2xl sm:w-[400px]"
      >
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold">{t("notifications.title")}</h2>
          <button onClick={() => setOpen(false)} aria-label={t("common.close")} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        {tabsPanel}
      </PopoverContent>
    </Popover>
  );
}
