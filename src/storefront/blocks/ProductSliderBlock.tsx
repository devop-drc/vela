// Product slider — a premium, infinitely-looping auto-scroll rail. The catalog
// is repeated into two copies, each guaranteed at least as wide as the viewport,
// and the scroll position is kept modulo one copy width — so it glides forever
// with no reversal, jump, or dead end. Grab-and-drag works from anywhere on the
// rail (mouse via pointer capture; touch flicks natively and wraps too) without
// selecting text or ghost-dragging images. Auto-scroll pauses on hover / drag /
// touch / wheel and resumes shortly after; reduced-motion and motion:'none'
// disable it. Variants: peek (default) · centered (middle card scales up) · wide.

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Crown, Sparkles, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStorefront } from '@/contexts/StorefrontContext';
import { useStorefrontConfig } from '../theme/StorefrontThemeProvider';
import { ProductCard, ProductLike } from '../components/ProductCard';
import { SectionHeader } from '../components/SectionHeader';

type Source = 'bestSellers' | 'newArrivals' | 'recommended';
type Variant = 'peek' | 'centered' | 'wide';

const ICONS: Record<Source, any> = { bestSellers: Crown, newArrivals: Sparkles, recommended: Gift };
const EYEBROWS: Record<Source, string> = { bestSellers: 'Most loved', newArrivals: 'Just in', recommended: 'For you' };

interface Props { props: { source?: Source; title?: string; variant?: Variant; limit?: number } }

const mod = (v: number, s: number) => ((v % s) + s) % s;

export const ProductSliderBlock = ({ props }: Props) => {
  const { products, bestSellers, recommendedProducts, shopDetails } = useStorefront();
  const config = useStorefrontConfig();
  const railRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [mult, setMult] = useState(2);

  const source = props.source ?? 'newArrivals';
  const variant: Variant = props.variant ?? 'peek';
  const limit = props.limit ?? 10;
  const motion = config.effects.motion;

  const items: ProductLike[] = useMemo(() => {
    if (source === 'bestSellers') return (bestSellers || []).filter((p: any) => Number(p.price) > 0).map((p: any) => ({ ...p, id: p.product_id ?? p.id }));
    if (source === 'recommended') return (recommendedProducts || []) as ProductLike[];
    return [...(products || [])]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit) as ProductLike[];
  }, [source, products, bestSellers, recommendedProducts, limit]);

  // One "copy" = the catalog repeated `mult` times; the rail renders two copies.
  const loop = items.length > 1;
  const copy = loop ? Array.from({ length: mult }, () => items).flat() : items;
  const rendered = loop ? [...copy, ...copy] : items;

  // Grow `mult` until one copy is at least as wide as the viewport — required so
  // the scroll-wrap loop is seamless and never clamps at an edge.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !loop) return;
    const copyW = rail.scrollWidth / 2;
    if (copyW > 0 && copyW < rail.clientWidth + 60 && mult < 12) setMult((m) => m + 1);
  }, [mult, loop, items.length, variant]);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || !loop) return;

    const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const auto = motion !== 'none' && !reduce;
    const speed = motion === 'expressive' ? 1.0 : motion === 'subtle' ? 0.45 : 0.7; // px/frame

    const seg = () => rail.scrollWidth / 2;
    const ready = () => seg() >= rail.clientWidth; // one copy covers the viewport
    const norm = () => { const s = seg(); if (s > 0 && (rail.scrollLeft >= s || rail.scrollLeft < 0)) rail.scrollLeft = mod(rail.scrollLeft, s); };

    let dragging = false, moved = false, startX = 0, startScroll = 0;
    let paused = false;
    let resumeT: ReturnType<typeof setTimeout> | undefined;
    const pauseNow = () => { paused = true; if (resumeT) clearTimeout(resumeT); };
    const resumeSoon = () => { if (resumeT) clearTimeout(resumeT); resumeT = setTimeout(() => { paused = false; }, 1400); };

    let raf = 0;
    const tick = () => {
      if (auto && !paused && !dragging && ready()) { rail.scrollLeft += speed; norm(); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onScroll = () => {
      if (!dragging) norm(); // wrap native (touch / wheel) scrolling too
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

    // Grab-and-drag from anywhere on the rail (mouse). CRITICAL: no pointer
    // capture / preventDefault on pointerdown — capturing immediately retargets
    // the subsequent `click` to the rail, which makes every product on the rail
    // unclickable. Instead the gesture is only "armed" on pointerdown; capture
    // begins once movement crosses a small threshold, so a plain press-release
    // stays a normal click on the card underneath. The scroll target is taken
    // modulo one copy so a drag loops instead of hitting an edge.
    let armed = false, pointerId = -1;
    const onDown = (e: PointerEvent) => {
      pauseNow();
      if (e.pointerType !== 'mouse' || e.button !== 0) return; // touch/pen flick natively
      armed = true; dragging = false; moved = false;
      startX = e.clientX; startScroll = rail.scrollLeft; pointerId = e.pointerId;
    };
    const onMove = (e: PointerEvent) => {
      if (!armed) return;
      const dx = e.clientX - startX;
      if (!dragging) {
        if (Math.abs(dx) <= 5) return; // still a click, not a drag
        dragging = true; moved = true;
        try { rail.setPointerCapture(pointerId); } catch { /* older browsers */ }
        rail.style.cursor = 'grabbing';
      }
      const s = seg();
      rail.scrollLeft = s > 0 ? mod(startScroll - dx, s) : startScroll - dx;
    };
    const onUp = (e: PointerEvent) => {
      if (armed) {
        armed = false;
        if (dragging) {
          dragging = false; rail.style.cursor = 'grab';
          try { rail.releasePointerCapture(e.pointerId); } catch { /* noop */ }
          if (moved) {
            // A real drag happened — swallow the click it would otherwise fire.
            const supp = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
            rail.addEventListener('click', supp, { capture: true, once: true });
            setTimeout(() => rail.removeEventListener('click', supp, true), 40);
          }
        }
      }
      resumeSoon();
    };
    const onDragStart = (e: Event) => e.preventDefault();

    rail.addEventListener('scroll', onScroll, { passive: true });
    rail.addEventListener('mouseenter', pauseNow);
    rail.addEventListener('mouseleave', resumeSoon);
    rail.addEventListener('pointerdown', onDown);
    rail.addEventListener('pointermove', onMove);
    rail.addEventListener('pointerup', onUp);
    rail.addEventListener('pointercancel', onUp);
    rail.addEventListener('dragstart', onDragStart);
    rail.addEventListener('touchstart', pauseNow, { passive: true });
    rail.addEventListener('touchend', resumeSoon, { passive: true });
    rail.addEventListener('wheel', () => { pauseNow(); resumeSoon(); }, { passive: true });
    rail.style.cursor = 'grab';

    return () => {
      cancelAnimationFrame(raf);
      if (resumeT) clearTimeout(resumeT);
      rail.removeEventListener('scroll', onScroll);
      rail.removeEventListener('mouseenter', pauseNow);
      rail.removeEventListener('mouseleave', resumeSoon);
      rail.removeEventListener('pointerdown', onDown);
      rail.removeEventListener('pointermove', onMove);
      rail.removeEventListener('pointerup', onUp);
      rail.removeEventListener('pointercancel', onUp);
      rail.removeEventListener('dragstart', onDragStart);
      rail.removeEventListener('touchstart', pauseNow);
      rail.removeEventListener('touchend', resumeSoon);
    };
  }, [loop, motion, variant, items.length, mult]);

  if (!shopDetails || items.length === 0) return null;

  const nudge = (dir: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: dir * rail.clientWidth * 0.8, behavior: 'smooth' });
  };

  const cardW = variant === 'wide' ? 'w-[300px] sm:w-[340px] md:w-[380px]' : 'w-[220px] sm:w-[240px] md:w-[264px]';

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
            'flex select-none gap-5 overflow-x-auto pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            !loop && 'snap-x snap-mandatory',
            variant === 'centered' && 'px-6 md:px-[12%]'
          )}
          style={{
            maskImage: 'linear-gradient(90deg, transparent 0, #000 3%, #000 97%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(90deg, transparent 0, #000 3%, #000 97%, transparent 100%)',
          }}
        >
          {rendered.map((p, i) => (
            <div
              key={`${p.id}-${i}`}
              className={cn(
                'shrink-0 transition-[transform,opacity] duration-300',
                cardW,
                variant === 'centered' && (i === active ? 'scale-100 opacity-100' : 'scale-[0.92] opacity-60')
              )}
            >
              <ProductCard product={p} />
            </div>
          ))}
        </div>

        {/* Arrows (desktop) — nudge the rail; pause/resume is handled above. */}
        <button
          type="button" aria-label="Previous products" onClick={() => nudge(-1)}
          className="absolute -left-3 top-[38%] z-10 hidden h-10 w-10 place-items-center rounded-full border bg-card shadow-md transition-colors hover:bg-accent md:grid"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button" aria-label="More products" onClick={() => nudge(1)}
          className="absolute -right-3 top-[38%] z-10 hidden h-10 w-10 place-items-center rounded-full border bg-card shadow-md transition-colors hover:bg-accent md:grid"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
