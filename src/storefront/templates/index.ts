// The template collection — clean "starting points", each a coherent COMBINATION
// of the Storefront Studio's own settings (colour, corners, fonts, navbar,
// footer, hero, cards, buttons, motion…). Nothing bespoke: applying a template
// only ever sets options the Studio can also set by hand, so every look here is
// reproducible and editable from the panel.
//
// Colour is generated from a single brand colour through the palette engine, so
// each template ships a cohesive LIGHT *and* DARK palette (no template ever
// falls back to a broken dark mode). Section compositions use only the safe,
// media-free blocks so a brand-new shop with no photos still looks intentional.

import { StorefrontConfig, StorefrontTemplate, SectionInstance } from '../config/types';
import { DEFAULT_CONFIG, DEFAULT_PRODUCT_DETAIL_SECTIONS, cloneConfig } from '../config/defaults';
import { generateTheme } from '../lib/palette';

/** Compact section-instance author for template page compositions. */
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

/** Default product-detail composition (studio drives the gallery layout knob). */
const productDetail = (): SectionInstance[] => DEFAULT_PRODUCT_DETAIL_SECTIONS.map((s) => ({ ...s }));

/** A safe, media-free BUT layered homepage — a proper editorial rhythm:
 *  hero → trust strip → categories → featured RAIL → promo band → best-sellers
 *  grid → new arrivals → brand story → closing CTA. Every band is optional and
 *  every choice is a Studio-settable value, so the whole page stays editable. */
type HomeOpts = {
  showLogo?: boolean; cta?: string;
  value?: false | 'row' | 'cards';
  cat?: 'tiles' | 'mosaic' | 'pills'; catTitle?: string;
  slider?: false | 'peek' | 'centered' | 'wide'; featTitle?: string;
  promo?: false | 'gradient' | 'outline';
  best?: false | 'carousel' | 'grid' | 'editorial' | 'masonry'; bestTitle?: string;
  news?: false | 'grid' | 'carousel' | 'masonry'; newsTitle?: string;
  about?: false | 'centered' | 'split';
  viewAll?: string; viewAllVariant?: 'button' | 'link' | 'banner';
};
const home = (heroVariant: string, o: HomeOpts = {}): SectionInstance[] => {
  const list: SectionInstance[] = [
    sec('hero', 'hero', { variant: heroVariant, showLogo: o.showLogo ?? true, ctaLabel: o.cta ?? 'Shop Now' }),
    sec('marquee', 'announcementMarquee', {}),
  ];
  if (o.value !== false) list.push(sec('valueProps', 'valueProps', { variant: o.value ?? 'row' }));
  list.push(sec('categories', 'categoryGrid', { title: o.catTitle ?? 'Shop by Category', variant: o.cat ?? 'tiles' }));
  // Featured RAIL = best-sellers. `get_top_products` caps this at ~5, so it only
  // ever lives in a slider (reads fine with few items) — never a grid/masonry
  // band that would show a half-empty row. The full-catalog "New Arrivals" grid
  // below is the one that fills rows. Two distinct sources, no duplicated band.
  if (o.slider !== false) list.push(sec('featured', 'productSlider', { source: 'bestSellers', title: o.featTitle ?? 'Best Sellers', variant: o.slider ?? 'peek', limit: 8 }));
  if (o.promo !== false) list.push(sec('promo', 'promoBanner', { variant: o.promo ?? 'gradient' }));
  if (o.news !== false) list.push(sec('newArrivals', 'newArrivals', { title: o.newsTitle ?? 'New Arrivals', display: o.news ?? 'grid', limit: 8 }));
  if (o.about) list.push(sec('about', 'richText', { variant: o.about }));
  list.push(sec('viewAll', 'viewAllCta', { label: o.viewAll ?? 'View All Products', variant: o.viewAllVariant ?? 'button' }));
  return list;
};

/** Author a template from a brand colour + a combination of Studio knobs. */
type Gradient = { enabled: boolean; from: string; to: string; angle: number };
const tpl = (
  id: string,
  name: string,
  description: string,
  businessType: string,
  brand: string,
  mode: 'light' | 'dark' | 'auto',
  overrides: any,
  gradient?: Gradient,
): StorefrontTemplate => {
  const { tokens, darkTokens } = generateTheme(brand);
  const theme = { paletteId: id, mode, tokens, darkTokens, ...(gradient ? { gradient } : {}) };
  const config: StorefrontConfig = merge(cloneConfig(DEFAULT_CONFIG), {
    ...overrides,
    theme,
    templateId: id,
    pages: { ...overrides.pages, productDetail: overrides.pages?.productDetail ?? productDetail() },
  });
  return { id, name, description, businessType, config };
};

export const TEMPLATES: StorefrontTemplate[] = [

  /* ── Studio — the refined neutral baseline ─────────────────────────── */
  tpl('studio', 'Studio', 'Clean and modern — a quiet frame that lets any catalog shine.', 'Universal',
    '#20242e', 'light', {
      typography: { headingFont: 'Manrope', bodyFont: 'Inter', headingWeight: 700, bodyWeight: 400, scaleRatio: 1.25, letterSpacing: -0.01, lineHeight: 1.6, headingTransform: 'none', baseSize: 16 },
      shape: { radius: 14, radiusStyle: 'soft', borderWidth: 1, borderStyle: 'solid' },
      effects: { shadow: 'md', glass: { enabled: true, blur: 12, opacity: 70 }, motion: 'standard', hoverEffect: 'lift', grain: false },
      layout: {
        containerWidth: 'standard', density: 'comfortable', sectionSpacing: 'normal', sectionHeader: 'left',
        header: { variant: 'classic', presentation: 'bar', sticky: true, blur: true, showSearch: true, showAnnouncementBar: true },
        nav: { desktop: 'topbar', showCategories: true, mobileBottomBar: true, bottomBarStyle: 'bar' },
        footer: { variant: 'rich' }, productGrid: { columns: 4, gap: 'md' }, banner: { style: 'marquee' },
      },
      components: { productCard: 'classic', button: 'solid', buttonShape: 'inherit', cart: 'drawer', productGalleryLayout: 'left', badge: 'soft' },
      pages: { home: home('banner', { value: 'row', slider: 'peek', promo: 'gradient', best: 'grid', news: 'grid', cta: 'Shop Now' }), products: { layout: 'grid', filters: 'sidebar' }, orders: { style: 'cards' } },
    }),

  /* ── Minimal — sharp, quiet, typographic ───────────────────────────── */
  tpl('minimal', 'Minimal', 'Sharp edges and lots of air — nothing but the products.', 'Fashion & Editorial',
    '#111214', 'light', {
      typography: { headingFont: 'Inter', bodyFont: 'Inter', headingWeight: 600, bodyWeight: 400, scaleRatio: 1.33, letterSpacing: -0.01, lineHeight: 1.6, headingTransform: 'none', baseSize: 15 },
      shape: { radius: 0, radiusStyle: 'sharp', borderWidth: 1, borderStyle: 'solid' },
      effects: { shadow: 'none', glass: { enabled: false, blur: 0, opacity: 100 }, motion: 'subtle', hoverEffect: 'zoom', grain: false },
      layout: {
        containerWidth: 'standard', density: 'cozy', sectionSpacing: 'normal', sectionHeader: 'left',
        header: { variant: 'minimal', presentation: 'minimal', sticky: true, blur: false, showSearch: true, showAnnouncementBar: true },
        nav: { desktop: 'topbar', showCategories: true, mobileBottomBar: true, bottomBarStyle: 'minimal' },
        footer: { variant: 'minimal' }, productGrid: { columns: 4, gap: 'sm' }, banner: { style: 'static' },
      },
      components: { productCard: 'minimal', button: 'outline', buttonShape: 'sharp', cart: 'modal', productGalleryLayout: 'top', badge: 'outline' },
      pages: { home: home('minimal', { value: false, cat: 'pills', slider: 'wide', promo: false, best: false, news: 'grid', viewAllVariant: 'link', cta: 'Shop' }), products: { layout: 'grid', filters: 'topbar' }, orders: { style: 'table' } },
    }),

  /* ── Boutique — warm, rounded, serif voice ─────────────────────────── */
  tpl('boutique', 'Boutique', 'Warm and welcoming — rounded cards and a soft serif headline.', 'Beauty, Home & Gifts',
    '#b1543a', 'light', {
      typography: { headingFont: 'Fraunces', bodyFont: 'Inter', headingWeight: 600, bodyWeight: 400, scaleRatio: 1.35, letterSpacing: 0, lineHeight: 1.7, headingTransform: 'none', baseSize: 16 },
      shape: { radius: 16, radiusStyle: 'round', borderWidth: 1, borderStyle: 'solid' },
      effects: { shadow: 'lg', glass: { enabled: false, blur: 0, opacity: 100 }, motion: 'standard', hoverEffect: 'lift', grain: false },
      layout: {
        containerWidth: 'standard', density: 'spacious', sectionSpacing: 'airy', sectionHeader: 'centered',
        header: { variant: 'centered', presentation: 'floating', sticky: true, blur: true, showSearch: true, showAnnouncementBar: true },
        nav: { desktop: 'topbar', showCategories: true, mobileBottomBar: true, bottomBarStyle: 'floating' },
        footer: { variant: 'columns' }, productGrid: { columns: 3, gap: 'lg' }, banner: { style: 'static' },
      },
      components: { productCard: 'frame', button: 'soft', buttonShape: 'inherit', cart: 'drawer', productGalleryLayout: 'left', badge: 'soft' },
      pages: { home: home('split', { value: 'cards', cat: 'mosaic', slider: 'centered', promo: 'outline', best: 'editorial', news: 'grid', about: 'split', cta: 'Shop the Collection' }), products: { layout: 'grid', filters: 'sidebar' }, orders: { style: 'cards' } },
    }),

  /* ── Vivid — bold, playful, gradient-forward ───────────────────────── */
  tpl('vivid', 'Vivid', 'Big, friendly, colourful — pill shapes and lively motion.', 'Gifts, Food & Family',
    '#f4511e', 'light', {
      typography: { headingFont: 'Baloo 2', bodyFont: 'Karla', headingWeight: 700, bodyWeight: 400, scaleRatio: 1.3, letterSpacing: 0, lineHeight: 1.65, headingTransform: 'none', baseSize: 16 },
      shape: { radius: 18, radiusStyle: 'pill', borderWidth: 1, borderStyle: 'solid' },
      effects: { shadow: 'md', glass: { enabled: false, blur: 0, opacity: 100 }, motion: 'expressive', hoverEffect: 'tilt', grain: false },
      layout: {
        containerWidth: 'standard', density: 'comfortable', sectionSpacing: 'normal', sectionHeader: 'centered',
        header: { variant: 'classic', presentation: 'floating', sticky: true, blur: false, showSearch: true, showAnnouncementBar: true },
        nav: { desktop: 'topbar', showCategories: true, mobileBottomBar: true, bottomBarStyle: 'floating' },
        footer: { variant: 'rich' }, productGrid: { columns: 4, gap: 'md' }, banner: { style: 'gradient' },
      },
      components: { productCard: 'ticket', button: 'gradient', buttonShape: 'pill', cart: 'drawer', productGalleryLayout: 'left', badge: 'solid' },
      pages: { home: home('gradient', { value: 'row', cat: 'pills', slider: 'peek', promo: 'gradient', best: 'masonry', news: 'grid', viewAllVariant: 'banner', cta: 'Start Shopping' }), products: { layout: 'grid', filters: 'drawer' }, orders: { style: 'cards' } },
    },
    { enabled: true, from: '16 90% 55%', to: '340 85% 58%', angle: 110 }),

  /* ── Editorial — magazine grid, cobalt accent ──────────────────────── */
  tpl('editorial', 'Editorial', 'A magazine grid — heavy display type and confident columns.', 'Design & Premium Goods',
    '#2b4bd6', 'light', {
      typography: { headingFont: 'Archivo', bodyFont: 'Archivo', headingWeight: 800, bodyWeight: 400, scaleRatio: 1.36, letterSpacing: -0.02, lineHeight: 1.55, headingTransform: 'none', baseSize: 16 },
      shape: { radius: 0, radiusStyle: 'sharp', borderWidth: 1, borderStyle: 'solid' },
      effects: { shadow: 'sm', glass: { enabled: false, blur: 0, opacity: 100 }, motion: 'subtle', hoverEffect: 'zoom', grain: false },
      layout: {
        containerWidth: 'wide', density: 'spacious', sectionSpacing: 'airy', sectionHeader: 'editorial',
        header: { variant: 'split', presentation: 'bar', sticky: true, blur: false, showSearch: true, showAnnouncementBar: true },
        nav: { desktop: 'topbar', showCategories: true, mobileBottomBar: true, bottomBarStyle: 'bar' },
        footer: { variant: 'columns' }, productGrid: { columns: 3, gap: 'lg' }, banner: { style: 'static' },
      },
      components: { productCard: 'editorial', button: 'outline', buttonShape: 'sharp', cart: 'page', productGalleryLayout: 'sticky-split', badge: 'outline' },
      pages: { home: home('split', { value: false, cat: 'mosaic', slider: 'wide', promo: false, best: 'editorial', news: 'grid', about: 'split', viewAllVariant: 'link', cta: 'View the Collection' }), products: { layout: 'grid', filters: 'topbar' }, orders: { style: 'table' } },
    }),

  /* ── Noir — dark luxe, gold accent, spacious ───────────────────────── */
  tpl('noir', 'Noir', 'Dark and luxurious — candlelit gold on near-black.', 'Jewelry & Luxury',
    '#d4af37', 'dark', {
      typography: { headingFont: 'Cormorant Garamond', bodyFont: 'Nunito Sans', headingWeight: 600, bodyWeight: 400, scaleRatio: 1.42, letterSpacing: 0.02, lineHeight: 1.7, headingTransform: 'none', baseSize: 16 },
      shape: { radius: 6, radiusStyle: 'soft', borderWidth: 1, borderStyle: 'solid' },
      effects: { shadow: 'dramatic', shadowColor: '42 65% 45%', glass: { enabled: true, blur: 16, opacity: 55 }, motion: 'subtle', hoverEffect: 'glow', grain: true },
      layout: {
        containerWidth: 'wide', density: 'spacious', sectionSpacing: 'airy', sectionHeader: 'editorial',
        header: { variant: 'centered', presentation: 'minimal', sticky: true, blur: true, showSearch: true, showAnnouncementBar: true },
        nav: { desktop: 'topbar', showCategories: true, mobileBottomBar: true, bottomBarStyle: 'floating' },
        footer: { variant: 'columns' }, productGrid: { columns: 3, gap: 'lg' }, banner: { style: 'static' },
      },
      components: { productCard: 'editorial', button: 'outline', buttonShape: 'inherit', cart: 'drawer', productGalleryLayout: 'sticky-split', badge: 'outline' },
      pages: { home: home('full', { showLogo: false, value: 'cards', cat: 'mosaic', slider: 'centered', promo: 'gradient', best: 'editorial', news: 'masonry', about: 'centered', viewAllVariant: 'link', cta: 'Discover the Collection' }), products: { layout: 'grid', filters: 'topbar' }, orders: { style: 'cards' } },
    }),

  /* ── Pulse — neon night-tech, electric on charcoal ─────────────────── */
  tpl('pulse', 'Pulse', 'Electric night-tech — glowing accents on charcoal, expressive motion.', 'Streetwear & Tech',
    '#ec1e79', 'dark', {
      typography: { headingFont: 'Space Grotesk', bodyFont: 'Space Grotesk', headingWeight: 700, bodyWeight: 400, scaleRatio: 1.28, letterSpacing: 0, lineHeight: 1.6, headingTransform: 'none', baseSize: 16 },
      shape: { radius: 14, radiusStyle: 'pill', borderWidth: 1, borderStyle: 'solid' },
      effects: { shadow: 'dramatic', shadowColor: '326 85% 55%', glass: { enabled: true, blur: 14, opacity: 55 }, motion: 'expressive', hoverEffect: 'glow', grain: true },
      layout: {
        containerWidth: 'wide', density: 'cozy', sectionSpacing: 'normal', sectionHeader: 'left',
        header: { variant: 'split', presentation: 'floating', sticky: true, blur: true, showSearch: true, showAnnouncementBar: true },
        nav: { desktop: 'topbar', showCategories: true, mobileBottomBar: true, bottomBarStyle: 'floating' },
        footer: { variant: 'minimal' }, productGrid: { columns: 4, gap: 'sm' }, banner: { style: 'gradient' },
      },
      components: { productCard: 'overlay', button: 'gradient', buttonShape: 'pill', cart: 'drawer', productGalleryLayout: 'sticky-split', badge: 'solid' },
      pages: { home: home('gradient', { showLogo: false, value: 'row', cat: 'pills', slider: 'centered', promo: 'gradient', best: 'grid', news: 'grid', viewAllVariant: 'banner', cta: 'Shop the Drop' }), products: { layout: 'grid', filters: 'drawer' }, orders: { style: 'table' } },
    },
    { enabled: true, from: '326 90% 58%', to: '190 95% 55%', angle: 120 }),

  /* ── Fresh — calm, auto light/dark, teal accent ────────────────────── */
  tpl('fresh', 'Fresh', 'Calm and airy — follows the visitor’s light/dark preference.', 'Wellness & Everyday',
    '#0f9d8f', 'auto', {
      typography: { headingFont: 'Manrope', bodyFont: 'Inter', headingWeight: 700, bodyWeight: 400, scaleRatio: 1.27, letterSpacing: -0.01, lineHeight: 1.65, headingTransform: 'none', baseSize: 16 },
      shape: { radius: 12, radiusStyle: 'soft', borderWidth: 1, borderStyle: 'solid' },
      effects: { shadow: 'sm', glass: { enabled: true, blur: 10, opacity: 70 }, motion: 'subtle', hoverEffect: 'lift', grain: false },
      layout: {
        containerWidth: 'standard', density: 'comfortable', sectionSpacing: 'normal', sectionHeader: 'centered',
        header: { variant: 'minimal', presentation: 'floating', sticky: true, blur: true, showSearch: true, showAnnouncementBar: true },
        nav: { desktop: 'topbar', showCategories: true, mobileBottomBar: true, bottomBarStyle: 'floating' },
        footer: { variant: 'rich' }, productGrid: { columns: 4, gap: 'md' }, banner: { style: 'marquee' },
      },
      components: { productCard: 'polaroid', button: 'soft', buttonShape: 'inherit', cart: 'drawer', productGalleryLayout: 'left', badge: 'soft' },
      pages: { home: home('banner', { value: 'cards', cat: 'tiles', slider: 'peek', promo: 'outline', best: 'grid', news: 'grid', cta: 'Shop Now' }), products: { layout: 'grid', filters: 'sidebar' }, orders: { style: 'cards' } },
    }),
];

export const getTemplate = (id: string): StorefrontTemplate | undefined => TEMPLATES.find((t) => t.id === id);
