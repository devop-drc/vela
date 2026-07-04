// normalizeConfig(raw): accepts EITHER a legacy flat DesignSettings blob OR a
// versioned StorefrontConfig and always returns a complete, canonical config.
// This is what makes the rebuild migration-free: legacy shops upgrade on read.

import {
  StorefrontConfig,
  ColorToken,
  ColorTokens,
  SectionInstance,
} from './types';
import { DEFAULT_CONFIG, DEFAULT_LIGHT_TOKENS, cloneConfig } from './defaults';

const COLOR_TOKEN_KEYS: ColorToken[] = [
  'background', 'foreground', 'card', 'card-foreground', 'popover', 'popover-foreground',
  'primary', 'primary-foreground', 'secondary', 'secondary-foreground', 'accent',
  'accent-foreground', 'muted', 'muted-foreground', 'destructive', 'destructive-foreground',
  'warning', 'warning-foreground', 'info', 'info-foreground', 'border', 'input', 'ring',
];

const isObject = (v: any): v is Record<string, any> =>
  v != null && typeof v === 'object' && !Array.isArray(v);

/** Deep-merge `source` over a clone of `base` (arrays are replaced, not merged). */
function deepMerge<T>(base: T, source: any): T {
  if (!isObject(base) || !isObject(source)) return (source ?? base) as T;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...base };
  for (const key of Object.keys(source)) {
    const sv = source[key];
    if (sv === undefined) continue;
    const bv = (base as any)[key];
    out[key] = isObject(bv) && isObject(sv) ? deepMerge(bv, sv) : sv;
  }
  return out as T;
}

/** Map the legacy flat DesignSettings shape onto a partial StorefrontConfig. */
function fromLegacy(raw: Record<string, any>): StorefrontConfig {
  const cfg = cloneConfig(DEFAULT_CONFIG);

  // Colors: legacy stored CSS vars as "--token" keys.
  const tokens: ColorTokens = { ...DEFAULT_LIGHT_TOKENS };
  for (const key of COLOR_TOKEN_KEYS) {
    const v = raw[`--${key}`];
    if (typeof v === 'string' && v.trim()) tokens[key] = v.trim();
  }
  cfg.theme.tokens = tokens;
  cfg.theme.paletteId = raw.themeName ?? null;
  cfg.templateId = null; // legacy had no template concept

  // Typography
  if (raw.fontSans) cfg.typography.bodyFont = raw.fontSans;
  if (raw.fontHeading) cfg.typography.headingFont = raw.fontHeading;

  // Shape
  if (typeof raw['--radius'] === 'string') {
    const r = parseFloat(raw['--radius']);
    if (!isNaN(r)) cfg.shape.radius = raw['--radius'].includes('rem') ? Math.round(r * 16) : Math.round(r);
  }

  // Effects
  cfg.effects.glass.enabled = raw.blurEnabled ?? cfg.effects.glass.enabled;
  cfg.effects.background = {
    ...cfg.effects.background,
    type: raw.backgroundImageUrl ? 'image' : raw.solidBackgroundColor ? 'solid' : 'solid',
    imageUrl: raw.backgroundImageUrl || undefined,
    color: raw.solidBackgroundColor || undefined,
    brightness: raw.backgroundBrightness ?? 100,
    contrast: raw.backgroundContrast ?? 100,
    saturation: raw.backgroundSaturation ?? 100,
    hue: raw.backgroundHue ?? 0,
  };
  cfg.effects.hero = {
    mediaUrl: raw.heroBackgroundMediaUrl || undefined,
    mediaType: raw.heroBackgroundMediaType || 'image',
    blob: raw.showHeroBlobAnimation ?? true,
  };

  // Layout
  if (raw.layoutStyle === 'docked') cfg.layout.header.variant = 'classic';

  // Homepage template → section composition. Legacy templates only toggled which
  // of a fixed section set appeared; reproduce that as a section list.
  cfg.pages.home = legacyHomeSections(raw.homepageTemplate);

  return cfg;
}

function legacyHomeSections(template?: string): SectionInstance[] {
  const tpl = ({
    classic:  { categories: true,  bestSellers: true,  newArrivals: 'carousel', recommended: true,  hero: 'banner' },
    minimal:  { categories: false, bestSellers: false, newArrivals: 'grid',     recommended: false, hero: 'compact' },
    showcase: { categories: false, bestSellers: true,  newArrivals: 'carousel', recommended: false, hero: 'full' },
    magazine: { categories: true,  bestSellers: true,  newArrivals: 'grid',     recommended: true,  hero: 'split' },
  } as const)[(template as keyof any) ?? 'classic'] ?? {
    categories: true, bestSellers: true, newArrivals: 'carousel', recommended: true, hero: 'banner',
  };

  const s: SectionInstance[] = [
    { id: 'hero', type: 'hero', enabled: true, props: { variant: tpl.hero, showLogo: true, ctaLabel: 'Shop Now' } },
    { id: 'marquee', type: 'announcementMarquee', enabled: true, props: {} },
    { id: 'categories', type: 'categoryGrid', enabled: tpl.categories, props: { title: 'Shop by Category' } },
    { id: 'bestSellers', type: 'bestSellers', enabled: tpl.bestSellers, props: { title: 'Best Sellers', display: 'carousel' } },
    { id: 'newArrivals', type: 'newArrivals', enabled: true, props: { title: 'New Arrivals', display: tpl.newArrivals, limit: 10 } },
    { id: 'recommended', type: 'recommended', enabled: tpl.recommended, props: { title: 'Recommended For You', display: 'carousel' } },
    { id: 'viewAll', type: 'viewAllCta', enabled: true, props: { label: 'View All Products' } },
  ];
  return s;
}

/**
 * Guarantee the homepage has an announcement-bar section. Three of the v2
 * templates (galerie/velvet/noir) shipped without it, so shops that applied
 * those saved a marquee-less layout. The bar only ever renders when the shop
 * has active announcements and hasn't switched it off, so restoring it here is
 * invisible for everyone else. Idempotent — a no-op once the section exists.
 */
function ensureAnnouncementSection(cfg: StorefrontConfig): StorefrontConfig {
  const home = cfg.pages?.home;
  if (!Array.isArray(home) || home.some((s) => s.type === 'announcementMarquee')) return cfg;
  const heroIdx = home.findIndex((s) => s.type === 'hero');
  const insertAt = heroIdx >= 0 ? heroIdx + 1 : 0; // right after the hero, else top
  const section: SectionInstance = { id: 'marquee', type: 'announcementMarquee', enabled: true, props: {} };
  const nextHome = [...home.slice(0, insertAt), section, ...home.slice(insertAt)];
  return { ...cfg, pages: { ...cfg.pages, home: nextHome } };
}

/**
 * Accepts anything stored in design_settings.settings and returns a complete config.
 * - null / {} / undefined → DEFAULT_CONFIG
 * - { version: 2, ... }   → deep-merge over defaults (forward/backward safe)
 * - legacy flat blob       → mapped via fromLegacy
 */
export function normalizeConfig(raw: any): StorefrontConfig {
  return ensureAnnouncementSection(normalizeConfigInner(raw));
}

function normalizeConfigInner(raw: any): StorefrontConfig {
  if (!isObject(raw) || Object.keys(raw).length === 0) {
    return cloneConfig(DEFAULT_CONFIG);
  }
  // The new storefront config is stored under settings.storefront so the
  // dashboard's own appearance (legacy flat keys at the top level) stays
  // independent. Prefer it when present.
  if (isObject(raw.storefront)) {
    raw = raw.storefront;
    if (!isObject(raw) || Object.keys(raw).length === 0) return cloneConfig(DEFAULT_CONFIG);
  }
  if (raw.version >= 2 && isObject(raw.theme)) {
    return deepMerge(cloneConfig(DEFAULT_CONFIG), raw);
  }
  // Heuristic: legacy blobs carry CSS-var keys or known legacy fields.
  const looksLegacy =
    '--primary' in raw || 'themeName' in raw || 'fontSans' in raw || 'homepageTemplate' in raw;
  if (looksLegacy) return fromLegacy(raw);

  // Unknown shape — merge what we can over defaults.
  return deepMerge(cloneConfig(DEFAULT_CONFIG), raw);
}
