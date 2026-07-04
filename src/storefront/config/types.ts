// Storefront Studio — config schema (single source of truth).
// See docs/STOREFRONT_STUDIO.md. Stored in design_settings.settings (jsonb) as a
// versioned StorefrontConfig; legacy flat DesignSettings is upgraded on read by
// normalizeConfig().

export const STOREFRONT_CONFIG_VERSION = 2 as const;

// ─── Colors ──────────────────────────────────────────────────────────────────
// All values are CSS HSL triplets WITHOUT the hsl() wrapper, e.g. "240 6% 10%".
export type ColorToken =
  | 'background' | 'foreground'
  | 'card' | 'card-foreground'
  | 'popover' | 'popover-foreground'
  | 'primary' | 'primary-foreground'
  | 'secondary' | 'secondary-foreground'
  | 'accent' | 'accent-foreground'
  | 'muted' | 'muted-foreground'
  | 'destructive' | 'destructive-foreground'
  | 'warning' | 'warning-foreground'
  | 'info' | 'info-foreground'
  | 'border' | 'input' | 'ring';

export type ColorTokens = Record<ColorToken, string>;

export interface GradientConfig {
  enabled: boolean;
  from: string;   // HSL triplet
  to: string;     // HSL triplet
  angle: number;  // degrees
}

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto';
  paletteId: string | null;
  tokens: ColorTokens;
  /** Overrides applied only when the resolved mode is dark. */
  darkTokens?: Partial<ColorTokens>;
  gradient?: GradientConfig;
}

// ─── Typography ──────────────────────────────────────────────────────────────
export interface TypographyConfig {
  headingFont: string;
  bodyFont: string;
  baseSize: number;       // px
  scaleRatio: number;     // modular scale ratio (e.g. 1.25)
  headingWeight: number;  // 400–900
  bodyWeight: number;     // 300–600
  headingTransform: 'none' | 'uppercase' | 'capitalize';
  letterSpacing: number;  // em (applied to headings)
  lineHeight: number;     // body line-height (unitless)
}

// ─── Shape ───────────────────────────────────────────────────────────────────
export interface ShapeConfig {
  radius: number;         // base px; scale derived from this
  radiusStyle: 'sharp' | 'soft' | 'round' | 'pill';
  borderWidth: number;    // px
  borderStyle: 'solid' | 'none';
}

// ─── Effects ─────────────────────────────────────────────────────────────────
export interface BackgroundConfig {
  type: 'solid' | 'gradient' | 'image' | 'pattern';
  color?: string;         // HSL triplet (solid)
  gradient?: GradientConfig;
  imageUrl?: string;
  patternId?: string;
  overlay?: number;       // 0–100, darken overlay strength
  blur?: number;          // px
  brightness?: number;    // %
  contrast?: number;      // %
  saturation?: number;    // %
  hue?: number;           // deg
}

export interface GlassConfig {
  enabled: boolean;
  blur: number;     // px
  opacity: number;  // 0–100 (surface opacity behind the blur)
}

export type MotionLevel = 'none' | 'subtle' | 'standard' | 'expressive';
export type ShadowLevel = 'none' | 'sm' | 'md' | 'lg' | 'dramatic';
export type HoverEffect = 'none' | 'lift' | 'zoom' | 'glow' | 'tilt';

export interface EffectsConfig {
  shadow: ShadowLevel;
  shadowColor?: string;     // HSL triplet (tinted shadows); omit for neutral
  glass: GlassConfig;
  motion: MotionLevel;
  scrollReveal: boolean;
  hoverEffect: HoverEffect;
  grain: boolean;
  background: BackgroundConfig;
  /** Optional hero-specific media that overrides the page background in the hero. */
  hero?: { mediaUrl?: string; mediaType?: 'image' | 'video'; blob?: boolean };
}

// ─── Layout ──────────────────────────────────────────────────────────────────
export interface HeaderConfig {
  variant: 'minimal' | 'centered' | 'split' | 'classic';
  /** Hide the navbar entirely (the mobile bottom bar / sidebar still navigate). */
  hidden?: boolean;
  /** How the bar itself presents: full-width bar, detached floating pill, or
      chromeless minimal — independent of the content `variant`. */
  presentation?: 'bar' | 'floating' | 'minimal';
  sticky: boolean;
  transparentOnHero: boolean;
  blur: boolean;
  showSearch: boolean;
  showAnnouncementBar: boolean;
}

export interface NavConfig {
  desktop: 'topbar' | 'sidebar';
  showCategories: boolean;
  mobileBottomBar: boolean;
  bottomBarStyle: 'bar' | 'floating' | 'minimal';
}

export interface LayoutConfig {
  containerWidth: 'compact' | 'standard' | 'wide' | 'full';
  density: 'comfortable' | 'cozy' | 'spacious';
  sectionSpacing: 'tight' | 'normal' | 'airy';
  /** How section titles render: icon-centered, eyebrow-left, or editorial rule. */
  sectionHeader?: 'centered' | 'left' | 'editorial';
  header: HeaderConfig;
  nav: NavConfig;
  footer: { variant: 'rich' | 'columns' | 'minimal' | 'hidden' };
  productGrid: { columns: 2 | 3 | 4 | 5; gap: 'sm' | 'md' | 'lg' };
  banner: { style: 'marquee' | 'static' | 'gradient' };
}

export type HeroVariant = 'banner' | 'compact' | 'full' | 'split' | 'minimal' | 'gradient';

// ─── Component variants ──────────────────────────────────────────────────────
export interface ComponentVariants {
  productCard: 'classic' | 'overlay' | 'minimal' | 'editorial' | 'compact' | 'polaroid' | 'frame' | 'caption-hover' | 'ticket';
  button: 'solid' | 'outline' | 'soft' | 'gradient';
  buttonShape: 'inherit' | 'pill' | 'sharp';
  cart: 'drawer' | 'modal' | 'page';
  productGalleryLayout: 'left' | 'top' | 'sticky-split' | 'full-bleed';
  badge: 'solid' | 'soft' | 'outline';
}

// ─── Pages (block composition) ───────────────────────────────────────────────
export interface SectionInstance {
  id: string;            // stable id for reorder
  type: string;          // key into the block registry
  enabled: boolean;
  props: Record<string, any>;
}

export interface PagesConfig {
  home: SectionInstance[];
  products: { layout: 'grid' | 'list'; filters: 'sidebar' | 'drawer' | 'topbar' };
  productDetail: SectionInstance[];
  orders: { style: 'cards' | 'table' };
}

// ─── Root ────────────────────────────────────────────────────────────────────
export interface StorefrontConfig {
  version: typeof STOREFRONT_CONFIG_VERSION;
  templateId: string | null;
  /** Last applied structural layout preset (independent of colors/style). */
  layoutId?: string | null;
  theme: ThemeConfig;
  typography: TypographyConfig;
  shape: ShapeConfig;
  effects: EffectsConfig;
  layout: LayoutConfig;
  components: ComponentVariants;
  pages: PagesConfig;
}

/** A named, ready-to-apply full config (a template). */
export interface StorefrontTemplate {
  id: string;
  name: string;
  description: string;
  businessType?: string;
  config: StorefrontConfig;
}
