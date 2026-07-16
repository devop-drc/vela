// Canonical default StorefrontConfig (the "Studio" base look) + helpers.
// Every field is populated so the renderer never needs null checks.

import {
  StorefrontConfig,
  ColorTokens,
  SectionInstance,
  STOREFRONT_CONFIG_VERSION,
} from './types';

export const DEFAULT_LIGHT_TOKENS: ColorTokens = {
  background: '0 0% 100%',
  foreground: '240 10% 8%',
  card: '0 0% 100%',
  'card-foreground': '240 10% 8%',
  popover: '0 0% 100%',
  'popover-foreground': '240 10% 8%',
  primary: '240 6% 10%',
  'primary-foreground': '0 0% 98%',
  secondary: '240 5% 96%',
  'secondary-foreground': '240 6% 10%',
  accent: '240 5% 94%',
  'accent-foreground': '240 6% 10%',
  muted: '240 5% 96%',
  'muted-foreground': '240 4% 46%',
  destructive: '0 72% 51%',
  'destructive-foreground': '0 0% 100%',
  warning: '38 92% 50%',
  'warning-foreground': '0 0% 100%',
  info: '210 90% 50%',
  'info-foreground': '0 0% 100%',
  border: '240 6% 90%',
  input: '240 6% 90%',
  ring: '240 6% 10%',
};

export const DEFAULT_DARK_TOKENS: Partial<ColorTokens> = {
  background: '240 10% 6%',
  foreground: '0 0% 96%',
  card: '240 8% 10%',
  'card-foreground': '0 0% 96%',
  popover: '240 8% 10%',
  'popover-foreground': '0 0% 96%',
  primary: '0 0% 98%',
  'primary-foreground': '240 6% 10%',
  secondary: '240 6% 16%',
  'secondary-foreground': '0 0% 96%',
  accent: '240 6% 18%',
  'accent-foreground': '0 0% 96%',
  muted: '240 6% 16%',
  'muted-foreground': '240 5% 65%',
  border: '240 6% 20%',
  input: '240 6% 20%',
  ring: '0 0% 80%',
};

/** A reasonable default homepage composition. Block ids are stable strings. */
export const DEFAULT_HOME_SECTIONS: SectionInstance[] = [
  { id: 'hero', type: 'hero', enabled: true, props: { variant: 'banner', showLogo: true, ctaLabel: 'Shop Now' } },
  { id: 'marquee', type: 'announcementMarquee', enabled: true, props: {} },
  { id: 'categories', type: 'categoryGrid', enabled: true, props: { title: 'Shop by Category' } },
  { id: 'bestSellers', type: 'bestSellers', enabled: true, props: { title: 'Best Sellers', display: 'carousel' } },
  { id: 'newArrivals', type: 'newArrivals', enabled: true, props: { title: 'New Arrivals', display: 'carousel', limit: 10 } },
  { id: 'recommended', type: 'recommended', enabled: true, props: { title: 'Recommended For You', display: 'carousel' } },
  { id: 'viewAll', type: 'viewAllCta', enabled: true, props: { label: 'View All Products' } },
];

export const DEFAULT_PRODUCT_DETAIL_SECTIONS: SectionInstance[] = [
  { id: 'gallery', type: 'gallery', enabled: true, props: { variant: 'carousel' } },
  { id: 'info', type: 'productInfo', enabled: true, props: {} },
  { id: 'description', type: 'description', enabled: true, props: {} },
  { id: 'variants', type: 'variantSelector', enabled: true, props: {} },
  { id: 'addToCart', type: 'addToCart', enabled: true, props: {} },
  { id: 'specifications', type: 'specifications', enabled: true, props: {} },
  // 'reviews' lands with the customer-accounts phase; unknown types are skipped.
  { id: 'reviews', type: 'reviews', enabled: true, props: {} },
  { id: 'related', type: 'relatedProducts', enabled: true, props: { title: 'You may also like' } },
];

export const DEFAULT_CONFIG: StorefrontConfig = {
  version: STOREFRONT_CONFIG_VERSION,
  templateId: 'studio',
  layoutId: 'classic',
  theme: {
    mode: 'light',
    paletteId: 'studio',
    tokens: { ...DEFAULT_LIGHT_TOKENS },
    darkTokens: { ...DEFAULT_DARK_TOKENS },
    gradient: { enabled: false, from: '240 6% 10%', to: '240 6% 30%', angle: 135 },
  },
  typography: {
    headingFont: 'Inter',
    bodyFont: 'Inter',
    baseSize: 16,
    scaleRatio: 1.25,
    headingWeight: 700,
    bodyWeight: 400,
    headingTransform: 'none',
    letterSpacing: 0,
    lineHeight: 1.6,
  },
  shape: {
    radius: 14,
    radiusStyle: 'soft',
    borderWidth: 1,
    borderStyle: 'solid',
  },
  effects: {
    shadow: 'md',
    glass: { enabled: true, blur: 12, opacity: 70 },
    motion: 'standard',
    scrollReveal: true,
    hoverEffect: 'lift',
    grain: false,
    background: {
      type: 'solid',
      color: undefined, // falls back to theme background token
      overlay: 0,
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hue: 0,
      blur: 0,
    },
    hero: { blob: true },
  },
  layout: {
    containerWidth: 'standard',
    density: 'comfortable',
    sectionSpacing: 'normal',
    sectionHeader: 'centered',
    header: {
      variant: 'classic',
      presentation: 'bar',
      sticky: true,
      transparentOnHero: false,
      blur: true,
      showSearch: true,
      showAnnouncementBar: true,
    },
    nav: { desktop: 'topbar', showCategories: true, mobileBottomBar: true, bottomBarStyle: 'bar' },
    footer: { variant: 'rich' },
    productGrid: { columns: 4, gap: 'md' },
    banner: { style: 'marquee' },
  },
  components: {
    productCard: 'classic',
    button: 'solid',
    buttonShape: 'inherit',
    cart: 'drawer',
    productGalleryLayout: 'left',
    badge: 'soft',
  },
  pages: {
    home: DEFAULT_HOME_SECTIONS.map((s) => ({ ...s })),
    products: { layout: 'grid', filters: 'sidebar', filterVisibility: {} },
    productDetail: DEFAULT_PRODUCT_DETAIL_SECTIONS.map((s) => ({ ...s })),
    orders: { style: 'cards' },
  },
};

/** Deep clone so callers can mutate freely (templates, editor drafts). */
export const cloneConfig = (c: StorefrontConfig): StorefrontConfig =>
  (typeof structuredClone === 'function'
    ? structuredClone(c)
    : JSON.parse(JSON.stringify(c)));
