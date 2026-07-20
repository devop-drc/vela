// Vertical template rail (right side of the Studio): an auto-scrolling
// marquee of live template previews that the user can also grab and drag
// smoothly. Interaction pauses the auto-scroll; it resumes after a short
// idle. The list is doubled so the loop is seamless.

import { Check } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { TEMPLATES } from '@/storefront/templates';
import type { StorefrontConfig } from '@/storefront/config/types';
import { ScaledFrame } from './DockedPreview';

interface Props {
  activeTemplateId?: string | null;
  onPick: (config: StorefrontConfig, templateId: string) => void;
  className?: string;
}

const AUTO_SPEED = 0.35; // px per frame ≈ 21px/s
const RESUME_AFTER_MS = 2500;

export const TemplateMarquee = ({ activeTemplateId, onPick, className }: Props) => {
  const { t } = useTranslation();
  const railRef = useRef<HTMLDivElement>(null);
  const pausedUntil = useRef(0);
  const drag = useRef<{ startY: number; startTop: number; moved: boolean } | null>(null);

  // Auto-scroll loop with seamless wrap (list is rendered twice).
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const tick = () => {
      const half = rail.scrollHeight / 2;
      if (half > rail.clientHeight && Date.now() > pausedUntil.current && !drag.current) {
        rail.scrollTop = rail.scrollTop >= half ? rail.scrollTop - half : rail.scrollTop + AUTO_SPEED;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const pause = () => { pausedUntil.current = Date.now() + RESUME_AFTER_MS; };

  const onPointerDown = (e: React.PointerEvent) => {
    const rail = railRef.current;
    if (!rail) return;
    drag.current = { startY: e.clientY, startTop: rail.scrollTop, moved: false };
    rail.setPointerCapture(e.pointerId);
    pause();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const rail = railRef.current;
    if (!rail || !drag.current) return;
    const dy = e.clientY - drag.current.startY;
    if (Math.abs(dy) > 4) drag.current.moved = true;
    rail.scrollTop = drag.current.startTop - dy;
  };
  const endDrag = () => { if (drag.current) { pause(); drag.current = null; } };

  const doubled = [...TEMPLATES, ...TEMPLATES];

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <p className="shrink-0 px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('studio_panels.templates')}</p>
      <div
        ref={railRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onWheel={pause}
        onMouseEnter={pause}
        onTouchStart={pause}
        className="min-h-0 flex-1 cursor-grab touch-pan-y select-none overflow-y-auto px-3 pb-3 active:cursor-grabbing [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <div className="flex flex-col gap-3">
          {doubled.map((tpl, i) => {
            const active = activeTemplateId === tpl.id;
            return (
              <button
                key={`${tpl.id}-${i}`}
                type="button"
                onClick={() => { if (!drag.current?.moved) onPick(tpl.config, tpl.id); }}
                className={cn(
                  'group relative w-full shrink-0 overflow-hidden rounded-lg border-2 text-left transition-all hover:shadow-md',
                  active ? 'border-primary ring-1 ring-primary' : 'border-border hover:border-primary/40'
                )}
              >
                <ScaledFrame src={`/demo-shop?template=${tpl.id}`} virtualW={1280} virtualH={760} title={t('studio_panels.template_title', { name: tpl.name })} className="pointer-events-none rounded-none border-0" />
                {active && (
                  <span className="absolute right-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                <div className="flex items-baseline justify-between gap-2 border-t bg-background/95 px-2.5 py-1.5">
                  <span className="text-xs font-semibold">{tpl.name}</span>
                  <span className="truncate text-[10px] text-muted-foreground">{tpl.businessType}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <p className="shrink-0 px-3 pb-2 text-center text-[10px] text-muted-foreground">{t('studio_panels.drag_browse_click_apply')}</p>
    </div>
  );
};
