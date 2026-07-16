// Product-detail blocks. ProductDetailPage resolves the product + shared
// state (quantity, selected options) and provides it via ProductDetailContext;
// every block here consumes that context so config.pages.productDetail can
// compose/reorder/disable them freely.

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Minus, Plus, Truck, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { MediaItem } from '@/components/MediaItem';
import { formatCurrency } from '@/lib/formatters';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useStorefrontConfig } from '../../theme/StorefrontThemeProvider';
import { ProductCard, ProductLike } from '../../components/ProductCard';
import { SfButton } from '../../components/SfButton';
import { promotionBadgeLabel, type PromotionLike } from '../../lib/pricing';
import { useRailDrag } from '../../lib/useRailDrag';

/** Attaches mouse drag-to-scroll to the filmstrip rail (renders nothing). */
const FilmstripDrag = ({ stripRef, count }: { stripRef: React.RefObject<HTMLDivElement>; count: number }) => {
  useRailDrag(stripRef, [count]);
  return null;
};

export interface ProductDetailState {
  product: any;
  media: string[];
  original: number | null;
  discounted: number | null;
  hasDiscount: boolean;
  promos: PromotionLike[];
  isOutOfStock: boolean;
  options: [string, string[]][];
  specs: [string, any][];
  selected: Record<string, string>;
  setSelected: (updater: (s: Record<string, string>) => Record<string, string>) => void;
  quantity: number;
  setQuantity: (updater: (q: number) => number) => void;
  addToCartHandler: (sourceEl?: HTMLElement) => void;
  related: ProductLike[];
}

export const ProductDetailContext = createContext<ProductDetailState | null>(null);
export const useProductDetail = () => {
  const ctx = useContext(ProductDetailContext);
  if (!ctx) throw new Error('Product-detail blocks must render inside ProductDetailPage');
  return ctx;
};

/* ── Gallery ───────────────────────────────────────────────────────────── */
// variant: carousel (default) | grid (all media at once) | thumbs (main image
// + clickable thumbnail rail) | filmstrip (horizontal snap strip + counter).
export const GalleryBlock = ({ props }: { props: { variant?: 'carousel' | 'grid' | 'thumbs' | 'filmstrip' } }) => {
  const { product, media, isOutOfStock } = useProductDetail();
  const [active, setActive] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setActive(0); }, [product.id]);
  if (media.length === 0) return null;

  if (props.variant === 'filmstrip' && media.length > 1) {
    const onStripScroll = () => {
      const el = stripRef.current;
      if (!el) return;
      setActive(Math.min(media.length - 1, Math.round(el.scrollLeft / el.clientWidth)));
    };
    return (
      <div className="relative">
        <FilmstripDrag stripRef={stripRef} count={media.length} />
        <div
          ref={stripRef}
          onScroll={onStripScroll}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {media.map((url, i) => (
            <div key={i} className="sf-zoomable w-full shrink-0 snap-center overflow-hidden border bg-muted sf-card" style={{ borderRadius: 'var(--sf-radius-card)' } as any}>
              <div className="aspect-square w-full">
                <MediaItem src={url} alt={`${product.name} ${i + 1}`} type={product.media_type} className={cn('h-full w-full object-cover', isOutOfStock && 'grayscale')} />
              </div>
            </div>
          ))}
        </div>
        <span className="absolute bottom-4 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white tabular-nums">
          {active + 1} / {media.length}
        </span>
      </div>
    );
  }

  if (props.variant === 'thumbs' && media.length > 1) {
    const current = media[Math.min(active, media.length - 1)];
    return (
      <div className="space-y-3">
        <div className="sf-zoomable relative aspect-square w-full overflow-hidden border bg-muted sf-card" style={{ borderRadius: 'var(--sf-radius-card)' } as any}>
          <MediaItem
            key={current}
            src={current}
            alt={`${product.name} ${active + 1}`}
            type={product.media_type}
            className={cn('h-full w-full object-cover', isOutOfStock && 'grayscale')}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Product images">
          {media.map((url, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === active}
              aria-label={`Image ${i + 1}`}
              onClick={() => setActive(i)}
              className={cn(
                'h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 bg-muted transition-all',
                i === active ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
              )}
            >
              <MediaItem src={url} alt="" type={product.media_type} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (props.variant === 'grid' && media.length > 1) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {media.map((url, i) => (
          <div key={i} className={cn('relative w-full overflow-hidden border bg-muted sf-card', i === 0 && 'col-span-2', i === 0 ? 'aspect-[4/3]' : 'aspect-square')} style={{ borderRadius: 'var(--sf-radius-card)' } as any}>
            <MediaItem src={url} alt={`${product.name} ${i + 1}`} type={product.media_type} className={cn('h-full w-full object-cover', isOutOfStock && 'grayscale')} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <Carousel className="w-full overflow-hidden border sf-card" style={{ borderRadius: 'var(--sf-radius-card)' } as any}>
      <CarouselContent>
        {media.map((url, i) => (
          <CarouselItem key={i}>
            <div className="relative aspect-square w-full bg-muted flex items-center justify-center">
              <MediaItem src={url} alt={`${product.name} ${i + 1}`} type={product.media_type} className={cn('h-full w-full object-cover', isOutOfStock && 'grayscale')} />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      {media.length > 1 && (<><CarouselPrevious className="left-2" /><CarouselNext className="right-2" /></>)}
    </Carousel>
  );
};

/* ── Product info: category, title, price, promo badges ───────────────── */
export const ProductInfoBlock = () => {
  const { shopDetails } = useStorefront();
  const { product, original, discounted, hasDiscount, promos } = useProductDetail();
  return (
    <div className="space-y-4">
      {product.category && <span className="sf-badge">{product.category}</span>}
      <h1 className="sf-heading text-3xl md:text-4xl font-bold leading-tight">{product.name}</h1>
      <div className="flex items-center gap-3">
        {hasDiscount && original != null ? (
          <>
            <span className="text-xl text-muted-foreground line-through">{formatCurrency(original, shopDetails!.currency)}</span>
            <span className="text-3xl font-bold text-primary">{formatCurrency(discounted!, shopDetails!.currency)}</span>
          </>
        ) : (
          <span className="text-3xl font-bold text-primary">{original != null ? formatCurrency(original, shopDetails!.currency) : 'N/A'}</span>
        )}
        {/* Discount badge is always bright green + white, independent of theme. */}
        {promos.map((p) => { const l = promotionBadgeLabel(p); return l ? <Badge key={p.id} className="border-0 bg-[hsl(142_71%_45%)] text-white">{l}</Badge> : null; })}
      </div>
    </div>
  );
};

/* ── Description (caption) ─────────────────────────────────────────────── */
export const DescriptionBlock = () => {
  const { product } = useProductDetail();
  if (!product.caption) return null;
  return <p className="text-muted-foreground leading-relaxed">{product.caption}</p>;
};

/* ── Option groups (color / size / material) ───────────────────────────── */
export const VariantSelectorBlock = () => {
  const { options, selected, setSelected } = useProductDetail();
  if (options.length === 0) return null;
  return (
    <div className="space-y-4">
      {options.map(([key, values]) => (
        <div key={key} className="space-y-2">
          <p className="text-sm font-medium capitalize" id={`opt-${key}`}>{key}</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={`opt-${key}`}>
            {values.map((val) => (
              <button key={val} role="radio" aria-checked={selected[key] === val} onClick={() => setSelected((s) => ({ ...s, [key]: val }))} className={cn('inline-flex min-h-11 items-center rounded-md border px-4 py-2 text-sm capitalize transition-colors', selected[key] === val ? 'border-primary bg-primary/10 text-primary' : 'hover:border-primary/50')}>{val}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

/* ── Quantity + add-to-cart ────────────────────────────────────────────── */
export const AddToCartBlock = () => {
  const { shopDetails } = useStorefront();
  const { isOutOfStock, quantity, setQuantity, addToCartHandler } = useProductDetail();
  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex items-center border rounded-md h-11">
          <button aria-label="Decrease quantity" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="h-full w-10 flex items-center justify-center"><Minus className="h-4 w-4" /></button>
          <span className="w-12 text-center tabular-nums">{quantity}</span>
          <button aria-label="Increase quantity" onClick={() => setQuantity((q) => Math.min(99, q + 1))} className="h-full w-10 flex items-center justify-center"><Plus className="h-4 w-4" /></button>
        </div>
        <SfButton size="lg" className="flex-1" disabled={isOutOfStock} onClick={(e) => addToCartHandler(e.currentTarget)}>
          <ShoppingCart className="mr-2 h-5 w-5" /> {isOutOfStock ? 'Sold Out' : 'Add to Cart'}
        </SfButton>
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground pt-3"><Truck className="h-4 w-4" /> Ships from {shopDetails!.shop_name}</div>
    </div>
  );
};

/* ── Specifications ────────────────────────────────────────────────────── */
export const SpecificationsBlock = () => {
  const { specs } = useProductDetail();
  // Long spec lists collapse to the first few rows with a read-more expander.
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 4;
  if (specs.length === 0) return null;
  const shown = expanded ? specs : specs.slice(0, LIMIT);
  return (
    <div className="pt-4 border-t space-y-2">
      <h3 className="sf-heading font-semibold">Details</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {shown.map(([k, v]) => (
          <div key={k}><dt className="text-muted-foreground capitalize">{k}</dt><dd className="font-medium">{Array.isArray(v) ? v.join(', ') : String(v)}</dd></div>
        ))}
      </dl>
      {specs.length > LIMIT && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          className="text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          {expanded ? 'Show less' : `Read more (${specs.length - LIMIT} more)`}
        </button>
      )}
    </div>
  );
};

/* ── Reviews ───────────────────────────────────────────────────────────── */
// Verified-purchase reviews (product_reviews is public-read; inserts happen
// only through the order-validated submit-review edge function). Customers
// leave reviews from My Orders once an order is Fulfilled.

interface Review {
  id: string;
  customer_name: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  reply_text?: string | null;
  replied_at?: string | null;
}

const Stars = ({ value, className }: { value: number; className?: string }) => (
  <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} className={cn('h-4 w-4', s <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30')} />
    ))}
  </span>
);

export const ReviewsBlock = ({ props }: { props: { title?: string } }) => {
  const { product } = useProductDetail();
  const { capabilities } = useStorefront();
  const [reviews, setReviews] = useState<Review[] | null>(null);

  useEffect(() => {
    if (!capabilities?.reviews) return; // plan-gated: Starter shops don't show reviews
    let cancelled = false;
    supabase
      .from('product_reviews')
      .select('id, customer_name, rating, comment, created_at, reply_text, replied_at')
      .eq('product_id', product.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!cancelled) setReviews(error ? [] : (data as Review[]));
      });
    return () => { cancelled = true; };
  }, [product.id]);

  if (!capabilities?.reviews) return null; // reviews are a Pro/Business entitlement
  if (reviews === null) return null; // loading — keep the page quiet
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <section className="mt-16">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-6">
        <h2 className="sf-heading text-2xl font-bold">{props.title || 'Reviews'}</h2>
        {reviews.length > 0 && (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Stars value={avg} /> {avg.toFixed(1)} · {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
          </span>
        )}
      </div>
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No reviews yet. Reviews come from verified purchases — buy this product and share your experience from <em>My Orders</em>.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {reviews.map((r) => (
            <div key={r.id} className="sf-glass p-4">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-sm font-semibold">{r.customer_name || 'Verified customer'}</span>
                <Stars value={r.rating} />
              </div>
              {r.comment && <p className="text-sm text-muted-foreground leading-relaxed">{r.comment}</p>}
              {r.reply_text && (
                <div className="mt-3 rounded-md border-l-2 border-primary/40 bg-primary/5 p-3">
                  <p className="text-xs font-semibold text-primary mb-0.5">Response from the shop</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{r.reply_text}</p>
                </div>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground/70">{new Date(r.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

/* ── Related products ──────────────────────────────────────────────────── */
export const RelatedProductsBlock = ({ props }: { props: { title?: string } }) => {
  const config = useStorefrontConfig();
  const { related } = useProductDetail();
  if (related.length === 0) return null;
  return (
    <section className="mt-16">
      <h2 className="sf-heading text-2xl font-bold mb-6">{props.title || 'You may also like'}</h2>
      <div className={cn('grid gap-[var(--sf-grid-gap)] grid-cols-2 sm:grid-cols-3', config.layout.productGrid.columns >= 4 && 'lg:grid-cols-4')}>
        {related.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
};
