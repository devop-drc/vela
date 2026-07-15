// Token Engine — converts a StorefrontConfig into CSS custom properties + a few
// data-attributes / class switches. Output is applied to a scoped storefront
// root by StorefrontThemeProvider (NOT to document.documentElement).

import { StorefrontConfig, ColorToken } from './types';
import { DEFAULT_LIGHT_TOKENS, DEFAULT_DARK_TOKENS } from './defaults';
import { deriveDarkTokens } from '../lib/palette';

export interface TokenOutput {
  /** CSS custom properties keyed WITH the leading `--`. */
  vars: Record<string, string>;
  /** data-* attributes for non-token switches (motion, density, glass…). */
  attrs: Record<string, string>;
  /** className flags. */
  classes: string[];
  /** Fonts that should be lazy-loaded. */
  fonts: string[];
}

const COLOR_TOKENS: ColorToken[] = [
  'background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground',
  'primary', 'primary-foreground', 'secondary', 'secondary-foreground', 'accent',
  'accent-foreground', 'muted', 'muted-foreground', 'destructive', 'destructive-foreground',
  'warning', 'warning-foreground', 'info', 'info-foreground', 'border', 'input', 'ring',
];

const px = (n: number) => `${n}px`;
const clampPx = (n: number) => `${Math.max(0, n)}px`;

const SHADOW_PRESETS: Record<string, { card: string; hover: string }> = {
  none: { card: 'none', hover: 'none' },
  sm:   { card: '0 1px 2px var(--sf-shadow-color)', hover: '0 2px 6px var(--sf-shadow-color)' },
  md:   { card: '0 4px 12px var(--sf-shadow-color), 0 2px 4px var(--sf-shadow-color)', hover: '0 10px 24px var(--sf-shadow-color)' },
  lg:   { card: '0 10px 30px var(--sf-shadow-color), 0 4px 8px var(--sf-shadow-color)', hover: '0 20px 45px var(--sf-shadow-color)' },
  dramatic: { card: '0 25px 50px -12px var(--sf-shadow-color)', hover: '0 35px 70px -10px var(--sf-shadow-color)' },
};

const CONTAINER_MAX: Record<string, string> = {
  compact: '1024px',
  standard: '1280px',
  wide: '1536px',
  full: '100%',
};

const DENSITY_SCALE: Record<string, number> = {
  comfortable: 1,
  cozy: 0.85,
  spacious: 1.2,
};

const SECTION_SPACE: Record<string, string> = {
  tight: '2.5rem',
  normal: '4rem',
  airy: '6rem',
};

const GAP_SCALE: Record<string, string> = { sm: '0.75rem', md: '1.5rem', lg: '2.25rem' };

/** Resolve which mode is active (auto → light at build time; provider may override). */
export function resolveMode(config: StorefrontConfig, prefersDark = false): 'light' | 'dark' {
  if (config.theme.mode === 'auto') return prefersDark ? 'dark' : 'light';
  return config.theme.mode;
}

export function buildTokens(config: StorefrontConfig, prefersDark = false): TokenOutput {
  const vars: Record<string, string> = {};
  const attrs: Record<string, string> = {};
  const classes: string[] = ['sf-root'];
  const fonts: string[] = [];

  const mode = resolveMode(config, prefersDark);

  // ── Colors ──────────────────────────────────────────────────────────────
  // EVERY token gets a concrete value (config → built-in defaults). A missing
  // var would fall through to document-level CSS variables — e.g. the OWNER'S
  // dashboard theme when they view their own shop — leaking foreign colors
  // (the "dark red text" class of bug).
  const base = config.theme.tokens;
  const dark = config.theme.darkTokens || {};
  // Auto-derive a cohesive dark palette from the LIGHT base so dark mode never
  // falls back to the light tokens (templates ship no dark tokens → that used to
  // look broken). Any explicit darkTokens the palette DOES set still win.
  const darkAuto = mode === 'dark' ? deriveDarkTokens(base) : null;
  for (const t of COLOR_TOKENS) {
    const val = mode === 'dark'
      ? (dark[t] ?? darkAuto![t] ?? (DEFAULT_DARK_TOKENS as Partial<Record<string, string>>)[t] ?? DEFAULT_LIGHT_TOKENS[t])
      : (base[t] ?? DEFAULT_LIGHT_TOKENS[t]);
    if (val) vars[`--${t}`] = val;
  }
  if (mode === 'dark') classes.push('dark');

  // Second brand-gradient stop: primary hue shifted ~22°, SAME saturation and
  // lightness. Brand gradients use primary→primary-2 (not primary→accent, where
  // accent is a pale surface tint that makes white gradient labels invisible).
  const pv = vars['--primary'];
  if (pv) {
    const [ph, ps, pl] = pv.split(/\s+/);
    const h2 = Math.round(((parseFloat(ph) || 0) + 22) % 360);
    vars['--sf-primary-2'] = `${h2} ${ps ?? '50%'} ${pl ?? '45%'}`;
  }

  // ── Typography ──────────────────────────────────────────────────────────
  const ty = config.typography;
  vars['--font-sans'] = `'${ty.bodyFont}', sans-serif`;
  vars['--font-heading'] = `'${ty.headingFont}', sans-serif`;
  vars['--sf-weight-heading'] = String(ty.headingWeight);
  vars['--sf-weight-body'] = String(ty.bodyWeight);
  vars['--sf-tracking'] = `${ty.letterSpacing}em`;
  vars['--sf-leading'] = String(ty.lineHeight);
  vars['--sf-heading-transform'] = ty.headingTransform;
  // Modular type scale. Larger steps are emitted as a fluid clamp() so headings
  // shrink on small screens and reach the computed size around ~1240px — this is
  // what makes the storefront's big type mobile-safe (the `.sf-root .text-*`
  // overrides out-rank Tailwind's `md:` variants, so per-utility responsive
  // bumps can't do it; fluid tokens fix it for every heading at once).
  const r = ty.scaleRatio;
  const sizes: Record<string, number> = {
    'text-xs': -2, 'text-sm': -1, 'text-base': 0, 'text-lg': 1,
    'text-xl': 2, 'text-2xl': 3, 'text-3xl': 4, 'text-4xl': 5, 'text-5xl': 6,
  };
  const fluid = (minRem: number, maxRem: number) =>
    `clamp(${minRem.toFixed(3)}rem, calc(${minRem.toFixed(3)}rem + ${(maxRem - minRem).toFixed(3)}rem * (100vw - 360px) / 880px), ${maxRem.toFixed(3)}rem)`;
  for (const [name, step] of Object.entries(sizes)) {
    const desktop = (ty.baseSize * Math.pow(r, step)) / 16; // rem
    if (step >= 2) {
      const minFactor = Math.max(0.68, 1 - step * 0.05);
      const min = Math.max(desktop * minFactor, ty.baseSize / 16);
      vars[`--sf-${name}`] = fluid(min, desktop);
    } else {
      vars[`--sf-${name}`] = `${desktop}rem`;
    }
  }
  // Dedicated hero display size — genuinely large on desktop, gracefully fluid
  // on mobile. (Hero H1s use .sf-hero-title, bypassing the text-* cap so they
  // reach true hero scale instead of being pinned to text-4xl.)
  const heroMax = Math.min((ty.baseSize * Math.pow(r, 7)) / 16, 5.75); // ≤ 92px
  const heroMin = Math.max(heroMax * 0.56, 2.5); // ≥ 40px floor
  vars['--sf-text-hero'] = fluid(heroMin, heroMax);
  fonts.push(ty.headingFont, ty.bodyFont);

  // ── Shape ───────────────────────────────────────────────────────────────
  const sh = config.shape;
  // Distinct radius styles: sharp=0, soft=the configured radius, round=notably
  // rounder (≈1.9×), pill=fully rounded. (soft and round were previously aliases.)
  const baseRadius =
    sh.radiusStyle === 'pill' ? 9999
    : sh.radiusStyle === 'sharp' ? 0
    : sh.radiusStyle === 'round' ? Math.round(sh.radius * 1.9) + 4
    : sh.radius; // soft
  // For very large ("pill"/full) radii, keep the derived sm/md/lg/xl large too —
  // shaving a few px off 9999 would visually do nothing, so special-case it.
  const isPill = baseRadius >= 9999;
  vars['--radius'] = px(baseRadius);
  vars['--radius-sm'] = isPill ? px(baseRadius) : clampPx(baseRadius - 4);
  vars['--radius-md'] = isPill ? px(baseRadius) : clampPx(baseRadius - 2);
  vars['--radius-lg'] = px(baseRadius);
  vars['--radius-xl'] = isPill ? px(baseRadius) : px(baseRadius + 6);
  vars['--radius-full'] = '9999px';
  // Large rectangular surfaces (product cards, panels, tiles, media) must NOT
  // take the full pill/near-full radius — a 9999px corner on a tall card clips
  // the image and text. Cap it at a generous-but-safe value so "pill" and very
  // "round" styles stay rounded without eating content. Buttons/badges keep the
  // full radius (they're short enough to be true pills).
  vars['--sf-radius-card'] = px(Math.min(baseRadius, 28));
  vars['--sf-border-width'] = sh.borderStyle === 'none' ? '0px' : px(sh.borderWidth);
  attrs['data-radius'] = sh.radiusStyle;

  // ── Effects ─────────────────────────────────────────────────────────────
  const fx = config.effects;
  vars['--sf-shadow-color'] = fx.shadowColor
    ? `hsl(${fx.shadowColor} / 0.18)`
    : 'rgba(0,0,0,0.10)';
  const shadow = SHADOW_PRESETS[fx.shadow] ?? SHADOW_PRESETS.md;
  vars['--shadow-card'] = shadow.card;
  vars['--shadow-hover'] = shadow.hover;

  vars['--sf-glass-blur'] = px(fx.glass.enabled ? fx.glass.blur : 0);
  vars['--sf-glass-alpha'] = String((fx.glass.enabled ? fx.glass.opacity : 100) / 100);
  if (fx.glass.enabled) classes.push('glass-enabled');
  if (fx.grain) classes.push('grain-enabled');
  if (fx.scrollReveal && fx.motion !== 'none') classes.push('reveal-enabled');

  attrs['data-motion'] = fx.motion;
  attrs['data-hover'] = fx.hoverEffect;

  // ── Layout ──────────────────────────────────────────────────────────────
  const ly = config.layout;
  const density = DENSITY_SCALE[ly.density] ?? 1;
  vars['--sf-container-max'] = CONTAINER_MAX[ly.containerWidth] ?? CONTAINER_MAX.standard;
  vars['--sf-density'] = String(density);
  // Density scales spacing everywhere: section rhythm, grid gaps, and the
  // shared card/element padding tokens components read.
  vars['--sf-section-space'] = `calc(${SECTION_SPACE[ly.sectionSpacing] ?? SECTION_SPACE.normal} * ${density})`;
  vars['--sf-grid-gap'] = `calc(${GAP_SCALE[ly.productGrid.gap] ?? GAP_SCALE.md} * ${density})`;
  vars['--sf-card-pad'] = `calc(1rem * ${density})`;
  vars['--sf-gap'] = `calc(1rem * ${density})`;
  vars['--sf-grid-cols'] = String(ly.productGrid.columns);
  attrs['data-density'] = ly.density;
  attrs['data-header'] = ly.header.variant;
  attrs['data-nav'] = ly.nav.desktop;

  // ── Component element switches (drive the .sf-btn / .sf-badge CSS system) ──
  const cp = config.components;
  attrs['data-btn'] = cp.button;
  attrs['data-btn-shape'] = cp.buttonShape;
  attrs['data-badge'] = cp.badge;

  return { vars, attrs, classes, fonts };
}

/** Convenience: just the inline-style object for a React element. */
export function tokensToStyle(out: TokenOutput): React.CSSProperties {
  return out.vars as unknown as React.CSSProperties;
}
