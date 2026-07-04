// The template collection — eight from-scratch design languages. Each is a
// COMPLETE StorefrontConfig: colors (light + dark), typography, shape,
// effects, chrome (navbar presentation, footer), component styles and full
// page compositions, so applying one restyles every option the Studio has.

import { StorefrontConfig, StorefrontTemplate, ColorTokens, SectionInstance } from '../config/types';
import { DEFAULT_CONFIG, cloneConfig } from '../config/defaults';

/** Compact section-instance author for template page compositions. */
const sec = (id: string, type: string, props: Record<string, any> = {}, enabled = true): SectionInstance =>
  ({ id, type, enabled, props });

/** Product-detail composition with a chosen gallery style. */
const detail = (gallery: 'carousel' | 'thumbs' | 'filmstrip' | 'grid'): SectionInstance[] =>
  DEFAULT_CONFIG.pages.productDetail.map((s) => (s.type === 'gallery' ? { ...s, props: { ...s.props, variant: gallery } } : { ...s }));

const isObj = (v: any) => v && typeof v === 'object' && !Array.isArray(v);
function merge<T>(base: T, src: any): T {
  if (!isObj(base) || !isObj(src)) return (src ?? base) as T;
  const out: any = Array.isArray(base) ? [...(base as any)] : { ...base };
  for (const k of Object.keys(src)) {
    out[k] = isObj((base as any)[k]) && isObj(src[k]) ? merge((base as any)[k], src[k]) : src[k];
  }
  return out;
}

// Build a full token set from a handful of inputs.
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

  /* ── Studio — the refined neutral baseline ─────────────────────────── */
  define('studio', 'Studio', 'Clean and modern — a quiet frame that lets any catalog shine.', 'Universal', {
    theme: { paletteId: 'studio', mode: 'light', tokens: palette({ bg: '0 0% 100%', fg: '240 10% 8%', card: '0 0% 100%', primary: '240 6% 10%', primaryFg: '0 0% 98%', secondary: '240 5% 96%', accent: '240 5% 94%', muted: '240 5% 96%', mutedFg: '240 4% 46%', border: '240 6% 90%' }) },
    typography: { headingFont: 'Manrope', bodyFont: 'Inter', headingWeight: 700, bodyWeight: 400, scaleRatio: 1.25, letterSpacing: -0.01, lineHeight: 1.6, headingTransform: 'none', baseSize: 16 },
    shape: { radius: 14, radiusStyle: 'soft', borderWidth: 1, borderStyle: 'solid' },
    effects: { shadow: 'md', glass: { enabled: true, blur: 12, opacity: 70 }, motion: 'standard', scrollReveal: true, hoverEffect: 'lift', grain: false, background: { type: 'solid', color: '0 0% 100%' } },
    layout: {
      containerWidth: 'standard', density: 'comfortable', sectionSpacing: 'normal', sectionHeader: 'left',
      header: { variant: 'classic', presentation: 'bar', sticky: true, transparentOnHero: false, blur: true, showSearch: true, showAnnouncementBar: true },
      nav: { desktop: 'topbar', showCategories: true, mobileBottomBar: true, bottomBarStyle: 'bar' },
      footer: { variant: 'rich' }, productGrid: { columns: 4, gap: 'md' }, banner: { style: 'marquee' },
    },
    components: { productCard: 'classic', button: 'solid', buttonShape: 'inherit', cart: 'drawer', productGalleryLayout: 'left', badge: 'soft' },
    pages: {
      home: [
        sec('hero', 'hero', { variant: 'banner', showLogo: true, ctaLabel: 'Shop Now' }),
        sec('marquee', 'announcementMarquee', { variant: 'marquee' }),
        sec('valueProps', 'valueProps', { variant: 'row' }),
        sec('categories', 'categoryGrid', { title: 'Shop by Category', variant: 'tiles' }),
        sec('bestSellers', 'productSlider', { source: 'bestSellers', title: 'Best Sellers', variant: 'peek' }),
        sec('newArrivals', 'newArrivals', { title: 'New Arrivals', display: 'grid', limit: 8 }),
        sec('viewAll', 'viewAllCta', { label: 'View All Products', variant: 'button' }),
      ],
      products: { layout: 'grid', filters: 'sidebar' },
      productDetail: detail('thumbs'),
      orders: { style: 'cards' },
    },
  }),

  /* ── Atelier — warm gallery, frame cards, filmstrip ────────────────── */
  define('atelier', 'Atelier', 'A warm gallery — framed pieces, serif voice, ink on parchment.', 'Art, Craft & Fashion', {
    theme: {
      paletteId: 'atelier', mode: 'light',
      tokens: palette({ bg: '38 38% 96%', fg: '24 30% 12%', card: '40 45% 98%', primary: '18 65% 42%', primaryFg: '40 45% 97%', secondary: '36 28% 90%', accent: '84 22% 40%', accentFg: '40 45% 97%', muted: '36 24% 90%', mutedFg: '26 14% 40%', border: '32 22% 84%' }),
    },
    typography: { headingFont: 'Fraunces', bodyFont: 'Inter', headingWeight: 600, bodyWeight: 400, scaleRatio: 1.38, letterSpacing: 0, lineHeight: 1.7, headingTransform: 'none', baseSize: 16 },
    shape: { radius: 6, radiusStyle: 'soft', borderWidth: 1, borderStyle: 'solid' },
    effects: { shadow: 'sm', glass: { enabled: false, blur: 0, opacity: 100 }, motion: 'subtle', scrollReveal: true, hoverEffect: 'zoom', grain: true, background: { type: 'solid', color: '38 38% 96%' } },
    layout: {
      containerWidth: 'standard', density: 'spacious', sectionSpacing: 'airy', sectionHeader: 'editorial',
      header: { variant: 'centered', presentation: 'minimal', sticky: true, transparentOnHero: false, blur: false, showSearch: true, showAnnouncementBar: true },
      nav: { desktop: 'topbar', showCategories: true, mobileBottomBar: true, bottomBarStyle: 'minimal' },
      footer: { variant: 'columns' }, productGrid: { columns: 3, gap: 'lg' }, banner: { style: 'static' },
    },
    components: { productCard: 'frame', button: 'outline', buttonShape: 'inherit', cart: 'drawer', productGalleryLayout: 'left', badge: 'outline' },
    pages: {
      home: [
        sec('hero', 'hero', { variant: 'split-slideshow', showLogo: false, ctaLabel: 'Visit the Atelier', slideInterval: 5 }),
        sec('marquee', 'announcementMarquee', { variant: 'static' }),
        sec('categories', 'categoryGrid', { title: 'Collections', variant: 'mosaic' }),
        sec('bestSellers', 'bestSellers', { title: 'Signature Pieces', display: 'editorial', limit: 3 }),
        sec('newArrivals', 'productSlider', { source: 'newArrivals', title: 'New in the Studio', variant: 'peek' }),
        sec('about', 'richText', { variant: 'split' }),
        sec('viewAll', 'viewAllCta', { label: 'Browse Everything', variant: 'link' }),
      ],
      products: { layout: 'grid', filters: 'topbar' },
      productDetail: detail('filmstrip'),
      orders: { style: 'cards' },
    },
  }),

  /* ── Neon — dark electric, marquee type, caption-hover cards ───────── */
  define('neon', 'Neon', 'Electric night-market energy — scrolling type, glowing accents.', 'Streetwear & Tech', {
    theme: {
      paletteId: 'neon', mode: 'dark',
      tokens: palette({ bg: '260 25% 7%', fg: '260 20% 95%', card: '258 22% 11%', primary: '320 95% 60%', primaryFg: '260 25% 6%', secondary: '258 18% 16%', accent: '180 95% 50%', accentFg: '260 25% 6%', muted: '258 16% 17%', mutedFg: '258 12% 65%', border: '258 16% 22%' }),
      gradient: { enabled: true, from: '320 95% 60%', to: '180 95% 50%', angle: 120 },
    },
    typography: { headingFont: 'Unbounded', bodyFont: 'Space Grotesk', headingWeight: 700, bodyWeight: 400, scaleRatio: 1.28, letterSpacing: 0, lineHeight: 1.6, headingTransform: 'none', baseSize: 16 },
    shape: { radius: 12, radiusStyle: 'soft', borderWidth: 1, borderStyle: 'solid' },
    effects: {
      shadow: 'dramatic', shadowColor: '320 95% 60%', glass: { enabled: true, blur: 14, opacity: 55 }, motion: 'expressive', scrollReveal: true, hoverEffect: 'glow', grain: true,
      background: { type: 'gradient', gradient: { enabled: true, from: '260 25% 6%', to: '285 30% 10%', angle: 160 } },
    },
    layout: {
      containerWidth: 'wide', density: 'cozy', sectionSpacing: 'normal', sectionHeader: 'left',
      header: { variant: 'split', presentation: 'floating', sticky: true, transparentOnHero: false, blur: true, showSearch: true, showAnnouncementBar: true },
      nav: { desktop: 'topbar', showCategories: true, mobileBottomBar: true, bottomBarStyle: 'floating' },
      footer: { variant: 'minimal' }, productGrid: { columns: 4, gap: 'sm' }, banner: { style: 'gradient' },
    },
    components: { productCard: 'caption-hover', button: 'gradient', buttonShape: 'pill', cart: 'drawer', productGalleryLayout: 'sticky-split', badge: 'solid' },
    pages: {
      home: [
        sec('hero', 'hero', { variant: 'marquee-type', showLogo: false, ctaLabel: 'Shop the Drop' }),
        sec('marquee', 'announcementMarquee', { variant: 'gradient' }),
        sec('newArrivals', 'productSlider', { source: 'newArrivals', title: 'Latest Drop', variant: 'centered', limit: 10 }),
        sec('categories', 'categoryGrid', { title: 'Sections', variant: 'pills' }),
        sec('bestSellers', 'bestSellers', { title: 'Most Wanted', display: 'grid', limit: 8 }),
        sec('promo', 'promoBanner', { variant: 'gradient' }),
        sec('viewAll', 'viewAllCta', { label: 'Everything', variant: 'banner' }),
      ],
      products: { layout: 'grid', filters: 'drawer' },
      productDetail: detail('carousel'),
      orders: { style: 'table' },
    },
  }),

  /* ── Galerie — stark white space, video hero, museum restraint ─────── */
  define('galerie', 'Galerie', 'Museum whitespace — motion hero, sharp lines, nothing extra.', 'Design & Premium Goods', {
    theme: {
      paletteId: 'galerie', mode: 'light',
      tokens: palette({ bg: '0 0% 99%', fg: '0 0% 7%', card: '0 0% 100%', primary: '0 0% 7%', primaryFg: '0 0% 99%', secondary: '0 0% 95%', accent: '220 90% 55%', accentFg: '0 0% 100%', muted: '0 0% 94%', mutedFg: '0 0% 42%', border: '0 0% 88%' }),
    },
    typography: { headingFont: 'Archivo', bodyFont: 'Archivo', headingWeight: 800, bodyWeight: 400, scaleRatio: 1.33, letterSpacing: -0.02, lineHeight: 1.55, headingTransform: 'none', baseSize: 16 },
    shape: { radius: 0, radiusStyle: 'sharp', borderWidth: 1, borderStyle: 'solid' },
    effects: { shadow: 'none', glass: { enabled: false, blur: 0, opacity: 100 }, motion: 'subtle', scrollReveal: true, hoverEffect: 'zoom', grain: false, background: { type: 'solid', color: '0 0% 99%' } },
    layout: {
      containerWidth: 'wide', density: 'spacious', sectionSpacing: 'airy', sectionHeader: 'editorial',
      header: { variant: 'minimal', presentation: 'minimal', sticky: true, transparentOnHero: true, blur: false, showSearch: false, showAnnouncementBar: false },
      nav: { desktop: 'topbar', showCategories: false, mobileBottomBar: false, bottomBarStyle: 'minimal' },
      footer: { variant: 'minimal' }, productGrid: { columns: 3, gap: 'lg' }, banner: { style: 'static' },
    },
    components: { productCard: 'minimal', button: 'solid', buttonShape: 'sharp', cart: 'modal', productGalleryLayout: 'full-bleed', badge: 'outline' },
    pages: {
      home: [
        sec('hero', 'hero', { variant: 'video', showLogo: false, ctaLabel: 'View the Collection', slideInterval: 6 }),
        sec('marquee', 'announcementMarquee', { variant: 'static' }),
        sec('newArrivals', 'newArrivals', { title: 'New Works', display: 'grid', limit: 9 }),
        sec('bestSellers', 'bestSellers', { title: 'Selected', display: 'editorial', limit: 2 }),
        sec('about', 'richText', { variant: 'split' }),
        sec('viewAll', 'viewAllCta', { label: 'Full Catalogue', variant: 'link' }),
      ],
      products: { layout: 'grid', filters: 'topbar' },
      productDetail: detail('filmstrip'),
      orders: { style: 'table' },
    },
  }),

  /* ── Bazaar — playful market, ticket cards, saturated warmth ───────── */
  define('bazaar', 'Bazaar', 'A joyful market stall — ticket stubs, bold color, friendly type.', 'Gifts, Food & Family', {
    theme: {
      paletteId: 'bazaar', mode: 'light',
      tokens: palette({ bg: '43 90% 96%', fg: '20 60% 16%', card: '0 0% 100%', primary: '16 90% 52%', primaryFg: '0 0% 100%', secondary: '43 80% 90%', accent: '174 62% 40%', accentFg: '0 0% 100%', muted: '43 60% 90%', mutedFg: '24 30% 42%', border: '38 50% 84%' }),
      gradient: { enabled: true, from: '16 90% 60%', to: '340 80% 60%', angle: 100 },
    },
    typography: { headingFont: 'Baloo 2', bodyFont: 'Karla', headingWeight: 700, bodyWeight: 400, scaleRatio: 1.3, letterSpacing: 0, lineHeight: 1.65, headingTransform: 'none', baseSize: 16 },
    shape: { radius: 16, radiusStyle: 'round', borderWidth: 1, borderStyle: 'solid' },
    effects: { shadow: 'md', shadowColor: '16 90% 52%', glass: { enabled: false, blur: 0, opacity: 100 }, motion: 'expressive', scrollReveal: true, hoverEffect: 'tilt', grain: false, background: { type: 'solid', color: '43 90% 96%' } },
    layout: {
      containerWidth: 'standard', density: 'comfortable', sectionSpacing: 'normal', sectionHeader: 'centered',
      header: { variant: 'classic', presentation: 'floating', sticky: true, transparentOnHero: false, blur: false, showSearch: true, showAnnouncementBar: true },
      nav: { desktop: 'topbar', showCategories: true, mobileBottomBar: true, bottomBarStyle: 'floating' },
      footer: { variant: 'rich' }, productGrid: { columns: 4, gap: 'md' }, banner: { style: 'gradient' },
    },
    components: { productCard: 'ticket', button: 'solid', buttonShape: 'pill', cart: 'drawer', productGalleryLayout: 'left', badge: 'solid' },
    pages: {
      home: [
        sec('hero', 'hero', { variant: 'collage', showLogo: true, ctaLabel: 'Browse the Stalls' }),
        sec('marquee', 'announcementMarquee', { variant: 'gradient' }),
        sec('categories', 'categoryGrid', { title: 'Pick a Stall', variant: 'pills' }),
        sec('newArrivals', 'productSlider', { source: 'newArrivals', title: 'Fresh Today', variant: 'peek', limit: 10 }),
        sec('promo', 'promoBanner', { variant: 'gradient' }),
        sec('bestSellers', 'bestSellers', { title: 'Crowd Favorites', display: 'masonry', limit: 8 }),
        sec('viewAll', 'viewAllCta', { label: 'See Everything', variant: 'button' }),
      ],
      products: { layout: 'grid', filters: 'drawer' },
      productDetail: detail('thumbs'),
      orders: { style: 'cards' },
    },
  }),

  /* ── Mono — strict black & white typography ─────────────────────────── */
  define('mono', 'Mono', 'Strict black on white — typographic, gridded, zero ornament.', 'Fashion & Editorial', {
    theme: {
      paletteId: 'mono', mode: 'light',
      tokens: palette({ bg: '0 0% 100%', fg: '0 0% 5%', card: '0 0% 100%', primary: '0 0% 5%', primaryFg: '0 0% 100%', secondary: '0 0% 96%', accent: '0 0% 5%', accentFg: '0 0% 100%', muted: '0 0% 94%', mutedFg: '0 0% 38%', border: '0 0% 10%' }),
    },
    typography: { headingFont: 'Oswald', bodyFont: 'Inter', headingWeight: 600, bodyWeight: 400, scaleRatio: 1.42, letterSpacing: 0.02, lineHeight: 1.55, headingTransform: 'uppercase', baseSize: 15 },
    shape: { radius: 0, radiusStyle: 'sharp', borderWidth: 1, borderStyle: 'solid' },
    effects: { shadow: 'none', glass: { enabled: false, blur: 0, opacity: 100 }, motion: 'subtle', scrollReveal: true, hoverEffect: 'none', grain: false, background: { type: 'solid', color: '0 0% 100%' } },
    layout: {
      containerWidth: 'standard', density: 'cozy', sectionSpacing: 'normal', sectionHeader: 'left',
      header: { variant: 'split', presentation: 'bar', sticky: true, transparentOnHero: false, blur: false, showSearch: true, showAnnouncementBar: true },
      nav: { desktop: 'topbar', showCategories: true, mobileBottomBar: true, bottomBarStyle: 'bar' },
      footer: { variant: 'columns' }, productGrid: { columns: 4, gap: 'sm' }, banner: { style: 'static' },
    },
    components: { productCard: 'editorial', button: 'outline', buttonShape: 'sharp', cart: 'page', productGalleryLayout: 'top', badge: 'outline' },
    pages: {
      home: [
        sec('hero', 'hero', { variant: 'editorial', showLogo: false, ctaLabel: 'SHOP' }),
        sec('marquee', 'announcementMarquee', { variant: 'static' }),
        sec('newArrivals', 'newArrivals', { title: 'New', display: 'grid', limit: 12 }),
        sec('bestSellers', 'productSlider', { source: 'bestSellers', title: 'Essentials', variant: 'wide', limit: 8 }),
        sec('viewAll', 'viewAllCta', { label: 'ALL PRODUCTS', variant: 'link' }),
      ],
      products: { layout: 'list', filters: 'topbar' },
      productDetail: detail('grid'),
      orders: { style: 'table' },
    },
  }),

  /* ── Velvet — luxe evening, plum & gold, video glow ─────────────────── */
  define('velvet', 'Velvet', 'An evening boutique — deep plum, candlelit gold, soft glass.', 'Beauty, Wine & Luxury', {
    theme: {
      paletteId: 'velvet', mode: 'dark',
      tokens: palette({ bg: '290 30% 8%', fg: '35 40% 92%', card: '288 26% 12%', primary: '40 70% 58%', primaryFg: '290 30% 8%', secondary: '288 22% 16%', accent: '330 45% 55%', accentFg: '0 0% 100%', muted: '288 20% 17%', mutedFg: '300 12% 66%', border: '288 20% 22%' }),
      gradient: { enabled: true, from: '290 30% 10%', to: '320 30% 14%', angle: 150 },
    },
    typography: { headingFont: 'Playfair Display', bodyFont: 'Jost', headingWeight: 600, bodyWeight: 300, scaleRatio: 1.36, letterSpacing: 0.01, lineHeight: 1.7, headingTransform: 'none', baseSize: 16 },
    shape: { radius: 10, radiusStyle: 'soft', borderWidth: 1, borderStyle: 'solid' },
    effects: {
      shadow: 'dramatic', shadowColor: '40 70% 45%', glass: { enabled: true, blur: 18, opacity: 55 }, motion: 'standard', scrollReveal: true, hoverEffect: 'glow', grain: true,
      background: { type: 'gradient', gradient: { enabled: true, from: '290 30% 7%', to: '320 28% 11%', angle: 165 } },
    },
    layout: {
      containerWidth: 'standard', density: 'spacious', sectionSpacing: 'airy', sectionHeader: 'editorial',
      header: { variant: 'centered', presentation: 'floating', sticky: true, transparentOnHero: false, blur: true, showSearch: true, showAnnouncementBar: true },
      nav: { desktop: 'topbar', showCategories: true, mobileBottomBar: true, bottomBarStyle: 'floating' },
      footer: { variant: 'rich' }, productGrid: { columns: 3, gap: 'lg' }, banner: { style: 'static' },
    },
    components: { productCard: 'frame', button: 'soft', buttonShape: 'inherit', cart: 'drawer', productGalleryLayout: 'sticky-split', badge: 'soft' },
    pages: {
      home: [
        sec('hero', 'hero', { variant: 'video', showLogo: true, ctaLabel: 'Enter the Boutique', slideInterval: 6 }),
        sec('marquee', 'announcementMarquee', { variant: 'marquee' }),
        sec('valueProps', 'valueProps', { variant: 'row' }),
        sec('bestSellers', 'productSlider', { source: 'bestSellers', title: 'The Edit', variant: 'centered', limit: 8 }),
        sec('categories', 'categoryGrid', { title: 'Collections', variant: 'mosaic' }),
        sec('newArrivals', 'newArrivals', { title: 'Just Arrived', display: 'masonry', limit: 8 }),
        sec('about', 'richText', { variant: 'centered' }),
        sec('viewAll', 'viewAllCta', { label: 'View Everything', variant: 'button' }),
      ],
      products: { layout: 'grid', filters: 'sidebar' },
      productDetail: detail('thumbs'),
      orders: { style: 'cards' },
    },
  }),

  /* ── Noir — dark luxury, slideshow, sidebar navigation ─────────────── */
  define('noir', 'Noir', 'Dark luxury — product slideshow, serif type, gold details, sidebar navigation.', 'Jewelry & Fashion', {
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
      containerWidth: 'wide', density: 'spacious', sectionSpacing: 'airy', sectionHeader: 'editorial',
      header: { variant: 'centered', presentation: 'minimal', sticky: true, transparentOnHero: false, blur: true, showSearch: true, showAnnouncementBar: true },
      nav: { desktop: 'sidebar', showCategories: true, mobileBottomBar: true, bottomBarStyle: 'floating' },
      footer: { variant: 'columns' }, productGrid: { columns: 3, gap: 'lg' }, banner: { style: 'static' },
    },
    components: { productCard: 'editorial', button: 'outline', buttonShape: 'sharp', cart: 'drawer', productGalleryLayout: 'sticky-split', badge: 'outline' },
    pages: {
      home: [
        sec('hero', 'hero', { variant: 'slideshow', showLogo: false, ctaLabel: 'Discover the Collection', slideInterval: 5 }),
        sec('marquee', 'announcementMarquee', { variant: 'marquee' }),
        sec('categories', 'categoryGrid', { title: 'Collections', variant: 'mosaic' }),
        sec('bestSellers', 'bestSellers', { title: 'Signature Pieces', display: 'editorial', limit: 3 }),
        sec('newArrivals', 'productSlider', { source: 'newArrivals', title: 'New In', variant: 'peek', limit: 9 }),
        sec('about', 'richText', { variant: 'split' }),
        sec('viewAll', 'viewAllCta', { label: 'View Everything', variant: 'link' }),
      ],
      products: { layout: 'grid', filters: 'topbar' },
      productDetail: detail('filmstrip'),
      orders: { style: 'cards' },
    },
  }),
];

export const getTemplate = (id: string): StorefrontTemplate | undefined => TEMPLATES.find((t) => t.id === id);
