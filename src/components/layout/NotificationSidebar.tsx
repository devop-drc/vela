import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

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

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.max(0, now - then);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function statusColor(status: string): string {
  switch (status) {
    case "Pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "Order Seen":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Order Packaged":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "Given to Courier":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "Fulfilled":
      return "bg-green-100 text-green-800 border-green-200";
    case "Problematic":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "Cancelled":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
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
  businessId,
  onStatusChange,
}: {
  order: Order;
  isNew: boolean;
  businessId: string;
  onStatusChange: (id: string, status: string) => void;
}) {
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
      className={cn(
        "border rounded-lg p-3 transition-all duration-300",
        isNew && "animate-pulse-once ring-2 ring-primary/40 bg-primary/5"
      )}
    >
      <button
        onClick={toggleExpand}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm truncate">
            {order.customer_name || order.customer_email || "Anonymous"}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatAmount(order.total_amount, order.currency)} &middot;{" "}
            {timeAgo(order.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          <Badge className={cn("text-[10px] px-1.5 py-0", statusColor(order.status))}>
            {order.status}
          </Badge>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 border-t pt-3">
          {loadingItems ? (
            <p className="text-xs text-muted-foreground">Loading items...</p>
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
                          "Unknown product"}{" "}
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
                    {totalQuantity} item{totalQuantity !== 1 ? "s" : ""} reserved
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
                        {s}
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
                    Cancel
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
  const [expanded, setExpanded] = useState(false);
  const [replyText, setReplyText] = useState("");

  const handleSend = () => {
    if (!replyText.trim()) return;
    onReply(dispute.id, replyText.trim());
    setReplyText("");
  };

  return (
    <div className="border rounded-lg p-3">
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
          <Badge
            className={cn(
              "text-[10px] px-1.5 py-0",
              dispute.status === "Open"
                ? "bg-red-100 text-red-800 border-red-200"
                : "bg-green-100 text-green-800 border-green-200"
            )}
          >
            {dispute.status}
          </Badge>
          <span className="text-[10px] text-muted-foreground">
            {timeAgo(dispute.created_at)}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 border-t pt-3 space-y-2">
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
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type a reply..."
              className="flex-1 h-8 px-3 text-xs border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
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
            Mark as {dispute.status === "Open" ? "Resolved" : "Open"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────

export default function NotificationSidebar() {
  const [open, setOpen] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

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

  const unreadCount = useMemo(() => {
    const ts = lastSeen;
    const orderCount = orders.filter(
      (o) => new Date(o.created_at).getTime() > ts
    ).length;
    const disputeCount = disputes.filter(
      (d) => new Date(d.created_at).getTime() > ts
    ).length;
    return orderCount + disputeCount;
  }, [orders, disputes, lastSeen]);

  // Mark as seen when sheet opens
  useEffect(() => {
    if (open) {
      const now = Date.now();
      setLastSeen(now);
      try {
        localStorage.setItem(LAST_SEEN_KEY, String(now));
      } catch {}
    }
  }, [open]);

  // Fetch businessId once on mount
  useEffect(() => {
    let cancelled = false;
    const fetchBusiness = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (business && !cancelled) {
        setBusinessId(business.id);
      }
    };
    fetchBusiness();
    return () => {
      cancelled = true;
    };
  }, []);

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
          message: `New order from ${o.customer_name || "Anonymous"} \u2014 ${formatAmount(o.total_amount, o.currency)}`,
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
          message: `Product ${p.name} is low on stock (${p.inventory} left)`,
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
  }, [businessId]);

  // Initial data load
  useEffect(() => {
    if (!businessId) return;
    fetchOrders();
    fetchDisputes();
    fetchActivity();
  }, [businessId, fetchOrders, fetchDisputes, fetchActivity]);

  // Activity auto-refresh every 30s
  useEffect(() => {
    if (!businessId) return;
    const interval = setInterval(fetchActivity, 30000);
    return () => clearInterval(interval);
  }, [businessId, fetchActivity]);

  // ── Real-time subscriptions ─────────────────────────────────────────
  useEffect(() => {
    if (!businessId) return;

    const ordersChannel = supabase
      .channel("notifications-orders")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
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
        }
      )
      .subscribe();

    const disputesChannel = supabase
      .channel("notifications-disputes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_disputes",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newDispute = payload.new as Dispute;
            // Verify it belongs to this business via a quick check
            supabase
              .from("orders")
              .select("business_id")
              .eq("id", newDispute.order_id)
              .single()
              .then(({ data }) => {
                if (data?.business_id === businessId) {
                  setDisputes((prev) =>
                    [newDispute, ...prev].slice(0, 20)
                  );
                }
              });
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as Dispute;
            setDisputes((prev) =>
              prev.map((d) => (d.id === updated.id ? updated : d))
            );
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            setDisputes((prev) => prev.filter((d) => d.id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(disputesChannel);
      if (newOrderTimer.current) clearTimeout(newOrderTimer.current);
    };
  }, [businessId]);

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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="fixed top-1/2 -translate-y-1/2 right-0 z-50 flex flex-col items-center gap-1 rounded-l-lg bg-card border border-r-0 border-border px-2 py-3 shadow-md hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-ring">
          <Bell className="h-4 w-4" />
          <span className="text-[10px] font-medium writing-mode-vertical" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>Notifications</span>
          {unreadCount > 0 && (
            <span className="flex items-center justify-center h-4 min-w-[16px] rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <div className="px-4 pt-4 pb-2">
          <h2 className="text-lg font-semibold">Notifications</h2>
        </div>

        <Tabs defaultValue="orders" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mb-2 grid grid-cols-3">
            <TabsTrigger value="orders" className="text-xs">
              <Package className="h-3.5 w-3.5 mr-1" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="disputes" className="text-xs">
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              Disputes
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs">
              <Activity className="h-3.5 w-3.5 mr-1" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="flex-1 m-0 min-h-0">
            <ScrollArea className="h-full px-4 pb-4">
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No recent orders
                </p>
              ) : (
                <div className="space-y-2 pb-2">
                  {orders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      isNew={newOrderIds.has(order.id)}
                      businessId={businessId!}
                      onStatusChange={handleOrderStatusChange}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Disputes Tab */}
          <TabsContent value="disputes" className="flex-1 m-0 min-h-0">
            <ScrollArea className="h-full px-4 pb-4">
              {disputes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No disputes
                </p>
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
            </ScrollArea>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="flex-1 m-0 min-h-0">
            <ScrollArea className="h-full px-4 pb-4">
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No recent activity
                </p>
              ) : (
                <div className="space-y-2 pb-2">
                  {activity.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 border rounded-lg p-3"
                    >
                      <div className="mt-0.5 shrink-0">
                        {item.type === "new_order" && (
                          <Package className="h-4 w-4 text-blue-500" />
                        )}
                        {item.type === "status_change" && (
                          <Activity className="h-4 w-4 text-purple-500" />
                        )}
                        {item.type === "low_stock" && (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{item.message}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {timeAgo(item.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
