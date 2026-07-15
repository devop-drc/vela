# Storefront Design System — spec & build plan

Goal: a **premium, fully token-driven** storefront where **every Storefront Studio control does something real**, built from a clean design system: tokens → CSS layer → modular sections/components/elements (each with multiple styles) → wired to the Studio → templates as presets.

Companion: `docs/OVERHAUL_STOREFRONT_STUDIO.md` has the control-by-control gap analysis; this doc is the build system + roadmap.

---

## 1. The token layer — `src/storefront/config/`
`StorefrontConfig` (`types.ts`) → `buildTokens()` (`tokens.ts`) → CSS vars + `data-*` attrs + classes on `.sf-root` (applied by `StorefrontThemeProvider`). This is solid; the rule is **every config field must emit a token AND be consumed**.

**Token groups (all emitted today):**
- Colors: the 23 `--<token>` HSL triplets (+ dark overrides), `--sf-shadow-color`, gradient.
- Type: `--font-sans/-heading`, `--sf-weight-*`, `--sf-tracking`, `--sf-leading`, `--sf-heading-transform`, `--sf-text-xs…5xl` (modular scale from baseSize×ratio).
- Shape: `--radius`,`-sm/-md/-lg/-xl/-full`, `--sf-border-width`, `data-radius`.
- Effects: `--shadow-card/-hover`, `--sf-glass-blur/-alpha`, `data-motion`, `data-hover`, `glass/grain/reveal` classes.
- Layout: `--sf-container-max`, `--sf-density`, `--sf-section-space`, `--sf-grid-gap`, `--sf-grid-cols`, `--sf-card-pad`, `--sf-gap`, `data-density/-header/-nav`.

## 2. The CSS design-system layer — `globals.css` (`@layer components`, scoped `.sf-root`)
Turns tokens into appearance. **Every token must be consumed here or in a component.**

**✅ Done this pass:**
- **Type scale live** — `.sf-root` remaps `text-xs…6xl` to `--sf-text-*`, so Base size + Scale ratio now drive ALL storefront text (was dead).
- **Density live** — `--sf-section-space`, `--sf-grid-gap`, `--sf-card-pad`, `--sf-gap` all scale by `--sf-density` (was dead).

**To add (element utility classes — the "different styles for everything"):**
- `.sf-btn` + `[data-btn=solid|outline|soft|gradient]` + `[data-btn-shape=pill|sharp|inherit]` → wire `components.button` + `buttonShape`.
- `.sf-badge` + `[data-badge=solid|soft|outline]` → wire `components.badge` (currently dead).
- `.sf-surface` (card/panel: bg-card, border-width, radius, shadow, glass-aware), `.sf-input`, `.sf-chip`, `.sf-divider`, `.sf-eyebrow`, `.sf-section` (padding = section-space), `.sf-pad` (= card-pad), `.sf-gap-x/y` (= gap).
- Radius differentiation: make `soft` vs `round` (and `data-radius`) produce visibly different scales.
- Grid: consume `--sf-grid-cols` at every breakpoint (ProductsPage/product sections) — kill the 2≡3 alias.

## 3. Sections — `src/storefront/blocks/` (registry-driven `pages.home` + `pages.productDetail`)
Each section = a **blank, config-driven container** composed of elements, with a `variant` prop and props. Sections read ONLY tokens + element classes (no hardcoded colors/sizes/spacing).
- Home: Hero, ProductSection (carousel/grid), CategoryGrid, Content (rich text / image+text / quote / marquee / stats), Newsletter, Gallery, Testimonials, FAQ, Banner.
- Detail: Gallery, Info, Description, Specs, Related, Reviews.
- **Do:** extract one `SectionRenderer` (dedupe with ProductDetailPage), give each section a `sectionHeader` style, `data-reveal` for motion, `--sf-section-space` padding. Fill the OptionDemo tiles (frame/caption-hover/ticket/navbar/sectionHeader render the generic fallback).

## 4. Components — variant-complete, token-only
- **ProductCard** (9 variants) — remove hardcoded leaks (polaroid `bg-white`✓fixed, promo/rating colors→tokens✓, list-mode override, hero CTA via SfButton). Every variant reads `--sf-card-pad`, radius, shadow, badge style, button style.
- **Header** (variant × presentation), **Footer** (4), **Cart** (drawer/modal/page), **Gallery** (4 layouts — implement real `top` + differentiate), **Buttons/Badges** via §2 classes everywhere (kill raw `buttonVariants`/`Button` bypasses).

## 5. Elements — the atomic layer (all via §2 classes)
Button, Badge, Chip/Tag, Price, Rating, Input, Select, Quantity, Divider, Eyebrow/section-header, Avatar, Icon-tile, Skeleton. One implementation each, variant-driven, used everywhere.

## 6. Wiring map — every Studio control → token → effect
Fix the remaining dead/alias/gated controls from `docs/OVERHAUL_STOREFRONT_STUDIO.md`:
- Dead → live: **type scale ✓**, **density ✓**, **badge** (add `.sf-badge`), buttonShape, sectionSpacing/gap/borderStyle/showCategories/bg-filters (expose + consume).
- Alias → distinct: gallery `top`≡`left`, grid cols `2`≡`3`, corners `soft`≡`round`, navbar blur in minimal.
- Gating: move Orders-page style out from under cart=page.
- Remove dead emissions once consumed elsewhere (or consume `data-header/-nav/-radius`, `--sf-grid-cols`).

## 7. Templates — `templates/index.ts` = presets of the whole system
Rebuild 3 showcase templates end-to-end exercising every now-working control (distinct base size/scale, density, badge, button shape, spacing, border, bg filters): **editorial/minimal**, **premium/lux** (glass + tinted shadow + serif), **vibrant/retail** (gradient buttons + marquee). Audit the other 5 against the completed control set.

---

## Build order (each step shippable + verifiable in the Studio preview)
1. **§2 element classes** (`.sf-btn/.sf-badge/.sf-surface/.sf-section/.sf-eyebrow/.sf-chip`) + radius/grid wiring. ← next
2. Route all components/sections through those classes (kill hardcoded leaks + raw button/badge).
3. Expose the read-but-hidden Studio controls; fix alias/gated controls.
4. Fill OptionDemo tiles; dedupe SectionRenderer.
5. Rebuild the 3 showcase templates; audit the rest.
6. Verify each in the live Studio preview (desktop + mobile, light + dark).

**Status:** token layer complete; CSS layer — type scale + density now live (this pass). Next: the `.sf-*` element class system + radius/grid wiring, then route components through it.
