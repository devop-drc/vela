// Contrast helpers — pick a readable foreground for a given surface color so
// text always stays legible on the chosen background.

import { hslToHex } from '@/utils/colors';

const DARK_FG = '240 10% 10%';
const LIGHT_FG = '0 0% 100%';

/** Relative luminance (0–1) of an HSL triplet like "240 6% 10%". */
export function luminance(hslTriplet: string): number {
  const hex = hslToHex(hslTriplet);
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Black or white (as HSL triplet) for maximum readability on `surface`. */
export function idealForeground(surface: string): string {
  return luminance(surface) > 0.45 ? DARK_FG : LIGHT_FG;
}

/** A softened (muted) foreground that still reads against `surface`. */
export function idealMutedForeground(surface: string): string {
  const [h, s] = surface.split(' ');
  return luminance(surface) > 0.45 ? `${h} ${s} 38%` : `${h} ${parseFloat(s) ? '8%' : '0%'} 68%`;
}

/** WCAG contrast ratio (1–21) between two HSL triplets. */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG grade for normal text: AAA ≥ 7, AA ≥ 4.5, else fail. */
export function wcagGrade(a: string, b: string): 'AAA' | 'AA' | 'fail' {
  const r = contrastRatio(a, b);
  return r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : 'fail';
}

/** Map of surface token -> its paired foreground token. */
export const SURFACE_PAIRS: Record<string, string> = {
  background: 'foreground',
  card: 'card-foreground',
  popover: 'popover-foreground',
  primary: 'primary-foreground',
  secondary: 'secondary-foreground',
  accent: 'accent-foreground',
  muted: 'muted-foreground',
};
