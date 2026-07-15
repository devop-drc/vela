# Storefront Studio & Theming — Deep Overhaul

_Companion to `docs/OVERHAUL_PLAN.md` (§7 Storefront Studio / Customer storefront / Instagram). This doc is the deep, control-by-control map for three specific goals: **(1) make the app theme adapt to the storefront theme**, **(2) make every single Studio option actually work**, and **(3) make sections/components/elements fully modular and controlled by Studio settings**. Built from three dedicated audits of `src/storefront/config/*`, `theme/*`, `blocks/*`, `components/*`, and `components/settings/studio/*`._

Key files: `src/storefront/config/{types,defaults,tokens,normalize}.ts`, `src/storefront/theme/{StorefrontThemeProvider,useStorefrontStudio}.tsx/ts`, `src/hooks/useStorefrontMatchTheme.ts`, `src/storefront/blocks/registry.tsx`, `src/globals.css:285-371`, `src/components/settings/studio/StorefrontStudio.tsx`.

---

## 1. Make the app theme adapt to the storefront ("Match dashboard")

**How it works today.** A `settings.dashboardMatchesStorefront` boolean (sibling of `settings.storefront` in the `design_settings.settings` jsonb) toggles it. `useStorefrontMatchTheme()` reads `design_settings`, subscribes to a `window 'sf-settings-updated'` event (dispatched by the Studio's debounced save and by the toggle), runs `buildTokens(normalizeConfig(raw), prefersDark)`, and copies every var where `k.startsWith('--') && !k.startsWith('--sf-')` into a `style` object + a `dark` class. `DashboardLayout` applies both to its wrapper `<div>` (docked + floating branches). It **works** for the primary purpose — storefront color tokens + a dark toggle propagate live to the admin shell.

**Fixes to make it correct & premium:**
- **[High] Stop leaking fonts.** The filter `!k.startsWith('--sf-')` also copies `--font-sans`/`--font-heading`, so the storefront's fonts override the admin's Clash Display/Inter — contradicting the hook's own "colors + radius only" comment. Explicitly whitelist which vars cross over (the 23 color tokens + `--radius*`), or blacklist `--font-*`.
- **[High] Broken shadow tint.** `buildTokens` emits `--shadow-card`/`--shadow-hover` that reference `var(--sf-shadow-color)` — but `--sf-shadow-color` is `--sf-`-prefixed and stripped by the filter, so the copied shadows resolve to an undefined color on the dashboard. Either also copy `--sf-shadow-color` (renamed to a non-`--sf-` alias) or don't copy the shadow vars at all.
- **[Med] Radius unit mismatch.** Dashboard `:root` uses `--radius: 1.5rem`; the storefront emits `--radius: 14px`. Tailwind's `calc(var(--radius) - Npx)` still resolves but the scale drifts. Decide one unit; convert on copy.
- **[Med] Dark scoped to the wrapper, not `documentElement`.** Admin portals/overlays (dialogs, dropdowns, the new chat/notification popovers) render at the body root and won't get the matched dark mode. Mirror the storefront's own `useStorefrontTokenStyle` pattern for admin portals, or apply the matched theme higher.
- **[Med] Two independent Supabase reads** (`useStorefrontStudio` + `useStorefrontMatchTheme`) synced only by a same-document window event — a second tab won't update until reload. Consolidate onto one source (React Query key `design_settings`, per the main plan's data-layer move).
- **[Low] Partial dark tokens.** `DEFAULT_DARK_TOKENS` omits `warning`/`info`/some `-foreground`; in matched-dark they fall back to light values. Complete the dark defaults.

**Decision to confirm with owner:** should "Match dashboard" be **colors + radius only** (current intent — keep the admin's own type/shape/motion), or a **full** adopt (fonts, shadows, glass too)? The fixes above assume the documented "colors + radius only". If full-adopt is wanted, apply the whole non-`--sf-` set *plus* `--sf-shadow-color` and the `data-*`/class attrs.

---

## 2. Make every Studio option work (control-by-control)

### 2a. Fully dead controls (write a field nothing reads) — [High]
- **Density** (`layout.density`: comfortable/cozy/spacious) — `StorefrontStudio.tsx:671`. Emits `--sf-density` + `data-density` (`tokens.ts:143,147`) that **no CSS/component reads**. → Wire it: multiply `--sf-section-space`, card padding, and grid gap by `--sf-density` (add the CSS), or remove the control.
- **Badges** (`components.badge`: solid/soft/outline) — `StorefrontStudio.tsx:662`. **No component reads it**; every badge hardcodes classes. → Add a shared `<SfBadge tone variant>` reading `components.badge` + the semantic token scale, replace the ~5 hardcoded badge sites (`ProductCard.tsx:263`, `CategoryGridBlock.tsx:113`, `detailBlocks.tsx:152`), or remove the picker.

### 2b. The type-size system is dead — [High]
`tokens.ts:96-104` computes `--sf-text-xs … --sf-text-5xl` from `baseSize` × `scaleRatio^step`, but **nothing consumes those vars** — every component uses hardcoded Tailwind `text-3xl/4xl/…`. So the Studio's **Base size** and **Scale ratio** controls change nothing. → Either map `--sf-text-*` into a Tailwind theme extension / apply to `.sf-heading` + body element sizes, or drop the two controls. (This is the single biggest "advertised typography control that does nothing".)

### 2c. Alias / partial controls (two values look identical) — [Med]
- **Gallery layout `top` ≡ `left`** — `ProductDetailPage.tsx:139` only special-cases `full-bleed` + `sticky-split`; `top` falls through to the 2-col `left` layout. → Implement a real stacked-gallery-on-top layout, or drop `top`.
- **Grid columns `2` ≡ `3`** — `ProductsPage.tsx:103` always builds `grid-cols-2 sm:grid-cols-3`, so "2" never yields a 2-up desktop grid. → Respect `productGrid.columns` at every breakpoint (or wire the dead `--sf-grid-cols`).
- **Corners `soft` ≡ `round`** — `tokens.ts:109` maps both to `shape.radius` and `data-radius` is read by nothing. → Differentiate (e.g. `round` = larger multiplier) or merge the two options.
- **Navbar Blur no-op in "minimal" header** — `Header.tsx:179-184` ignores `layout.header.blur`. → Honor blur in the minimal presentation too.

### 2d. Gating bug — [Med]
- **Orders-page-style unreachable unless Cart = "page"** — the whole `cartPage` accordion (its only control is `pages.orders.style`) is hidden unless `components.cart === 'page'` (`StorefrontStudio.tsx:878`). Orders style is independent of cart type. → Move the Orders-style control into the Shop/Orders group so drawer/modal-cart shops can reach it.

### 2e. Read-but-no-control (only settable via templates) — [Med]
These fields ARE honored by the renderer but have no Studio UI: `components.buttonShape` (inherit/pill/sharp), `layout.nav.showCategories`, `layout.sectionSpacing` (tight/normal/airy), `layout.productGrid.gap` (sm/md/lg), `shape.borderStyle` (solid/none), `effects.background.{blur,contrast,saturation,hue}`, and the `pattern` background type (`patternId` — also has no provider branch). → Add controls for each (buttonShape next to Button style; sectionSpacing + gap in "Components & spacing"; the extra bg filters next to Brightness/Overlay), and either implement `pattern` backgrounds or remove the type.

---

## 3. Make sections/components fully modular (tokenize the hardcoded leaks) — [Med]

The section/block system is genuinely modular (registry-driven `pages.home` + `pages.productDetail`, drag-reorder/enable/variant/props in `SectionList`, 9 ProductCard + 12 hero + all header/footer/cart/gallery variants implemented). The leaks are hardcoded styling inside otherwise-config-driven components:
- **`polaroid` ProductCard** hardcodes `bg-white`/`text-zinc-800` (`ProductCard.tsx:161,167`) — broken in dark mode. → `bg-card`/`text-card-foreground`.
- **Promo / Sold-out / rating / status colors** hardcoded `emerald/amber` across `ProductCard`, `detailBlocks`, `OrdersPage`, `Cart`. → Point at `warning`/`info`/`destructive` + a new `success` token (shared with the app-wide status scale in the main plan).
- **Hero CTA + overlays hardcoded** (`HeroBlock.tsx:70` `shadow-xl hover:scale-105`; scrims `from-black/70`). → Route hero CTA through `SfButton`; add an overlay-strength prop.
- **Carousel "View All" bypasses `SfButton`** (`ProductSectionBlock.tsx:135` raw `buttonVariants`), and `HomePage.tsx:49` uses a raw `Button`. → Route all CTAs through `SfButton` so button style/shape is universal.
- **List mode overrides the chosen card variant** (`ProductsPage.tsx:184` forces `compact`). → Respect `components.productCard` (or make it an explicit "list uses compact" toggle).
- **De-dupe the two block renderers** — `SectionRenderer.tsx` and `ProductDetailPage.tsx:24` reimplement the same merge logic. Extract one.
- **Type drift** — `types.ts:135 HeroVariant` lists 6 values but `HeroBlock` implements 13 via a local union. Reconcile so the canonical type reflects real capability.
- **Dead emissions to clean**: `data-header`/`data-nav`/`data-radius` attrs, `--sf-grid-cols`, `heroVariant`/`setHeroVariant` vars in `StorefrontStudio.tsx:274`, dead `StorefrontPreviewPanel.tsx`. Fill the `OptionDemo` gaps (frame/caption-hover/ticket cards + navbarPresentation/sectionHeader tiles all render the generic fallback).

---

## 4. Remake a few base templates — [Med]

Once §2–§3 land (type scale, density, badge, tokenized colors all live), the 8 templates (`templates/index.ts`) can genuinely exercise the full system. Recommendation: **remake 3 "hero" templates** end-to-end as showcase references that use every now-working control (distinct base size/scale, density, badge style, button shape, section spacing, gap, border style, background filters):
- one **minimal/editorial** (e.g. refresh `mono`/`galerie`) — sharp corners, tight density, outline badges, no glass;
- one **premium/lux** (refresh `velvet`/`noir`) — soft-round corners, airy density, soft badges, glass on, tinted shadow, serif display;
- one **vibrant/retail** (refresh `bazaar`/`neon`) — round corners, cozy density, solid badges, gradient buttons, marquee banner.
Each becomes a living test that every Studio control is wired. Keep the other 5 but audit them against the newly-working fields.

---

## 5. Suggested sequencing (maps to main plan Phase 3)
1. Wire the **dead systems** (type scale, density, badge) + fix the **alias/gating** controls — this is "make every option work".
2. **Tokenize** the hardcoded color/shadow/button leaks (shares the app-wide `success/warning/danger/info` token work from `docs/OVERHAUL_PLAN.md` §2.1).
3. **Expose** the read-but-unexposed fields; delete dead code.
4. Fix **Match-dashboard** (font leak, shadow-color, radius unit) — confirm colors-only vs full-adopt with owner first.
5. **Remake the 3 showcase templates** as end-to-end tests of the now-complete control surface.

Each item is independently shippable and touches only the storefront/Studio (not the admin data/logic).
