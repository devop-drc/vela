import { useEffect, useState, useMemo, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { readCache, writeCache } from "@/lib/pageCache";
import { showError, showSuccess } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderDetailModal } from "@/components/OrderDetailModal";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/contexts/PageTitleContext";
import { useShop } from "@/contexts/ShopContext";
import { formatCurrency } from "@/lib/formatters";
import { DateRangePicker } from "@/components/ui/DateRangePicker";
import { DateRange } from "react-day-picker";
import {
  Banknote,
  ShoppingBag,
  Clock,
  CheckCircle2,
  Truck,
  PackageCheck,
  Download,
  X,
  ChevronRight,
} from "lucide-react";
import { gsap } from "gsap";
import { Spinner } from "@/components/ui/spinner";
import { StatCard } from "@/components/ui-app/StatCard";
import { CommandBar } from "@/components/ui-app/CommandBar";
import { SearchInput } from "@/components/ui-app/SearchInput";
import { StatusBadge } from "@/components/ui-app/StatusBadge";
import { orderStatusTone } from "@/lib/status";
import { useReveal, useGsap, DURATION, EASE } from "@/lib/anim";
import { useAuth } from "@/contexts/AuthContext";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";

type OrderStatus =
  | "Pending"
  | "Order Seen"
  | "Order Packaged"
  | "Given to Courier"
  | "Fulfilled"
  | "Problematic"
  | "Cancelled";

type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  status: OrderStatus;
  total_amount: number;
  created_at: string;
  updated_at: string;
  currency: string;
  payment_method: string;
  payment_status: string;
  shipping_address?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_zip?: string;
  shipping_country?: string;
  shipping_notes_seller?: string;
  shipping_notes_courier?: string;
  item_count?: number;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { value: "All", labelKey: "common.all" },
  { value: "Pending", labelKey: "orders.pending" },
  { value: "In Progress", labelKey: "orders.in_progress" },
  { value: "Fulfilled", labelKey: "orders.fulfilled" },
  { value: "Problematic", labelKey: "orders.problematic" },
  { value: "Cancelled", labelKey: "orders.cancelled" },
] as const;

type TabValue = (typeof STATUS_TABS)[number]["value"];

const IN_PROGRESS_STATUSES: OrderStatus[] = [
  "Order Seen",
  "Order Packaged",
  "Given to Courier",
];

const ALL_STATUSES: OrderStatus[] = [
  "Pending",
  "Order Seen",
  "Order Packaged",
  "Given to Courier",
  "Fulfilled",
  "Problematic",
  "Cancelled",
];

function relativeTime(dateStr: string, t: TFunction): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return t("notifications.just_now");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("notifications.minutes_ago", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("notifications.hours_ago", { count: hours });
  const days = Math.floor(hours / 24);
  if (days < 30) return t("notifications.days_ago", { count: days });
  return new Date(dateStr).toLocaleDateString();
}

function exportOrdersCSV(orders: Order[], currency: string) {
  const headers = [
    "Order ID",
    "Customer",
    "Email",
    "Status",
    "Total",
    "Currency",
    "Created",
  ];
  const rows = orders.map((o) => [
    o.id,
    o.customer_name,
    o.customer_email,
    o.status,
    o.total_amount,
    o.currency,
    new Date(o.created_at).toISOString(),
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `orders-export-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Empty State ─────────────────────────────────────────────────────────────

const EmptyState = ({ hasFilters }: { hasFilters: boolean }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
      <PackageCheck className="h-12 w-12 text-muted-foreground/40" />
      <p className="text-lg font-medium text-muted-foreground">
        {hasFilters ? t("orders.no_match") : t("orders.no_orders")}
      </p>
      <p className="text-sm text-muted-foreground/70">
        {hasFilters ? t("orders.no_match_desc") : t("orders.no_orders_desc")}
      </p>
    </div>
  );
};

// ─── Inline Status Dropdown ───────────────────────────────────────────────────

interface InlineStatusDropdownProps {
  orderId: string;
  currentStatus: OrderStatus;
  onOptimisticUpdate: (id: string, status: OrderStatus) => void;
}

const InlineStatusDropdown = ({
  orderId,
  currentStatus,
  onOptimisticUpdate,
}: InlineStatusDropdownProps) => {
  const { t } = useTranslation();
  const [isUpdating, setIsUpdating] = useState(false);
  const [pendingCancel, setPendingCancel] = useState(false);

  const applyStatus = async (newStatus: OrderStatus) => {
    // Optimistic update
    onOptimisticUpdate(orderId, newStatus);
    setIsUpdating(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);
    if (error) {
      showError("Failed to update status.");
      // Revert
      onOptimisticUpdate(orderId, currentStatus);
    } else {
      showSuccess(`Status updated to "${newStatus}".`);
    }
    setIsUpdating(false);
  };

  const handleChange = async (newStatus: OrderStatus) => {
    if (newStatus === currentStatus) return;
    // Cancelling restores inventory and can't be undone — confirm first.
    if (newStatus === "Cancelled") {
      setPendingCancel(true);
      return;
    }
    applyStatus(newStatus);
  };

  return (
    <>
    <AlertDialog open={pendingCancel} onOpenChange={setPendingCancel}>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
          <AlertDialogDescription>
            The reserved stock will be returned to your inventory. This can't be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep order</AlertDialogCancel>
          <AlertDialogAction onClick={() => { setPendingCancel(false); applyStatus("Cancelled"); }}>
            Cancel order
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <Select
      value={currentStatus}
      onValueChange={(v) => handleChange(v as OrderStatus)}
      disabled={isUpdating}
    >
      <SelectTrigger
        title={t("orders.change_status")}
        className="h-7 w-[150px] rounded-md border-0 bg-transparent px-2 text-xs shadow-none transition-colors hover:bg-muted focus:ring-0"
        onClick={(e) => e.stopPropagation()}
      >
        {isUpdating ? (
          <Spinner className="h-3 w-3" />
        ) : (
          <StatusBadge tone={orderStatusTone(currentStatus)} size="sm">
            {currentStatus}
          </StatusBadge>
        )}
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {ALL_STATUSES.map((s) => (
          <SelectItem key={s} value={s} className="text-xs">
            <StatusBadge tone={orderStatusTone(s)} size="sm">
              {s}
            </StatusBadge>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    </>
  );
};

// ─── Order Table ──────────────────────────────────────────────────────────────

interface OrderTableProps {
  orders: Order[];
  onSelectOrder: (order: Order) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  onOptimisticUpdate: (id: string, status: OrderStatus) => void;
  hasFilters: boolean;
}

const OrderTable = ({
  orders,
  onSelectOrder,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onOptimisticUpdate,
  hasFilters,
}: OrderTableProps) => {
  const { t } = useTranslation();
  const { shopDetails, convertCurrency } = useShop();
  // Subtle staggered entrance for the rows on first load (reduced-motion safe).
  const tableRef = useReveal<HTMLTableElement>({ y: 8, stagger: 0.03 }, []);

  if (!shopDetails) return null;

  const allSelected = orders.length > 0 && orders.every((o) => selectedIds.has(o.id));
  const someSelected = orders.some((o) => selectedIds.has(o.id)) && !allSelected;

  return (
    <Table ref={tableRef} data-tour="orders-list">
      <TableHeader>
        <TableRow>
          <TableHead className="w-10 pr-0">
            <Checkbox
              checked={allSelected ? true : someSelected ? "indeterminate" : false}
              onCheckedChange={(checked) => onToggleAll(!!checked)}
              aria-label="Select all"
            />
          </TableHead>
          <TableHead>{t("orders.order")}</TableHead>
          <TableHead>{t("orders.customer")}</TableHead>
          <TableHead className="hidden sm:table-cell">{t("orders.items")}</TableHead>
          <TableHead>{t("orders.created")}</TableHead>
          <TableHead>{t("orders.status")}</TableHead>
          <TableHead className="text-right">{t("orders.total")}</TableHead>
          <TableHead className="w-[44px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.length > 0 ? (
          orders.map((order) => (
            <TableRow
              key={order.id}
              data-reveal
              className={cn(
                "cursor-pointer transition-colors",
                selectedIds.has(order.id) && "bg-muted/60"
              )}
              onClick={() => onSelectOrder(order)}
            >
              <TableCell className="pr-0" onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(order.id)}
                  onCheckedChange={() => onToggleSelect(order.id)}
                  aria-label="Select row"
                />
              </TableCell>
              <TableCell className="font-mono text-sm font-medium text-muted-foreground">
                #{order.id.substring(0, 8)}
              </TableCell>
              <TableCell>
                <div className="font-medium leading-tight">{order.customer_name}</div>
                <div className="text-xs text-muted-foreground">{order.customer_email}</div>
              </TableCell>
              <TableCell className="hidden text-muted-foreground text-sm sm:table-cell">
                {order.item_count != null ? order.item_count : "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                <span title={new Date(order.created_at).toLocaleString()}>
                  {relativeTime(order.created_at, t)}
                </span>
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <InlineStatusDropdown
                  orderId={order.id}
                  currentStatus={order.status}
                  onOptimisticUpdate={onOptimisticUpdate}
                />
              </TableCell>
              <TableCell className="text-right font-medium">
                <div>
                  {formatCurrency(
                    convertCurrency(order.total_amount, order.currency, shopDetails.currency),
                    shopDetails.currency
                  )}
                </div>
                {order.currency !== shopDetails.currency && (
                  <div className="text-xs font-normal text-muted-foreground">
                    ~{formatCurrency(order.total_amount, order.currency)}
                  </div>
                )}
              </TableCell>
              <TableCell className="text-right">
                <ChevronRight className="inline-block h-4 w-4 text-muted-foreground/50" aria-label={t("orders.details")} />
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={8} className="p-0">
              <EmptyState hasFilters={hasFilters} />
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

// ─── Bulk Action Bar ──────────────────────────────────────────────────────────

interface BulkActionBarProps {
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onBulkStatusChange: (status: OrderStatus) => void;
  onExport: () => void;
  isUpdating: boolean;
}

const BulkActionBar = ({
  selectedIds,
  onClearSelection,
  onBulkStatusChange,
  onExport,
  isUpdating,
}: BulkActionBarProps) => {
  const { t } = useTranslation();
  const count = selectedIds.size;
  // Floating bar (no layout shift) with a subtle slide-up entrance. Centering is
  // handled by the flex wrapper so GSAP's y transform never fights an x-translate.
  const barRef = useGsap<HTMLDivElement>((el) => {
    gsap.from(el, { y: 24, opacity: 0, duration: DURATION.base, ease: EASE.out });
  }, [count > 0]);

  if (count === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex justify-center px-4">
      <div
        ref={barRef}
        className="pointer-events-auto flex max-w-[calc(100vw-2rem)] items-center gap-3 overflow-x-auto rounded-xl border bg-background/80 px-4 py-2.5 text-sm shadow-lg backdrop-blur-xl"
      >
        <span className="whitespace-nowrap font-medium">
          {t("orders.selected", { count })}
        </span>
        <div className="flex items-center gap-2">
          <Select onValueChange={(v) => onBulkStatusChange(v as OrderStatus)} disabled={isUpdating}>
            <SelectTrigger className="h-8 text-xs w-[160px]">
              <SelectValue placeholder={t("orders.change_status")} />
            </SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 text-xs"
            onClick={onExport}
          >
            <Download className="h-3.5 w-3.5" />
            {t("common.export")}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClearSelection}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const Orders = () => {
  const { setTitle } = usePageTitle();
  const { t } = useTranslation();
  const { shopDetails, convertCurrency } = useShop();
  // Business id is resolved once by the shared AuthProvider (cached, instant) —
  // no getUser() + businesses waterfall on every fetch/realtime refresh.
  const { businessId, ensureBusinessId } = useAuth();
  const [orders, setOrders] = useState<Order[]>(() => readCache<Order[]>("orders") ?? []);
  const [isLoading, setIsLoading] = useState(() => !readCache<Order[]>("orders"));
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount_high" | "amount_low" | "name">("newest");
  const [paymentFilter, setPaymentFilter] = useState<"all" | "card" | "cash_on_delivery">("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"all" | "pending" | "processing" | "paid" | "failed">("all");

  useEffect(() => {
    setTitle(t("nav.orders"));
  }, [setTitle, t]);

  // `silent` skips the loading skeleton — used for realtime refreshes so the
  // list updates in place without flashing.
  const fetchOrders = useCallback(async (silent = false) => {
    // No skeleton when we already have cached rows to show (or on silent
    // realtime refreshes) — revalidate quietly instead.
    if (!silent && !readCache("orders")) setIsLoading(true);
    // Resolve the business id from the shared AuthProvider cache (instant if
    // already known) instead of a getUser() → businesses round-trip each call.
    const bizId = await ensureBusinessId();
    if (!bizId) {
      if (!silent) setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select("*, updated_at, order_items(count)")
      .eq("business_id", bizId)
      .order("created_at", { ascending: false });

    if (error) {
      if (!silent) showError("Failed to fetch orders.");
    } else {
      const withCounts = (data ?? []).map((o: any) => ({
        ...o,
        item_count: Array.isArray(o.order_items) ? (o.order_items[0]?.count ?? 0) : 0,
      }));
      setOrders(withCounts as Order[]);
      writeCache("orders", withCounts as Order[]);
    }
    if (!silent) setIsLoading(false);
  }, [ensureBusinessId]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Live-update the list when orders change for this business (new orders,
  // status changes from elsewhere) so the seller doesn't need to refresh.
  // Bursts of changes are debounced into a single quiet refetch.
  useEffect(() => {
    if (!businessId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase
      .channel(`orders_list:${businessId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `business_id=eq.${businessId}` },
        () => {
          clearTimeout(timer);
          timer = setTimeout(() => fetchOrders(true), 400);
        }
      )
      .subscribe();
    return () => { clearTimeout(timer); supabase.removeChannel(channel); };
  }, [businessId, fetchOrders]);

  // Open OrderDetailModal if orderId is in URL
  useEffect(() => {
    const orderIdFromUrl = searchParams.get("orderId");
    if (orderIdFromUrl && orders.length > 0) {
      const orderToOpen = orders.find((o) => o.id === orderIdFromUrl);
      if (orderToOpen) {
        setSelectedOrder(orderToOpen);
        searchParams.delete("orderId");
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [orders, searchParams, setSearchParams]);

  // Optimistic update for inline/bulk status changes
  const handleOptimisticUpdate = useCallback((id: string, status: OrderStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status } : o))
    );
  }, []);

  // Filtered + sorted orders
  const filteredOrders = useMemo(() => {
    let result = orders.filter((order) => {
      // Tab filter
      if (activeTab === "In Progress") {
        if (!IN_PROGRESS_STATUSES.includes(order.status)) return false;
      } else if (activeTab !== "All") {
        if (order.status !== activeTab) return false;
      }

      // Search
      const lowerSearch = searchTerm.toLowerCase();
      if (lowerSearch && !(
        order.customer_name?.toLowerCase().includes(lowerSearch) ||
        order.customer_email?.toLowerCase().includes(lowerSearch) ||
        order.id.toLowerCase().includes(lowerSearch)
      )) return false;

      // Date range
      if (dateRange?.from) {
        const orderDate = new Date(order.created_at);
        if (orderDate < dateRange.from) return false;
        if (dateRange.to && orderDate > new Date(new Date(dateRange.to).setHours(23, 59, 59, 999))) return false;
      }

      // Payment method filter
      if (paymentFilter !== "all" && order.payment_method !== paymentFilter) return false;

      // Payment status filter
      if (paymentStatusFilter !== "all" && order.payment_status !== paymentStatusFilter) return false;

      return true;
    });

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "newest": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "amount_high": return b.total_amount - a.total_amount;
        case "amount_low": return a.total_amount - b.total_amount;
        case "name": return (a.customer_name || "").localeCompare(b.customer_name || "");
        default: return 0;
      }
    });

    return result;
  }, [orders, activeTab, searchTerm, dateRange, paymentFilter, paymentStatusFilter, sortBy]);

  // Stats — computed from ALL orders (not filtered) for the top cards
  const stats = useMemo(() => {
    if (!shopDetails) return null;

    const total = orders.length;
    const pending = orders.filter((o) => o.status === "Pending").length;
    const inProgress = orders.filter((o) =>
      IN_PROGRESS_STATUSES.includes(o.status)
    ).length;
    const fulfilled = orders.filter((o) => o.status === "Fulfilled").length;
    // Revenue counts only realised sales (Fulfilled + paid) so it matches the
    // dashboard's figure — cancelled/unpaid orders are excluded.
    const revenueOrders = orders.filter(
      (o) => o.status === "Fulfilled" && o.payment_status === "paid"
    );
    const totalRevenue = revenueOrders.reduce((sum, o) => {
      return sum + convertCurrency(o.total_amount, o.currency, shopDetails.currency);
    }, 0);
    const aov = revenueOrders.length > 0 ? totalRevenue / revenueOrders.length : 0;

    return { total, pending, inProgress, fulfilled, totalRevenue, aov };
  }, [orders, shopDetails, convertCurrency]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { All: orders.length };
    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
      if (IN_PROGRESS_STATUSES.includes(o.status)) {
        counts["In Progress"] = (counts["In Progress"] || 0) + 1;
      }
    });
    return counts;
  }, [orders]);

  // Selection helpers
  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(filteredOrders.map((o) => o.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [filteredOrders]
  );

  const handleBulkStatusChange = async (status: OrderStatus) => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds);
    // Optimistic
    ids.forEach((id) => handleOptimisticUpdate(id, status));
    setIsBulkUpdating(true);
    const { error } = await supabase
      .from("orders")
      .update({ status })
      .in("id", ids);
    if (error) {
      showError("Bulk status update failed.");
      // Revert: refetch
      fetchOrders();
    } else {
      showSuccess(`${ids.length} order${ids.length !== 1 ? "s" : ""} updated to "${status}".`);
      setSelectedIds(new Set());
    }
    setIsBulkUpdating(false);
  };

  const handleExportSelected = () => {
    const toExport =
      selectedIds.size > 0
        ? orders.filter((o) => selectedIds.has(o.id))
        : filteredOrders;
    exportOrdersCSV(toExport, shopDetails?.currency ?? "USD");
  };

  const hasFilters = !!(searchTerm || dateRange?.from || activeTab !== "All" || paymentFilter !== "all" || paymentStatusFilter !== "all");

  // Subtle staggered entrance for the stat cards once they become available.
  const statsReady = !isLoading && !!stats && !!shopDetails;
  const statsRef = useReveal({}, [statsReady]);

  return (
    <>
      <OrderDetailModal
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
        onUpdate={() => {
          fetchOrders();
          setSelectedOrder(null);
        }}
      />

      <div className="space-y-4">
        {/* ── Stats — canonical StatCards (token tones + count-up) ── */}
        {!isLoading && stats && shopDetails && (
          <div ref={statsRef} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div data-reveal>
              <StatCard title={t("orders.orders")} value={stats.total} icon={ShoppingBag} tone="brand" />
            </div>
            <div data-reveal>
              <StatCard
                title={t("orders.revenue")}
                value={stats.totalRevenue}
                icon={Banknote}
                tone="success"
                formatValue={(n) => formatCurrency(n, shopDetails.currency)}
              />
            </div>
            <div data-reveal>
              <StatCard title={t("orders.pending")} value={stats.pending} icon={Clock} tone="warning" />
            </div>
            <div data-reveal>
              <StatCard title={t("orders.in_progress")} value={stats.inProgress} icon={Truck} tone="info" />
            </div>
            <div data-reveal>
              <StatCard title={t("orders.fulfilled")} value={stats.fulfilled} icon={CheckCircle2} tone="success" />
            </div>
          </div>
        )}

        {/* ── Toolbar — canonical CommandBar (search + filters) with the status
             tabs as the secondary row ── */}
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as TabValue); setSelectedIds(new Set()); }}>
          <CommandBar
            secondary={
              <TabsList className="h-auto gap-1 flex-wrap" data-tour="orders-filters">
                {STATUS_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="text-xs gap-1">
                    {t(tab.labelKey)}
                    {tabCounts[tab.value] > 0 && (
                      <Badge variant="secondary" className="h-4 px-1 text-xs ml-0.5">{tabCounts[tab.value]}</Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
            }
          >
            <SearchInput
              value={searchTerm}
              onValueChange={(v) => { setSearchTerm(v); setSelectedIds(new Set()); }}
              placeholder={t("orders.search_orders")}
              containerClassName="min-w-[200px] flex-1"
            />
            <DateRangePicker date={dateRange} onDateChange={(d) => { setDateRange(d); setSelectedIds(new Set()); }} />

            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="h-9 w-[150px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t("products.newest")}</SelectItem>
                <SelectItem value="oldest">{t("products.oldest")}</SelectItem>
                <SelectItem value="amount_high">{t("orders.amount_desc")}</SelectItem>
                <SelectItem value="amount_low">{t("orders.amount_asc")}</SelectItem>
                <SelectItem value="name">{t("products.name_az")}</SelectItem>
              </SelectContent>
            </Select>

            {/* Payment filters */}
            <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as any)}>
              <SelectTrigger className="h-9 w-[120px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("orders.all_pay")}</SelectItem>
                <SelectItem value="card">{t("orders.card")}</SelectItem>
                <SelectItem value="cash_on_delivery">{t("orders.cash")}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={paymentStatusFilter} onValueChange={(v) => setPaymentStatusFilter(v as any)}>
              <SelectTrigger className="h-9 w-[140px] text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("orders.all_status")}</SelectItem>
                <SelectItem value="pending">{t("orders.pay_pending")}</SelectItem>
                <SelectItem value="processing">{t("orders.processing")}</SelectItem>
                <SelectItem value="paid">{t("orders.paid")}</SelectItem>
                <SelectItem value="failed">{t("orders.pay_failed")}</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-9 gap-1 text-xs" onClick={() => {
                setSearchTerm(""); setDateRange(undefined); setActiveTab("All");
                setSelectedIds(new Set()); setSortBy("newest"); setPaymentFilter("all"); setPaymentStatusFilter("all");
              }}>
                <X className="h-3 w-3" />{t("common.clear")}
              </Button>
            )}
          </CommandBar>

          {/* Bulk actions */}
          <BulkActionBar selectedIds={selectedIds} onClearSelection={() => setSelectedIds(new Set())}
            onBulkStatusChange={handleBulkStatusChange} onExport={handleExportSelected} isUpdating={isBulkUpdating} />

          {/* Order list */}
          <div className="mt-3 rounded-lg border bg-card overflow-hidden">
            {isLoading || !shopDetails ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              // Wide table scrolls within its own container — never the page.
              <div className="overflow-x-auto">
                <OrderTable orders={filteredOrders} onSelectOrder={setSelectedOrder} selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect} onToggleAll={handleToggleAll}
                  onOptimisticUpdate={handleOptimisticUpdate} hasFilters={hasFilters} />
              </div>
            )}
          </div>

          {!isLoading && (
            <p className="text-xs text-muted-foreground text-right mt-1">
              {filteredOrders.length} {t("common.of")} {orders.length} {t("orders.orders")}
            </p>
          )}
        </Tabs>
      </div>
    </>
  );
};

export default Orders;
