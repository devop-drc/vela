// Product slider — a premium snap-scroll rail with arrow controls and a
// progress bar. Variants:
//  peek     — cards partially reveal the next one (default)
//  centered — the active card scales up, neighbors dim
//  wide     — fewer, larger cards
// Source/title/limit mirror ProductSectionBlock's props.

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Crown, Sparkles, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStorefront } from '@/contexts/StorefrontContext';
import { ProductCard, ProductLike } from '../components/ProductCard';
import { SectionHeader } from '../components/SectionHeader';

type Source = 'bestSellers' | 'newArrivals' | 'recommended';
type Variant = 'peek' | 'centered' | 'wide';

const ICONS: Record<Source, any> = { bestSellers: Crown, newArrivals: Sparkles, recommended: Gift };
const EYEBROWS: Record<Source, string> = { bestSellers: 'Most loved', newArrivals: 'Just in', recommended: 'For you' };

interface Props { props: { source?: Source; title?: string; variant?: Variant; limit?: number } }

export const ProductSliderBlock = ({ props }: Props) => {
  const { products, bestSellers, recommendedProducts, shopDetails } = useStorefront();
  const railRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const [active, setActive] = useState(0);

  const source = props.source ?? 'newArrivals';
  const variant: Variant = props.variant ?? 'peek';
  const limit = props.limit ?? 10;

  const items: ProductLike[] = useMemo(() => {
    if (source === 'bestSellers') return (bestSellers || []).map((p: any) => ({ ...p, id: p.product_id ?? p.id }));
    if (source === 'recommended') return (recommendedProducts || []) as ProductLike[];
    return [...(products || [])]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit) as ProductLike[];
  }, [source, products, bestSellers, recommendedProducts, limit]);

  // Track scroll for the progress bar, arrow states and the centered focus.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const onScroll = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      setProgress(max > 0 ? rail.scrollLeft / max : 0);
      setCanPrev(rail.scrollLeft > 8);
      setCanNext(rail.scrollLeft < max - 8);
      if (variant === 'centered') {
        const mid = rail.scrollLeft + rail.clientWidth / 2;
        let best = 0, bestDist = Infinity;
        Array.from(rail.children).forEach((c, i) => {
          const el = c as HTMLElement;
          const center = el.offsetLeft + el.offsetWidth / 2;
          const d = Math.abs(center - mid);
          if (d < bestDist) { bestDist = d; best = i; }
        });
        setActive(best);
      }
    };
    onScroll();
    rail.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(onScroll);
    ro.observe(rail);
    return () => { rail.removeEventListener('scroll', onScroll); ro.disconnect(); };
  }, [variant, items.length]);

  if (!shopDetails || items.length === 0) return null;

  const nudge = (dir: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: dir * rail.clientWidth * 0.8, behavior: 'smooth' });
  };

  const cardW = variant === 'wide' ? 'w-[320px] md:w-[380px]' : 'w-[230px] md:w-[264px]';

  return (
    <div>
      <SectionHeader
        title={props.title}
        icon={ICONS[source]}
        eyebrow={EYEBROWS[source]}
        action={{ label: 'View all', to: `/shop/${shopDetails.slug}/products?sort=${source}` }}
      />
      <div className="relative">
        <div
          ref={railRef}
          className={cn(
            'flex snap-x snap-mandatory gap-5 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            variant === 'centered' && 'px-[12%]'
          )}
        >
          {items.map((p, i) => (
            <div
              key={p.id}
              className={cn(
                'shrink-0 snap-start transition-[transform,opacity] duration-300',
                cardW,
                variant === 'centered' && 'snap-center',
                variant === 'centered' && (i === active ? 'scale-100 opacity-100' : 'scale-[0.92] opacity-60')
              )}
            >
              <ProductCard product={p} />
            </div>
          ))}
        </div>

        {/* Arrows */}
        <button
          type="button" aria-label="Previous products" disabled={!canPrev} onClick={() => nudge(-1)}
          className={cn('absolute -left-3 top-[38%] z-10 grid h-10 w-10 place-items-center rounded-full border bg-card shadow-md transition-opacity hover:bg-accent', !canPrev && 'pointer-events-none opacity-0')}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button" aria-label="More products" disabled={!canNext} onClick={() => nudge(1)}
          className={cn('absolute -right-3 top-[38%] z-10 grid h-10 w-10 place-items-center rounded-full border bg-card shadow-md transition-opacity hover:bg-accent', !canNext && 'pointer-events-none opacity-0')}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mx-auto mt-2 h-1 w-40 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-[width] duration-150" style={{ width: `${Math.max(8, progress * 100)}%` }} />
      </div>
    </div>
  );
};
