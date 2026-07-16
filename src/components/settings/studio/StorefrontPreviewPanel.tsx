// Floating, always-on-top preview panel. The storefront iframe is sized to a
// REAL device viewport (1280×720 desktop / 390-wide mobile) so media queries,
// vh/dvh and the mobile bottom nav all resolve exactly like a real device, then
// scaled to fit. Live config streams in via postMessage (no reload); if the
// bridge never connects, it falls back to reloading so the preview is never stale.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Monitor, Smartphone, ExternalLink, ChevronRight, Eye, Lock, ChevronLeft, Share, BookOpen, SquareStack, Wifi, SignalHigh, BatteryFull, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { StorefrontConfig } from '@/storefront/config/types';

interface Props {
  previewPath: string | null;
  previewUrl: string | null;
  config: StorefrontConfig;
  typeKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Content viewport (the iframe) + chrome heights → outer logical frame.
const DESKTOP = { content: { w: 1280, h: 720 }, browserBar: 34 };
const MOBILE = { content: { w: 390, h: 640 }, status: 26, address: 34, bottom: 30, gesture: 20, bezel: 10 };
const DESKTOP_OUTER = { w: DESKTOP.content.w, h: DESKTOP.content.h + DESKTOP.browserBar };
const MOBILE_OUTER = { w: MOBILE.content.w + MOBILE.bezel * 2, h: MOBILE.content.h + MOBILE.status + MOBILE.address + MOBILE.bottom + MOBILE.gesture + MOBILE.bezel * 2 };

export const StorefrontPreviewPanel = ({ previewPath, previewUrl, config, typeKey, open, onOpenChange }: Props) => {
  // Default the preview to the device the merchant is actually on — a phone
  // user editing their shop wants the mobile view, not a scaled-down desktop.
  const [device, setDevice] = useState<'desktop' | 'mobile'>(() =>
    typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop'
  );
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const configRef = useRef(config);
  const [ready, setReady] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [vp, setVp] = useState({ w: 1440, h: 900 });
  configRef.current = config;

  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // On compact screens the overlay covers the controls, so collapse it when we
  // cross into the compact breakpoint (the merchant re-opens it deliberately).
  const wasCompact = useRef(false);
  useEffect(() => {
    const compactNow = vp.w < 1024;
    if (compactNow && !wasCompact.current) onOpenChange(false);
    wasCompact.current = compactNow;
  }, [vp.w, onOpenChange]);

  const post = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'sf-preview-config', config: configRef.current }, '*');
  }, []);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => { if (e.data?.type === 'sf-preview-ready') { setReady(true); post(); } };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [post]);

  // Push config on change once connected.
  useEffect(() => { if (ready) post(); }, [ready, post, config]);
  // A fresh load (device/type/reload) resets the bridge.
  useEffect(() => { setReady(false); }, [typeKey, reloadKey, device]);

  // Fallback: if the bridge hasn't connected shortly after a (re)load, reload so
  // the latest saved config shows rather than a stale view.
  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => { if (!ready) setReloadKey((k) => k + 1); }, 4000);
    return () => clearTimeout(t);
  }, [ready, typeKey]);

  // Below `lg` (1024px) the fixed right-hand panel would cover the controls, so
  // we present it as a full-screen overlay sheet instead. Desktop is unchanged.
  const compact = vp.w < 1024;

  const outer = device === 'desktop' ? DESKTOP_OUTER : MOBILE_OUTER;
  const availW = compact ? vp.w - 32 : Math.min(vp.w * 0.92, 1360) - 40;
  const availH = compact ? vp.h - 120 : vp.h - 120;
  const scale = Math.max(0.2, Math.min(availW / outer.w, availH / outer.h, 1));
  const dispW = Math.round(outer.w * scale);
  const dispH = Math.round(outer.h * scale);
  const panelW = dispW + 24;
  const handleRight = open && !compact ? `${panelW + 16}px` : '0px';
  const host = previewUrl ? previewUrl.replace(/^https?:\/\//, '').replace(/\/$/, '') : 'shop';

  const Frame = previewPath ? (
    <iframe
      ref={iframeRef}
      key={`${typeKey}-${reloadKey}`}
      src={previewPath}
      title="Storefront preview"
      className="border-0 bg-white block"
      style={device === 'desktop'
        ? { width: DESKTOP.content.w, height: DESKTOP.content.h }
        : { width: MOBILE.content.w, height: MOBILE.content.h }}
    />
  ) : null;

  const Desktop = (
    <div style={{ width: DESKTOP_OUTER.w, height: DESKTOP_OUTER.h }} className="rounded-lg overflow-hidden border bg-zinc-100 shadow-md">
      <div className="flex items-center gap-2 px-3" style={{ height: DESKTOP.browserBar }}>
        <div className="flex gap-1.5"><span className="h-3 w-3 rounded-full bg-red-400" /><span className="h-3 w-3 rounded-full bg-amber-400" /><span className="h-3 w-3 rounded-full bg-green-400" /></div>
        <div className="flex-1 h-5 rounded-md bg-white border flex items-center gap-1.5 px-2 text-[11px] text-zinc-500 truncate"><Lock className="h-3 w-3" /> {host}</div>
      </div>
      {Frame}
    </div>
  );

  const Mobile = (
    <div style={{ width: MOBILE_OUTER.w, height: MOBILE_OUTER.h }} className="rounded-[2.4rem] bg-zinc-900 shadow-xl" >
      <div className="absolute" />
      <div className="h-full w-full rounded-[2.4rem] overflow-hidden flex flex-col bg-black" style={{ padding: MOBILE.bezel }}>
        <div className="rounded-[1.8rem] overflow-hidden flex flex-col bg-white h-full">
          {/* status bar */}
          <div className="relative flex items-center justify-between px-5 bg-white text-zinc-900 text-[11px] font-semibold shrink-0" style={{ height: MOBILE.status }}>
            <span>9:41</span>
            <span className="absolute left-1/2 -translate-x-1/2 top-1 h-4 w-20 bg-black rounded-full" />
            <span className="flex items-center gap-1"><SignalHigh className="h-3 w-3" /><Wifi className="h-3 w-3" /><BatteryFull className="h-3.5 w-3.5" /></span>
          </div>
          {/* address bar */}
          <div className="flex items-center gap-2 px-2 bg-zinc-100 border-b shrink-0" style={{ height: MOBILE.address }}>
            <div className="flex-1 h-6 rounded-full bg-white border flex items-center justify-center gap-1 text-[10px] text-zinc-500 truncate px-2"><Lock className="h-2.5 w-2.5" /> {host}</div>
          </div>
          {/* content */}
          {Frame}
          {/* browser bottom bar */}
          <div className="flex items-center justify-around bg-zinc-100 border-t text-zinc-400 shrink-0" style={{ height: MOBILE.bottom }}>
            <ChevronLeft className="h-4 w-4" /><ChevronRight className="h-4 w-4 opacity-40" /><Share className="h-4 w-4" /><BookOpen className="h-4 w-4" /><SquareStack className="h-4 w-4" />
          </div>
          {/* gesture pill */}
          <div className="flex items-center justify-center bg-white shrink-0" style={{ height: MOBILE.gesture }}><span className="h-1 w-28 rounded-full bg-zinc-800" /></div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Toggle handle. On compact screens, hide it while the overlay is open
          (the overlay has its own close button) so it doesn't sit on top. */}
      {!(compact && open) && (
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          className="fixed top-1/2 -translate-y-1/2 z-[101] flex items-center gap-1.5 rounded-l-lg bg-primary text-primary-foreground px-2.5 py-3 shadow-lg transition-all duration-300 ease-in-out"
          style={{ right: handleRight }}
          aria-label={open ? 'Hide preview' : 'Show preview'}
        >
          {open && !compact ? <ChevronRight className="h-4 w-4" /> : <><Eye className="h-4 w-4" /><span className="text-xs font-semibold [writing-mode:vertical-rl] rotate-180 py-1">Preview</span></>}
        </button>
      )}

      {/* Compact backdrop — tap to dismiss the full-screen overlay. */}
      {compact && open && (
        <div className="fixed inset-0 z-[99] bg-black/40" onClick={() => onOpenChange(false)} aria-hidden />
      )}

      <aside
        className={cn(
          'z-[100] bg-background border shadow-2xl flex flex-col overflow-hidden',
          compact
            ? 'fixed inset-x-2 bottom-2 top-2 rounded-xl'
            : 'fixed right-4 top-1/2 -translate-y-1/2 rounded-xl transition-[transform,width] duration-300 ease-in-out',
          !open && (compact ? 'hidden' : 'translate-x-[calc(100%+2rem)]')
        )}
        style={compact ? undefined : { width: panelW }}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-muted/40 shrink-0">
          <span className="text-sm font-semibold">Live preview</span>
          <div className="flex items-center gap-1">
            <div className="flex rounded-md border p-0.5">
              <button type="button" onClick={() => setDevice('desktop')} className={cn('h-7 px-2 rounded flex items-center gap-1 text-xs', device === 'desktop' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}><Monitor className="h-3.5 w-3.5" /> Desktop</button>
              <button type="button" onClick={() => setDevice('mobile')} className={cn('h-7 px-2 rounded flex items-center gap-1 text-xs', device === 'mobile' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}><Smartphone className="h-3.5 w-3.5" /> Mobile</button>
            </div>
            {previewUrl && <Button variant="outline" size="icon" className="h-8 w-8" asChild><a href={previewUrl} target="_blank" rel="noopener noreferrer" aria-label="Open in new tab"><ExternalLink className="h-3.5 w-3.5" /></a></Button>}
            {compact && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onOpenChange(false)} aria-label="Close preview"><X className="h-4 w-4" /></Button>}
          </div>
        </div>

        <div className="p-3 flex items-center justify-center bg-muted/30 overflow-auto">
          {previewPath ? (
            <div style={{ width: dispW, height: dispH }} className="relative shrink-0">
              <div style={{ width: outer.w, height: outer.h, transform: `scale(${scale})`, transformOrigin: 'top left' }} className="absolute top-0 left-0">
                {device === 'desktop' ? Desktop : Mobile}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-10">Save your shop name to preview.</p>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground text-center py-1.5 border-t bg-muted/40 shrink-0">{device === 'desktop' ? 'Desktop · 1280×720' : 'Mobile · 390px'} — edits apply instantly</p>
      </aside>
    </>
  );
};
