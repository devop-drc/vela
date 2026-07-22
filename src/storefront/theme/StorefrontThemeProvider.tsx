// Applies a StorefrontConfig to a scoped storefront root: emits CSS variables,
// data-attributes and class flags from the token engine, loads fonts, paints the
// page background, and wires scroll-reveal. Exposes the config via context so any
// storefront component can read design + composition.

import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { StorefrontConfig } from '../config/types';
import { buildTokens, resolveMode } from '../config/tokens';
import { useVisitorMode } from '../lib/visitorPrefs';
import { loadGoogleFont } from '@/lib/fontUtils';
import { cn } from '@/lib/utils';

/** The customer's mode choice overrides the merchant's configured theme.mode
    (null = follow the shop's design). Forcing it through config keeps the
    darkTokens/deriveDarkTokens pipeline intact. */
const withVisitorMode = (config: StorefrontConfig, visitor: 'light' | 'dark' | null): StorefrontConfig =>
  visitor ? { ...config, theme: { ...config.theme, mode: visitor } } : config;

const StorefrontConfigContext = createContext<StorefrontConfig | null>(null);

/**
 * Reactively tracks `(prefers-color-scheme: dark)`. Unlike a one-shot
 * matchMedia read, this re-renders when the OS theme changes so 'auto' mode
 * updates live.
 */
const usePrefersDark = (): boolean => {
  const [prefersDark, setPrefersDark] = useState<boolean>(
    () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    setPrefersDark(mql.matches);
    // addEventListener is the modern API; fall back to addListener for old Safari.
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, []);
  return prefersDark;
};

export const useStorefrontConfig = (): StorefrontConfig => {
  const ctx = useContext(StorefrontConfigContext);
  if (!ctx) throw new Error('useStorefrontConfig must be used within a StorefrontThemeProvider');
  return ctx;
};

/**
 * Token style/attrs/classes for the current config — apply to portaled UI
 * (cart drawer, dialogs, filter sheets) that render OUTSIDE the sf-root and so
 * don't inherit the scoped CSS variables. Spread onto the portal content.
 */
export const useStorefrontTokenStyle = () => {
  const config = useStorefrontConfig();
  const prefersDark = usePrefersDark();
  const visitor = useVisitorMode();
  const tokens = buildTokens(withVisitorMode(config, visitor), prefersDark);
  return {
    style: tokens.vars as React.CSSProperties,
    className: cn(tokens.classes),
    attrs: tokens.attrs as Record<string, string>,
  };
};

interface Props {
  config: StorefrontConfig;
  children: ReactNode;
  className?: string;
  /** True when rendered inside the Studio's live-preview iframe (?preview=1). */
  isPreview?: boolean;
}

export const StorefrontThemeProvider = ({ config: rawConfig, children, className, isPreview = false }: Props) => {
  const rootRef = useRef<HTMLDivElement>(null);

  const prefersDark = usePrefersDark();
  const visitor = useVisitorMode();
  const config = useMemo(() => withVisitorMode(rawConfig, visitor), [rawConfig, visitor]);

  const tokens = useMemo(() => buildTokens(config, prefersDark), [config, prefersDark]);
  const mode = resolveMode(config, prefersDark);

  // Lazy-load the configured fonts.
  useEffect(() => {
    tokens.fonts.forEach((f) => f && loadGoogleFont(f));
  }, [tokens.fonts]);

  // Scroll-reveal, GSAP-powered: sections fade/slide in on scroll, with a
  // card cascade inside product/category grids. Depth scales with
  // effects.motion; reduced-motion (and motion 'none') shows content instantly.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>('.sf-reveal'));
    if (!els.length) return;

    const showInstantly = () => els.forEach((el) => el.classList.add('is-visible'));
    const reduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    // In the Studio's live preview, skip the GSAP scroll-reveal entirely. It
    // otherwise tears down and rebuilds the whole ScrollTrigger system (+ a
    // page-wide ScrollTrigger.refresh) on EVERY token edit — the reported
    // sluggishness. Content still shows instantly here; the published storefront
    // (isPreview=false) keeps the full reveal with correct re-runs on navigation.
    if (isPreview || !config.effects.scrollReveal || config.effects.motion === 'none' || reduced) {
      showInstantly();
      return;
    }

    let killed = false;
    let ctx: { revert: () => void } | null = null;
    // Debounced: in the Studio this effect re-runs on every keystroke; without
    // the delay we'd revert + rebuild every ScrollTrigger dozens of times a
    // second, mid-scroll, which is exactly the churn that crashes GSAP's
    // uninitialized-trigger walk (ScrollTrigger.js refresh recursion).
    const timer = window.setTimeout(async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
      if (killed || !rootRef.current) return;
      gsap.registerPlugin(ScrollTrigger);

      // GSAP drives inline styles frame-by-frame — the CSS reveal transition
      // would double-ease every frame, so hand the elements over completely.
      root.classList.add('sf-gsap');
      showInstantly();

      const level = config.effects.motion;
      const dist = level === 'subtle' ? 14 : level === 'expressive' ? 44 : 26;
      const dur = level === 'subtle' ? 0.5 : level === 'expressive' ? 0.9 : 0.65;

      ctx = gsap.context(() => {
        els.forEach((el) => {
          const cards = level === 'subtle' ? [] : Array.from(el.querySelectorAll<HTMLElement>(':scope .sf-hoverable')).slice(0, 12);
          const tl = gsap.timeline({
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          });
          tl.fromTo(
            el,
            { autoAlpha: 0, y: dist, ...(level === 'expressive' ? { scale: 0.985 } : {}) },
            { autoAlpha: 1, y: 0, scale: 1, duration: dur, ease: 'power3.out', clearProps: 'transform' }
          );
          if (cards.length > 1) {
            // Suspend the cards' own hover transitions during the entrance so
            // they don't double-ease GSAP's frames; clearProps restores them.
            tl.fromTo(
              cards,
              { autoAlpha: 0, y: dist * 0.6, transition: 'none' },
              { autoAlpha: 1, y: 0, duration: dur * 0.85, ease: 'power3.out', stagger: 0.055, clearProps: 'transform,opacity,visibility,transition' },
              '<0.12'
            );
          }
        });
        // Parallax: hero media drifts slower than the scroll. The media is
        // pre-overscaled via CSS `scale` (independent of GSAP's translate) so
        // the drift never exposes gaps.
        if (level !== 'subtle') {
          root.querySelectorAll<HTMLElement>('[data-sf-parallax]').forEach((media) => {
            gsap.fromTo(media, { yPercent: -5 }, {
              yPercent: 5, ease: 'none',
              scrollTrigger: { trigger: media.parentElement ?? media, start: 'top bottom', end: 'bottom top', scrub: true },
            });
          });
        }
      }, root);

      // Force-init every trigger now (full refresh iterates a copy of the
      // trigger list, so `once` self-kills are safe). Timeline-based triggers
      // otherwise stay uninitialized for a tick, and a scroll during that
      // window makes GSAP walk the raw trigger array while `once` triggers
      // remove themselves from it → "curTrigger is undefined" crash.
      ScrollTrigger.refresh();
    }, 120);

    return () => {
      killed = true;
      window.clearTimeout(timer);
      ctx?.revert();
      root.classList.remove('sf-gsap');
    };
  }, [config, children]);

  const bg = config.effects.background;
  const heroNone = !bg;

  // Page background styling (solid / gradient / image / pattern + filters).
  const bgStyle = useMemo(() => {
    const s: React.CSSProperties = {};
    const filter = `brightness(${bg.brightness ?? 100}%) contrast(${bg.contrast ?? 100}%) saturate(${bg.saturation ?? 100}%) hue-rotate(${bg.hue ?? 0}deg) blur(${bg.blur ?? 0}px)`;
    s.filter = filter;
    if (bg.type === 'image' && bg.imageUrl) {
      s.backgroundImage = `url(${bg.imageUrl})`;
      s.backgroundSize = 'cover';
      s.backgroundPosition = 'center';
      s.backgroundRepeat = 'no-repeat';
    } else if (bg.type === 'gradient' && bg.gradient) {
      s.backgroundImage = `linear-gradient(${bg.gradient.angle}deg, hsl(${bg.gradient.from}), hsl(${bg.gradient.to}))`;
    } else {
      // A stored solid `bg.color` is authored for LIGHT surfaces. In dark mode
      // it would paint the page light while the chrome goes dark (the "horrible
      // dark mode" bug), so fall through to the derived dark `--background`.
      s.backgroundColor = bg.color && mode === 'light' ? `hsl(${bg.color})` : `hsl(${tokens.vars['--background']})`;
    }
    return s;
  }, [bg, tokens.vars, mode]);

  return (
    <StorefrontConfigContext.Provider value={config}>
      <div
        ref={rootRef}
        className={cn(tokens.classes, className)}
        style={tokens.vars as React.CSSProperties}
        data-storefront-root=""
        {...tokens.attrs}
      >
        {/* Background layer (scoped to the storefront, behind content). */}
        <div className="fixed inset-0 z-[-1] transition-colors" style={bgStyle} aria-hidden />
        {bg.overlay ? (
          <div
            className="fixed inset-0 z-[-1] pointer-events-none"
            style={{ background: `rgba(0,0,0,${(bg.overlay ?? 0) / 100})` }}
            aria-hidden
          />
        ) : null}
        {children}
      </div>
    </StorefrontConfigContext.Provider>
  );
};
