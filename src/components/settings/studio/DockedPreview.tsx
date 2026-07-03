// Docked live preview for the Studio workspace (tweakcn-style): the storefront
// renders in an iframe at a REAL device viewport (1280×720 desktop / 390-wide
// mobile) and is scaled to fill the dock. Live config streams in over
// postMessage — no reloads; if the bridge never connects we reload once so the
// preview is never stale.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Monitor, Smartphone, ExternalLink, Lock, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { StorefrontConfig } from '@/storefront/config/types';

interface Props {
  previewPath: string | null;
  previewUrl: string | null;
  config: StorefrontConfig;
  /** Semantic spot to show after an edit ('products', 'productDetail', 'cart',
      'orders', 'footer', 'home'); bump `n` to re-send the same target. */
  navTarget?: { target: string; n: number } | null;
  className?: string;
}

const DESKTOP = { w: 1280, h: 800 };
const MOBILE = { w: 390, h: 780 };

/** An iframe rendered at a real device size and scaled to fill its parent
    width (height follows the aspect). Used for static side-by-side previews. */
export const ScaledFrame = ({ src, virtualW, virtualH, title, className }: {
  src: string; virtualW: number; virtualH: number; title: string; className?: string;
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
    <div ref={ref} className={cn('overflow-hidden rounded-lg border bg-white', className)} style={{ height: virtualH * scale }}>
      <iframe
        src={src}
        title={title}
        loading="lazy"
        tabIndex={-1}
        className="pointer-events-none block origin-top-left border-0 bg-white"
        style={{ width: virtualW, height: virtualH, transform: `scale(${scale})` }}
      />
    </div>
  );
};

export const DockedPreview = ({ previewPath, previewUrl, config, navTarget, className }: Props) => {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const configRef = useRef(config);
  const [ready, setReady] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [holder, setHolder] = useState({ w: 800, h: 600 });
  configRef.current = config;

  // Fit the virtual device into the dock.
  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    const update = () => setHolder({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const post = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'sf-preview-config', config: configRef.current }, '*');
  }, []);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => { if (e.data?.type === 'sf-preview-ready') { setReady(true); post(); } };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [post]);

  useEffect(() => { if (ready) post(); }, [ready, post, config]);
  useEffect(() => { setReady(false); }, [reloadKey, device, previewPath]);

  // Steer the preview to where the last edit is visible.
  useEffect(() => {
    if (!ready || !navTarget) return;
    iframeRef.current?.contentWindow?.postMessage({ type: 'sf-preview-navigate', target: navTarget.target }, '*');
  }, [ready, navTarget]);

  // Bridge fallback: reload once if it never connects.
  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => { if (!ready) setReloadKey((k) => k + 1); }, 4000);
    return () => clearTimeout(t);
  }, [ready, reloadKey]);

  const vp = device === 'desktop' ? DESKTOP : MOBILE;
  const pad = 20;
  const scale = Math.max(0.15, Math.min((holder.w - pad) / vp.w, (holder.h - pad) / vp.h, 1));
  const host = previewUrl ? previewUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'shop';

  return (
    <div className={cn('flex min-h-0 flex-col overflow-hidden rounded-xl border bg-muted/30', className)}>
      {/* Dock toolbar */}
      <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-background/80 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3 w-3 shrink-0" />
          <span className="truncate">{host}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div className="flex rounded-md border p-0.5">
            <button type="button" onClick={() => setDevice('desktop')} className={cn('flex h-7 items-center gap-1 rounded px-2 text-xs', device === 'desktop' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')} aria-pressed={device === 'desktop'}>
              <Monitor className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Desktop</span>
            </button>
            <button type="button" onClick={() => setDevice('mobile')} className={cn('flex h-7 items-center gap-1 rounded px-2 text-xs', device === 'mobile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')} aria-pressed={device === 'mobile'}>
              <Smartphone className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>
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

      {/* Scaled device */}
      <div ref={holderRef} className="relative min-h-0 flex-1">
        {previewPath ? (
          <div
            className="absolute left-1/2 top-1/2 overflow-hidden rounded-lg border bg-white shadow-lg"
            style={{ width: vp.w, height: vp.h, transform: `translate(-50%, -50%) scale(${scale})` }}
          >
            <iframe
              ref={iframeRef}
              key={`${device}-${reloadKey}`}
              src={previewPath}
              title="Storefront preview"
              className="block border-0 bg-white"
              style={{ width: vp.w, height: vp.h }}
            />
          </div>
        ) : (
          <p className="flex h-full items-center justify-center text-sm text-muted-foreground">Save your shop name to preview.</p>
        )}
      </div>
      <p className="shrink-0 border-t bg-background/80 py-1 text-center text-[11px] text-muted-foreground">
        {device === 'desktop' ? 'Desktop · 1280px' : 'Mobile · 390px'} — edits apply instantly
      </p>
    </div>
  );
};
