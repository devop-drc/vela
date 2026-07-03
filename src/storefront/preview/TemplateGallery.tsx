// Gallery of template previews. Each card renders the REAL storefront
// (/demo-shop?template=<id> — actual blocks, demo products with photos and
// prices) in a scaled, inert iframe, so what you pick is what you get.
// Clicking a card calls onApply with the template's full config.

import { useEffect, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TEMPLATES } from '../templates';
import { StorefrontConfig } from '../config/types';

interface Props {
  activeTemplateId?: string | null;
  onApply: (config: StorefrontConfig, templateId: string) => void;
}

/** Real homepage render at desktop width, scaled to fit its card. Lazy: the
    iframe mounts only once the card scrolls into view. */
const LiveTemplatePreview = ({ templateId }: { templateId: string }) => {
  const holderRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); io.disconnect(); } }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Render at a fixed 1280px-wide virtual desktop, scaled down to card width.
  const VIRTUAL_W = 1280;
  const [scale, setScale] = useState(0.2);
  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / VIRTUAL_W);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={holderRef} className="absolute inset-0 overflow-hidden bg-muted/40">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/50" />
        </div>
      )}
      {visible && (
        <iframe
          title={`${templateId} preview`}
          src={`/demo-shop?template=${templateId}`}
          loading="lazy"
          tabIndex={-1}
          onLoad={() => setLoaded(true)}
          className={cn('pointer-events-none origin-top-left border-0 transition-opacity duration-300', loaded ? 'opacity-100' : 'opacity-0')}
          style={{ width: VIRTUAL_W, height: VIRTUAL_W * 2, transform: `scale(${scale})` }}
        />
      )}
    </div>
  );
};

export const TemplateGallery = ({ activeTemplateId, onApply }: Props) => (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
    {TEMPLATES.map((t) => {
      const active = activeTemplateId === t.id;
      return (
        <button
          key={t.id}
          type="button"
          onClick={() => onApply(t.config, t.id)}
          className={cn(
            'group text-left rounded-xl border-2 overflow-hidden transition-all hover:shadow-md',
            active ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/40'
          )}
        >
          <div className="relative" style={{ aspectRatio: '16 / 10' }}>
            <LiveTemplatePreview templateId={t.id} />
            {active && (
              <span className="absolute top-2 right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3 w-3" />
              </span>
            )}
          </div>
          <div className="p-2.5">
            <p className="text-sm font-semibold leading-tight">{t.name}</p>
            <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2 mt-0.5">{t.description}</p>
          </div>
        </button>
      );
    })}
  </div>
);
