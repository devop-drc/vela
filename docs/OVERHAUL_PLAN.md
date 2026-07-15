I now have enough grounding in the real tokens, the existing GSAP primitives (`useReveal`, `anim.tsx`'s `Counter`/`prefersReducedMotion`), the `pageCache` SWR layer, the unused `QueryClient`, and the route/provider structure. Here is the complete plan.

---

# Vela — Complete Overhaul Plan

_Design + Front-end architecture. Drives implementation. Supersedes and folds in `docs/UX_AUDIT.md` and `docs/UX_REORG.md`; dedupes 12 parallel audits. Priorities: **[High] / [Med] / [Low]**._

---

## 1. Executive Summary

Vela is a feature-complete Instagram→commerce admin + multi-surface storefront with genuinely good bones: a coherent violet-cast brand token set (`--primary: 300 72% 45%`, 24px `--radius`, layered `shadow-card`/`shadow-premium` scales), a hand-rolled instant-hydration cache (`src/lib/pageCache.ts`), and a polished GSAP motion language — but that language lives **only** on the landing/storefront/Remotion surfaces and never reaches the admin app. The admin instead renders as generic shadcn: pages hardcode light-only Tailwind palette chips (`bg-emerald-100 text-emerald-800`) that break in dark mode, three-plus divergent StatCard/stat-chip implementations, per-page toolbars, and a scatter of `framer-motion` + CSS transitions with no shared timing/easing and almost no `prefers-reduced-motion` guard. Data flow is the biggest liability: `@tanstack/react-query` is configured in `App.tsx` but **used zero times** — every page does raw `supabase.from().select()` in `useEffect`, re-resolves auth+business on hot paths via network `getUser()`, opens duplicate realtime channels, over-fetches whole tables, and mostly skips optimistic UI. The result reads slower and less premium than the brand promises, and there are real logic bugs (broken Get-Started checklist, promotion "duplicate" that silently updates nothing, orphaned `/filters` route, unwired storefront search, mobile nav dead-zone in docked layout).

**The 8 highest-impact moves (do these and everything else compounds):**

1. **[High] Kill dark-mode chip breakage globally** — one `StatusBadge` + a semantic `success/warning/danger/info` token set (with dark variants) replacing ~40 hardcoded `bg-*-100 text-*-800` sites across Orders, Products, Dashboard, Notifications, storefronts.
2. **[High] Adopt React Query as the single data layer**, seeded from `pageCache` for instant hydration — deletes duplicate fetches, gives shared cache + in-flight dedup + uniform optimistic mutations.
3. **[High] One `AuthProvider`** resolving `session/userId/businessId` once; every context/page consumes it instead of re-calling `getUser()` (a network hop) before each query and mutation.
4. **[High] Build the admin GSAP motion system** (`src/lib/anim/`): timing/easing tokens + a `useGsap`/reveal/count-up/`quickTo` hook set, one reduced-motion guard, migrate admin `framer-motion` onto it.
5. **[High] Canonicalize the design-system primitives** — `StatCard`, command-bar toolbar, `EmptyState`, search input, radius/shadow usage — so per-page work stops re-inventing them.
6. **[High] Optimistic + delta-driven mutations & realtime** — patch the changed row from the payload instead of full-table refetch (Orders, Products, Keywords, Categories, Promotions); no `window.location.reload()`.
7. **[Med] Execute the IA reorg** — rename Stock→Inventory / Categories→Categories & Types / Keywords→AI Keywords, regroup sidebar (Promotions→Sales), remove orphan `/filters`, add header account menu, fix Settings tabs (+Shipping, +Integrations).
8. **[Med] Fix the correctness bugs surfaced across audits** — Get-Started checklist, promotion duplicate, docked-layout `BottomNav`, unwired storefront `onOpenSearch`, hardcoded `'ALL'` currency in order line items, USD-default on registration.

---

## 2. Design-System Foundation

Fix the shared primitives **first** — every per-page task in §7 assumes these exist.

### 2.1 Color tokens & dark-mode correctness — [High]

The root cause of the single most-repeated audit finding (dark-mode chip breakage in Orders, Products, Dashboard, Notifications, Inventory, both storefronts) is that status colors are authored as light-only literals. `--warning` and `--info` also exist in `:root` but are **not redefined in `.dark`**, so they don't adapt.

- **Add a semantic status scale** in `src/globals.css`, with `:root` and `.dark` values, each with a surface + border + foreground triple:
  - `--success`, `--success-foreground` (new — no green token exists today), plus `--warning`/`--info` **dark variants** (currently missing), `--destructive` (exists).
  - Convention for tints that read in both themes: `bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))] border-[hsl(var(--success)/0.25)]` — i.e. the `Promotions.tsx` `/10` tint pattern the audit already recommends, promoted to tokens.
- **Central status map** `src/lib/status.ts`: `orderStatus`, `stockStatus` (fold in `src/lib/stock.ts` `getStockStatus`), `promotionStatus`, `paymentStatus` → `{ tone: 'success'|'warning'|'danger'|'info'|'neutral', label }`. All badges derive tone from this; **no component picks a raw palette color.**
- **Purge hardcoded palette literals** (grep `bg-(emerald|blue|amber|red|green|violet|cyan|gray|slate|zinc)-(50|100|200|...)`). Replace with tokens. Known offenders: `Orders.tsx getStatusColor`, `OrderDetailModal.tsx getStatusColor` (two divergent maps → one), `ProductTableView`, `ProductViewMode`, `StatCard colorMap`, `ActivityFeed`, `QuickActions`, `NotificationSidebar statusColor`, `Promotions PromotionCard`, `OutOfStock StatusBadge`, storefront `ProductCard` (polaroid `bg-white`), `Cart` subscription note, all `Instagram*` components (blue `--primary` override, `red-500` CTAs).
- **Brand anchor:** at least one hero metric (dashboard Revenue) uses `--primary` magenta so the palette reads as Vela, not generic blue.

### 2.2 Radius scale — [High]

`--radius` is 24px; Tailwind's `borderRadius` maps `lg→var(--radius)` (24), `md→16`, `sm→8`. But raw `rounded-xl` (Tailwind's fixed 12px) is used on command bars/toolbars, making them **less** rounded than `rounded-lg` cards — inverted, as UX_AUDIT flags.
- Ban `rounded-xl`/`rounded-2xl` literals in admin; use the token scale (`rounded-sm/md/lg`). Add an ESLint rule or a codemod pass.

### 2.3 Shadow scale — [High]

`shadow-card`/`shadow-premium` are defined but rarely render because `Card` hardcodes `shadow-sm` and pages pass `shadow-sm`. Also every shadow is a fixed light-tuned `rgba(46,33,64,…)` — **near-invisible in dark mode.**
- Make `Card` default to `shadow-card`; reserve `shadow-premium` for hero cards only.
- Add dark-mode shadow handling: either a `.dark` shadow override set (higher alpha / ring-based elevation) or switch elevated surfaces to `ring-1 ring-white/5` + subtle shadow in dark. One elevation utility, applied everywhere.

### 2.4 Typography — [Med]

- Big display figures (StatCard values, Billing price/MRR, Admin counts, storefront totals) must use `font-heading` (Clash Display) + `tabular-nums`, not `font-bold` Inter. Fix `StatCard.tsx:35`, `WelcomeHeader` (drop `font-bold`), Promotions/OutOfStock stat numbers.
- Standardize page-title handling (UX_AUDIT "duplicate page titles"): the header owns the `<h1>`; pages set it via `usePageTitle`. Remove in-page `<h1>` from Keywords/Promotions/FilterVisibility, and **add** `usePageTitle` to FilterVisibility (currently missing).

### 2.5 Canonical shared components — [High]

Build these once in `src/components/ui-app/` (app-level, distinct from shadcn `ui/`), delete the duplicates:

| Component | Replaces | Notes |
|---|---|---|
| `StatCard` (upgrade existing) | Orders inline chips (dead `StatCard` import), Promotions local StatCard, Categories chips, OutOfStock cards | tone from token scale; optional `animateValue` count-up (§3); `font-heading`; `trend` wired or removed |
| `StatusBadge` | Orders×2, Products table/card/view/filter, Notifications, storefronts | tone from `src/lib/status.ts`; dot+label variant |
| `CommandBar` (toolbar shell) | per-page toolbars | `rounded-lg border bg-card p-2.5 shadow-card` + branded search; bring to OutOfStock, Categories, Keywords, Admin |
| `SearchInput` | Products `h-10` vs others `h-9`, Admin/OutOfStock bordered variant | one height, one style, `⌘K`/`Ctrl K` platform-aware hint |
| `EmptyState` | bare text lines in Dashboard, Orders, ActivityFeed, TopProducts, SectionList, storefront | icon tile + heading + subtext + primary CTA |
| `PageContainer` | `max-w-5xl`/`max-w-6xl`/`max-w-[1800px]` drift | one max-width wrapper across Settings/Billing/Admin/pages |
| `ConfirmButton`/reuse `AlertDialog` | unguarded destructive actions | logout, bulk cancel, reset-settings, cancel-subscription, delete-theme, zero-out-stock |

### 2.6 i18n hygiene — [Med]

Many surfaces bypass `t()`. Route every user-facing string through i18n and add missing keys. Worst offenders: **Admin.tsx (100% hardcoded Albanian)**, appearance sub-panels (100% hardcoded English), PromotionEditorModal, Promotions helpers (`'$'` currency, status labels), OutOfStock toasts, ShopSettings toasts, ResetPassword (English-only), Header/SyncStatusWidget/VelaChat strings. Use `formatCurrency(value, shopDetails.currency)` everywhere money renders (no literal `$` or `'ALL'`).

---

## 3. GSAP Motion System (admin)

Goal from the owner: "subtly animated with gsap." Today the admin has no shared motion language — `framer-motion` (page transition, product grid, quick-actions, activity feed), `tailwindcss-animate` (accordion/sheet/toast), and ad-hoc `transition-*` durations, with reduced-motion honored only on decorative landing/storefront CSS. GSAP is already a dependency and the landing proves the patterns (`anim.tsx` `Counter`, `useReveal.ts`).

### 3.1 The module — [High]

Create `src/lib/anim/` (note: `src/lib/motion.ts` is Remotion-only — keep it; use a new namespace to avoid the file/dir collision):

- **`tokens.ts`** — the shared vocabulary so nothing hand-picks durations again:
  ```
  DUR   = { xs: 0.16, sm: 0.22, md: 0.35, lg: 0.5 }   // seconds
  EASE  = { out: 'power3.out', inOut: 'power2.inOut', standard: 'power2.out' }
  STAGGER = 0.04
  TRAVEL  = 8   // px — the "subtle" y-offset; landing uses larger (32)
  OVERLAY = { in: 0.32, out: 0.2 }
  ```
  Mirror as CSS custom props (`--motion-dur-md`, `--motion-ease-standard`) so Radix/CSS overlays share the rhythm.
- **`usePrefersReducedMotion()`** — one hook (lift `prefersReducedMotion()` from `anim.tsx`), the single guard all admin motion checks.
- **`useGsap(scopeRef, setup, deps)`** — thin wrapper over `gsap.context(setup, scope)` with `ctx.revert()` cleanup (the `useReveal` pattern), early-returning to final state under reduced motion.
- **Presets** built on the above:
  - `useReveal` (admin variant: `y:8→0, opacity, DUR.md, EASE.out, stagger`) — fires on the `isLoading→false` edge, not scroll (admin content is above the fold).
  - `useCountUp(el, to, { format })` — GSAP `gsap.to({v},…) onUpdate`, `tabular-nums`, snap-to-final under reduced motion. Wraps `StatCard`'s `animateValue`.
  - `useActiveIndicator(containerRef)` — `gsap.quickTo` a shared pill to the active nav item's `offsetTop/height` (sidebar) or `offsetLeft/width` (tabs).
  - `hoverLift(el)` / press helpers — unify magnitude at `y:-3` (matching QuickActions), replacing scattered `whileHover={{y:-5}}` / `hover:scale-105`.
- **`MotionConfig`** at the app root: wrap remaining `framer-motion` in `<MotionConfig reducedMotion="user">` during migration.

### 3.2 What animates (and how) — [High/Med]

| Surface | Motion | Priority |
|---|---|---|
| **Route transition** (`DashboardLayout`) | Replace `AnimatePresence mode="wait"` y:15 with opacity-led `y:6, DUR.sm`, no blocking exit; reduced-motion → none | High |
| **Skeleton→content** | `useReveal` fade-up on load edge (Dashboard, Products, Orders, Inventory, storefront) instead of hard swap | High |
| **Stat count-ups** | `useCountUp` on Dashboard stats, Orders stats, Inventory/Promotions stats, Billing price/MRR, storefront totals — on data-load, ~0.6–0.9s | High |
| **List stagger** | one preset for product grid / order rows / category & promotion cards / activity feed; **first-mount only** (key to initial load, not every filter/sort recompute) | Med |
| **Sidebar active indicator** | `useActiveIndicator` sliding pill on route change; static bg under reduced-motion | Med |
| **Tabs content** | fade+slide-in on `data-state=active`; animated `TabsList` indicator (same quickTo) | Med |
| **Card/sheet/popover expand** | height+opacity for Notification OrderCard/DisputeCard (or convert to Radix Collapsible), Studio SubSection/ChromeRow/SectionList; origin-aware scale for chat & notification popovers (`scale .96→1, y 8→0`) | Med |
| **Hover/press** | unified `hoverLift` + button press; gate behind `motion-safe:` | Med |
| **Sync widget** | number count-ups on progress/created/updated, tweened progress bar, crossfade current-post thumbnail; fix `AnimatePresence` early-return so exit actually plays | Med |
| **Toasts / overlays** | tokenize sheet/dialog/drawer/toast durations to `OVERLAY`; align accordion 0.2s → `DUR.md` power curve | Low |

### 3.3 Coexistence & reduced motion — [High]

- **Decide GSAP as the single admin engine.** Migrate the ~15 admin `framer-motion` usages (DashboardLayout, Products grid, ProductCard, QuickActions, ActivityFeed, BulkActionsToolbar, ProductFilterDrawer) to the `useGsap` presets, then **drop `framer-motion` from the admin path** to remove the duplicate runtime + easing drift. Keep Radix + `tailwindcss-animate` for pure open/close (sheet/dialog/toast/accordion — already good and CSS-cheap).
- **Global reduced-motion floor:** add `@media (prefers-reduced-motion: reduce)` that neutralizes transform-based transitions app-wide, plus every JS animation checks `usePrefersReducedMotion()` and snaps to final state. This closes the many "no reduced-motion handling" findings at once.
- **Never re-animate on silent revalidate:** cache a per-page "seen" flag so count-ups/staggers play on first paint, not on every background refetch or realtime tick.

---

## 4. Performance, Caching & Optimistic UI

Owner goal: "everything loads very fast and gets cached so we have optimistic UI/UX." The strategy is one data layer + one auth resolution + delta-driven realtime.

### 4.1 React Query as the single data layer — [High]

`QueryClient` is configured (`staleTime 60s`, `refetchOnWindowFocus:false`, `retry:1`) but **never used**. Adopt it:
- Wrap every domain read in `useQuery(['products', businessId])`, `['orders', businessId]`, `['keywords']`, `['categories']`, `['promotions']`, `['dashboard-summary', businessId]`, `['exchange-rates']`, `['billing-history']`, etc.
- **Seed instant hydration from `pageCache`:** pass `initialData: readCache(key)` (and `writeCache` in `onSuccess`) so the current SWR "paint from cache, revalidate" behavior is preserved while gaining in-flight dedup, shared cache, structural sharing, and background refetch for free. Optionally back it with `@tanstack/query-sync-storage-persister` and retire the bespoke per-page caching.
- **All mutations → `useMutation`** with `onMutate` (optimistic patch + `writeCache`), `onError` (rollback to captured snapshot), `onSettled` (invalidate). This replaces the per-page "await write then full refetch" everywhere.

**Convert list (by priority):** Products/`useProductData` (High), Orders (High), Dashboard summary + secondary widgets (High), Keywords/Categories/Promotions (Med), OutOfStock variants (Med), Billing history / Admin / Integrations / ShopSettings IG profile / exchange rates (Med), storefront product/reviews/orders queries (Med).

### 4.2 One AuthProvider — kill the auth waterfalls — [High]

Five providers + many pages each call `getSession`/`getUser` and register their own `onAuthStateChange`; a single sign-in or token refresh triggers a thundering herd of refetches. And hot paths use network `getUser()` where synchronous `getSession()` suffices.
- Add `AuthProvider` exposing `{ userId, businessId, session }` resolved **once**. `ShopContext` already fetches business + integration — expose `business.id` and `integrationConnected` from context.
- Replace every `supabase.auth.getUser()` on read/mutation paths with the context value (Orders, Products sync-status, IntegrationContext, Keywords, Categories, SyncProvider). Reserve `getUser()` for security-sensitive server confirmation only.
- Guard provider refetches on **user-id change** (the `pgcache-uid` compare trick already in `App.tsx`) so token refresh (same uid) doesn't reload all data.

### 4.3 Parallelize waterfalls & trim payloads — [High/Med]

- `ShopContext.fetchShopDetails`: the `Promise.all` is fake (middle element is `Promise.resolve`); `shop_details` runs serially after `businesses`. Join through business in one round-trip or run truly parallel keyed on `user_id`.
- `Orders.fetchOrders`: re-resolves business every fetch + realtime does full `select('*')` re-download on **every** row change. → use `businessId` from context; **patch the changed row from the realtime payload** (like `useProductData` does); select only rendered columns; paginate/bound the initial window; drop redundant `updated_at`.
- Consolidate **duplicate realtime channels**: one products channel in the shared data layer (Products.tsx opens a 2nd `products:${uid}` just to debounce sync-status — derive that from the shared stream); scope ActivityFeed channel names by `businessId`; filter the disputes subscription server-side (currently N+1 ownership check per INSERT across all tenants).
- **Exchange rates fetched twice** (ShopContext + CurrencyContext, each with edge-function fallback) → one `useQuery(['exchange-rates'])`; consolidate the two `convert()` impls.
- Stabilize `convertCurrency` on `[exchangeRates, shopDetails.currency]` (not whole `shopDetails`) so the async IG-profile augmentation doesn't invalidate memos and re-run the whole dashboard fetch.
- Merge the dashboard's ~6 uncoordinated fetch groups: fetch profile once at context level; merge TopProducts' two sequential RPCs; batch the integration check into the summary RPC.

### 4.4 No full-page reloads; optimistic writes — [High]

- **Delete `window.location.reload()`** in `QuickActions.handleRefreshImages` — invalidate/refetch the products query (realtime already covers `media_url`); optionally cache-bust affected image URLs.
- Make optimistic: Orders status (inline **and** bulk — share one `updateOrderStatus` service with confirm + `writeCache`), Keywords add/edit/delete/inline, Categories add/edit/delete/duplicate, Promotions/announcement toggles (write cache so navigating back doesn't flip-flop), OutOfStock stock edits (capture prev value before optimistic write for correct rollback).
- Modals return the updated entity and merge it into the list (`writeCache`) instead of the parent doing a full refetch (Orders `onUpdate`, Categories/Keywords `onSave`).

### 4.5 N+1 & over-fetch fixes — [High]

- **ProductTableView** variant stock: one query per product → single `.in('product_id', ids)` batched, grouped client-side.
- **InstagramProductCardFull**: 3 queries/mount + serial per-combo-item loop, rendered per feed item → bulk-fetch options/variants/combos for visible products, parallelize combo fetches, lazy-load on drawer-open/scroll-in, cache with React Query.
- **OutOfStock**: seeds a global variant prefetch but each row still refetches (its `fetched` flag ignores the cache) → seed from cache; batch inventory writes into one upsert (not `Promise.all` per-variant); persist variant summary to cache for instant re-hydrate.
- **ProductViewMode / ProductEditMode**: refetch options/variants every open → cache by `id+updated_at`; batch spec/variant saves into one upsert (currently serial `for`/per-row).
- **Storefront ProductsPage** client-only search auto-pages the **entire** catalog → add a debounced server-side `searchProducts` endpoint; sync search to URL.

### 4.6 Lists, images, prefetch — [Med/Low]

- **Virtualize** long lists (`@tanstack/react-virtual`): products grid/table, orders table, out-of-stock accordion. Gate entrance stagger to first mount; memoize `ProductCard`/rows.
- **Render Embla only when `mediaItems.length > 1`** (ProductCard mounts a full carousel even for single images).
- **Lazy images everywhere:** audit ~51 raw `<img>` (OutOfStock thumbs, Instagram cards, gallery thumbnails) → `loading="lazy" decoding="async"` + width/height; rebuild Unsplash thumbnail URLs at `w=200` (they currently serve ~2400px); IntersectionObserver-gate storefront `MediaItem` video autoplay (+ poster, reduced-motion).
- **Extend `prefetchRoutes`** beyond Products/Orders/Settings to Dashboard, Categories, Keywords, Promotions, OutOfStock, Billing, StorefrontStudio; add hover/focus prefetch on nav links.

---

## 5. Information Architecture & Clarity

Folds in `docs/UX_REORG.md`. Each step is independently shippable with route redirects.

### 5.1 Sidebar regroup + renames — [Med]

```
Dashboard
── CATALOG ──          Products · Inventory · Categories & Types · AI Keywords
── SALES ──            Orders · Promotions        (Promotions moves out of Products)
── STOREFRONT ──       Storefront Studio          (fold Filters in as a panel)
── ACCOUNT ──          Billing · Settings
```
- **Rename + re-icon + redirect:** Stock→**Inventory** (boxes icon, not `Archive`; `/out-of-stock`→`/inventory` with redirect); Categories→**Categories & Types** (+ "define product templates" subtitle); Keywords→**AI Keywords** (+ "help the AI read your captions" hint); Settings "Appearance" tab→**App theme**.
- Drops the single-item "Sales" divider; Promotions relevant-grouped with Orders.

### 5.2 Remove redundancy — [Med]

- **Orphan `/filters`:** registered in `App.tsx`, in no nav, `localStorage`-only (can't reach the storefront), duplicates the Products gear sheet. → Remove the route + Products gear button; **fold storefront-filter visibility into Storefront Studio as a panel**, persisted **to the DB per shop** and read by the storefront (rename the pre-Vela `instagram_filter_visibility` key).
- **Instagram connect has 3 entry points** (`IntegrationPrompt`, `IntegrationSettings`, `GetStartedCard`) with different redirects/toasts → one `connectInstagram()` helper.
- **Import vs Quick/Full Sync** on Products → one "Add from Instagram ▾" menu (Quick sync / Full sync / Pick posts) with one-line descriptions; fold the clunky one-item split-button dropdown in.
- Dashboard "Customize" → point at Storefront Studio (design the shop), not Settings→Appearance.

### 5.3 Header account menu + global search — [Med]

- Add the standard **top-right avatar/account menu** (Settings, Billing, Language, Log out) — today these live only at the bottom of the sidebar (hidden on mobile). Also surface page title + a compact account entry on mobile (header currently hides both).
- **Global search covers the whole app:** add Categories, Keywords, Promotions, and Settings sub-tabs (deep-link `?tab=`) so "shipping"/"currency" resolve. Run the two queries with `Promise.all` + cache + abort; make results a real `combobox/listbox/option` (see §6); platform-aware `⌘K`/`Ctrl K`.

### 5.4 Settings tabs — [Med]

```
Profile · Shop (+ SHIPPING, currently homeless) · Integrations (promoted out of Account) · Notifications · App theme
```
- Make Profile **editable** (name/phone write back to `profiles`); persist language to profile; add unsaved-changes guard on tab switch.
- Either implement or clearly separate the "coming soon" notification toggles (don't render interactive switches that do nothing).

### 5.5 Floating stack — [Med]

Fold `SyncStatusWidget` into the one managed bottom-right stack (Chat · Notifications · Sync) with fixed z-order and mobile offsets (`bottom-24 md:bottom-4`) so it stops colliding with `BottomNav` and the FABs.

---

## 6. Accessibility (must-fix)

Folds in `docs/UX_AUDIT.md`. **[High]** unless noted.

- **Docked-layout mobile nav dead-zone:** the `docked` branch of `DashboardLayout` omits `<BottomNav/>` while Sidebar is `hidden md:flex` → **no navigation at all** on mobile. Render `BottomNav` in both branches (or hoist shared chrome out of the branch split).
- **Reduced motion:** global `MotionConfig reducedMotion="user"` + the `@media (prefers-reduced-motion: reduce)` floor + per-animation guards (§3.3). Covers page transitions, grid stagger, FAB hover-scale, typing dots, marquees, spring entrances, storefront video autoplay, Instagram staggers.
- **Header search a11y:** clickable `<div>` results with no roles/keyboard reach → `combobox/listbox/option` + `aria-activedescendant`, Enter/arrow support.
- **Skip-to-content link** + `id="main"` on `<main>` (`DashboardLayout`).
- **Icon-only buttons need `aria-label`:** sidebar collapse/language/tutorial/logout, theme swatches, cart ±, ProfileStats refresh, bulk-bar clear (X), Studio Bug/List toggles, storefront images with `alt=""`.
- **Auth forms:** add `autoComplete` (`email`/`current-password`/`new-password`/`name`/`tel`), `aria-invalid`+`aria-describedby`+`role="alert"` on errors, error border state, larger "Forgot password?" hit area, password show/hide toggle. (Used by every new user.)
- **Theme swatches** (`ThemeSelector`): accessible name + `aria-pressed`; reveal delete on `focus-within` (currently `opacity-0`, keyboard/touch-invisible) + confirm.
- **Low-contrast on magenta sidebar:** `text-primary-foreground/45–70` ≈ 2–2.5:1 fails AA → raise opacities; contrasting focus ring on primary surfaces.
- **Keyboard-activatable rows:** Orders row-click and other click-only `<tr>`/`<div>` interactions → `role/button + tabIndex + Enter/Space`.
- **[Med]** Page `<h1>` `sr-only md:not-sr-only` (not `hidden`); decorative Lucide icons `aria-hidden`; `aria-live` on async status text ("Searching…", sync status); `aria-required` + visual `*` on required fields; billing Switch + tab triggers `aria-label`; storefront `BottomNav` `env(safe-area-inset-bottom)`.

---

## 7. Per-Area Overhaul

Each bullet is visual (V), animation (A), perf/caching (P), or clarity/logic (C). Priority in brackets.

### App shell & chrome
- (C)[High] Render `BottomNav` in the docked branch; extract shared chrome (overlay + FAB stack) so the two layout branches can't diverge; derive sidebar width from one constant map.
- (P)[Med] Share `userId/businessId` via `AuthProvider` — remove the 3 duplicate `getSession` fetches (Sidebar, Header, NotificationSidebar); split the favicon effect from the title effect (favicon re-runs on every route today).
- (V)[High] Fix NotificationSidebar status badges (dark-mode-broken) via `StatusBadge`; add loading skeletons (tabs currently flash "empty" before first fetch); stable low-stock timestamps (currently perpetually "unread"/"just now").
- (A)[Med] Sliding sidebar active indicator; opacity-led route transition; origin-aware popover scale for chat/notifications; sync-widget count-ups + fixed `AnimatePresence` exit.
- (C)[Med] Gate the dev-log behind `useIsAdmin`; reframe VelaChat as "AI assistant" (drop human "online" pattern); i18n the hardcoded strings; unify the 3 language-toggle patterns; add logout confirm; move SyncStatusWidget into the floating stack.

### Dashboard
- (C)[High] Fix Get-Started checklist (render until all steps done, pass real `hasProducts`, persist "shared" flag so step 3 can complete); fix WelcomeHeader "active orders" math (don't sum lifetime sales + pending); replace `window.location.reload()`; remove dead `QuickActionCard` (or adopt it).
- (V)[High] Move StatCard + QuickActions + ActivityFeed off hardcoded palettes to tokens; brand-anchor the Revenue card in `--primary`; skeleton for ProfileStats count pills (no "N/A" flash); point Customers stat at a customers view (3 of 4 cards link to `/orders`).
- (P)[High] Cache secondary widgets (ProfileStats/TopProducts/ActivityFeed/WelcomeHeader) via React Query; merge TopProducts' two RPCs; dedupe profiles fetch; scope ActivityFeed realtime channels by `businessId`.
- (A)[Med] Count-ups on the 4 stats; first-mount stagger on stat grid + onboarding rows; skeleton→content crossfade; check-mark pop when a step completes.
- (C)[Med] TopProducts: `>1` threshold → `>=1` (or accurate empty copy), make rows clickable + realtime, declarative image fallback (no `document.createElement`), null-guard + `try/finally`; OverviewChart: derive active preset from `dateRange` (6M/custom desync), distinct hues for clients/orders, `Intl` no-decimals formatter (regex corrupts comma-locales), labeled axes.

### Products
- (C)[High] Mobile: expose Sort/Filter/Group/Select entry points (the whole toolbar is `!isMobile`-gated → mobile users can't sort/filter at all); wire the already-rendered `ProductFilterDrawer`.
- (P)[High] Batch variant-stock N+1; virtualize grid/table; render Embla only for multi-image; consolidate the duplicate products realtime channel; replace `JSON.stringify` deep-compare with `updated_at`.
- (V)[High] `StatusBadge` across card/table/view/filter (kill light-only chips); brand selection ring (`ring-primary/40`, moderate shadow, not `shadow-2xl`); off-brand amber "publish drafts" banner → warning token.
- (C)[Med] Delete the dead filter-ordering/drag block + unused imports in `Products.tsx`; single `clearStatusFilter()` (not multi-toggle loop); optimistic draft (open editor against in-memory draft, INSERT on first save) to stop orphan "Untitled" rows; SaleModal awaits the write + shows new-price preview + currency prefix; scope category/type option queries by user; one source of `form.reset`.
- (A)[Med] Count-up status-pill counts; crossfade skeleton→grid; entrance stagger first-mount only.

### Orders
- (C)[High] Route bulk "Cancelled" through the same confirm as inline (currently one-click irreversible for 50 orders); one `updateOrderStatus` service for inline/bulk/modal (three divergent contracts today); modal status change should update in place, not eject the user; fix hardcoded `'ALL'` in line-item currency conversion.
- (P)[High] Patch changed row from realtime payload (no full `select('*')` re-download); `businessId` from context; select only rendered columns; write cache on optimistic updates.
- (V)[High] `StatusBadge` (dark-mode-broken map ×2 → one); unify stat-chip shapes; horizontal-scroll/stacked table on mobile; render `payment_status` as a badge.
- (C)[Med] Persistent "Export" button (CSV currently only inside the selection-gated bulk bar); RFC-4180 quote/escape CSV; "Realized revenue" label/tooltip; clarify search placeholder/fields; empty-state + image fallback in modal.
- (A)[Med] Stat count-ups, row stagger, skeleton crossfade, animate bulk-bar enter/exit; all reduced-motion gated.

### Inventory / Categories / Keywords / Promotions
- (C)[High] Fix promotion "Duplicate" (new UUID + presence-of-id branch → UPDATE matches zero rows, silent no-op) — pass a `forceInsert`/strip-id flag so it INSERTs; i18n PromotionEditorModal + helpers; `formatCurrency` (drop hardcoded `$`).
- (P)[High] Optimistic Keywords/Categories mutations (no full refetch per edit; cache userId once); OutOfStock: seed rows from `variantCache`, batch inventory upsert, persist variant summary.
- (V)[Med] One shared `StatCard` across all four pages; map violet/emerald/cyan accents to tokens; brand headings; FilterVisibility gets Cards + skeleton switches + shared container + explanatory copy + `usePageTitle` (moves into Studio per §5.2).
- (C)[Med] Categories "Add Category" persists or is relabeled (Cancel is a silent no-op today); OutOfStock product-level + global select-all (no expand needed); keyword edit/delete affordances discoverable (focus-within reveal); date-picker clear buttons; single-option Offer select → static text; `Copy` icon for duplicate (not `Repeat2`).
- (A)[Low] Count-ups + list stagger; pause react-fast-marquee preview under reduced-motion; animate CategoryCard collapsible height (matches OutOfStock).

### Settings & Billing
- (C)[High] Editable Profile (name/phone → `profiles`); Admin fully i18n'd; appearance sub-panels i18n'd; `type="password"` + confirm dialogs on Admin cancel-subscription / create-account password; AppearancePanel "Reset to defaults" + ThemeSelector delete get confirms.
- (V)[Med] Fix contrast/saturation slider readouts (read "0%" at neutral); tab icon hues → tokens; Instagram integration uses IG glyph not Facebook; consistent status wash/badge tokens on Billing; skeletons for Admin stats / Billing history / IG profile card (no "@undefined" flash).
- (P)[Med] React Query for Admin/Integrations/ShopSettings-IG/Billing-history; dedupe the double integration fetch (Account + IntegrationSettings) and double exchange-rate fetch; fix Admin double-load (`overview` in `load` deps); handle Billing history error branch; cache IG profile (don't cold-invoke edge fn every mount); lazy `w=200` gallery thumbnails + poster (not live `<video>`).
- (A)[Med] Count-ups on price/MRR/user counts; animate period Progress fill; card/row stagger; port AdvancedPanel expand from framer to the gsap hook.
- (C)[Med] Init annual/monthly toggle from actual `billing_cycle`; clarify "/mo billed annually"; debounced live Admin search with pagination retained; FontSelector includes brand fonts + previews + relabels the shuffle.

### Storefront Studio
- (C)[High] Search jumps to the actual control (stable `data-setting-id` anchors + force-open its SubSection + highlight flash), not just the accordion group.
- (P)[High] Replace ~24 live template iframes with static thumbnail snapshots (mount a real iframe only for the hovered/previewed one; don't duplicate iframes for the loop); cap DockedPreview auto-reload to 1–2 attempts then show an error/retry (currently unbounded reload-every-4s loop); add a skeleton until `sf-preview-ready`.
- (P)[High] Debounce slider history: use Radix `onValueCommit` for the undo checkpoint (one entry per drag) while `onValueChange` only updates a live value; memoize panel subtrees so ticks don't re-render every demo.
- (V)[Med] Emerald/black/zinc/`bg-white` literals → tokens (dark-mode-safe swatch borders); delete dead `StorefrontPreviewPanel.tsx`; reconcile virtual viewport dims; distinct reload vs reset icons.
- (C)[Med] Branded color control (hex/HSL input + eyedropper + swatches, keep HSL authoritative) replacing native `<input type=color>`; tooltips on jargon (Glassmorphism/Film grain/Scale ratio/option names); one control paradigm rule (visual→OptionGrid, 2-value→Segment, long list→Select); always-show Cart group with inline explanation; font pickers preview themselves + grouped.
- (A)[Med] Checkmark scale-in on OptionGrid select; height+fade expands; SaveIndicator crossfade; applied-template/palette flash; consistent apply feedback; marquee pause on focus + reduced-motion.
- (P)[Low] Post config to concrete storefront origin + validate `e.origin`.

### Customer storefront (custom)
- (C)[High] Wire `onOpenSearch` (Search button is dead) — real search overlay or route to `/products` focused; add server-side search (client-only search auto-pages the entire catalog); sync search to URL + debounce.
- (V)[Med] Layout-matching skeletons + skeleton→content crossfade; error states get icon + Retry; home skeleton columns from `config`; fix polaroid `bg-white`/`text-zinc` and amber cart note for dark mode; `success/sale` tokens for promo/sold-out/rating badges; price "N/A" → "Price on request".
- (C)[Med] Checkout step indicator (1-2-3) + crossfade; collapse single-option COD payment step + truthful copy; full ISO country list (not 9, Albania-default); merge/explain seller-vs-courier notes; quick-add on cards; empty-cart CTA links to `/products`; desktop category discoverability (mega-menu/strip); exclude "Uncategorized" tile; honest "More from {shop}" fallback label; table order-detail as colSpan expander.
- (A)[Med] Extract the GSAP reveal/stagger into a hook and apply to ProductsPage/detail/related/search + infinite-scroll batches (homepage-only today); checkout step crossfade + total count-up; cart badge pop.
- (A/A11y)[Med] Announcement marquee + marquee-hero respect `prefers-reduced-motion`; `MediaItem` IntersectionObserver-gated autoplay + poster + onError placeholder; safe-area `BottomNav`; undo toast on cart remove.
- (P)[Low] Omit CSS filter when all-default; drive reveal off `pathname` not `children`; cache reviews/orders queries.

### Instagram storefront
- (C)[High] Derive `--primary` + fonts from Vela brand tokens (currently hardcodes blue `210 90%` + Montserrat, so it looks like a different product); standardize all CTAs on `--primary` (kill `red-500/600` in VariantDrawer/filter chips); purge gray/amber/blue literals for dark mode; add cart entry to the profile header.
- (P)[High] Fix the per-card N+1 (3 queries + serial combo loop per feed item) via bulk + lazy + React Query; class-based theme toggle instead of mutating `documentElement`/injecting `<style>` on every focus/visibility change.
- (V)[Med] Skeletons mirror real grid/feed shape (3-col, stacked cards) + crossfade; normalize the oversized `md:px-24` filter buttons; consolidate the 3 divergent filter/sort entry points into one; fix `w-half`→`w-1/2` and full-width `BottomNav`.
- (C)[Med] VariantDrawer preselects computed defaults / auto-skips single-variant; filter drawer gets a "Done/Show N results" button; shipping threshold from shop settings (not hardcoded $50/$5); label inventory ("12 left"); count badge instead of red "(Active)"; conditional empty-order copy; single horizontal qty stepper.
- (A)[Med] `useReducedMotion` on all framer stagger/spring; cap profile-grid stagger; count-ups on totals/stat numbers; single shared theme context (not 3 DOM-attr toggles).
- (P)[Low] Delete empty `InstagramFloatingCart.tsx` + unused imports/vars; dynamic header height (ResizeObserver) not magic px; consolidate MyOrders overlapping fetches with cache.

### Auth & Landing
- (C)[High] Rebuild ResetPassword inside `AuthLayout` (currently an un-branded pre-Vela Card) + i18n it; move Register's 4-step client waterfall (signUp→profiles→businesses→shop_details, orphan-prone) into one RPC/trigger; default new-shop currency to `ALL` (not USD) + collision-safe slug.
- (C)[Med] Fix landing hero `instantshop.al` → Vela domain; parse the Markdown in InstagramSetupGuide (raw `**…**` shows literally) + fix the "Connect with Facebook" reference; Register already-signed-in guard; navigate to a real "Check your inbox" screen (not a transient toast).
- (V/A11y)[Med] Auth `autoComplete` + `aria-invalid`/`describedby` + error borders + password reveal (§6); brand-token text accents (not `fuchsia-600`/`pink-600`); mobile shows condensed value-props + trial reassurance (panel is `hidden lg:block`); persist phone to `profiles`.
- (P)[Med] Landing: static poster/deferred iframes for the two live `/demo` mocks (booting the app twice for decoration); isolate the 3.6s testimonial interval + resize handler into child components (currently re-render the whole Landing tree).
- (A)[Med] GSAP entrance stagger on auth heading/fields (reduced-motion gated); crossfade ResetPassword loading→content→success; session-check loading gate to avoid login-form FOUC for logged-in users.

---

## 8. Phased Roadmap

Each phase is independently shippable; renames ship with redirects (non-breaking).

### Phase 1 — Foundation (design-system + caching + motion primitives) — enables everything
**Deliverables:**
- `src/lib/status.ts` + `--success`/dark `--warning`/`--info` tokens; `StatusBadge`; dark-mode chip purge (global find-replace of palette literals).
- Radius (`rounded-xl`→token) + shadow (`Card` default `shadow-card` + dark elevation) + typography (`font-heading` on display figures) fixes.
- Canonical components: upgraded `StatCard`, `CommandBar`, `SearchInput`, `EmptyState`, `PageContainer`, `ConfirmButton`.
- `src/lib/anim/` motion module (tokens, `usePrefersReducedMotion`, `useGsap`, `useReveal`, `useCountUp`, `useActiveIndicator`) + global `MotionConfig reducedMotion="user"` + reduced-motion CSS floor.
- `AuthProvider` (userId/businessId/session) + `getUser()`→context/`getSession()` sweep.
- React Query wrapper pattern proven on **one** query (products) with `pageCache` `initialData` seeding + optimistic mutation template.
- A11y quick wins that are pure adds: docked-branch `BottomNav`, skip link, icon-button `aria-label`s.

**Independently shippable / non-breaking:** all of it (new primitives + token additions; old components keep working until migrated).

### Phase 2 — High-traffic pages (Dashboard, Products, Orders)
**Deliverables:**
- Migrate Products/`useProductData`, Orders, Dashboard to React Query + optimistic mutations + delta realtime; delete `window.location.reload()`; batch the variant N+1; virtualize the product grid + orders table.
- Correctness bugs: Get-Started checklist, WelcomeHeader math, bulk-cancel confirm, single `updateOrderStatus` service, `'ALL'` currency, mobile Products toolbar, TopProducts/OverviewChart fixes.
- Apply the motion presets: stat count-ups, list stagger (first-mount), skeleton crossfade, sidebar/tab active indicators, route transition swap.
- IA: sidebar regroup + renames + redirects; remove `/filters`; header account menu + global-search coverage; Settings tabs (+Shipping, +Integrations, editable Profile).

**Independently shippable:** per-page (Dashboard, then Products, then Orders); IA reorg ships as its own PR.

### Phase 3 — Storefront + Studio
**Deliverables:**
- Studio: search-to-control, static template thumbnails, bounded preview reload + skeleton, slider history debounce, branded color control, token color purge, delete dead panel; fold in the Filters panel.
- Custom storefront: wire search + server-side search endpoint, step indicator + crossfade, skeletons/error/retry, token badges, quick-add, `MediaItem` autoplay gating, reveal hook on all pages.
- Instagram storefront: brand-token theme (kill blue/Montserrat + red CTAs), fix per-card N+1, class-based theme, consolidated filter/sort, skeletons, layout bug fixes.

**Independently shippable:** three separate surfaces; none touches admin.

### Phase 4 — Polish & A11y
**Deliverables:**
- Inventory/Categories/Keywords/Promotions: shared StatCard, optimistic mutations, promotion-duplicate fix, i18n sweep, select-all, collapsible/marquee motion.
- Settings/Billing/Admin: i18n (Admin, appearance panels), confirms on destructive actions, skeletons, count-ups, lazy thumbnails, React Query.
- Auth/Landing: ResetPassword rebrand + i18n, Register RPC + ALL currency, `autoComplete`/aria, entrance animation, deferred demo iframes, isolated intervals.
- Full a11y pass: header-search combobox roles, contrast on magenta sidebar, `aria-live` status, keyboard-activatable rows, safe-area insets, `motion-reduce` audit.
- Retire `framer-motion` from the admin bundle; final token/lint sweep (ban raw palette + `rounded-xl`); virtualize remaining long lists.

**Independently shippable:** page-by-page; the `framer-motion` removal lands last, after all admin motion is migrated.

---

_Prioritize ruthlessly: Phase 1 + the Phase-2 high-traffic conversions deliver ~80% of the perceived "fast, cached, subtly animated, on-brand" outcome. The dark-mode token fix and React Query adoption are the two changes that unblock the most downstream work._

---

# Completeness Review — Gaps & Additions

I've cross-referenced all 12 audit areas against the plan and spot-checked the codebase. No **high**-severity finding is fully dropped — the plan absorbs every one. The gaps are a cluster of orphaned mediums, two real convention/contradiction problems, and unstated backend dependencies that undercut the "independently shippable" claim.

## Gaps & additions to the overhaul plan

### A. Convention contradictions that will block or break work
- **Violates the codebase's "Never modify `src/components/ui/`" rule.** Several §2/§3 primitives edit shadcn components directly: making `Card` default to `shadow-card` (§2.3), banning `rounded-xl` on cards (§2.2), and animating `TabsContent`/tokenizing `toast`/`sheet` durations (§3.2). CLAUDE.md forbids this. Add an explicit decision: either declare a scoped exception for token/shadow/radius defaults in `ui/`, or route all of it through `ui-app/` wrappers. Right now the plan silently contradicts a hard project rule.
- **Orders "select only rendered columns" (§4.3) contradicts CSV export + modal (§7).** The table renders ~8 fields, but `exportOrdersCSV`/the current-view export and `OrderDetailModal` need shipping/notes/line-item columns. Trimming the list query will break export or force the modal into extra fetches. Specify a two-tier fetch (lean list + detail-on-open) rather than a blanket column trim.

### B. Unstated backend / migration dependencies (breaks "each step independently shippable")
Several "frontend" steps can't ship as frontend-only PRs and aren't flagged as needing a Supabase migration/edge deploy — this is exactly the deferred-backend category the project memory warns about:
- **FilterVisibility → DB per-shop (§5.2):** needs a new column/table *and* both storefronts (custom + Instagram) wired to read it, plus a migration for existing `instagram_filter_visibility` localStorage users (or they silently lose settings on the key rename).
- **Register → single RPC/trigger (§7):** the audit notes a DB trigger **already** creates the business on confirmation. Moving client setup into an RPC risks double-creation unless the existing trigger is reconciled. Call this out.
- **Shipping tab (§5.4) + "shipping threshold from shop settings" (§7 Instagram/storefront):** requires a shipping-config schema before the storefronts can stop hardcoding $50/$5.
- **Editable Profile writeback (§5.4)** and **GetStarted "shared" flag persistence (§7 Dashboard):** both need a `profiles`/shop column to persist to.
- Add a per-phase note marking which deliverables carry a migration/edge-function dependency, and gate those behind the backend change landing first.

### C. Process gap the owner explicitly mandated
- **No screenshot/critique verification baked into the phases.** Project memory records an owner directive to self-verify each milestone with build + screenshots + critique. Given dark-mode breakage is the single most-repeated finding, add an explicit **both-themes visual pass** (light + dark, per surface) as an acceptance gate on Phase 1, and a screenshot/critique checkpoint closing each phase. The ESLint palette/`rounded-xl` ban catches literals but not visual regressions.

### D. Medium findings that were dropped or only weakly covered
- **Dashboard mobile height clamp mismatch:** skeleton uses `lg:h-[calc(100vh-7rem)]` (auto below lg) while content is a hard `h-[calc(100vh-7rem)]`, causing a layout jump on mobile + crushed right column. Not addressed anywhere; add to §7 Dashboard.
- **Products table stock-column confusion:** the "In stock" (base) vs "Variants" columns are duplicative for variant products, and "Total Earned" renders an always-zero column (Products never selects `total_earned`). Plan's StatusBadge work doesn't touch this. Collapse to one context-aware stock column and hide/​feed Total Earned.
- **Products status auto-flip on inventory keystroke:** the effect that silently switches status Active↔Out-of-Stock as the user types stock is surprising and uncovered. Add helper text or gate it.
- **Variant low-stock threshold still inconsistent:** §2.1 folds `getStockStatus` into `status.ts` for *tone*, but the inline `< 10` threshold in `ProductViewMode` (filter vs badge disagreement) isn't explicitly routed through the shared constant. Make that explicit.
- **Customer storefront: transparent-over-hero header legibility.** When `transparentOnHero` sits over a bright hero image, nav/cart/brand text keeps theme foreground and becomes unreadable. Not covered — add a forced light treatment or scrim.
- **Orders detail modal caching:** items/disputes refetch on every open even though item_count is already known. §4.5 covers product/variant caching but not this. Add to the React Query conversion list.
- **Settings HeroBackgroundSettings:** the plan lazy-loads thumbnails but skips (a) the broken absolute-overlay play icon (button isn't `relative`) and (b) the hardcoded external mixkit video shipped to prod. Add both.

### E. Minor omissions worth one line each (currently invisible in the plan)
- **VelaChat** is reframed as "AI assistant" but the audit's streaming + failure-retry affordance (no retry on the error bubble) is dropped.
- **SyncStatusWidget** 1s `setInterval` re-renders the whole card — isolate the elapsed clock into a child (uncovered perf).
- **InstagramPostModal** cluster is entirely absent from the plan: session-only dismiss that resurrects on reopen, nested Radix dialogs (import + editor), and the raw post-id/​bare "analyzed" dot. At least the dismiss-persistence and nested-modal focus trap should be listed.
- **Instagram profile grid "tab"** uses an invalid `stroke-weight` prop (React DOM warning) and looks interactive but isn't — quick correctness fix, not in plan.
- **Orders redundant filter surfaces** (stat pills *and* status tabs both driving `activeTab`) — pick one; uncovered.
- **SpecificationEditor** comma-joined `common_values` can't hold a value with a comma (tokenize) — uncovered.
- **OptionGrid dead `cols` prop** (call sites pass `cols={4}`, component hardcodes 2-up) — uncovered API smell in Studio.

### F. Dimensions that are genuinely complete — don't add more
- **Performance/Caching (§4):** concrete and thorough — named query keys, `pageCache` `initialData` seeding, `onMutate`/rollback template, the specific `.in()` N+1 batches, duplicate-channel consolidation, `convertCurrency` memo stabilization, fake `Promise.all` fix, virtualization + prefetch list. The only optional add is a before/after measurement target (network waterfall / TTI) so "loads very fast" is verifiable rather than asserted.
- **Animation (§3):** concrete and complete — real token values, named hooks/presets, the per-surface priority table, the framer→gsap migration + `framer-motion` retirement, and the reduced-motion floor. The one thing missing is that it inherits the §A `ui/`-edit contradiction (tabs/toast/accordion). Otherwise solid; no additional motion scope needed.
