// Token-driven product card with selectable variants. Reads design from the
// StorefrontConfig (components.productCard) and data/currency from StorefrontContext.
// Option-less products add straight to the cart from the card; products with
// options open the QuickViewModal (gallery + options + add to cart) in place.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Plus, SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { MediaItem } from '@/components/MediaItem';
import { useProductRating } from '@/hooks/useProductRating';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useCart } from '@/contexts/CartContext';
import { useStorefrontConfig } from '../theme/StorefrontThemeProvider';
import { activePromotionsFor, computePrice, promotionBadgeLabel } from '../lib/pricing';
import { flyToCart } from '../lib/flyToCart';
import { QuickViewModal } from './QuickViewModal';
import { optionEntries } from '@/components/filters/filterVisibility';
import { useVariantOptionsFor } from '@/hooks/useVariantOptions';
import type { ComponentVariants } from '../config/types';

export interface ProductLike {
  id: string;
  name: string;
  status?: string;
  price: number | null;
  currency: string | null;
  inventory?: number;
  media_url: string;
  media_gallery?: string[] | null;
  media_type?: string | null;
  thumbnail_url?: string;
  caption?: string;
  category?: string;
  pricing_type?: 'one_time' | 'subscription';
  billing_interval?: 'month' | 'year' | null;
  details?: any;
}

interface Props {
  product: ProductLike;
  className?: string;
  variant?: ComponentVariants['productCard'];
  /** Overrides the variant's default image aspect (e.g. masonry layouts). */
  ratio?: string;
}

export const ProductCard = ({ product, className, variant, ratio }: Props) => {
  const config = useStorefrontConfig();
  const { shopDetails, convertCurrency, promotions, capabilities } = useStorefront();
  const { addToCart } = useCart();
  const rating = useProductRating(capabilities?.reviews ? product.id : undefined);
  // Real purchase options live in product_variants (batched, session-cached).
  const variantInfo = useVariantOptionsFor(product.id);
  const v = variant ?? config.components.productCard;

  // Quick view stays mounted after its first open so close animations play.
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [quickViewMounted, setQuickViewMounted] = useState(false);

  if (!shopDetails) return null;

  const currency = shopDetails.currency;
  const base = convertCurrency ? convertCurrency(product.price, product.currency) : product.price;
  const promos = activePromotionsFor(promotions as any, product.id);
  const { original, discounted, hasDiscount } = computePrice(base, promos);
  const isOutOfStock =
    product.status === 'Out of Stock' ||
    (product.pricing_type === 'one_time' && (product.inventory ?? 0) <= 0);

  const to = `/shop/${shopDetails.slug}/product/${product.id}`;
  const img = product.thumbnail_url || product.media_gallery?.[0] || product.media_url;
  const suffix =
    product.pricing_type === 'subscription'
      ? ` /${product.billing_interval === 'month' ? 'mo' : 'yr'}`
      : '';

  // Quieter price treatment: regular prices read in the foreground ink at
  // semibold (not shouty bold-primary); only a discounted price keeps the
  // primary accent, next to the small struck-through original.
  const Price = ({ className: c, light }: { className?: string; light?: boolean }) =>
    hasDiscount && original != null ? (
      <div className={cn('flex flex-wrap items-baseline gap-x-2', c)}>
        <span className={cn('text-[13px] tabular-nums line-through', light ? 'text-white/70' : 'text-muted-foreground/80')}>{formatCurrency(original, currency)}</span>
        <span className={cn('font-semibold tabular-nums', light ? 'text-white' : 'text-primary')}>{formatCurrency(discounted!, currency)}{suffix}</span>
      </div>
    ) : (
      <span className={cn('font-semibold tabular-nums tracking-tight', light ? 'text-white' : 'text-foreground', c)}>
        {original != null ? `${formatCurrency(original, currency)}${suffix}` : 'N/A'}
      </span>
    );

  // Compact "★ 4.5 (3)" line; hidden until the product has reviews.
  const Rating = ({ className: c, light }: { className?: string; light?: boolean }) =>
    rating && rating.count > 0 ? (
      <span className={cn('inline-flex items-center gap-1 text-xs', light ? 'text-white/90' : 'text-muted-foreground', c)}>
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        {rating.avg.toFixed(1)} <span className={light ? 'text-white/70' : 'text-muted-foreground/70'}>({rating.count})</span>
      </span>
    ) : null;

  const Promo = () =>
    promos.length && !isOutOfStock ? (
      <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
        {promos.map((p) => {
          const label = promotionBadgeLabel(p);
          // Discount badges are always bright green + white, independent of theme.
          return label ? (
            <span key={p.id} className="sf-badge !bg-[hsl(142_71%_45%)] !text-white">{label}</span>
          ) : null;
        })}
      </div>
    ) : null;

  const SoldOut = () =>
    isOutOfStock ? (
      <span className="sf-badge absolute top-2 left-2 z-10" style={{ background: 'hsl(var(--warning))', color: 'hsl(var(--warning-foreground))' }}>Sold Out</span>
    ) : null;

  // Quick-add: products with option groups (colour/size/material) open the
  // quick-view modal to choose right on the spot; option-less products add
  // straight to the cart with a fly-to-cart animation.
  const hasOptions = optionEntries(product.details).length > 0 || Object.keys(variantInfo.options).length > 0;
  const quickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    if (hasOptions) {
      setQuickViewMounted(true);
      setQuickViewOpen(true);
      return;
    }
    flyToCart(e.currentTarget as HTMLElement, product.media_type === 'video' ? undefined : img);
    addToCart({
      productId: product.id, name: product.name,
      price: hasDiscount ? discounted! : original!, originalPrice: original!, isDiscounted: hasDiscount,
      currency, media_url: product.media_url, media_type: product.media_type as any,
      pricing_type: product.pricing_type, billing_interval: product.billing_interval,
    } as any, 1);
  };
  const quickAddLabel = hasOptions ? `Choose options for ${product.name}` : `Add ${product.name} to cart`;

  // Floating icon button over the image: hidden until hover (slides up), always
  // visible on touch devices and while focused.
  const QuickAdd = ({ small }: { small?: boolean }) =>
    isOutOfStock ? null : (
      <button
        type="button"
        onClick={quickAdd}
        aria-label={quickAddLabel}
        title={hasOptions ? 'Choose options' : 'Add to cart'}
        className={cn(
          'absolute bottom-2 right-2 z-10 grid place-items-center rounded-full bg-primary text-primary-foreground shadow-lg',
          small ? 'h-8 w-8' : 'h-9 w-9',
          'transition-all duration-200 ease-out hover:scale-110 active:scale-95',
          'translate-y-1.5 opacity-0 group-hover:translate-y-0 group-hover:opacity-100',
          'focus-visible:translate-y-0 focus-visible:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100',
          '[@media(pointer:coarse)]:translate-y-0 [@media(pointer:coarse)]:opacity-100'
        )}
      >
        {hasOptions ? <SlidersHorizontal className={small ? 'h-3.5 w-3.5' : 'h-4 w-4'} /> : <Plus className={small ? 'h-4 w-4' : 'h-4 w-4'} />}
      </button>
    );

  const Picture = ({ ratio: defaultRatio = 'aspect-square', round = '', add = true }: { ratio?: string; round?: string; add?: boolean }) => (
    <div className={cn('relative w-full overflow-hidden bg-muted', ratio ?? defaultRatio, round)}>
      <MediaItem
        src={img}
        alt={product.name}
        type={product.media_type}
        className={cn('h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]', isOutOfStock && 'grayscale')}
      />
      {add && <QuickAdd />}
    </div>
  );

  const quickView = quickViewMounted ? (
    <QuickViewModal product={product} open={quickViewOpen} onOpenChange={setQuickViewOpen} />
  ) : null;

  // ── Variants ───────────────────────────────────────────────────────────────
  let card: React.ReactNode;

  if (v === 'overlay') {
    card = (
      <Link to={to} className={cn('sf-hoverable group relative block overflow-hidden sf-card', className)} style={{ borderRadius: 'var(--sf-radius-card)' }}>
        <SoldOut /><Promo />
        <Picture ratio="aspect-[4/5]" />
        {/* Deep gradient + drop shadows keep white text readable on any photo. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pt-14 text-white [text-shadow:0_1px_3px_rgb(0_0_0/.5)]">
          <h3 className="sf-heading font-semibold leading-tight line-clamp-2">{product.name}</h3>
          <Rating light className="mt-0.5" />
          <Price light className="mt-1" />
        </div>
      </Link>
    );
  } else if (v === 'minimal') {
    card = (
      <Link to={to} className={cn('sf-hoverable group block', className)}>
        <div className="relative overflow-hidden" style={{ borderRadius: 'calc(var(--sf-radius-card) / 2)' }}>
          <SoldOut /><Promo />
          <Picture round="" ratio="aspect-square" />
        </div>
        <div className="pt-3">
          <h3 className="sf-heading text-sm font-medium leading-snug line-clamp-1 transition-colors group-hover:text-primary">{product.name}</h3>
          <Rating className="mt-0.5" />
          <Price className="text-sm mt-1" />
        </div>
      </Link>
    );
  } else if (v === 'compact') {
    card = (
      <Link to={to} className={cn('sf-hoverable group flex items-center gap-3 sf-glass p-2 pr-3', className)}>
        <div className="relative h-16 w-16 shrink-0 overflow-hidden" style={{ borderRadius: 'calc(var(--sf-radius-card) / 2)' }}>
          <Picture ratio="h-16 w-16" round="" add={false} />
          {isOutOfStock && (
            <span className="absolute inset-0 grid place-items-center bg-black/45 text-[10px] font-semibold uppercase tracking-wide text-white">Sold out</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="sf-heading truncate text-sm font-medium">{product.name}</h3>
          <Rating className="mt-0.5" />
          <Price className="text-sm" />
        </div>
        {!isOutOfStock && (
          <button
            type="button"
            onClick={quickAdd}
            aria-label={quickAddLabel}
            title={hasOptions ? 'Choose options' : 'Add to cart'}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary transition-all duration-200 hover:bg-primary hover:text-primary-foreground active:scale-95"
          >
            {hasOptions ? <SlidersHorizontal className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        )}
      </Link>
    );
  } else if (v === 'polaroid') {
    card = (
      <Link
        to={to}
        className={cn('sf-hoverable sf-card group block bg-card p-3 pb-5 text-card-foreground transition-transform duration-300 hover:-rotate-1', className)}
        style={{ borderRadius: 'var(--sf-radius-card)' }}
      >
        <div className="relative overflow-hidden">
          <SoldOut /><Promo />
          <Picture ratio="aspect-square" />
        </div>
        <div className="pt-3 text-center">
          <h3 className="sf-heading text-sm font-semibold leading-snug line-clamp-1">{product.name}</h3>
          <div className="flex justify-center"><Rating className="mt-0.5" /></div>
          <Price className="text-sm justify-center mt-1" />
        </div>
      </Link>
    );
  } else if (v === 'editorial') {
    card = (
      <Link to={to} className={cn('sf-hoverable group block', className)}>
        <div className="relative overflow-hidden">
          <SoldOut /><Promo />
          <Picture ratio="aspect-[3/4]" round="" />
        </div>
        <div className="pt-4">
          {product.category && <p className="sf-eyebrow mb-1">{product.category}</p>}
          <h3 className="sf-heading text-lg font-semibold leading-snug line-clamp-2 underline-offset-4 transition-colors group-hover:text-primary">{product.name}</h3>
          <Rating className="mt-1" />
          <Price className="mt-2 text-lg" />
        </div>
      </Link>
    );
  } else if (v === 'frame') {
    // Frame — gallery-plaque feel: inset double border, serif-leaning centered text.
    card = (
      <Link to={to} className={cn('sf-hoverable group block border bg-card p-2', className)} style={{ borderRadius: 'var(--sf-radius-card)' }}>
        <div className="relative overflow-hidden border p-1.5" style={{ borderRadius: 'calc(var(--sf-radius-card) / 1.5)' }}>
          <SoldOut /><Promo />
          <Picture ratio="aspect-[4/5]" />
        </div>
        <div className="px-1 pb-1 pt-3 text-center">
          <h3 className="sf-heading text-base font-semibold leading-snug line-clamp-1">{product.name}</h3>
          <Rating className="mt-0.5" />
          <div className="mx-auto my-2 h-px w-8 bg-border transition-all duration-300 group-hover:w-14 group-hover:bg-primary/50" aria-hidden />
          <Price className="justify-center" />
        </div>
      </Link>
    );
  } else if (v === 'caption-hover') {
    // Caption-hover — image only; the info panel slides up on hover (always
    // visible on touch via focus-within/coarse pointer fallback).
    card = (
      <Link to={to} className={cn('sf-hoverable group relative block overflow-hidden', className)} style={{ borderRadius: 'var(--sf-radius-card)' }}>
        <SoldOut /><Promo />
        <Picture ratio="aspect-[4/5]" add={false} />
        <div className="absolute inset-x-0 bottom-0 translate-y-full border-t border-border/40 bg-card/95 p-3 backdrop-blur-md transition-transform duration-300 ease-out group-hover:translate-y-0 group-focus-within:translate-y-0 [@media(pointer:coarse)]:translate-y-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="sf-heading truncate text-sm font-semibold">{product.name}</h3>
              <Rating className="mt-0.5" />
              <Price className="text-sm" />
            </div>
            {!isOutOfStock && (
              <button
                type="button"
                onClick={quickAdd}
                aria-label={quickAddLabel}
                title={hasOptions ? 'Choose options' : 'Add to cart'}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform duration-200 hover:scale-110 active:scale-95"
              >
                {hasOptions ? <SlidersHorizontal className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>
      </Link>
    );
  } else if (v === 'ticket') {
    // Ticket — playful stub with a perforated divider between image and info.
    card = (
      <Link to={to} className={cn('sf-hoverable group block overflow-hidden border bg-card', className)} style={{ borderRadius: 'var(--sf-radius-card)' }}>
        <div className="relative">
          <SoldOut /><Promo />
          <Picture ratio="aspect-square" />
        </div>
        <div className="relative border-t border-dashed">
          <span className="absolute -left-2 -top-2 h-4 w-4 rounded-full border bg-background" aria-hidden />
          <span className="absolute -right-2 -top-2 h-4 w-4 rounded-full border bg-background" aria-hidden />
          <div className="flex items-center justify-between gap-2 p-3">
            <div className="min-w-0">
              <h3 className="sf-heading truncate text-sm font-bold uppercase tracking-wide">{product.name}</h3>
              <Rating className="mt-0.5" />
            </div>
            <Price className="shrink-0" />
          </div>
        </div>
      </Link>
    );
  } else {
    // classic (default)
    card = (
      <Link to={to} className={cn('sf-hoverable sf-glass group flex h-full flex-col overflow-hidden', isOutOfStock && 'opacity-80', className)}>
        <div className="relative">
          <SoldOut /><Promo />
          <Picture ratio="aspect-square" />
        </div>
        <div className="sf-pad flex flex-1 flex-col justify-between">
          <div>
            <h3 className="sf-heading mb-1 text-base font-semibold leading-tight line-clamp-2 transition-colors group-hover:text-primary">{product.name}</h3>
            <Rating className="mb-1" />
            {product.category && (
              <span className="sf-badge mb-2">{product.category}</span>
            )}
            {product.caption && <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">{product.caption}</p>}
          </div>
          <Price className="mt-3 text-lg" />
        </div>
      </Link>
    );
  }

  return (
    <>
      {card}
      {quickView}
    </>
  );
};
