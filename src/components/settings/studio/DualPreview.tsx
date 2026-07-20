// Shared live-preview building blocks + the onboarding dual preview.
//   PreviewFrame     — a device iframe scaled to fit, with the bezel OUTSIDE the
//                      content box so the storefront is never clipped.
//   usePreviewBridge — posts config/navigate to a set of iframes (heartbeat +
//                      ready handshake) so every frame stays perfectly in sync.
//   DualPreview      — desktop + mobile side by side (used in onboarding).

import { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Monitor, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StorefrontConfig } from '@/storefront/config/types';

export const DESKTOP = { w: 1280, h: 800 };
export const MOBILE = { w: 390, h: 844 };

/** A device iframe scaled to `scale`, with the bezel drawn around (not over) the
    content box — so `dev.w × dev.h` of storefront is always fully visible. */
export const PreviewFrame = ({ innerRef, src, dev, scale, phone, interactive = true, title }: {
  innerRef: RefObject<HTMLIFrameElement>;
  src: string | null;
  dev: { w: number; h: number };
  scale: number;
  phone?: boolean;
  interactive?: boolean;
  title?: string;
}) => {
  const { t } = useTranslation();
  return (
  <div className={cn('shrink-0 bg-background shadow-xl', phone ? 'rounded-[2rem] border-[7px] border-foreground/85' : 'rounded-xl border')}>
    <div className="overflow-hidden bg-background" style={{ width: Math.round(dev.w * scale), height: Math.round(dev.h * scale), borderRadius: phone ? '1.35rem' : '0.6rem' }}>
      <iframe
        ref={innerRef}
        src={src ?? undefined}
        title={title ?? (phone ? t('studio_panels.mobile_preview') : t('studio_panels.desktop_preview'))}
        className={cn('origin-top-left border-0 bg-background', !interactive && 'pointer-events-none')}
        style={{ width: dev.w, height: dev.h, transform: `scale(${scale})` }}
      />
    </div>
  </div>
  );
};

/** Streams config + navigation to every iframe in `refs` (heartbeat-backed). */
export function usePreviewBridge(refs: RefObject<HTMLIFrameElement>[], config: StorefrontConfig, navTarget?: { target: string; n: number } | null) {
  const configRef = useRef(config);
  configRef.current = config;
  const refsRef = useRef(refs);
  refsRef.current = refs;

  const postAll = useCallback(() => {
    const msg = { type: 'sf-preview-config', config: configRef.current };
    refsRef.current.forEach((r) => r.current?.contentWindow?.postMessage(msg, '*'));
  }, []);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => { if (e.data?.type === 'sf-preview-ready') postAll(); };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [postAll]);

  useEffect(() => { postAll(); }, [config, postAll]);

  useEffect(() => {
    const iv = setInterval(postAll, 500);
    return () => clearInterval(iv);
  }, [postAll]);

  useEffect(() => {
    if (!navTarget) return;
    const msg = { type: 'sf-preview-navigate', target: navTarget.target };
    refsRef.current.forEach((r) => r.current?.contentWindow?.postMessage(msg, '*'));
    const t = setTimeout(postAll, 80);
    return () => clearTimeout(t);
  }, [navTarget, postAll]);

  return postAll;
}

interface Props {
  previewPath: string | null;
  config: StorefrontConfig;
  navTarget?: { target: string; n: number } | null;
  className?: string;
}

const GAP = 32;

export const DualPreview = ({ previewPath, config, navTarget, className }: Props) => {
  const { t } = useTranslation();
  const holderRef = useRef<HTMLDivElement>(null);
  const deskRef = useRef<HTMLIFrameElement>(null);
  const mobRef = useRef<HTMLIFrameElement>(null);
  const [box, setBox] = useState({ w: 900, h: 560 });

  useEffect(() => {
    const el = holderRef.current;
    if (!el) return;
    const update = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  usePreviewBridge([deskRef, mobRef], config, navTarget);

  // A phone-sized container can't fit desktop+mobile side by side at any
  // readable scale — show ONLY the mobile frame there, as large as fits.
  const mobileOnly = box.w < 560;

  const scale = mobileOnly
    ? Math.max(0.14, Math.min((box.w - 24) / MOBILE.w, (box.h - 44) / MOBILE.h))
    : Math.max(0.14, Math.min(
        (box.w - GAP - 28) / (DESKTOP.w + MOBILE.w),
        (box.h - 40) / Math.max(DESKTOP.h, MOBILE.h),
      ));

  if (!previewPath) {
    return <div className={cn('flex items-center justify-center text-sm text-muted-foreground', className)}>{t('studio_panels.save_shop_name_to_preview')}</div>;
  }

  return (
    <div ref={holderRef} className={cn('flex min-h-0 items-center justify-center overflow-hidden', className)}>
      <div className="flex items-start" style={{ gap: GAP }}>
        {!mobileOnly && (
          <div className="flex flex-col items-center gap-2">
            <PreviewFrame innerRef={deskRef} src={previewPath} dev={DESKTOP} scale={scale} />
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Monitor className="h-3.5 w-3.5" /> {t('studio_panels.desktop')}</span>
          </div>
        )}
        <div className="flex flex-col items-center gap-2">
          <PreviewFrame innerRef={mobRef} src={previewPath} dev={MOBILE} scale={scale} phone />
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Smartphone className="h-3.5 w-3.5" /> {t('studio_panels.mobile')}</span>
        </div>
      </div>
    </div>
  );
};
