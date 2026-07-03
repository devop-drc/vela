// Block registry — maps a section `type` to its component + editor metadata +
// default props. Adding a new homepage/detail block = register it here; the
// SectionRenderer and the page builder both read from this map.

import { ComponentType } from 'react';
import { LayoutTemplate, Megaphone, Grid3x3, Crown, Sparkles, Gift, MousePointerClick, Images, Tag, SlidersHorizontal, ShoppingCart, AlignLeft, ListChecks, LayoutGrid, BadgeCheck, Type, Flame, Star, type LucideIcon } from 'lucide-react';
import { HeroBlock } from './HeroBlock';
import { AnnouncementMarqueeBlock } from './AnnouncementMarqueeBlock';
import { CategoryGridBlock } from './CategoryGridBlock';
import { ProductSectionBlock } from './ProductSectionBlock';
import { ViewAllCtaBlock } from './ViewAllCtaBlock';
import {
  GalleryBlock, ProductInfoBlock, DescriptionBlock, VariantSelectorBlock,
  AddToCartBlock, SpecificationsBlock, RelatedProductsBlock, ReviewsBlock,
} from './detail/detailBlocks';
import { ValuePropsBlock, RichTextBlock, PromoBannerBlock } from './ContentBlocks';

export interface BlockVariantOption {
  value: string;
  label: string;
}

/** Editable prop metadata so the Studio can render prop editors generically. */
export interface BlockPropDef {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'toggle';
  placeholder?: string;
  min?: number;
  max?: number;
}

export interface BlockDef {
  component: ComponentType<{ props: Record<string, any> }>;
  label: string;
  icon: LucideIcon;
  /** Merged under instance.props by the renderer. */
  defaultProps?: Record<string, any>;
  /** Where this block can be added in the page builder. */
  scope: 'home' | 'productDetail' | 'both';
  /** Which prop selects the layout variant (usually 'variant'). */
  variantProp?: string;
  /** Layout styles offered by the Studio variant picker. */
  variants?: BlockVariantOption[];
  /** Additional editable props (title, limit, CTA label…). */
  editableProps?: BlockPropDef[];
}

export const BLOCK_REGISTRY: Record<string, BlockDef> = {
  hero: {
    component: HeroBlock, label: 'Hero', icon: LayoutTemplate, scope: 'home',
    defaultProps: { variant: 'banner', showLogo: true, ctaLabel: 'Shop Now' },
    variantProp: 'variant',
    variants: [
      { value: 'banner', label: 'Banner' },
      { value: 'slideshow', label: 'Product slideshow' },
      { value: 'full', label: 'Full-screen' },
      { value: 'split', label: 'Image split' },
      { value: 'collage', label: 'Photo collage' },
      { value: 'editorial', label: 'Editorial type' },
      { value: 'minimal', label: 'Minimal' },
      { value: 'compact', label: 'Compact' },
      { value: 'gradient', label: 'Gradient' },
    ],
    editableProps: [
      { key: 'ctaLabel', label: 'Button label', kind: 'text', placeholder: 'Shop Now' },
      { key: 'showLogo', label: 'Show logo', kind: 'toggle' },
      { key: 'slideshowImages', label: 'Slideshow images (URLs, comma-separated — empty = product photos)', kind: 'text', placeholder: 'https://… , https://…' },
      { key: 'slideInterval', label: 'Slide seconds', kind: 'number', min: 3, max: 15 },
    ],
  },
  announcementMarquee: {
    component: AnnouncementMarqueeBlock, label: 'Announcement bar', icon: Megaphone, scope: 'home',
    variantProp: 'variant',
    variants: [
      { value: 'marquee', label: 'Marquee' },
      { value: 'static', label: 'Static bar' },
      { value: 'gradient', label: 'Gradient' },
      { value: 'stacked', label: 'Stacked pills' },
    ],
  },
  categoryGrid: {
    component: CategoryGridBlock, label: 'Category grid', icon: Grid3x3, scope: 'home',
    defaultProps: { title: 'Shop by Category', variant: 'tiles' },
    variantProp: 'variant',
    variants: [
      { value: 'tiles', label: 'Icon tiles' },
      { value: 'pills', label: 'Pills' },
      { value: 'mosaic', label: 'Photo mosaic' },
    ],
    editableProps: [{ key: 'title', label: 'Title', kind: 'text' }],
  },
  bestSellers: {
    component: ProductSectionBlock, label: 'Best sellers', icon: Crown, scope: 'home',
    defaultProps: { source: 'bestSellers', title: 'Best Sellers', display: 'carousel' },
    variantProp: 'display',
    variants: [
      { value: 'carousel', label: 'Carousel' },
      { value: 'grid', label: 'Grid' },
      { value: 'masonry', label: 'Masonry' },
      { value: 'editorial', label: 'Editorial rows' },
    ],
    editableProps: [
      { key: 'title', label: 'Title', kind: 'text' },
      { key: 'limit', label: 'Max items', kind: 'number', min: 2, max: 24 },
    ],
  },
  newArrivals: {
    component: ProductSectionBlock, label: 'New arrivals', icon: Sparkles, scope: 'home',
    defaultProps: { source: 'newArrivals', title: 'New Arrivals', display: 'carousel', limit: 10 },
    variantProp: 'display',
    variants: [
      { value: 'carousel', label: 'Carousel' },
      { value: 'grid', label: 'Grid' },
      { value: 'masonry', label: 'Masonry' },
      { value: 'editorial', label: 'Editorial rows' },
    ],
    editableProps: [
      { key: 'title', label: 'Title', kind: 'text' },
      { key: 'limit', label: 'Max items', kind: 'number', min: 2, max: 24 },
    ],
  },
  recommended: {
    component: ProductSectionBlock, label: 'Recommended', icon: Gift, scope: 'home',
    defaultProps: { source: 'recommended', title: 'Recommended For You', display: 'carousel' },
    variantProp: 'display',
    variants: [
      { value: 'carousel', label: 'Carousel' },
      { value: 'grid', label: 'Grid' },
      { value: 'masonry', label: 'Masonry' },
      { value: 'editorial', label: 'Editorial rows' },
    ],
    editableProps: [
      { key: 'title', label: 'Title', kind: 'text' },
      { key: 'limit', label: 'Max items', kind: 'number', min: 2, max: 24 },
    ],
  },
  viewAllCta: {
    component: ViewAllCtaBlock, label: 'View-all button', icon: MousePointerClick, scope: 'home',
    defaultProps: { label: 'View All Products', variant: 'button' },
    variantProp: 'variant',
    variants: [
      { value: 'button', label: 'Button' },
      { value: 'banner', label: 'Gradient banner' },
      { value: 'link', label: 'Text link' },
    ],
    editableProps: [{ key: 'label', label: 'Button label', kind: 'text' }],
  },
  valueProps: {
    component: ValuePropsBlock, label: 'Value props', icon: BadgeCheck, scope: 'home',
    defaultProps: { variant: 'row' },
    variantProp: 'variant',
    variants: [
      { value: 'row', label: 'Slim strip' },
      { value: 'cards', label: 'Cards' },
    ],
  },
  richText: {
    component: RichTextBlock, label: 'Text section', icon: Type, scope: 'home',
    defaultProps: { variant: 'centered' },
    variantProp: 'variant',
    variants: [
      { value: 'centered', label: 'Centered' },
      { value: 'split', label: 'Title + body split' },
    ],
    editableProps: [
      { key: 'title', label: 'Title', kind: 'text' },
      { key: 'body', label: 'Body', kind: 'text' },
    ],
  },
  promoBanner: {
    component: PromoBannerBlock, label: 'Promo banner', icon: Flame, scope: 'home',
    defaultProps: { variant: 'gradient' },
    variantProp: 'variant',
    variants: [
      { value: 'gradient', label: 'Gradient' },
      { value: 'outline', label: 'Outlined' },
    ],
    editableProps: [
      { key: 'heading', label: 'Heading', kind: 'text' },
      { key: 'text', label: 'Text', kind: 'text' },
      { key: 'ctaLabel', label: 'Button label', kind: 'text' },
    ],
  },

  /* ── Product-detail blocks (composed by ProductDetailPage) ─────────── */
  gallery: {
    component: GalleryBlock, label: 'Media gallery', icon: Images, scope: 'productDetail',
    defaultProps: { variant: 'carousel' },
    variantProp: 'variant',
    variants: [
      { value: 'carousel', label: 'Carousel' },
      { value: 'grid', label: 'Media grid' },
    ],
  },
  productInfo: { component: ProductInfoBlock, label: 'Name & price', icon: Tag, scope: 'productDetail' },
  description: { component: DescriptionBlock, label: 'Description', icon: AlignLeft, scope: 'productDetail' },
  variantSelector: { component: VariantSelectorBlock, label: 'Options (size/color)', icon: SlidersHorizontal, scope: 'productDetail' },
  addToCart: { component: AddToCartBlock, label: 'Add to cart', icon: ShoppingCart, scope: 'productDetail' },
  specifications: { component: SpecificationsBlock, label: 'Specifications', icon: ListChecks, scope: 'productDetail' },
  reviews: {
    component: ReviewsBlock, label: 'Reviews', icon: Star, scope: 'productDetail',
    defaultProps: { title: 'Reviews' },
    editableProps: [{ key: 'title', label: 'Title', kind: 'text' }],
  },
  relatedProducts: {
    component: RelatedProductsBlock, label: 'Related products', icon: LayoutGrid, scope: 'productDetail',
    defaultProps: { title: 'You may also like' },
    editableProps: [{ key: 'title', label: 'Title', kind: 'text' }],
  },
};

/** Detail blocks that live in the info column beside the gallery (the rest
    render full-width below the two-column area). */
export const DETAIL_INFO_COLUMN_TYPES = new Set(['productInfo', 'description', 'variantSelector', 'addToCart', 'specifications']);

export const getBlockDef = (type: string): BlockDef | undefined => BLOCK_REGISTRY[type];
