// Structural layout presets — they define ARRANGEMENT only (header style, nav,
// hero shape, section order, product grid, gallery, footer, spacing). They do
// NOT touch colors, fonts, radius or effects, so a merchant can pick a structure
// and keep their palette. Applied by deep-merging the partial onto the config.

import { StorefrontConfig, SectionInstance } from '../config/types';

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  structure: Partial<StorefrontConfig>;
}

type HeroVariant = 'banner' | 'compact' | 'full' | 'split';
const home = (
  hero: HeroVariant,
  flags: { categories?: boolean; bestSellers?: boolean; recommended?: boolean; newArrivals?: 'carousel' | 'grid'; marquee?: boolean } = {}
): SectionInstance[] => [
  { id: 'hero', type: 'hero', enabled: true, props: { variant: hero, showLogo: true, ctaLabel: 'Shop Now' } },
  { id: 'marquee', type: 'announcementMarquee', enabled: flags.marquee ?? true, props: {} },
  { id: 'categories', type: 'categoryGrid', enabled: flags.categories ?? true, props: { title: 'Shop by Category' } },
  { id: 'bestSellers', type: 'bestSellers', enabled: flags.bestSellers ?? true, props: { source: 'bestSellers', title: 'Best Sellers', display: 'carousel' } },
  { id: 'newArrivals', type: 'newArrivals', enabled: true, props: { source: 'newArrivals', title: 'New Arrivals', display: flags.newArrivals ?? 'carousel', limit: 10 } },
  { id: 'recommended', type: 'recommended', enabled: flags.recommended ?? true, props: { source: 'recommended', title: 'Recommended For You', display: 'carousel' } },
  { id: 'viewAll', type: 'viewAllCta', enabled: true, props: { label: 'View All Products' } },
];

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: 'classic', name: 'Classic',
    description: 'Centered nav, banner hero, full set of product rows.',
    structure: {
      layoutId: 'classic',
      layout: { header: { variant: 'classic' }, nav: { desktop: 'topbar', mobileBottomBar: true, showCategories: true }, footer: { variant: 'rich' }, productGrid: { columns: 4, gap: 'md' }, containerWidth: 'standard', density: 'comfortable', sectionSpacing: 'normal' } as any,
      components: { productCard: 'classic', productGalleryLayout: 'left' } as any,
      pages: { home: home('banner'), products: { layout: 'grid', filters: 'sidebar' }, orders: { style: 'cards' } } as any,
    },
  },
  {
    id: 'minimal', name: 'Minimal',
    description: 'Sparse — compact hero, one large product grid.',
    structure: {
      layoutId: 'minimal',
      layout: { header: { variant: 'minimal' }, nav: { desktop: 'topbar', mobileBottomBar: true, showCategories: false }, footer: { variant: 'minimal' }, productGrid: { columns: 4, gap: 'md' }, containerWidth: 'standard', density: 'cozy', sectionSpacing: 'normal' } as any,
      components: { productCard: 'minimal', productGalleryLayout: 'top' } as any,
      pages: { home: home('compact', { categories: false, bestSellers: false, recommended: false, newArrivals: 'grid', marquee: false }), products: { layout: 'grid', filters: 'topbar' }, orders: { style: 'cards' } } as any,
    },
  },
  {
    id: 'sidebar', name: 'Sidebar',
    description: 'Persistent side navigation; filters in a sidebar.',
    structure: {
      layoutId: 'sidebar',
      layout: { header: { variant: 'split' }, nav: { desktop: 'sidebar', mobileBottomBar: true, showCategories: true }, footer: { variant: 'columns' }, productGrid: { columns: 3, gap: 'md' }, containerWidth: 'wide', density: 'comfortable', sectionSpacing: 'normal' } as any,
      components: { productCard: 'classic', productGalleryLayout: 'left' } as any,
      pages: { home: home('banner', { newArrivals: 'grid' }), products: { layout: 'grid', filters: 'sidebar' }, orders: { style: 'table' } } as any,
    },
  },
  {
    id: 'showcase', name: 'Showcase',
    description: 'Bold full-bleed hero with large featured products.',
    structure: {
      layoutId: 'showcase',
      layout: { header: { variant: 'centered' }, nav: { desktop: 'topbar', mobileBottomBar: true, showCategories: false }, footer: { variant: 'rich' }, productGrid: { columns: 3, gap: 'lg' }, containerWidth: 'wide', density: 'spacious', sectionSpacing: 'airy' } as any,
      components: { productCard: 'overlay', productGalleryLayout: 'sticky-split' } as any,
      pages: { home: home('full', { categories: false, recommended: false }), products: { layout: 'grid', filters: 'drawer' }, orders: { style: 'cards' } } as any,
    },
  },
  {
    id: 'magazine', name: 'Magazine',
    description: 'Editorial split hero and alternating feature rows.',
    structure: {
      layoutId: 'magazine',
      layout: { header: { variant: 'split' }, nav: { desktop: 'topbar', mobileBottomBar: true, showCategories: true }, footer: { variant: 'columns' }, productGrid: { columns: 3, gap: 'lg' }, containerWidth: 'wide', density: 'spacious', sectionSpacing: 'airy' } as any,
      components: { productCard: 'editorial', productGalleryLayout: 'left' } as any,
      pages: { home: home('split', { newArrivals: 'grid' }), products: { layout: 'grid', filters: 'sidebar' }, orders: { style: 'cards' } } as any,
    },
  },
  {
    id: 'compact', name: 'Compact grid',
    description: 'Dense, app-like — minimal hero, tight 5-column grid.',
    structure: {
      layoutId: 'compact',
      layout: { header: { variant: 'minimal' }, nav: { desktop: 'topbar', mobileBottomBar: true, showCategories: true }, footer: { variant: 'minimal' }, productGrid: { columns: 5, gap: 'sm' }, containerWidth: 'wide', density: 'cozy', sectionSpacing: 'tight' } as any,
      components: { productCard: 'compact', productGalleryLayout: 'top' } as any,
      pages: { home: home('compact', { categories: true, bestSellers: false, recommended: false, newArrivals: 'grid', marquee: false }), products: { layout: 'grid', filters: 'topbar' }, orders: { style: 'table' } } as any,
    },
  },
];

export const getLayoutPreset = (id: string) => LAYOUT_PRESETS.find((l) => l.id === id);
