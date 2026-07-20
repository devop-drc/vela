// A product section: best sellers, new arrivals, or recommended — displayed as
// a carousel, grid, masonry wall, or editorial rows. Source + display + title
// come from the section instance props.

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Crown, Sparkles, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { MediaItem } from '@/components/MediaItem';
import { formatCurrency } from '@/lib/formatters';
import { useDragToScroll } from '@/hooks/use-drag-to-scroll';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useStorefrontConfig } from '../theme/StorefrontThemeProvider';
import { ProductCard, ProductLike } from '../components/ProductCard';
import { SectionHeader } from '../components/SectionHeader';
import { SfButton } from '../components/SfButton';
import { activePromotionsFor, computePrice } from '../lib/pricing';
import { useSfT, type SfKey } from '../lib/visitorPrefs';
import { productText } from '../lib/productText';

type Source = 'bestSellers' | 'newArrivals' | 'recommended';
type Display = 'carousel' | 'grid' | 'masonry' | 'editorial';

const ICONS: Record<Source, any> = { bestSellers: Crown, newArrivals: Sparkles, recommended: Gift };
const TITLE_KEYS: Record<Source, SfKey> = { bestSellers: 'bestSellers', newArrivals: 'newArrivals', recommended: 'recommendedForYou' };
const EYEBROW_KEYS: Record<Source, SfKey> = { bestSellers: 'mostLoved', newArrivals: 'justIn', recommended: 'forYou' };

// Masonry rhythm: image aspects cycle so columns break at different heights.
const MASONRY_RATIOS = ['aspect-[3/4]', 'aspect-square', 'aspect-[4/5]', 'aspect-[5/6]', 'aspect-square', 'aspect-[3/4]'];

interface Props { props: { source?: Source; title?: string; display?: Display; limit?: number } }

export const ProductSectionBlock = ({ props }: Props) => {
  const config = useStorefrontConfig();
  const { t, ld, lang } = useSfT();
  const { products, bestSellers, recommendedProducts, shopDetails, convertCurrency, promotions } = useStorefront();
  const railRef = useDragToScroll<HTMLDivElement>();
  const source = props.source ?? 'newArrivals';
  const display: Display = props.display ?? 'carousel';
  const limit = props.limit ?? 10;

  const items: ProductLike[] = useMemo(() => {
    if (source === 'bestSellers') return (bestSellers || []).map((p: any) => ({ ...p, id: p.product_id ?? p.id }));
    if (source === 'recommended') return (recommendedProducts || []) as ProductLike[];
    return [...(products || [])]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit) as ProductLike[];
  }, [source, products, bestSellers, recommendedProducts, limit]);

  if (!shopDetails || items.length === 0) return null;
  const Icon = ICONS[source];
  const cols = config.layout.productGrid.columns;

  const heading = (
    <SectionHeader
      title={ld(props.title, TITLE_KEYS[source])}
      icon={Icon}
      eyebrow={t(EYEBROW_KEYS[source])}
      action={{ label: t('viewAll'), to: `/shop/${shopDetails.slug}/products?sort=${source}` }}
    />
  );

  if (display === 'masonry') {
    return (
      <div>
        {heading}
        <div className={cn('columns-2 gap-[var(--sf-grid-gap)] sm:columns-3 [&>*]:mb-[var(--sf-grid-gap)] [&>*]:break-inside-avoid', cols >= 4 && 'lg:columns-4', cols >= 5 && 'xl:columns-5')}>
          {items.map((p, i) => (
            <ProductCard key={p.id} product={p} ratio={MASONRY_RATIOS[i % MASONRY_RATIOS.length]} />
          ))}
        </div>
      </div>
    );
  }

  if (display === 'editorial') {
    const rows = items.slice(0, Math.min(limit, 4));
    return (
      <div>
        {heading}
        <div className="space-y-10 md:space-y-16">
          {rows.map((p, i) => {
            const img = p.thumbnail_url || p.media_gallery?.[0] || p.media_url;
            const base = convertCurrency ? convertCurrency(p.price, p.currency) : p.price;
            const { original, discounted, hasDiscount } = computePrice(base, activePromotionsFor(promotions as any, p.id));
            const price = hasDiscount ? discounted : original;
            const txt = productText(p as any, lang);
            return (
              <div key={p.id} className={cn('grid items-center gap-6 md:gap-12 md:grid-cols-2')}>
                <Link
                  to={`/shop/${shopDetails.slug}/product/${p.id}`}
                  className={cn('sf-hoverable group block overflow-hidden bg-muted', i % 2 === 1 && 'md:order-2')}
                  style={{ borderRadius: 'var(--sf-radius-card)' }}
                >
                  <div className="aspect-[4/3] md:aspect-[5/4] w-full overflow-hidden">
                    <MediaItem src={img} alt={txt.name} type={p.media_type} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  </div>
                </Link>
                <div className={cn('text-center md:text-left', i % 2 === 1 && 'md:order-1')}>
                  {p.category && <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">{p.category}</p>}
                  <h3 className="sf-heading text-2xl md:text-3xl font-bold leading-snug mb-3">{txt.name}</h3>
                  {txt.caption && <p className="text-muted-foreground line-clamp-3 mb-4 max-w-md mx-auto md:mx-0">{txt.caption}</p>}
                  <div className="flex items-baseline justify-center md:justify-start gap-2 mb-5">
                    {hasDiscount && original != null && <span className="text-muted-foreground line-through">{formatCurrency(original, shopDetails.currency)}</span>}
                    <span className="text-2xl font-bold text-primary">{price != null ? formatCurrency(price, shopDetails.currency) : ''}</span>
                  </div>
                  <SfButton asChild>
                    <Link to={`/shop/${shopDetails.slug}/product/${p.id}`}>{t('viewProduct')} <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </SfButton>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (display === 'grid') {
    return (
      <div>
        {heading}
        <div className={cn('grid gap-[var(--sf-grid-gap)]', 'grid-cols-2 sm:grid-cols-3', cols >= 4 && 'lg:grid-cols-4', cols >= 5 && 'xl:grid-cols-5')}>
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      {heading}
      <ScrollArea className="w-full whitespace-nowrap pb-4">
        <div ref={railRef} className="flex w-max gap-6 p-2">
          {items.map((p) => <ProductCard key={p.id} product={p} className="w-[240px] md:w-[270px] shrink-0" />)}
          {items.length >= limit && (
            <div className="shrink-0 w-[240px] flex items-center justify-center">
              <SfButton asChild variant="outline" size="lg">
                <Link to={`/shop/${shopDetails.slug}/products?sort=${source}`}>
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </SfButton>
            </div>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};
