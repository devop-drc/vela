# Storefront Studio — Custom Storefront & Design System

> **Status:** Strategy / Design spec (pre-implementation)
> **Scope:** Complete rebuild of the custom storefront (`/shop/:shopSlug`) and its design-settings editor.
> **Out of scope:** The Instagram-style storefront (`/instagramShop/:shopSlug`) is a separate, fixed-design experience and is **not** touched by this work.

---

## 1. Goal

Turn the custom storefront from a single hardcoded layout with shallow theming into a **fully composable design system** — "Storefront Studio" — where a merchant can:

1. Pick from **thorough, premade templates** (each with a small rendered preview) that style *every* surface: homepage, products page, product detail, cart, checkout, orders list, navigation, header, footer.
2. Select / fine-tune a **color scheme** (palettes + per-token + light/dark + gradients).
3. Control **every** visual dimension: typography, corner radius, shadows/elevation, glassmorphism/blur, animations & motion, spacing/density, container width, backgrounds, borders, button styles.
4. Choose **structural options**: header variant, sidebar on/off, bottom bar on/off, footer variant, cart presentation.
5. **Compose pages from blocks** — add, remove, reorder, and configure sections per page (a lightweight page builder).

The result is a single source of truth — a versioned `StorefrontConfig` object — that drives a registry of interchangeable **blocks** and **component variants**.

---

## 2. Core architecture (three pillars)

```
                    ┌─────────────────────────────┐
                    │   StorefrontConfig (JSON)    │   ← single source of truth
                    │  theme · type · shape · fx · │     (versioned, normalized)
                    │  layout · components · pages │
                    └──────────────┬──────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
┌──────────────────┐   ┌────────────────────────┐   ┌──────────────────────┐
│  Token Engine    │   │   Block Registry       │   │   Editor (Studio)    │
│  config → ~90    │   │  versioned components   │   │  controls write to   │
│  CSS variables   │   │  rendered by config     │   │  config; live preview│
│  scoped to root  │   │  (SectionRenderer)      │   │  via iframe + tokens │
└──────────────────┘   └────────────────────────┘   └──────────────────────┘
```

1. **Config** — the data. One normalized, versioned object per shop.
2. **Token Engine** — converts the config's design decisions into CSS custom properties applied to a scoped storefront root, plus a few class/data-attribute switches (motion, density, glass).
3. **Block Registry + Variants** — the rendering. Every section and every reusable component is registered by key and selected by config; pages are arrays of blocks.
4. **Editor (Studio)** — the UI that mutates config and previews it.

---

## 3. Data model & storage

### 3.1 Where it lives
Keep the **existing `design_settings` table** (`user_id` PK, `settings jsonb`). **No migration required** — the new config is just a richer JSON shape stored in the same column, served by the same `get-public-shop-data` edge function. RLS, the new-user trigger, and the save path are unchanged.

### 3.2 Versioned, normalized shape
We introduce a typed `StorefrontConfig` (TypeScript) with a `version` field. A pure `normalizeConfig(raw)` function reads **either** the old flat `DesignSettings` **or** a new `StorefrontConfig` and always returns a canonical, fully-populated config. This guarantees:
- Existing shops keep working (old flat settings are upgraded on read).
- Any missing field is filled from defaults (forward/backward safe).
- The renderer never has to null-check.

```ts
interface StorefrontConfig {
  version: 2;                       // bump on breaking shape changes
  templateId: string | null;        // last applied template (for "based on…")

  theme: ThemeConfig;               // colors / palette / dark mode
  typography: TypographyConfig;     // fonts, scale, weights, spacing
  shape: ShapeConfig;               // radii, border widths
  effects: EffectsConfig;           // shadows, glass, motion, backgrounds
  layout: LayoutConfig;             // container, density, header/nav/footer
  components: ComponentVariants;    // which variant of each reusable component
  pages: PagesConfig;               // section composition per page
}
```

#### ThemeConfig
```ts
interface ThemeConfig {
  mode: 'light' | 'dark' | 'auto';
  paletteId: string | null;                 // named palette starting point
  tokens: Record<ColorToken, string>;       // HSL triplets, all shadcn tokens
  darkTokens?: Partial<Record<ColorToken, string>>; // overrides in dark mode
  gradient?: { enabled: boolean; from: string; to: string; angle: number };
  // ColorToken = background, foreground, card, primary, secondary, accent,
  // muted, border, input, ring, destructive, warning, info, + *-foreground
}
```

#### TypographyConfig
```ts
interface TypographyConfig {
  headingFont: string;            // Google font family
  bodyFont: string;
  baseSize: number;               // px, drives a modular scale
  scaleRatio: number;             // 1.2 / 1.25 / 1.333…
  headingWeight: number;          // 500–900
  bodyWeight: number;
  headingTransform: 'none' | 'uppercase' | 'capitalize';
  letterSpacing: number;          // em, for headings
  lineHeight: number;
}
```

#### ShapeConfig
```ts
interface ShapeConfig {
  radius: number;                 // base px → derives sm/md/lg/xl/full
  radiusStyle: 'sharp' | 'soft' | 'round' | 'pill';
  borderWidth: number;            // px
  borderStyle: 'solid' | 'none';
}
```

#### EffectsConfig
```ts
interface EffectsConfig {
  shadow: 'none' | 'sm' | 'md' | 'lg' | 'dramatic';
  shadowColor?: string;           // tinted shadows
  glass: { enabled: boolean; blur: number; opacity: number };  // glassmorphism
  motion: 'none' | 'subtle' | 'standard' | 'expressive';       // animation intensity
  scrollReveal: boolean;          // sections fade/slide in on scroll
  hoverEffect: 'none' | 'lift' | 'zoom' | 'glow' | 'tilt';     // product cards
  grain: boolean;                 // film-grain/noise overlay
  background: BackgroundConfig;    // page background (solid/gradient/image/pattern)
}

interface BackgroundConfig {
  type: 'solid' | 'gradient' | 'image' | 'pattern';
  color?: string; gradient?: {...}; imageUrl?: string; patternId?: string;
  overlay?: number;               // darken/lighten
  blur?: number; brightness?: number; contrast?: number; saturation?: number;
}
```

#### LayoutConfig
```ts
interface LayoutConfig {
  containerWidth: 'compact' | 'standard' | 'wide' | 'full';
  density: 'comfortable' | 'cozy' | 'spacious';   // spacing scale multiplier
  sectionSpacing: 'tight' | 'normal' | 'airy';

  header: {
    variant: 'minimal' | 'centered' | 'split' | 'classic';
    sticky: boolean; transparentOnHero: boolean; blur: boolean;
    showSearch: boolean; showAnnouncementBar: boolean;
  };
  nav: {
    desktop: 'topbar' | 'sidebar';        // primary navigation surface
    showCategories: boolean;
    mobileBottomBar: boolean;             // app-like bottom nav on mobile
  };
  footer: { variant: 'rich' | 'columns' | 'minimal' | 'hidden'; };
  productGrid: { columns: 2 | 3 | 4 | 5; gap: 'sm' | 'md' | 'lg'; };
}
```

#### ComponentVariants
```ts
interface ComponentVariants {
  productCard: 'classic' | 'overlay' | 'minimal' | 'editorial' | 'compact' | 'polaroid';
  button: 'solid' | 'outline' | 'soft' | 'gradient';
  buttonShape: 'inherit' | 'pill' | 'sharp';
  cart: 'drawer' | 'modal' | 'page';
  productGalleryLayout: 'left' | 'top' | 'sticky-split' | 'full-bleed';
  badge: 'solid' | 'soft' | 'outline';
}
```

#### PagesConfig (the page builder)
Each page is an **ordered array of section instances**. A section instance = `{ id, type, enabled, props }`. `type` keys into the Block Registry.

```ts
interface PagesConfig {
  home: SectionInstance[];     // hero, marquee, categories, bestSellers, newArrivals,
                               // recommended, featuredCollection, banner, richText,
                               // testimonials, instagramFeed, newsletter, valueProps…
  products: { layout: 'grid' | 'list'; filters: 'sidebar' | 'drawer' | 'topbar'; };
  productDetail: SectionInstance[];   // gallery, info, variants, reviews, related…
  orders: { style: 'cards' | 'table'; };
}

interface SectionInstance {
  id: string;            // stable uuid for reordering
  type: string;          // registry key
  enabled: boolean;
  props: Record<string, any>;   // per-block options (title, source, limit, style…)
}
```

### 3.3 Normalization & migration
- `normalizeConfig(raw)` detects shape: if `raw.version` is absent → treat as legacy flat `DesignSettings` and map fields (`--primary` → `theme.tokens.primary`, `homepageTemplate` → a default `pages.home` section list, `blurEnabled` → `effects.glass.enabled`, etc.). If present → deep-merge over `DEFAULT_CONFIG`.
- The **save path** always writes the new shape. Legacy is only read, never written back in old form.
- `DEFAULT_CONFIG` is the canonical default (one of the templates, e.g. "Studio").

---

## 4. Token Engine

`buildTokens(config) → { cssVars: Record<string,string>, dataAttrs, classNames }`.

Responsibilities:
- Emit **all** shadcn color tokens (`--background`, `--primary`, … `--ring`) as HSL triplets, with dark-mode overrides under a `.dark` scope.
- Derive a **radius scale** from `shape.radius`: `--radius-sm/md/lg/xl/full`.
- Derive a **type scale** from `typography.baseSize` × `scaleRatio`: `--text-xs … --text-5xl`, plus `--font-heading`, `--font-body`, `--tracking`, `--leading`, weights.
- Derive a **spacing scale** from `layout.density` (multiplier on a base unit) and `--container-max` from `containerWidth`.
- Derive **shadow tokens** (`--shadow-card`, `--shadow-hover`, …) from `effects.shadow` + optional tint.
- Glass tokens: `--glass-blur`, `--glass-opacity`.
- Data attributes / classes for non-token switches: `data-motion="standard"`, `data-density="cozy"`, `.glass-enabled`, `.grain-enabled`, `.reveal-enabled`.

**Scoping:** apply to a single `<div data-storefront-root style={cssVars}>` wrapper rather than `document.documentElement`, so the design is isolated (cleaner than today's global mutation, and the editor preview can run multiple themes). Fonts are still loaded via `loadGoogleFont`.

Tailwind config maps utility classes to these variables so existing `bg-card`, `text-primary`, `rounded-lg`, `shadow-card` keep working with the new tokens.

---

## 5. Block & component registries

### 5.1 Block Registry (page sections)
A map `type → { component, label, icon, defaultProps, schema, previewThumb }`. `SectionRenderer` maps a page's `SectionInstance[]` to components, passing `props` + storefront data via context. Editing the page = editing the array.

**Homepage blocks (initial set):**
`hero` · `announcementMarquee` · `categoryGrid` · `bestSellers` · `newArrivals` · `recommended` · `featuredCollection` · `promoBanner` · `richText` · `valueProps` (shipping/returns icons) · `testimonials` · `newsletter` · `instagramGallery` · `productCarousel` · `splitFeature` · `spacer/divider`.

**Product-detail blocks:** `gallery` · `productInfo` · `variantSelector` · `addToCart` · `description` · `specs` · `reviews` · `relatedProducts` · `recentlyViewed`.

Each block reads design from tokens, so it automatically matches the theme.

### 5.2 Component Variant Registry
For reusable pieces with multiple looks (product card, hero, header, cart, footer, button), a map `variantKey → component`. Selected by `config.components` / `config.layout`. Adding a new look = register a variant; no edits to call sites.

---

## 6. Templates

A **template** is a complete, named `StorefrontConfig` (theme + typography + shape + effects + layout + component variants + page composition). Templates are the headline feature: opinionated, cohesive, covering every surface.

### 6.1 Template catalog (initial 8, thorough & distinct)
| Template | Vibe | Key traits |
|---|---|---|
| **Studio** | Clean modern (default) | Neutral palette, soft radius, subtle motion, sidebar nav off, classic cards |
| **Aurora** | Glassmorphic / vibrant | Gradient bg, frosted glass, expressive motion, overlay cards |
| **Editorial** | Magazine / fashion | Serif headings, split hero, alternating feature rows, large type |
| **Brutalist** | Bold / high-contrast | Sharp corners, thick borders, no shadow, mono-ish, uppercase |
| **Boutique** | Elegant luxury | Muted gold/black, serif, generous spacing, minimal cards |
| **Street** | Streetwear / dark | Dark, neon accent, compact dense grid, app-like bottom bar |
| **Organic** | Soft / natural | Warm earthy, round corners, airy spacing, polaroid cards |
| **Tech** | SaaS / electronics | Dark blue, crisp, drama shadow, value-props, sticky split detail |

Each ships: full config, palette, font pair, section composition for **every** page, and a **preview**.

### 6.2 Template previews (small rendered)
Previews use the **same renderer** at reduced scale with **sample data**, not screenshots — so they're always accurate and theme-exact:
- `<TemplatePreview config={template.config} />` renders a `<StorefrontPreviewFrame>` (the token engine + a couple of representative blocks: header + hero + a 2×2 product grid) inside a `transform: scale()` container with `pointer-events:none`.
- Rendered in an `<iframe>` (style isolation) or a token-scoped div. Iframe is preferred for guaranteed isolation; a static fallback thumbnail can be added later for perf.
- Gallery shows a grid of these mini-previews; clicking applies the template's config (with a confirm if the user has unsaved custom tweaks).

---

## 7. The Editor — "Storefront Studio"

Replaces `StorefrontDesigner.tsx`. Two-pane: **controls (left/scroll)** + **sticky live preview (right)**, with a device toggle (desktop/mobile) and "open in new tab". Preview is the real storefront in an iframe at `?preview=1`; we additionally push token changes via `postMessage` for **instant** feedback (no 1.6s reload wait), falling back to reload on structural changes.

### 7.1 Control panels (accordion / tabbed)
1. **Templates** — gallery of rendered previews; "Start from template".
2. **Colors** — palette presets, per-token color pickers, light/dark toggle, gradient builder, contrast checker.
3. **Typography** — heading/body font pickers (categorized), size & scale, weight, transform, letter-spacing, line-height; live specimen.
4. **Shape** — radius slider + style (sharp/soft/round/pill), border width/style.
5. **Shadows & depth** — elevation preset, shadow tint.
6. **Effects & motion** — glassmorphism (toggle + blur/opacity), motion intensity, scroll-reveal, hover effect, grain.
7. **Layout** — container width, density, section spacing, product-grid columns/gap.
8. **Header & navigation** — header variant, sticky/transparent/blur, search, announcement bar, desktop nav (topbar/sidebar), categories in nav, mobile bottom bar.
9. **Footer** — variant.
10. **Components** — product-card variant, button style/shape, cart presentation, product-gallery layout, badge style.
11. **Pages (builder)** — per page: add/remove/reorder/configure blocks (drag handles); products/orders layout switches.
12. **Backgrounds** — solid/gradient/image/pattern + filters/overlay.
13. **Save / Reset / Save as custom template** — plus randomize ("Surprise me").

### 7.2 Editor mechanics
- Controls call `updateConfig(path, value)` (lodash-style deep set) on the `StorefrontStudioContext`, which debounce-saves to `design_settings` (reuse existing 1s debounce) and broadcasts to the preview.
- "Save as template" stores a snapshot into `config` plus an optional user template library (future: a `custom_templates` array inside config, mirroring today's `customThemes`).
- Undo/redo via a config history stack (nice-to-have, phase 5).

---

## 8. Rendering pipeline (runtime)

```
StorefrontLayout (route /shop/:slug)
 └─ StorefrontProvider (fetch shop data + raw config)
     └─ normalizeConfig(raw) → config
        └─ <StorefrontThemeProvider config>   // token engine → scoped CSS vars + classes
            ├─ <StorefrontChrome>             // header/nav/footer/bottombar by config
            └─ <Outlet/>
                ├─ HomePage      → SectionRenderer(config.pages.home)
                ├─ ProductsPage  → grid/list + filters per config
                ├─ ProductDetail → SectionRenderer(config.pages.productDetail)
                ├─ Cart          → variant per config.components.cart
                └─ Orders        → style per config.pages.orders
```

- **Preview mode** (`?preview=1`): same pipeline, but config comes from `postMessage`/parent rather than the network, and interactions (add-to-cart, links) are inert.
- Data (products, best sellers, promotions, marquee, orders) continues to come from `get-public-shop-data` unchanged.

---

## 9. File / module plan

```
src/storefront/                      ← new home for the rebuilt storefront
  config/
    types.ts                         StorefrontConfig + sub-interfaces
    defaults.ts                      DEFAULT_CONFIG + token defaults
    normalize.ts                     normalizeConfig() (legacy → v2)
    tokens.ts                        buildTokens(config)
  templates/
    index.ts                         template catalog
    studio.ts aurora.ts editorial.ts … (one per template)
  theme/
    StorefrontThemeProvider.tsx      applies tokens to scoped root
    StorefrontStudioContext.tsx      editor state + save/preview bridge
  blocks/
    registry.ts                      type → block
    HeroBlock/ (+ variants)  CategoryGridBlock  BestSellersBlock  …
    SectionRenderer.tsx
  components/                        variant components
    productcard/ (classic, overlay, …)
    header/ (minimal, centered, …)
    cart/ (drawer, modal, page)
    footer/  button/  gallery/ …
  pages/
    HomePage.tsx ProductsPage.tsx ProductDetailPage.tsx CartPage.tsx OrdersPage.tsx
  layout/
    StorefrontLayout.tsx StorefrontChrome.tsx
  preview/
    PreviewFrame.tsx TemplatePreview.tsx
src/components/settings/studio/      ← the editor UI (replaces StorefrontDesigner)
  StorefrontStudio.tsx + panels/*
```

The **old** `src/components/storefront/Storefront*.tsx` + `src/pages/Storefront*.tsx` are removed once the new pipeline reaches parity; `App.tsx` routes are repointed. `Instagram*` storefront files are left as-is.

---

## 10. Implementation phases

| Phase | Deliverable | Notes |
|---|---|---|
| **0. Spec** | This document | ✅ |
| **1. Foundation** | `config/` (types, defaults, normalize, tokens) + `StorefrontThemeProvider` | No UI change yet; renders existing pages through new tokens |
| **2. Blocks & chrome** | Block registry, `SectionRenderer`, header/footer/nav/bottombar variants, HomePage from config | Reach homepage parity, then exceed it |
| **3. Pages** | ProductsPage, ProductDetail (gallery variants), Cart variants, Orders | Full storefront on new pipeline; delete old `Storefront*` files |
| **4. Templates** | 8 templates + rendered `TemplatePreview` gallery | The headline feature |
| **5. Studio editor** | New `StorefrontStudio` with all control panels + page builder + live `postMessage` preview | Replaces `StorefrontDesigner` |
| **6. Polish** | Motion system, dark mode, undo/redo, save-as-template, perf (static preview thumbs) | |

Each phase is independently shippable and keeps the storefront working.

---

## 11. Key decisions & rationale

- **Same table, richer JSON, normalized on read** → zero DB migration, zero downtime, existing shops auto-upgrade.
- **Config-driven registries** → adding a block/variant/template never touches call sites; the editor and renderer share one schema.
- **Scoped token root (not `documentElement`)** → isolation, multiple themes on a page (previews), cleaner than current global mutation.
- **Rendered previews via the real renderer** → previews can never drift from reality.
- **Page-builder as ordered arrays** → "every section/block" requirement is satisfied by composition, not by an explosion of boolean flags.
- **Live `postMessage` preview** → removes today's ~1.6s reload lag for instant design feedback.

---

## 12. Risks / open questions

- **Preview performance**: many live iframe mini-previews can be heavy. Mitigation: render previews lazily (on scroll/visible), cap concurrent iframes, add static thumbnail fallback in phase 6.
- **Legacy normalization fidelity**: a handful of old shops have custom per-token colors; `normalizeConfig` must map them faithfully (covered by mapping table + tests).
- **Block prop schemas**: the page builder needs per-block prop editors — start with a small, typed schema per block and grow.
- **Dark mode scope**: storefront dark mode is independent from dashboard theme; ensure the scoped root + `?preview` don't clash with `AppearanceContext`'s global mutation (the Instagram shop already guards this with `data-instagram-shop-theme`; we add `data-storefront-root`).
```
