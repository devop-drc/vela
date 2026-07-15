// Customer order lookup — by email and/or order ids saved locally on this device.
// Calls get-public-shop-data (same endpoint the storefront uses) with the lookup
// params. Presentation (cards/table) from config.pages.orders.style.

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Search, Package, ChevronDown, Star, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useStorefrontConfig } from '../theme/StorefrontThemeProvider';
import { SfButton } from '../components/SfButton';
import LeaveReviewDialog from '@/components/storefront/ProductReviews';

// Alpha backgrounds + dark-mode text shades so badges read on every scheme.
const STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  'Order Seen': 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  'Order Packaged': 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  'Given to Courier': 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  Fulfilled: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  Problematic: 'bg-red-500/15 text-red-700 dark:text-red-400',
  Cancelled: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
};

const localOrderIds = (): string[] => {
  try { return JSON.parse(localStorage.getItem('storefront_order_ids') || '[]'); } catch { return []; }
};

export const OrdersPage = () => {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const { shopDetails } = useStorefront();
  const config = useStorefrontConfig();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(params.get('orderId'));
  // Review state: which order/product the dialog targets + already-reviewed pairs.
  const [reviewTarget, setReviewTarget] = useState<{ orderId: string; productId: string; productName: string; customerEmail: string } | null>(null);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());

  // Mark which (order, product) pairs already have a review so buttons disable.
  useEffect(() => {
    const ids = orders.map((o) => o.id);
    if (ids.length === 0) return;
    let cancelled = false;
    supabase
      .from('product_reviews')
      .select('order_id, product_id')
      .in('order_id', ids)
      .then(({ data }) => {
        if (!cancelled && data) setReviewed(new Set(data.map((r: any) => `${r.order_id}:${r.product_id}`)));
      });
    return () => { cancelled = true; };
  }, [orders]);

  const lookup = useCallback(async (customerEmail?: string) => {
    if (!shopSlug) return;
    const ids = Array.from(new Set([...localOrderIds(), ...(params.get('orderId') ? [params.get('orderId')!] : [])]));
    if (!customerEmail && ids.length === 0) return;
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke('get-public-shop-data', {
        body: { shopSlug, customerEmail: customerEmail || undefined, orderIds: ids },
      });
      if (error) throw error;
      setOrders(data?.customerOrders || []);
    } catch (e) {
      console.error('Order lookup failed', e);
      setErr("We couldn't load your orders. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [shopSlug, params]);

  // Auto-load orders saved on this device.
  useEffect(() => { lookup(); }, [lookup]);

  const style = config.pages.orders.style;

  return (
    <div className="sf-container py-8 max-w-3xl">
      <h1 className="sf-heading text-3xl md:text-4xl font-bold mb-2">My Orders</h1>
      <p className="text-muted-foreground mb-6">Look up your orders by email, or see the ones placed on this device.</p>

      <form onSubmit={(e) => { e.preventDefault(); lookup(email); }} className="flex gap-2 mb-8">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="flex-1" />
        <SfButton type="submit" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}<span className="ml-2 hidden sm:inline">Find Orders</span></SfButton>
      </form>

      {loading && orders.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : err && orders.length === 0 ? (
        <div className="py-16 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive opacity-70" />
          <p className="mb-4 text-muted-foreground">{err}</p>
          <SfButton onClick={() => lookup(email)}>Try again</SfButton>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><Package className="h-12 w-12 mx-auto mb-4 opacity-40" /><p>No orders found yet.</p></div>
      ) : style === 'table' ? (
        /* Compact table presentation (config.pages.orders.style === 'table'). */
        <div className="sf-glass overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Items</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className="cursor-pointer border-b last:border-b-0 transition-colors hover:bg-accent/40"
                  onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                >
                  <td className="px-4 py-3 font-medium">#{o.id.substring(0, 8)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-muted-foreground">{(o.order_items || []).reduce((s: number, it: any) => s + it.quantity, 0)}</td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(o.total_amount, o.currency)}</td>
                  <td className="px-4 py-3"><Badge className={cn('border-0', STATUS_COLORS[o.status] || 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400')}>{o.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
          {expanded && (() => {
            const o = orders.find((x) => x.id === expanded);
            if (!o) return null;
            return (
              <div className="border-t px-4 py-3 space-y-2">
                {(o.order_items || []).map((it: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{it.products?.name || 'Item'} × {it.quantity}</span>
                    <span className="font-medium">{formatCurrency(it.price_at_purchase * it.quantity, o.currency)}</span>
                  </div>
                ))}
                {o.shipping_address && <p className="text-xs text-muted-foreground pt-1">Ship to: {o.shipping_address}, {o.shipping_city}, {o.shipping_country}</p>}
              </div>
            );
          })()}
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const open = expanded === o.id;
            return (
              <div key={o.id} className="sf-glass overflow-hidden">
                <button onClick={() => setExpanded(open ? null : o.id)} className="w-full flex items-center justify-between p-4 text-left">
                  <div>
                    <p className="font-semibold">Order #{o.id.substring(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()} · {formatCurrency(o.total_amount, o.currency)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={cn('border-0', STATUS_COLORS[o.status] || 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400')}>{o.status}</Badge>
                    <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
                  </div>
                </button>
                {open && (
                  <div className="px-4 pb-4 border-t pt-3 space-y-2">
                    {(o.order_items || []).map((it: any, i: number) => {
                      const canReview = o.status === 'Fulfilled' && it.product_id;
                      const alreadyReviewed = reviewed.has(`${o.id}:${it.product_id}`);
                      return (
                        <div key={i} className="flex items-center justify-between gap-3 text-sm">
                          <span className="min-w-0 truncate">{it.products?.name || 'Item'} × {it.quantity}</span>
                          <span className="flex shrink-0 items-center gap-3">
                            {canReview && (
                              alreadyReviewed ? (
                                <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><Star className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" /> Reviewed</span>
                              ) : (
                                <SfButton
                                  variant="outline" size="sm" className="h-7 px-2 text-xs"
                                  onClick={() => setReviewTarget({ orderId: o.id, productId: it.product_id, productName: it.products?.name || 'this product', customerEmail: o.customer_email })}
                                >
                                  <Star className="mr-1 h-3.5 w-3.5" /> Leave review
                                </SfButton>
                              )
                            )}
                            <span className="font-medium">{formatCurrency(it.price_at_purchase * it.quantity, o.currency)}</span>
                          </span>
                        </div>
                      );
                    })}
                    {o.shipping_address && <p className="text-xs text-muted-foreground pt-2">Ship to: {o.shipping_address}, {o.shipping_city}, {o.shipping_country}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {reviewTarget && (
        <LeaveReviewDialog
          isOpen
          onClose={() => setReviewTarget(null)}
          orderId={reviewTarget.orderId}
          productId={reviewTarget.productId}
          productName={reviewTarget.productName}
          customerEmail={reviewTarget.customerEmail}
          onSubmitted={(productId) => setReviewed((s) => new Set(s).add(`${reviewTarget.orderId}:${productId}`))}
        />
      )}
    </div>
  );
};
