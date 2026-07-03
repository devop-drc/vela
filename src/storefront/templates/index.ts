// Eight comprehensive storefront templates. Each is a full StorefrontConfig
// (colors + type + shape + effects + layout + component variants + page
// composition). Authored by deep-merging salient overrides onto DEFAULT_CONFIG.

import { StorefrontConfig, StorefrontTemplate, ColorTokens, SectionInstance } from '../config/types';
import { DEFAULT_CONFIG, cloneConfig } from '../config/defaults';

/** Compact section-instance author for template home compositions. */
const sec = (id: string, type: string, props: Record<string, any> = {}, enabled = true): SectionInstance =>
  ({ id, type, enabled, props });

const isObj = (v: any) => v && typeof v === 'object' && !Array.isArray(v);
function merge<T>(base: T, src: any): T {
  if (!isObj(base) || !isObj(src)) return (src ?? base) as T;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...base };
  for (const k of Object.keys(src)) {
    out[k] = isObj((base as any)[k]) && isObj(src[k]) ? merge((base as any)[k], src[k]) : src[k];
  }
  return out;
}

// Build a full token set from a handful of inputs (mirrors storefrontPresets).
type PaletteInput = {
  bg: string; fg: string; card: string; cardFg?: string;
  primary: string; primaryFg: string;
  secondary: string; secondaryFg?: string;
  accent: string; accentFg?: string;
  muted: string; mutedFg: string; border: string; ring?: string;
};
const palette = (o: PaletteInput): ColorTokens => ({
  background: o.bg, foreground: o.fg,
  card: o.card, 'card-foreground': o.cardFg ?? o.fg,
  popover: o.card, 'popover-foreground': o.cardFg ?? o.fg,
  primary: o.primary, 'primary-foreground': o.primaryFg,
  secondary: o.secondary, 'secondary-foreground': o.secondaryFg ?? o.fg,
  accent: o.accent, 'accent-foreground': o.accentFg ?? o.fg,
  muted: o.muted, 'muted-foreground': o.mutedFg,
  destructive: '0 72% 51%', 'destructive-foreground': '0 0% 100%',
  warning: '38 92% 50%', 'warning-foreground': '0 0% 100%',
  info: '210 90% 50%', 'info-foreground': '0 0% 100%',
  border: o.border, input: o.border, ring: o.ring ?? o.primary,
});

const define = (
  id: string,
  name: string,
  description: string,
  businessType: string,
  overrides: any
): StorefrontTemplate => {
  const config: StorefrontConfig = merge(cloneConfig(DEFAULT_CONFIG), { ...overrides, templateId: id });
  return { id, name, description, businessType, config };
};

export const TEMPLATES: StorefrontTemplate[] = [
  define('studio', 'Studio', 'Clean, modern and neutral — works for any catalog.', 'Universal', {
    theme: { paletteId: 'studio', tokens: palette({ bg: '0 0% 100%', fg: '240 10% 8%', card: '0 0% 100%', primary: '240 6% 10%', primaryFg: '0 0% 98%', secondary: '240 5% 96%', accent: '240 5% 94%', muted: '240 5% 96%', mutedFg: '240 4% 46%', border: '240 6% 90%' }) },
    typography: { headingFont: 'Manrope', bodyFont: 'Inter', headingWeight: 700, scaleRatio: 1.25 },
    shape: { radius: 14, radiusStyle: 'soft' },
    effects: { shadow: 'md', glass: { enabled: true, blur: 12, opacity: 70 }, motion: 'standard', hoverEffect: 'lift' },
    components: { productCard: 'classic', cart: 'drawer' },
    layout: { sectionHeader: 'left' },
    pages: { home: [
      sec('hero', 'hero', { variant: 'banner', showLogo: true, ctaLabel: 'Shop Now' }),
      sec('marquee', 'announcementMarquee', { variant: 'marquee' }),
      sec('valueProps', 'valueProps', { variant: 'row' }),
      sec('categories', 'categoryGrid', { title: 'Shop by Category', variant: 'tiles' }),
      sec('bestSellers', 'bestSellers', { title: 'Best Sellers', display: 'carousel' }),
      sec('newArrivals', 'newArrivals', { title: 'New Arrivals', display: 'carousel', limit: 10 }),
      sec('recommended', 'recommended', { title: 'Recommended For You', display: 'carousel' }),
      sec('viewAll', 'viewAllCta', { label: 'View All Products', variant: 'button' }),
    ] },
  }),

  define('aurora', 'Aurora', 'Glassmorphic and vibrant with a soft gradient backdrop.', 'Beauty & Cosmetics', {
    theme: {
      paletteId: 'aurora', mode: 'light',
      tokens: palette({ bg: '250 60% 98%', fg: '250 30% 18%', card: '0 0% 100%', primary: '265 70% 56%', primaryFg: '0 0% 100%', secondary: '255 50% 94%', accent: '320 70% 64%', muted: '250 40% 94%', mutedFg: '250 12% 45%', border: '255 40% 90%' }),
      gradient: { enabled: true, from: '265 80% 92%', to: '320 80% 92%', angle: 135 },
    },
    typography: { headingFont: 'Syne', bodyFont: 'Manrope', headingWeight: 800, scaleRatio: 1.3 },
    shape: { radius: 22, radiusStyle: 'round' },
    effects: { shadow: 'lg', shadowColor: '265 70% 56%', glass: { enabled: true, blur: 18, opacity: 60 }, motion: 'expressive', hoverEffect: 'glow', scrollReveal: true, background: { type: 'gradient', gradient: { enabled: true, from: '265 80% 95%', to: '320 80% 95%', angle: 135 } } },
    layout: { header: { variant: 'centered', blur: true }, footer: { variant: 'rich' }, productGrid: { columns: 4, gap: 'lg' }, density: 'spacious', sectionHeader: 'centered' },
    components: { productCard: 'overlay', cart: 'drawer', button: 'gradient', productGalleryLayout: 'sticky-split' },
    pages: { home: [
      sec('hero', 'hero', { variant: 'full', showLogo: true, ctaLabel: 'Shop Now' }),
      sec('marquee', 'announcementMarquee', { variant: 'gradient' }),
      sec('categories', 'categoryGrid', { title: 'Shop by Category', variant: 'pills' }),
      sec('bestSellers', 'bestSellers', { title: 'Best Sellers', display: 'carousel' }),
      sec('newArrivals', 'newArrivals', { title: 'New Arrivals', display: 'masonry', limit: 10 }),
      sec('promo', 'promoBanner', { variant: 'gradient' }),
      sec('recommended', 'recommended', { title: 'Recommended For You', display: 'carousel' }),
      sec('viewAll', 'viewAllCta', { label: 'View All Products', variant: 'banner' }),
    ] },
  }),

  define('editorial', 'Editorial', 'Magazine-style fashion layout with large serif headings.', 'Clothing', {
    theme: { paletteId: 'editorial', tokens: palette({ bg: '40 12% 97%', fg: '0 0% 8%', card: '0 0% 100%', primary: '0 0% 8%', primaryFg: '43 60% 72%', secondary: '40 10% 92%', accent: '43 74% 49%', accentFg: '0 0% 8%', muted: '40 10% 92%', mutedFg: '0 0% 40%', border: '0 0% 88%' }) },
    typography: { headingFont: 'Playfair Display', bodyFont: 'Lato', headingWeight: 700, scaleRatio: 1.4, letterSpacing: -0.01 },
    shape: { radius: 4, radiusStyle: 'soft' },
    effects: { shadow: 'sm', glass: { enabled: false, blur: 0, opacity: 100 }, motion: 'subtle', hoverEffect: 'zoom' },
    layout: { header: { variant: 'split', blur: false }, footer: { variant: 'columns' }, productGrid: { columns: 3, gap: 'lg' }, sectionSpacing: 'airy', containerWidth: 'wide', sectionHeader: 'editorial' },
    components: { productCard: 'editorial', cart: 'modal', badge: 'outline' },
    pages: { home: [
      sec('hero', 'hero', { variant: 'editorial', showLogo: false, ctaLabel: 'Explore the Collection' }),
      sec('marquee', 'announcementMarquee', { variant: 'static' }),
      sec('categories', 'categoryGrid', { title: 'Shop by Category', variant: 'mosaic' }),
      sec('bestSellers', 'bestSellers', { title: 'Best Sellers', display: 'editorial', limit: 3 }),
      sec('newArrivals', 'newArrivals', { title: 'New Arrivals', display: 'grid', limit: 9 }),
      sec('about', 'richText', { variant: 'split' }),
      sec('viewAll', 'viewAllCta', { label: 'View All Products', variant: 'link' }),
    ] },
  }),

  define('brutalist', 'Brutalist', 'Bold, high-contrast, sharp corners and thick borders.', 'Electronics', {
    theme: { paletteId: 'brutalist', tokens: palette({ bg: '0 0% 100%', fg: '0 0% 4%', card: '0 0% 100%', primary: '0 0% 4%', primaryFg: '0 0% 100%', secondary: '0 0% 94%', accent: '54 100% 50%', accentFg: '0 0% 4%', muted: '0 0% 92%', mutedFg: '0 0% 30%', border: '0 0% 4%' }) },
    typography: { headingFont: 'Space Grotesk', bodyFont: 'Work Sans', headingWeight: 700, headingTransform: 'uppercase', letterSpacing: -0.02, scaleRatio: 1.33 },
    shape: { radius: 0, radiusStyle: 'sharp', borderWidth: 2 },
    effects: { shadow: 'none', glass: { enabled: false, blur: 0, opacity: 100 }, motion: 'subtle', hoverEffect: 'none', grain: false },
    layout: { header: { variant: 'minimal', blur: false }, footer: { variant: 'minimal' }, productGrid: { columns: 4, gap: 'sm' }, density: 'cozy', sectionHeader: 'left' },
    components: { productCard: 'minimal', cart: 'page', button: 'solid', buttonShape: 'sharp', badge: 'solid' },
    pages: { home: [
      sec('hero', 'hero', { variant: 'compact', showLogo: true, ctaLabel: 'SHOP NOW' }),
      sec('marquee', 'announcementMarquee', { variant: 'static' }),
      sec('categories', 'categoryGrid', { title: 'Categories', variant: 'pills' }),
      sec('newArrivals', 'newArrivals', { title: 'New Arrivals', display: 'grid', limit: 12 }),
      sec('bestSellers', 'bestSellers', { title: 'Best Sellers', display: 'grid' }),
      sec('viewAll', 'viewAllCta', { label: 'ALL PRODUCTS', variant: 'link' }),
    ] },
  }),

  define('boutique', 'Boutique', 'Elegant luxury — muted gold & black, generous spacing.', 'Jewelry', {
    theme: { paletteId: 'boutique', tokens: palette({ bg: '36 16% 96%', fg: '30 12% 14%', card: '0 0% 100%', primary: '30 14% 16%', primaryFg: '40 50% 82%', secondary: '36 14% 91%', accent: '40 60% 52%', muted: '36 12% 90%', mutedFg: '30 8% 42%', border: '36 14% 86%' }) },
    typography: { headingFont: 'Cormorant Garamond', bodyFont: 'Nunito Sans', headingWeight: 600, scaleRatio: 1.4, letterSpacing: 0.01 },
    shape: { radius: 6, radiusStyle: 'soft' },
    effects: { shadow: 'md', glass: { enabled: false, blur: 0, opacity: 100 }, motion: 'subtle', hoverEffect: 'lift' },
    layout: { header: { variant: 'centered', blur: false }, footer: { variant: 'rich' }, productGrid: { columns: 3, gap: 'lg' }, sectionSpacing: 'airy', density: 'spacious', containerWidth: 'standard', sectionHeader: 'editorial' },
    components: { productCard: 'minimal', cart: 'drawer', badge: 'outline', productGalleryLayout: 'sticky-split' },
    pages: { home: [
      sec('hero', 'hero', { variant: 'collage', showLogo: true, ctaLabel: 'Discover' }),
      sec('valueProps', 'valueProps', { variant: 'row' }),
      sec('categories', 'categoryGrid', { title: 'Collections', variant: 'tiles' }),
      sec('bestSellers', 'bestSellers', { title: 'Signature Pieces', display: 'editorial', limit: 3 }),
      sec('newArrivals', 'newArrivals', { title: 'New Arrivals', display: 'masonry', limit: 8 }),
      sec('about', 'richText', { variant: 'centered' }),
      sec('viewAll', 'viewAllCta', { label: 'View All Products', variant: 'button' }),
    ] },
  }),

  define('street', 'Street', 'Streetwear energy — dark, neon accent, dense grid.', 'Shoes', {
    theme: {
      paletteId: 'street', mode: 'dark',
      tokens: palette({ bg: '0 0% 7%', fg: '0 0% 96%', card: '0 0% 11%', primary: '84 81% 50%', primaryFg: '0 0% 6%', secondary: '0 0% 15%', accent: '84 81% 50%', accentFg: '0 0% 6%', muted: '0 0% 16%', mutedFg: '0 0% 62%', border: '0 0% 20%' }),
    },
    typography: { headingFont: 'Space Grotesk', bodyFont: 'Work Sans', headingWeight: 700, headingTransform: 'uppercase', scaleRatio: 1.33 },
    shape: { radius: 2, radiusStyle: 'sharp' },
    effects: { shadow: 'dramatic', glass: { enabled: true, blur: 10, opacity: 50 }, motion: 'expressive', hoverEffect: 'tilt', grain: true },
    layout: { header: { variant: 'minimal', blur: true }, footer: { variant: 'minimal' }, nav: { desktop: 'topbar', showCategories: true, mobileBottomBar: true }, productGrid: { columns: 5, gap: 'sm' }, density: 'cozy', sectionHeader: 'left' },
    components: { productCard: 'compact', cart: 'drawer', button: 'solid' },
    pages: { home: [
      sec('hero', 'hero', { variant: 'full', showLogo: true, ctaLabel: 'Shop the Drop' }),
      sec('marquee', 'announcementMarquee', { variant: 'marquee' }),
      sec('categories', 'categoryGrid', { title: 'Categories', variant: 'mosaic' }),
      sec('newArrivals', 'newArrivals', { title: 'Latest Drop', display: 'grid', limit: 10 }),
      sec('promo', 'promoBanner', { variant: 'gradient' }),
      sec('bestSellers', 'bestSellers', { title: 'Most Copped', display: 'carousel' }),
      sec('viewAll', 'viewAllCta', { label: 'View All', variant: 'banner' }),
    ] },
  }),

  define('organic', 'Organic', 'Soft and natural — warm earthy tones, round corners.', 'Flower Shop', {
    theme: { paletteId: 'organic', tokens: palette({ bg: '40 30% 96%', fg: '30 16% 22%', card: '40 30% 99%', primary: '140 30% 34%', primaryFg: '40 40% 96%', secondary: '90 24% 88%', accent: '24 50% 60%', muted: '40 20% 90%', mutedFg: '30 10% 44%', border: '40 20% 85%' }) },
    typography: { headingFont: 'Lora', bodyFont: 'Karla', headingWeight: 600, scaleRatio: 1.28 },
    shape: { radius: 26, radiusStyle: 'round' },
    effects: { shadow: 'sm', glass: { enabled: false, blur: 0, opacity: 100 }, motion: 'standard', hoverEffect: 'lift', background: { type: 'solid', color: '40 30% 96%' } },
    layout: { header: { variant: 'classic', blur: false }, footer: { variant: 'rich' }, productGrid: { columns: 3, gap: 'lg' }, sectionSpacing: 'airy', density: 'spacious', sectionHeader: 'centered' },
    components: { productCard: 'polaroid', cart: 'drawer', badge: 'soft' },
    pages: { home: [
      sec('hero', 'hero', { variant: 'split', showLogo: true, ctaLabel: 'Shop Now' }),
      sec('marquee', 'announcementMarquee', { variant: 'stacked' }),
      sec('valueProps', 'valueProps', { variant: 'cards' }),
      sec('categories', 'categoryGrid', { title: 'Shop by Category', variant: 'pills' }),
      sec('newArrivals', 'newArrivals', { title: 'Fresh This Week', display: 'masonry', limit: 8 }),
      sec('recommended', 'recommended', { title: 'Picked For You', display: 'carousel' }),
      sec('about', 'richText', { variant: 'centered' }),
      sec('viewAll', 'viewAllCta', { label: 'View All Products', variant: 'button' }),
    ] },
  }),

  define('tech', 'Tech', 'Crisp SaaS/electronics look — dark blue, sharp shadows.', 'Electronics', {
    theme: {
      paletteId: 'tech', mode: 'dark',
      tokens: palette({ bg: '222 26% 9%', fg: '210 20% 94%', card: '222 22% 13%', primary: '210 100% 56%', primaryFg: '0 0% 100%', secondary: '222 18% 18%', accent: '190 90% 50%', muted: '222 16% 20%', mutedFg: '215 16% 66%', border: '222 16% 22%' }),
    },
    typography: { headingFont: 'Space Grotesk', bodyFont: 'Inter', headingWeight: 700, scaleRatio: 1.27 },
    shape: { radius: 10, radiusStyle: 'soft' },
    effects: { shadow: 'lg', shadowColor: '210 100% 56%', glass: { enabled: true, blur: 14, opacity: 65 }, motion: 'standard', hoverEffect: 'glow' },
    layout: { header: { variant: 'split', blur: true }, footer: { variant: 'columns' }, productGrid: { columns: 4, gap: 'md' }, sectionHeader: 'left' },
    components: { productCard: 'overlay', cart: 'drawer', button: 'solid', productGalleryLayout: 'sticky-split' },
    pages: { home: [
      sec('hero', 'hero', { variant: 'full', showLogo: true, ctaLabel: 'Shop Now' }),
      sec('marquee', 'announcementMarquee', { variant: 'marquee' }),
      sec('valueProps', 'valueProps', { variant: 'row' }),
      sec('categories', 'categoryGrid', { title: 'Browse Categories', variant: 'tiles' }),
      sec('bestSellers', 'bestSellers', { title: 'Best Sellers', display: 'grid' }),
      sec('newArrivals', 'newArrivals', { title: 'Just Landed', display: 'carousel', limit: 10 }),
      sec('promo', 'promoBanner', { variant: 'outline' }),
      sec('viewAll', 'viewAllCta', { label: 'View All Products', variant: 'banner' }),
    ] },
  }),

  define('noir', 'Noir', 'Dark luxury — product slideshow hero, serif type, gold details, sidebar navigation.', 'Jewelry & Fashion', {
    theme: {
      paletteId: 'noir', mode: 'dark',
      tokens: palette({ bg: '30 8% 6%', fg: '40 30% 92%', card: '30 8% 10%', primary: '42 65% 55%', primaryFg: '30 10% 8%', secondary: '30 8% 14%', accent: '42 65% 55%', accentFg: '30 10% 8%', muted: '30 8% 15%', mutedFg: '35 12% 60%', border: '30 8% 20%' }),
      gradient: { enabled: true, from: '30 8% 6%', to: '30 10% 12%', angle: 160 },
    },
    typography: { headingFont: 'Cormorant Garamond', bodyFont: 'Nunito Sans', headingWeight: 600, bodyWeight: 400, scaleRatio: 1.42, letterSpacing: 0.02, lineHeight: 1.7, headingTransform: 'none', baseSize: 16 },
    shape: { radius: 4, radiusStyle: 'soft', borderWidth: 1, borderStyle: 'solid' },
    effects: {
      shadow: 'dramatic', shadowColor: '42 65% 45%',
      glass: { enabled: true, blur: 16, opacity: 55 }, motion: 'subtle', scrollReveal: true, hoverEffect: 'glow', grain: true,
      background: { type: 'gradient', gradient: { enabled: true, from: '30 8% 5%', to: '30 10% 9%', angle: 180 } },
    },
    layout: {
      containerWidth: 'wide', density: 'spacious', sectionSpacing: 'airy',
      header: { variant: 'centered', sticky: true, transparentOnHero: false, blur: true, showSearch: true, showAnnouncementBar: true },
      nav: { desktop: 'sidebar', showCategories: true, mobileBottomBar: true, bottomBarStyle: 'floating' },
      footer: { variant: 'columns' }, productGrid: { columns: 3, gap: 'lg' }, banner: { style: 'static' }, sectionHeader: 'editorial',
    },
    components: { productCard: 'editorial', button: 'outline', buttonShape: 'sharp', cart: 'drawer', productGalleryLayout: 'sticky-split', badge: 'outline' },
    pages: {
      home: [
        sec('hero', 'hero', { variant: 'slideshow', showLogo: false, ctaLabel: 'Discover the Collection', slideInterval: 5 }),
        sec('categories', 'categoryGrid', { title: 'Collections', variant: 'mosaic' }),
        sec('bestSellers', 'bestSellers', { title: 'Signature Pieces', display: 'editorial', limit: 3 }),
        sec('newArrivals', 'newArrivals', { title: 'New In', display: 'grid', limit: 9 }),
        sec('about', 'richText', { variant: 'split' }),
        sec('viewAll', 'viewAllCta', { label: 'View Everything', variant: 'link' }),
      ],
      products: { layout: 'grid', filters: 'topbar' },
      orders: { style: 'cards' },
    },
  }),

  define('vitrine', 'Vitrine', 'Bright showcase — rolling product slideshow, playful pills, masonry wall.', 'Boutique & Gifts', {
    theme: {
      paletteId: 'vitrine', mode: 'light',
      tokens: palette({ bg: '40 60% 98%', fg: '340 30% 16%', card: '0 0% 100%', primary: '340 75% 52%', primaryFg: '0 0% 100%', secondary: '40 60% 93%', accent: '160 60% 42%', accentFg: '0 0% 100%', muted: '40 40% 93%', mutedFg: '340 10% 44%', border: '40 40% 88%' }),
      gradient: { enabled: true, from: '340 75% 92%', to: '40 90% 92%', angle: 120 },
    },
    typography: { headingFont: 'Syne', bodyFont: 'Karla', headingWeight: 800, bodyWeight: 400, scaleRatio: 1.3, letterSpacing: -0.01, lineHeight: 1.6, headingTransform: 'none', baseSize: 16 },
    shape: { radius: 18, radiusStyle: 'round', borderWidth: 1, borderStyle: 'solid' },
    effects: {
      shadow: 'md', shadowColor: '340 75% 52%',
      glass: { enabled: false, blur: 0, opacity: 100 }, motion: 'expressive', scrollReveal: true, hoverEffect: 'tilt', grain: false,
      background: { type: 'solid', color: '40 60% 98%' },
    },
    layout: {
      containerWidth: 'standard', density: 'comfortable', sectionSpacing: 'normal',
      header: { variant: 'classic', sticky: true, transparentOnHero: false, blur: false, showSearch: true, showAnnouncementBar: true },
      nav: { desktop: 'topbar', showCategories: true, mobileBottomBar: true, bottomBarStyle: 'bar' },
      footer: { variant: 'rich' }, productGrid: { columns: 4, gap: 'md' }, banner: { style: 'gradient' }, sectionHeader: 'left',
    },
    components: { productCard: 'polaroid', button: 'gradient', buttonShape: 'pill', cart: 'drawer', productGalleryLayout: 'left', badge: 'solid' },
    pages: {
      home: [
        sec('hero', 'hero', { variant: 'slideshow', showLogo: true, ctaLabel: 'Shop the Window', slideInterval: 4 }),
        sec('marquee', 'announcementMarquee', { variant: 'gradient' }),
        sec('categories', 'categoryGrid', { title: 'Pick a Shelf', variant: 'pills' }),
        sec('newArrivals', 'newArrivals', { title: 'Fresh in the Vitrine', display: 'masonry', limit: 8 }),
        sec('promo', 'promoBanner', { variant: 'gradient' }),
        sec('recommended', 'recommended', { title: 'Handpicked For You', display: 'carousel' }),
        sec('viewAll', 'viewAllCta', { label: 'See Everything', variant: 'button' }),
      ],
      products: { layout: 'grid', filters: 'drawer' },
      orders: { style: 'cards' },
    },
  }),
];

export const getTemplate = (id: string): StorefrontTemplate | undefined => TEMPLATES.find((t) => t.id === id);
