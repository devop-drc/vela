// Palette engine — derive a full, harmonious storefront colour palette
// (all 23 tokens, light AND dark) from a single brand colour. Used both for the
// "pick your favourite colour" feature and to auto-generate a proper dark mode
// for any palette (templates ship no dark tokens, so dark used to fall back to
// the LIGHT palette → broken). Every neutral carries a subtle tint of the brand
// hue so the whole shop feels cohesive.

import { hexToHsl } from '@/utils/colors';
import type { ColorTokens } from '../config/types';

interface HSL { h: number; s: number; l: number; }
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const parse = (v: string): HSL => {
  const [h, s, l] = (v || '').split(/\s+/).map((x) => parseFloat(x));
  return { h: Number.isFinite(h) ? h : 0, s: Number.isFinite(s) ? s : 0, l: Number.isFinite(l) ? l : 0 };
};
const fmt = ({ h, s, l }: HSL) => `${Math.round(((h % 360) + 360) % 360)} ${Math.round(clamp(s, 0, 100))}% ${Math.round(clamp(l, 0, 100))}%`;

// Semantic colours stay standard (always readable), tuned per mode.
const SEMANTIC_LIGHT = {
  destructive: '0 72% 51%', 'destructive-foreground': '0 0% 100%',
  warning: '35 92% 45%', 'warning-foreground': '40 96% 10%',
  info: '214 88% 46%', 'info-foreground': '0 0% 100%',
};
const SEMANTIC_DARK = {
  destructive: '0 72% 58%', 'destructive-foreground': '0 0% 100%',
  warning: '42 92% 60%', 'warning-foreground': '40 96% 8%',
  info: '213 90% 66%', 'info-foreground': '214 60% 10%',
};

/** Build a complete palette from a brand HSL for light or dark surfaces. */
function build(brand: HSL, mode: 'light' | 'dark'): ColorTokens {
  const h = brand.h;
  const s = brand.s;

  if (mode === 'light') {
    const pL = clamp(brand.l, 32, 58);
    const primary: HSL = { h, s: clamp(s, 45, 92), l: pL };
    const pFg = pL > 62 ? { h, s: 20, l: 12 } : { h: 0, s: 0, l: 100 };
    return {
      background: fmt({ h, s: 22, l: 99 }),
      foreground: fmt({ h, s: 14, l: 11 }),
      card: fmt({ h, s: 16, l: 100 }),
      'card-foreground': fmt({ h, s: 14, l: 11 }),
      popover: fmt({ h, s: 16, l: 100 }),
      'popover-foreground': fmt({ h, s: 14, l: 11 }),
      primary: fmt(primary),
      'primary-foreground': fmt(pFg),
      secondary: fmt({ h, s: 18, l: 95 }),
      'secondary-foreground': fmt({ h, s: 30, l: 24 }),
      accent: fmt({ h, s: 34, l: 93 }),
      'accent-foreground': fmt({ h, s: 45, l: 26 }),
      muted: fmt({ h, s: 16, l: 96 }),
      'muted-foreground': fmt({ h, s: 10, l: 44 }),
      border: fmt({ h, s: 18, l: 89 }),
      input: fmt({ h, s: 18, l: 89 }),
      ring: fmt({ h, s: clamp(s, 50, 90), l: clamp(pL + 6, 40, 62) }),
      ...SEMANTIC_LIGHT,
    };
  }

  // Dark. A near-grey brand becomes a light key colour; a saturated brand keeps
  // its hue but is lightened enough to read on the dark surfaces.
  const grey = s < 16;
  const primary: HSL = grey
    ? { h, s: 6, l: 92 }
    : { h, s: clamp(s, 45, 85), l: clamp(brand.l + 10, 55, 70) };
  const pFg = grey || primary.l > 62 ? { h, s: 40, l: 10 } : { h: 0, s: 0, l: 100 };
  return {
    background: fmt({ h, s: 16, l: 7 }),
    foreground: fmt({ h, s: 8, l: 95 }),
    card: fmt({ h, s: 14, l: 11 }),
    'card-foreground': fmt({ h, s: 8, l: 95 }),
    popover: fmt({ h, s: 14, l: 11 }),
    'popover-foreground': fmt({ h, s: 8, l: 95 }),
    primary: fmt(primary),
    'primary-foreground': fmt(pFg),
    secondary: fmt({ h, s: 12, l: 18 }),
    'secondary-foreground': fmt({ h, s: 10, l: 92 }),
    accent: fmt({ h, s: 24, l: 22 }),
    'accent-foreground': fmt({ h, s: 15, l: 92 }),
    muted: fmt({ h, s: 12, l: 17 }),
    'muted-foreground': fmt({ h, s: 8, l: 64 }),
    border: fmt({ h, s: 12, l: 22 }),
    input: fmt({ h, s: 12, l: 22 }),
    ring: fmt({ h, s: clamp(s, 45, 85), l: grey ? 70 : clamp(brand.l + 14, 55, 72) }),
    ...SEMANTIC_DARK,
  };
}

const brandFromInput = (input: string): HSL =>
  parse((input || '').trim().startsWith('#') ? hexToHsl(input.trim()) : input);

/** Full LIGHT palette from a favourite colour (hex `#rrggbb` or `"H S% L%"`). */
export function generatePalette(input: string): ColorTokens {
  return build(brandFromInput(input), 'light');
}

/** DARK palette derived from a LIGHT palette (uses its primary as the brand). */
export function deriveDarkTokens(light: ColorTokens): ColorTokens {
  return build(parse(light.primary), 'dark');
}

/** Both light + dark tokens from a favourite colour. */
export function generateTheme(input: string): { tokens: ColorTokens; darkTokens: ColorTokens } {
  const brand = brandFromInput(input);
  return { tokens: build(brand, 'light'), darkTokens: build(brand, 'dark') };
}
