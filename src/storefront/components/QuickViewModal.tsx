// Quick view — opened from a product card's "choose options" button instead of
// navigating away. Image gallery + description + option pickers + quantity +
// add to cart, with a link through to the full product page.

import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Minus, Plus, ShoppingBag, Star, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { MediaItem } from '@/components/MediaItem';
import { useProductRating } from '@/hooks/useProductRating';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useCart } from '@/contexts/CartContext';
import { useStorefrontTokenStyle } from '../theme/StorefrontThemeProvider';
import { SfButton } from './SfButton';
import { activePromotionsFor, computePrice, promotionBadgeLabel } from '../lib/pricing';
import { optionEntries } from '@/components/filters/filterVisibility';
import { useVariantOptionsFor, mergeOptionEntries } from '@/hooks/useVariantOptions';
import { flyToCart } from '../lib/flyToCart';
import type { ProductLike } from './ProductCard';

interface Props {
  product: ProductLike;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QuickViewModal = ({ product, open, onOpenChange }: Props) => {
  const { shopDetails, convertCurrency, promotions, capabilities } = useStorefront();
  const { addToCart } = useCart();
  const token = useStorefrontTokenStyle();
  const rating = useProductRating(open && capabilities.reviews ? product.id : undefined);

  const [selected, setSelected] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  useEffect(() => {
    if (open) { setSelected({}); setQuantity(1); setActiveImg(0); }
  }, [open, product.id]);

  const media = useMemo(() => {
    const list = product.media_gallery?.length ? product.media_gallery : product.media_url ? [product.media_url] : [];
    return list;
  }, [product]);

  const currency = shopDetails?.currency || 'USD';
  const base = convertCurrency ? convertCurrency(product.price, product.currency) : product.price;
  const promos = activePromotionsFor(promotions as any, product.id);
  const { original, discounted, hasDiscount } = computePrice(base, promos);
  const isOutOfStock =
    product.status === 'Out of Stock' ||
    (product.pricing_type === 'one_time' && (product.inventory ?? 0) <= 0);
  const suffix =
    product.pricing_type === 'subscription'
      ? ` /${product.billing_interval === 'month' ? 'mo' : 'yr'}`
      : '';

  // Option groups: real variant combinations (product_variants) merged with any
  // detail-based options (color / size / material).
  const variantInfo = useVariantOptionsFor(open ? product.id : undefined);
  const options = useMemo(
    () => mergeOptionEntries(optionEntries(product.details), variantInfo.options),
    [product, variantInfo]
  );

  const detailPath = shopDetails ? `/shop/${shopDetails.slug}/product/${product.id}` : '#';

  const handleAdd = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isOutOfStock) { toast.error('This product is currently out of stock.'); return; }
    const missing = options.find(([key]) => !selected[key]);
    if (missing) { toast.error(`Please choose a ${missing[0]} first.`); return; }
    flyToCart(e.currentTarget, product.media_type === 'video' ? undefined : media[activeImg] || product.media_url);
    addToCart({
      productId: product.id, name: product.name,
      price: hasDiscount ? discounted! : original!, originalPrice: original!, isDiscounted: hasDiscount,
      currency, media_url: product.media_url, media_type: product.media_type as any,
      selectedOptions: Object.keys(selected).length ? selected : undefined,
      pricing_type: product.pricing_type, billing_interval: product.billing_interval,
    } as any, quantity);
    onOpenChange(false);
  };

  if (!shopDetails) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className={cn(
          'grid max-h-[90dvh] w-[calc(100vw-2rem)] gap-0 overflow-y-auto p-0 sm:max-w-3xl md:grid-cols-2 md:overflow-hidden',
          'bg-background text-foreground', token.className
        )}
        style={token.style}
        {...token.attrs}
      >
        {/* ── Gallery ── */}
        <div className="relative bg-muted md:h-full">
          <div className="relative aspect-square w-full overflow-hidden md:h-full md:min-h-[420px]">
            <MediaItem
              key={media[activeImg] || product.media_url}
              src={media[activeImg] || product.media_url}
              alt={product.name}
              type={product.media_type}
              className={cn('h-full w-full object-cover', isOutOfStock && 'grayscale')}
            />
            {promos.length > 0 && !isOutOfStock && (
              <div className="absolute left-3 top-3 flex flex-col gap-1">
                {promos.map((p) => {
                  const label = promotionBadgeLabel(p);
                  return label ? <span key={p.id} className="sf-badge !bg-[hsl(142_71%_45%)] !text-white">{label}</span> : null;
                })}
              </div>
            )}
            {isOutOfStock && (
              <span className="sf-badge absolute left-3 top-3" style={{ background: 'hsl(var(--warning))', color: 'hsl(var(--warning-foreground))' }}>
                Sold Out
              </span>
            )}
          </div>
          {media.length > 1 && (
            <div className="absolute inset-x-0 bottom-0 flex gap-1.5 overflow-x-auto bg-gradient-to-t from-black/40 to-transparent p-2.5">
              {media.map((m, i) => (
                <button
                  key={m + i}
                  type="button"
                  onClick={() => setActiveImg(i)}
                  aria-label={`Image ${i + 1}`}
                  aria-pressed={i === activeImg}
                  className={cn(
                    'h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 transition-all',
                    i === activeImg ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'
                  )}
                >
                  <MediaItem src={m} alt="" type={product.media_type} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div className="flex min-w-0 flex-col gap-4 p-5 md:overflow-y-auto md:p-6">
          <div>
            {product.category && <p className="sf-eyebrow mb-1">{product.category}</p>}
            <DialogTitle className="sf-heading text-xl font-bold leading-snug md:text-2xl">{product.name}</DialogTitle>
            {rating && rating.count > 0 && (
              <span className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                {rating.avg.toFixed(1)} <span className="text-muted-foreground/70">({rating.count} review{rating.count === 1 ? '' : 's'})</span>
              </span>
            )}
          </div>

          <div className="flex items-baseline gap-2">
            {hasDiscount && original != null && (
              <span className="text-base text-muted-foreground line-through">{formatCurrency(original, currency)}</span>
            )}
            <span className="text-2xl font-bold text-primary">
              {original != null ? `${formatCurrency(hasDiscount ? discounted! : original, currency)}${suffix}` : 'N/A'}
            </span>
          </div>

          {product.caption && (
            <DialogDescription className="max-h-28 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {product.caption}
            </DialogDescription>
          )}

          {options.map(([key, values]) => (
            <div key={key}>
              <p className="mb-1.5 text-sm font-medium capitalize">
                {key}
                {selected[key] && <span className="ml-1.5 font-normal text-muted-foreground">— {selected[key]}</span>}
              </p>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={key}>
                {values.map((val) => (
                  <button
                    key={val}
                    role="radio"
                    aria-checked={selected[key] === val}
                    onClick={() => setSelected((s) => ({ ...s, [key]: val }))}
                    className={cn(
                      'inline-flex min-h-9 items-center rounded-md border px-3 py-1.5 text-sm capitalize transition-colors',
                      selected[key] === val ? 'border-primary bg-primary/10 font-medium text-primary' : 'hover:border-primary/50'
                    )}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div className="mt-auto space-y-3 pt-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-md border">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="grid h-10 w-10 place-items-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-sm font-semibold tabular-nums">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Increase quantity"
                  className="grid h-10 w-10 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <SfButton className="h-10 flex-1" onClick={handleAdd} disabled={isOutOfStock}>
                <ShoppingBag className="mr-2 h-4 w-4" />
                {isOutOfStock ? 'Out of stock' : 'Add to cart'}
              </SfButton>
            </div>
            <Link
              to={detailPath}
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              View full details <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
