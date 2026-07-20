// Customer order lookup — by email and/or order ids saved locally on this device.
// Calls get-public-shop-data (same endpoint the storefront uses) with the lookup
// params. Presentation (cards/table) from config.pages.orders.style.

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Loader2, Search, Package, ChevronDown, Star, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useStorefrontConfig, useStorefrontTokenStyle } from '../theme/StorefrontThemeProvider';
import { SfButton } from '../components/SfButton';
import { useSfT, sfStatus, useVisitorLang } from '../lib/visitorPrefs';
import LeaveReviewDialog from '@/components/storefront/ProductReviews';
import { OrderSuccessOverlay } from '@/components/storefront/OrderSuccessOverlay';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MediaItem } from '@/components/MediaItem';

// Semantic tokens where they exist (warning/success/destructive follow the
// theme); the in-progress steps keep distinct hues so the pipeline stays
// readable, with alpha backgrounds + dark-mode text shades for every scheme.
const STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-warning/15 text-warning',
  'Order Seen': 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  'Order Packaged': 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400',
  'Given to Courier': 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  Fulfilled: 'bg-success/15 text-success',
  Problematic: 'bg-destructive/15 text-destructive',
  Cancelled: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
};

/** Pill status chip, sized like the .sf-badge element but semantically colored.
    Colors key off the raw DB status; the label follows the visitor language. */
const StatusChip = ({ status }: { status: string }) => {
  const lang = useVisitorLang();
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold leading-none', STATUS_COLORS[status] || 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400')}>
      {sfStatus(lang, status)}
    </span>
  );
};

/** Overlapping product thumbnails for an order row (up to 4, then +N). */
const OrderThumbs = ({ items }: { items: any[] }) => {
  const shown = (items || []).slice(0, 4);
  const extra = (items || []).length - shown.length;
  return (
    <span className="flex items-center -space-x-2">
      {shown.map((it: any, i: number) => (
        <span key={i} className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-background bg-muted">
          {it.products?.media_url
            ? <img src={it.products.media_url} alt="" loading="lazy" className="h-full w-full object-cover" />
            : <Package className="h-3.5 w-3.5 text-muted-foreground" />}
        </span>
      ))}
      {extra > 0 && (
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-background bg-muted text-[10px] font-semibold text-muted-foreground">
          +{extra}
        </span>
      )}
    </span>
  );
};

const localOrderIds = (): string[] => {
  try { return JSON.parse(localStorage.getItem('storefront_order_ids') || '[]'); } catch { return []; }
};

export const OrdersPage = () => {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const { shopDetails } = useStorefront();
  const config = useStorefrontConfig();
  const [params, setParams] = useSearchParams();
  const token = useStorefrontTokenStyle();
  const { t } = useSfT();
  // Full-screen celebration on return from a successful card payment.
  const [celebrate, setCelebrate] = useState(() => params.get('payment') === 'success');

  // Landing back from the RaiAccept hosted form (?payment=cancelled|failed) —
  // success gets the overlay above instead of a toast.
  useEffect(() => {
    const p = params.get('payment');
    if (!p || p === 'success') return;
    if (p === 'cancelled') toast.info(t('paymentCancelled'));
    else toast.error(t('paymentFailed'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [email, setEmail] = useState('');
  const [orderNo, setOrderNo] = useState('');
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

  const lookup = useCallback(async (customerEmail?: string, orderNumber?: string) => {
    if (!shopSlug) return;
    const ids = Array.from(new Set([...localOrderIds(), ...(params.get('orderId') ? [params.get('orderId')!] : [])]));
    if (!customerEmail && ids.length === 0) return;
    // Guest lookups need email + order number together (server enforces it too).
    if (customerEmail && !orderNumber?.trim() && ids.length === 0) {
      setErr(t('lookupHint'));
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke('get-public-shop-data', {
        body: {
          shopSlug,
          customerEmail: customerEmail || undefined,
          orderId: orderNumber?.trim() ? orderNumber.trim().toLowerCase() : undefined,
          orderIds: ids,
        },
      });
      if (error) throw error;
      setOrders(data?.customerOrders || []);
    } catch (e) {
      console.error('Order lookup failed', e);
      setErr(t('ordersLoadError'));
    } finally {
      setLoading(false);
    }
  }, [shopSlug, params]);

  // Auto-load orders saved on this device.
  useEffect(() => { lookup(); }, [lookup]);

  const style = config.pages.orders.style;

  return (
    <div className="sf-container py-8 max-w-3xl">
      {celebrate && (
        <OrderSuccessOverlay
          orderNumber={params.get('orderId')?.substring(0, 8) || null}
          onContinue={() => {
            setCelebrate(false);
            const next = new URLSearchParams(params);
            next.delete('payment');
            setParams(next, { replace: true });
          }}
        />
      )}
      <h1 className="sf-heading text-3xl md:text-4xl font-bold mb-2">{t('myOrders')}</h1>
      <p className="text-muted-foreground mb-6">{t('ordersIntro')}</p>

      <form onSubmit={(e) => { e.preventDefault(); lookup(email, orderNo); }} className="mb-8 flex flex-col gap-2 sm:flex-row">
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="flex-1 min-w-0" />
        <Input value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder={t('orderNoPlaceholder')} className="sm:w-44" />
        <SfButton type="submit" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}<span className="ml-2 sm:hidden lg:inline">{t('findOrder')}</span></SfButton>
      </form>

      {loading && orders.length === 0 ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : err && orders.length === 0 ? (
        <div className="py-16 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive opacity-70" />
          <p className="mb-4 text-muted-foreground">{err}</p>
          <SfButton onClick={() => lookup(email)}>{t('tryAgain')}</SfButton>
        </div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary"><Package className="h-7 w-7" /></div>
          <h2 className="sf-heading mb-1 text-lg font-semibold">{t('noOrdersYet')}</h2>
          <p className="mb-6 text-sm text-muted-foreground">{t('noOrdersSub')}</p>
          <SfButton asChild><Link to={`/shop/${shopSlug}/products`}>{t('browseProducts')}</Link></SfButton>
        </div>
      ) : style === 'table' ? (
        /* Compact table presentation (config.pages.orders.style === 'table'). */
        <div className="sf-glass overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">{t('order')}</th>
                <th className="px-4 py-3 font-semibold">{t('date')}</th>
                <th className="px-4 py-3 font-semibold">{t('items')}</th>
                <th className="px-4 py-3 font-semibold">{t('total')}</th>
                <th className="px-4 py-3 font-semibold">{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr
                  key={o.id}
                  className="cursor-pointer border-b last:border-b-0 transition-colors hover:bg-accent/40"
                  onClick={() => setExpanded(o.id)}
                >
                  <td className="px-4 py-3 font-medium">#{o.id.substring(0, 8)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><OrderThumbs items={o.order_items} /></td>
                  <td className="px-4 py-3 font-semibold">{formatCurrency(o.total_amount, o.currency)}</td>
                  <td className="px-4 py-3"><StatusChip status={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <div key={o.id} className="sf-glass overflow-hidden">
              <button onClick={() => setExpanded(o.id)} className="w-full flex items-center justify-between gap-3 p-4 text-left">
                <div className="min-w-0">
                  <p className="font-semibold">{t('order')} #{o.id.substring(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()} · {formatCurrency(o.total_amount, o.currency)}</p>
                  <div className="mt-2"><OrderThumbs items={o.order_items} /></div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusChip status={o.status} />
                  <ChevronDown className="h-4 w-4 -rotate-90" />
                </div>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Order detail modal — every item with thumbnail, options, qty and pricing. */}
      {(() => {
        const o = orders.find((x) => x.id === expanded);
        if (!o) return null;
        const itemsTotal = (o.order_items || []).reduce((sum: number, it: any) => sum + it.price_at_purchase * it.quantity, 0);
        const shipping = Math.max(0, (o.total_amount ?? itemsTotal) - itemsTotal);
        return (
          <Dialog open onOpenChange={(v) => { if (!v) setExpanded(null); }}>
            <DialogContent
              className={cn('max-h-[85dvh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg bg-background text-foreground rounded-[var(--sf-radius-card,1rem)] sm:rounded-[var(--sf-radius-card,1rem)]', token.className)}
              style={token.style}
              {...token.attrs}
            >
              <DialogHeader>
                <DialogTitle className="sf-heading flex flex-wrap items-center gap-2 text-lg">
                  {t('order')} #{o.id.substring(0, 8)} <StatusChip status={o.status} />
                </DialogTitle>
              </DialogHeader>
              <p className="text-xs text-muted-foreground -mt-2">
                {t('placedOn')} {new Date(o.created_at).toLocaleDateString()} · {o.payment_method === 'cash_on_delivery' ? t('cashOnDelivery') : t('cardPayment')}
              </p>
              <div className="divide-y">
                {(o.order_items || []).map((it: any, i: number) => {
                  const canReview = o.status === 'Fulfilled' && it.product_id;
                  const alreadyReviewed = reviewed.has(`${o.id}:${it.product_id}`);
                  const opts = it.selected_options && typeof it.selected_options === 'object'
                    ? Object.entries(it.selected_options).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' · ')
                    : null;
                  return (
                    <div key={i} className="flex items-start gap-3 py-3">
                      <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg border bg-muted">
                        {it.products?.media_url
                          ? <MediaItem src={it.products.media_url} alt={it.products?.name || t('item')} className="h-full w-full object-cover" />
                          : <Package className="h-5 w-5 text-muted-foreground" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug">{it.products?.name || t('item')}</p>
                        {opts && <p className="mt-0.5 text-xs text-muted-foreground">{opts}</p>}
                        <p className="mt-0.5 text-xs text-muted-foreground">{formatCurrency(it.price_at_purchase, o.currency)} × {it.quantity}</p>
                        {canReview && (
                          alreadyReviewed ? (
                            <span className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><Star className="h-3.5 w-3.5 fill-emerald-500 text-emerald-500" /> {t('reviewedLabel')}</span>
                          ) : (
                            <SfButton
                              variant="outline" size="sm" className="mt-1.5 h-7 px-2 text-xs"
                              onClick={() => setReviewTarget({ orderId: o.id, productId: it.product_id, productName: it.products?.name || 'this product', customerEmail: o.customer_email })}
                            >
                              <Star className="mr-1 h-3.5 w-3.5" /> {t('leaveReview')}
                            </SfButton>
                          )
                        )}
                      </div>
                      <span className="shrink-0 text-sm font-semibold">{formatCurrency(it.price_at_purchase * it.quantity, o.currency)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>{t('subtotal')}</span><span>{formatCurrency(itemsTotal, o.currency)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>{t('shipping')}</span><span>{shipping > 0 ? formatCurrency(shipping, o.currency) : t('free')}</span></div>
                <div className="flex justify-between font-semibold"><span>{t('total')}</span><span>{formatCurrency(o.total_amount, o.currency)}</span></div>
              </div>
              {o.shipping_address && (
                <p className="text-xs text-muted-foreground">{t('shipTo')}: {o.shipping_address}, {o.shipping_city}{o.shipping_zip ? ` ${o.shipping_zip}` : ''}, {o.shipping_country}</p>
              )}
            </DialogContent>
          </Dialog>
        );
      })()}

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
