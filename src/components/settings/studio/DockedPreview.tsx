// Docked live preview for the Studio workspace. When the dock is wide enough it
// shows desktop AND mobile side by side; on narrower docks it shows one device
// with a desktop/mobile toggle. Config streams in over postMessage (no reloads),
// heartbeat-backed so it never goes stale.

import { useEffect, useRef, useState } from 'react';
import { Monitor, Smartphone, ExternalLink, Lock, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { StorefrontConfig } from '@/storefront/config/types';
import { DESKTOP, MOBILE, PreviewFrame, usePreviewBridge } from './DualPreview';

interface Props {
  previewPath: string | null;
  previewUrl: string | null;
  config: StorefrontConfig;
  /** Semantic spot to show after an edit ('products', 'productDetail', 'cart',
      'orders', 'footer', 'home'); bump `n` to re-send the same target. */
  navTarget?: { target: string; n: number } | null;
  className?: string;
}

// Below this dock width we drop to a single device + a toggle.
const DUAL_MIN = 760;
const GAP = 28;

/** An iframe rendered at a real device size and scaled to fill its parent
    width (height follows the aspect). Used for static side-by-side previews. */
export const ScaledFrame = ({ src, virtualW, virtualH, title, className, interactive }: {
  src: string; virtualW: number; virtualH: number; title: string; className?: string;
  /** When true the iframe is clickable/scrollable (a live, usable preview). */
  interactive?: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(320);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = w / virtualW;
  return (
    <div ref={ref} className={cn('overflow-hidden rounded-lg border bg-muted', className)} style={{ height: virtualH * scale }}>
      <iframe
        src={src}
        title={title}
        loading="lazy"
        tabIndex={interactive ? 0 : -1}
        className={cn('block origin-top-left border-0 bg-background', !interactive && 'pointer-events-none')}
        style={{ width: virtualW, height: virtualH, transform: `scale(${scale})` }}
      />
    </div>
  );
};

export const DockedPreview = ({ previewPath, previewUrl, config, navTarget, className }: Props) => {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const deskRef = useRef<HTMLIFrameElement>(null);
  const mobRef = useRef<HTMLIFrameElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [holder, setHolder] = useState({ w: 800, h: 600 });

  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    const update = () => setHolder({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Stream config to both refs; only the rendered iframe(s) receive it.
  usePreviewBridge([deskRef, mobRef], config, navTarget);

  const dual = holder.w >= DUAL_MIN;
  const host = previewUrl ? previewUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'shop';

  const dualScale = Math.max(0.12, Math.min(
    (holder.w - GAP - 28) / (DESKTOP.w + MOBILE.w),
    (holder.h - 44) / Math.max(DESKTOP.h, MOBILE.h),
  ));
  const single = device === 'desktop' ? DESKTOP : MOBILE;
  const singleScale = Math.max(0.12, Math.min((holder.w - 28) / single.w, (holder.h - 24) / single.h, 1));

  return (
    <div className={cn('flex min-h-0 flex-col overflow-hidden rounded-xl border bg-muted/30', className)}>
      {/* Dock toolbar */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-background/80 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3 shrink-0" />
          <span className="truncate">{host}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {!dual && (
            <div className="flex rounded-md border p-0.5">
              <button type="button" onClick={() => setDevice('desktop')} className={cn('flex h-7 items-center gap-1 rounded px-2 text-xs', device === 'desktop' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')} aria-pressed={device === 'desktop'}>
                <Monitor className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Desktop</span>
              </button>
              <button type="button" onClick={() => setDevice('mobile')} className={cn('flex h-7 items-center gap-1 rounded px-2 text-xs', device === 'mobile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')} aria-pressed={device === 'mobile'}>
                <Smartphone className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Mobile</span>
              </button>
            </div>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setReloadKey((k) => k + 1)} aria-label="Reload preview">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          {previewUrl && (
            <Button variant="outline" size="icon" className="h-8 w-8" asChild>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" aria-label="Open storefront in new tab"><ExternalLink className="h-3.5 w-3.5" /></a>
            </Button>
          )}
        </div>
      </div>

      {/* Scaled device(s) */}
      <div ref={holderRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3">
        {!previewPath ? (
          <p className="text-sm text-muted-foreground">Save your shop name to preview.</p>
        ) : dual ? (
          <div className="flex items-start" style={{ gap: GAP }}>
            <div className="flex flex-col items-center gap-2">
              <PreviewFrame key={`d-${reloadKey}`} innerRef={deskRef} src={previewPath} dev={DESKTOP} scale={dualScale} />
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><Monitor className="h-3 w-3" /> Desktop</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <PreviewFrame key={`m-${reloadKey}`} innerRef={mobRef} src={previewPath} dev={MOBILE} scale={dualScale} phone />
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><Smartphone className="h-3 w-3" /> Mobile</span>
            </div>
          </div>
        ) : device === 'desktop' ? (
          <PreviewFrame key={`d-${reloadKey}`} innerRef={deskRef} src={previewPath} dev={DESKTOP} scale={singleScale} />
        ) : (
          <PreviewFrame key={`m-${reloadKey}`} innerRef={mobRef} src={previewPath} dev={MOBILE} scale={singleScale} phone />
        )}
      </div>
      <p className="shrink-0 border-t bg-background/80 py-1 text-center text-[11px] text-muted-foreground">
        {dual ? 'Desktop + mobile' : device === 'desktop' ? 'Desktop · 1280px' : 'Mobile · 390px'} — edits apply instantly
      </p>
    </div>
  );
};
