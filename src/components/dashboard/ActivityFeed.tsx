import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardDescription } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { Banknote, Package, CheckCircle, XCircle, Archive, MessageSquareWarning, Handshake, ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { useShop } from "@/contexts/ShopContext";
import { formatDistanceToNowStrict } from 'date-fns';
import { ProductEditor } from "../ProductEditor";
import { OrderDetailModal } from "../OrderDetailModal";
import { showError } from "@/utils/toast";
import { ScrollArea } from "../ui/scroll-area";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { useTranslation } from "react-i18next";

type Activity = {
  id: string;
  type: 'sale' | 'product' | 'dispute' | 'new_order' | 'order_fulfilled' | 'order_status_update';
  title: string;
  description: string;
  value: string | number;
  image?: string;
  date: string;
  orderId?: string;
  disputeId?: string;
};

// ── colour config keyed by type ──────────────────────────────────────────────
const TYPE_CONFIG: Record<
  Activity['type'],
  { dot: string; iconBg: string; iconText: string; rowBg: string }
> = {
  sale:                { dot: 'bg-emerald-500', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', rowBg: 'hover:bg-emerald-500/5' },
  order_fulfilled:     { dot: 'bg-emerald-500', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', rowBg: 'hover:bg-emerald-500/5' },
  new_order:           { dot: 'bg-blue-500',    iconBg: 'bg-blue-100',    iconText: 'text-blue-600',    rowBg: 'hover:bg-blue-500/5'    },
  order_status_update: { dot: 'bg-blue-400',    iconBg: 'bg-blue-50',     iconText: 'text-blue-500',    rowBg: 'hover:bg-blue-500/5'    },
  dispute:             { dot: 'bg-amber-500',   iconBg: 'bg-amber-100',   iconText: 'text-amber-600',   rowBg: 'hover:bg-amber-500/5'   },
  product:             { dot: 'bg-violet-500',  iconBg: 'bg-violet-100',  iconText: 'text-violet-600',  rowBg: 'hover:bg-violet-500/5'  },
};

const getConfig = (type: Activity['type']) => TYPE_CONFIG[type] ?? TYPE_CONFIG.product;

// ── icon per type ─────────────────────────────────────────────────────────────
const ActivityIcon = ({ activity }: { activity: Activity }) => {
  switch (activity.type) {
    case 'sale':                return <Banknote className="h-3.5 w-3.5" />;
    case 'new_order':           return <ShoppingBag className="h-3.5 w-3.5" />;
    case 'order_fulfilled':     return <Handshake className="h-3.5 w-3.5" />;
    case 'order_status_update': return <Package className="h-3.5 w-3.5" />;
    case 'dispute':             return <MessageSquareWarning className="h-3.5 w-3.5" />;
    case 'product': {
      const status = activity.value as string;
      if (status === 'Active')        return <CheckCircle className="h-3.5 w-3.5" />;
      if (status === 'Draft')         return <XCircle className="h-3.5 w-3.5" />;
      if (status === 'Out of Stock')  return <Archive className="h-3.5 w-3.5" />;
      return <Package className="h-3.5 w-3.5" />;
    }
    default: return <Package className="h-3.5 w-3.5" />;
  }
};

// ── value badge / text ────────────────────────────────────────────────────────
const ActivityValue = ({ activity }: { activity: Activity }) => {
  if (activity.type === 'sale' || activity.type === 'new_order') {
    return <span className="font-semibold text-xs tabular-nums">{activity.value}</span>;
  }

  if (activity.type === 'product' || activity.type === 'order_status_update') {
    const status = activity.value as string;
    const statusClass: Record<string, string> = {
      'Active':          'bg-emerald-100 text-emerald-800',
      'Draft':           'bg-amber-100 text-amber-800',
      'Out of Stock':    'bg-slate-100 text-slate-800',
      'Pending':         'bg-amber-100 text-amber-800',
      'Order Seen':      'bg-blue-100 text-blue-800',
      'Order Packaged':  'bg-blue-100 text-blue-800',
      'Given to Courier':'bg-blue-100 text-blue-800',
      'Fulfilled':       'bg-emerald-100 text-emerald-800',
      'Problematic':     'bg-destructive/10 text-destructive',
      'Cancelled':       'bg-gray-100 text-gray-800',
    };
    if (statusClass[status]) {
      return <Badge variant="outline" className={cn('font-normal text-xs', statusClass[status])}>{status}</Badge>;
    }
  }

  if (activity.type === 'dispute') {
    return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-xs">New</Badge>;
  }

  return <span className="font-semibold text-xs">{activity.value}</span>;
};

// ── relative time (compact) ───────────────────────────────────────────────────
const relativeTime = (date: string) => {
  try {
    return formatDistanceToNowStrict(new Date(date), { addSuffix: false })
      .replace(' seconds', 's').replace(' second', 's')
      .replace(' minutes', 'm').replace(' minute', 'm')
      .replace(' hours', 'h').replace(' hour', 'h')
      .replace(' days', 'd').replace(' day', 'd')
      .replace(' weeks', 'w').replace(' week', 'w')
      .replace(' months', 'mo').replace(' month', 'mo')
      .replace(' years', 'y').replace(' year', 'y')
      + ' ago';
  } catch {
    return '';
  }
};

// ── main component ────────────────────────────────────────────────────────────
export const ActivityFeed = () => {
  const { t } = useTranslation();
  const [activities, setActivities]   = useState<Activity[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const { shopDetails, convertCurrency } = useShop();
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedOrder, setSelectedOrder]     = useState<any | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;
    let productsChannel: any;
    let ordersChannel: any;
    let disputesChannel: any;

    const fetchAndSubscribe = async () => {
      if (!shopDetails?.id) { setIsLoading(false); return; }
      setIsLoading(true);
      const businessId = shopDetails.id;

      const [ordersRes, productsRes, disputesRes] = await Promise.all([
        supabase.from('orders')
          .select('id, customer_name, total_amount, created_at, currency, status, payment_status')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.from('products')
          .select('id, name, media_url, created_at, status')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase.from('order_disputes')
          .select('id, order_id, reason, created_at, orders!inner(business_id)')
          .eq('orders.business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      const orderActivities: Activity[] = (ordersRes.data || []).map(order => {
        const amount = convertCurrency(order.total_amount, order.currency, shopDetails?.currency);
        if (order.status === 'Fulfilled' && order.payment_status === 'paid') {
          return { id: order.id, type: 'sale', title: t('dashboard.new_sale'), description: `to ${order.customer_name}`, value: formatCurrency(amount, shopDetails?.currency), date: order.created_at, orderId: order.id };
        }
        return { id: order.id, type: 'new_order', title: t('dashboard.new_order'), description: `from ${order.customer_name}`, value: formatCurrency(amount, shopDetails?.currency), date: order.created_at, orderId: order.id };
      });

      const productActivities: Activity[] = (productsRes.data || []).map(product => ({
        id: product.id, type: 'product', title: t('dashboard.new_product'), description: product.name,
        value: product.status, image: product.media_url, date: product.created_at,
      }));

      const disputeActivities: Activity[] = (disputesRes.data || []).map(dispute => ({
        id: dispute.id, type: 'dispute', title: t('dashboard.new_dispute'), description: `${t('dashboard.reason')}: ${dispute.reason}`,
        value: 'Open', date: dispute.created_at, disputeId: dispute.id, orderId: dispute.order_id,
      }));

      const combined = [...orderActivities, ...productActivities, ...disputeActivities]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 15);

      if (isMounted) { setActivities(combined); setIsLoading(false); }

      // ── realtime subscriptions ──
      productsChannel = supabase.channel('dashboard-products-feed')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'products', filter: `business_id=eq.${businessId}` }, (payload) => {
          const p = payload.new;
          const a: Activity = { id: p.id, type: 'product', title: t('dashboard.new_product'), description: p.name, value: p.status, image: p.media_url, date: p.created_at };
          if (isMounted) setActivities(prev => [a, ...prev].sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime()).slice(0, 20));
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'products', filter: `business_id=eq.${businessId}` }, (payload) => {
          const oldP = payload.old as any; const newP = payload.new as any;
          if (oldP.status !== newP.status) {
            const a: Activity = { id: `${newP.id}-${payload.commit_timestamp}`, type: 'product', title: t('dashboard.status_updated'), description: newP.name, value: newP.status, image: newP.media_url, date: payload.commit_timestamp };
            if (isMounted) setActivities(prev => [a, ...prev].sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime()).slice(0, 20));
          }
        })
        .subscribe();

      ordersChannel = supabase.channel('dashboard-orders-feed')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `business_id=eq.${businessId}` }, (payload) => {
          const o = payload.new as any;
          const amount = convertCurrency(o.total_amount, o.currency, shopDetails?.currency);
          const a: Activity = { id: o.id, type: 'new_order', title: t('dashboard.new_order'), description: `from ${o.customer_name}`, value: formatCurrency(amount, shopDetails?.currency), date: o.created_at, orderId: o.id };
          if (isMounted) setActivities(prev => [a, ...prev].sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime()).slice(0, 20));
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `business_id=eq.${businessId}` }, (payload) => {
          const oldO = payload.old as any; const newO = payload.new as any;
          const amount = convertCurrency(newO.total_amount, newO.currency, shopDetails?.currency);
          if (oldO.status !== newO.status) {
            const a: Activity = { id: `${newO.id}-${payload.commit_timestamp}-status-update`, type: 'order_status_update', title: t('dashboard.order_status_updated'), description: `#${newO.id.substring(0, 8)} → ${newO.status}`, value: newO.status, date: payload.commit_timestamp, orderId: newO.id };
            if (isMounted) setActivities(prev => [a, ...prev].sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime()).slice(0, 20));
          }
          if (newO.status === 'Fulfilled' && newO.payment_status === 'paid' && (oldO.status !== 'Fulfilled' || oldO.payment_status !== 'paid')) {
            const a: Activity = { id: `${newO.id}-${payload.commit_timestamp}-sale`, type: 'sale', title: t('dashboard.sale_fulfilled'), description: `#${newO.id.substring(0, 8)} — ${newO.customer_name}`, value: formatCurrency(amount, shopDetails?.currency), date: payload.commit_timestamp, orderId: newO.id };
            if (isMounted) setActivities(prev => [a, ...prev].sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime()).slice(0, 20));
          }
        })
        .subscribe();

      // Disputes carry business_id (stamped by a DB trigger), so the
      // subscription is scoped server-side — no cross-business events, no
      // follow-up lookup. The handler check covers pre-migration rows.
      disputesChannel = supabase.channel('dashboard-disputes-feed')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'order_disputes', filter: `business_id=eq.${businessId}` }, async (payload) => {
          const d = payload.new as any;
          if (d.business_id && d.business_id !== businessId) return;
          const a: Activity = { id: d.id, type: 'dispute', title: t('dashboard.new_dispute'), description: `${t('dashboard.reason')}: ${d.reason}`, value: 'Open', date: d.created_at, disputeId: d.id, orderId: d.order_id };
          if (isMounted) setActivities(prev => [a, ...prev].sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime()).slice(0, 20));
        })
        .subscribe();
    };

    if (shopDetails) { fetchAndSubscribe(); } else { setIsLoading(false); }

    // Synchronous cleanup so React actually runs it (the channels are assigned
    // to the outer-scope vars inside the async fetchAndSubscribe).
    return () => {
      isMounted = false;
      if (productsChannel) supabase.removeChannel(productsChannel);
      if (ordersChannel) supabase.removeChannel(ordersChannel);
      if (disputesChannel) supabase.removeChannel(disputesChannel);
    };
  }, [shopDetails, convertCurrency]);

  const handleActivityClick = async (activity: Activity) => {
    if (activity.type === 'product') {
      const { data, error } = await supabase.from('products').select('*').eq('id', activity.id.split('-')[0]).single();
      if (error) showError("Failed to load product details.");
      else setSelectedProduct(data);
    }
    if (['sale', 'new_order', 'order_fulfilled', 'dispute', 'order_status_update'].includes(activity.type)) {
      const { data, error } = await supabase.from('orders').select('*').eq('id', activity.orderId).single();
      if (error) showError("Failed to load order details.");
      else setSelectedOrder(data);
    }
  };

  return (
    <>
      {selectedProduct && (
        <ProductEditor isOpen={!!selectedProduct} onClose={() => setSelectedProduct(null)} product={selectedProduct} onUpdate={() => {}} />
      )}
      {selectedOrder && (
        <OrderDetailModal isOpen={!!selectedOrder} onClose={() => setSelectedOrder(null)} order={selectedOrder} onUpdate={() => {}} />
      )}

      <Card className="shadow-sm border border-border/60 h-full flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <CardDescription className="text-sm">{t("dashboard.click_event")}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-3 flex-1 min-h-0">
          <ScrollArea className="h-full pr-2">
            {isLoading ? (
              <div className="space-y-4 pt-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <Skeleton className="h-7 w-7 rounded-full flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length > 0 ? (
              <AnimatePresence initial={false}>
                <div className="relative">
                  {/* Vertical timeline line */}
                  <div className="absolute left-[13px] top-2 bottom-2 w-px bg-border/60 pointer-events-none" />

                  <div className="space-y-1 pt-1">
                    {activities.map((activity, idx) => {
                      const cfg = getConfig(activity.type);
                      const isLast = idx === activities.length - 1;

                      return (
                        <motion.button
                          key={activity.id}
                          layout
                          initial={{ opacity: 0, y: -16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                          onClick={() => handleActivityClick(activity)}
                          className={cn(
                            'relative w-full text-left flex items-start gap-3 rounded-lg px-2 py-2 transition-colors',
                            cfg.rowBg
                          )}
                        >
                          {/* Timeline dot + icon */}
                          <div className="relative flex-shrink-0 mt-0.5">
                            <div className={cn(
                              'h-7 w-7 rounded-full flex items-center justify-center ring-2 ring-background z-10 relative',
                              cfg.iconBg, cfg.iconText
                            )}>
                              <ActivityIcon activity={activity} />
                            </div>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 pt-0.5">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-semibold text-xs leading-snug truncate">{activity.title}</p>
                                <p className="text-xs text-muted-foreground truncate leading-snug">{activity.description}</p>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                <ActivityValue activity={activity} />
                              </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground/70 mt-0.5 tabular-nums">
                              {relativeTime(activity.date)}
                            </p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </AnimatePresence>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">{t("notifications.no_activity")}</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
};
