// Applies a StorefrontConfig to a scoped storefront root: emits CSS variables,
// data-attributes and class flags from the token engine, loads fonts, paints the
// page background, and wires scroll-reveal. Exposes the config via context so any
// storefront component can read design + composition.

import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { StorefrontConfig } from '../config/types';
import { buildTokens, resolveMode } from '../config/tokens';
import { loadGoogleFont } from '@/lib/fontUtils';
import { cn } from '@/lib/utils';

const StorefrontConfigContext = createContext<StorefrontConfig | null>(null);

/**
 * Reactively tracks `(prefers-color-scheme: dark)`. Unlike a one-shot
 * matchMedia read, this re-renders when the OS theme changes so 'auto' mode
 * updates live.
 */
const usesPrefersDark = (): boolean => {
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
  const prefersDark = usesPrefersDark();
  const tokens = buildTokens(config, prefersDark);
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
}

export const StorefrontThemeProvider = ({ config, children, className }: Props) => {
  const rootRef = useRef<HTMLDivElement>(null);

  const prefersDark = usesPrefersDark();

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
    if (!config.effects.scrollReveal || config.effects.motion === 'none' || reduced) {
      showInstantly();
      return;
    }

    let killed = false;
    let ctx: { revert: () => void } | null = null;
    (async () => {
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
    })();

    return () => {
      killed = true;
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
      s.backgroundColor = bg.color ? `hsl(${bg.color})` : `hsl(${tokens.vars['--background']})`;
    }
    return s;
  }, [bg, tokens.vars]);

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
