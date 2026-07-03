// Token-driven product card with selectable variants. Reads design from the
// StorefrontConfig (components.productCard) and data/currency from StorefrontContext.

import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { MediaItem } from '@/components/MediaItem';
import { Badge } from '@/components/ui/badge';
import { useProductRating } from '@/hooks/useProductRating';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useStorefrontConfig } from '../theme/StorefrontThemeProvider';
import { activePromotionsFor, computePrice, promotionBadgeLabel } from '../lib/pricing';
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
  const { shopDetails, convertCurrency, promotions } = useStorefront();
  const rating = useProductRating(product.id);
  const v = variant ?? config.components.productCard;

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

  const Price = ({ className: c }: { className?: string }) =>
    hasDiscount && original != null ? (
      <div className={cn('flex items-baseline gap-2', c)}>
        <span className="text-sm text-muted-foreground line-through">{formatCurrency(original, currency)}</span>
        <span className="font-bold text-primary">{formatCurrency(discounted!, currency)}{suffix}</span>
      </div>
    ) : (
      <span className={cn('font-bold text-primary', c)}>
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
          return label ? (
            <Badge key={p.id} className="bg-emerald-500 text-white border-0 text-[11px]">{label}</Badge>
          ) : null;
        })}
      </div>
    ) : null;

  const SoldOut = () =>
    isOutOfStock ? (
      <Badge className="absolute top-2 left-2 z-10 bg-amber-500 text-white border-0 text-[11px]">Sold Out</Badge>
    ) : null;

  const Picture = ({ ratio: defaultRatio = 'aspect-square', round = '' }: { ratio?: string; round?: string }) => (
    <div className={cn('w-full overflow-hidden bg-muted', ratio ?? defaultRatio, round)}>
      <MediaItem
        src={img}
        alt={product.name}
        type={product.media_type}
        className={cn('h-full w-full object-cover transition-transform duration-300 group-hover:scale-105', isOutOfStock && 'grayscale')}
      />
    </div>
  );

  // ── Variants ───────────────────────────────────────────────────────────────
  if (v === 'overlay') {
    return (
      <Link to={to} className={cn('sf-hoverable group relative block overflow-hidden sf-card', className)} style={{ borderRadius: 'var(--radius)' }}>
        <SoldOut /><Promo />
        <Picture ratio="aspect-[4/5]" />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 pt-12 text-white">
          <h3 className="sf-heading font-semibold leading-tight line-clamp-1">{product.name}</h3>
          <Rating light className="mt-0.5" />
          <Price className="text-white [&_.text-primary]:text-white mt-1" />
        </div>
      </Link>
    );
  }

  if (v === 'minimal') {
    return (
      <Link to={to} className={cn('sf-hoverable group block', className)}>
        <div className="relative">
          <SoldOut /><Promo />
          <Picture round="" ratio="aspect-square" />
        </div>
        <div className="pt-3">
          <h3 className="sf-heading text-sm font-medium leading-tight line-clamp-1">{product.name}</h3>
          <Rating className="mt-0.5" />
          <Price className="text-sm mt-1" />
        </div>
      </Link>
    );
  }

  if (v === 'compact') {
    return (
      <Link to={to} className={cn('sf-hoverable group flex gap-3 items-center sf-glass p-2', className)}>
        <div className="relative h-16 w-16 shrink-0">
          <Picture ratio="h-16 w-16" round="" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="sf-heading text-sm font-medium truncate">{product.name}</h3>
          <Price className="text-sm" />
        </div>
      </Link>
    );
  }

  if (v === 'polaroid') {
    return (
      <Link to={to} className={cn('sf-hoverable group block bg-white p-3 pb-5 shadow-md', className)} style={{ borderRadius: 'var(--radius-sm)' }}>
        <div className="relative">
          <SoldOut /><Promo />
          <Picture ratio="aspect-square" />
        </div>
        <div className="pt-3 text-center">
          <h3 className="sf-heading text-sm font-semibold leading-tight line-clamp-1 text-zinc-800">{product.name}</h3>
          <div className="flex justify-center"><Rating className="mt-0.5" /></div>
          <Price className="text-sm justify-center mt-1" />
        </div>
      </Link>
    );
  }

  if (v === 'editorial') {
    return (
      <Link to={to} className={cn('sf-hoverable group block', className)}>
        <div className="relative">
          <SoldOut /><Promo />
          <Picture ratio="aspect-[3/4]" round="" />
        </div>
        <div className="pt-4">
          {product.category && <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">{product.category}</p>}
          <h3 className="sf-heading text-lg font-semibold leading-snug line-clamp-2">{product.name}</h3>
          <Rating className="mt-1" />
          <Price className="mt-2 text-lg" />
        </div>
      </Link>
    );
  }

  // classic (default)
  return (
    <Link to={to} className={cn('sf-hoverable sf-glass group flex h-full flex-col overflow-hidden', isOutOfStock && 'opacity-80', className)}>
      <div className="relative">
        <SoldOut /><Promo />
        <Picture ratio="aspect-square" />
      </div>
      <div className="flex flex-1 flex-col justify-between p-3 md:p-4">
        <div>
          <h3 className="sf-heading font-semibold text-base leading-tight mb-1 line-clamp-2">{product.name}</h3>
          <Rating className="mb-1" />
          {product.category && (
            <Badge variant="outline" className="text-[11px] bg-primary/10 text-primary border-primary/30 mb-2">{product.category}</Badge>
          )}
          {product.caption && <p className="text-xs text-muted-foreground line-clamp-2">{product.caption}</p>}
        </div>
        <Price className="mt-3 text-lg" />
      </div>
    </Link>
  );
};
