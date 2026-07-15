# Vela — UX / Accessibility / Design Audit

_Generated 2026-07-14. Covers the authenticated admin app + auth + storefront chrome. Findings are grouped and prioritized; each cites the file to fix._

---

## 🔴 Top cross-cutting priorities (do these first)

1. **Dark-mode color bugs** — several colored chips/badges are light-only and glare in dark mode:
   - `Orders.tsx` `getStatusColor` (order status badges) — hardcoded `bg-emerald-100/…` with no `dark:` variants. Switch to the `Promotions.tsx` tint pattern (`bg-emerald-500/10 text-emerald-600 …`).
   - `BulkActionsToolbar.tsx` hover states (`hover:bg-emerald-50/amber-50/slate-50`) — add `dark:` variants.
   - Storefront/cart badges (`InstagramProductCard.tsx`, `InstagramCartDrawer.tsx`) — white text on `amber-500`/`green-500` fails WCAG AA; use darker fills.
2. **Auth-form accessibility** (used by every new user) — `Login.tsx` / `Register.tsx` raw inputs lack `aria-invalid`, `aria-describedby`, `role="alert"` on errors, and `autoComplete` attributes. Wire them like `ui/form.tsx` already does.
3. **Consolidate the design system** so "premium Vela" actually renders everywhere:
   - One canonical **stat chip/card** (currently 3+ variants: `dashboard/StatCard.tsx`, a local one in `Promotions.tsx`, ad-hoc in Orders/Categories/OutOfStock). Delete duplicates (Orders even has a dead `StatCard` import).
   - Bring the **command-bar toolbar** (`rounded-xl border bg-card p-2.5 shadow-sm` + branded search) to the pages that still look like plain shadcn: **OutOfStock, Categories, Keywords, Admin**.
   - One canonical **empty state** (icon tile + heading + subtext + primary CTA) — reuse the Products/Promotions pattern on Orders, Categories, OutOfStock, Dashboard.
4. **Findability of core settings** — three genuinely missing/hidden features:
   - **No "Cancel subscription"** control anywhere (`Billing.tsx`). Add one (confirm + "stays active until period end").
   - **No shipping/delivery-fee settings** (`ShopSettings.tsx`) — shipping only exists per-order + as a promo type. Add a Shipping section.
   - **Orphan `/filters` route** — registered in `App.tsx` but in no nav; duplicates the Products `Settings2` filter sheet. Remove or link + consolidate.
5. **Floating-element collisions bottom-right** — sync widget, notifications, chat, bulk toolbars, and mobile BottomNav all float there. (Partially addressed: notifications + chat now share one stack.) Fold `SyncStatusWidget` into the same stack with defined z-order.

---

## ♿ Accessibility

**Blocker / Serious**
- **Header global search** (`Header.tsx`) results are clickable `<div>`s with no combobox/listbox/option roles and no keyboard reachability — a screen-reader/keyboard dead-end on every page. Add `role="combobox"/listbox/option"` + `aria-activedescendant`.
- **No skip-to-content link** — keyboard users tab through the whole sidebar on every page. Add a visually-hidden `<a href="#main">` + `id="main"` on `<main>` (`DashboardLayout.tsx`).
- **Icon-only buttons rely on tooltips for their name** (Sidebar collapse/language/tutorial/logout; theme swatches in `ThemeSelector.tsx`; cart ±). Radix tooltips don't set an accessible name — add `aria-label` to each. (Done for the new notifications + chat buttons.)
- **Theme swatch buttons** (`ThemeSelector.tsx`) have no accessible name / `aria-pressed`; the delete button is focusable but `opacity-0` (invisible to keyboard). Add labels + reveal on `focus-within`.
- **Low-opacity text on the magenta "primary" sidebar** (`Sidebar.tsx` palette: `text-primary-foreground/45–70`) ~2–2.5:1 — fails AA. Raise opacities; use a contrasting focus ring on primary surfaces.
- **Route transition + cart animations** have no `prefers-reduced-motion` guard (`DashboardLayout.tsx`, `InstagramCartDrawer.tsx`). Gate with Framer `useReducedMotion()`.

**Minor**
- Page `<h1>` is `hidden md:block` (no heading on mobile) — use `sr-only md:not-sr-only`.
- Decorative Lucide icons lack `aria-hidden="true"`.
- Async status text (search "Searching…", sync status) has no `aria-live`.
- Required fields lack `aria-required` + visual `*`.

---

## 🧭 Navigation, Findability & Clarity

**High**
- **"Stock" is mislabeled/mis-iconed** — label "Stock", route `/out-of-stock`, title `stock.title`, `Archive` icon (reads as "archived"). Pick one name ("Inventory"), a boxes icon, and route `/stock`.
- **Instagram connect has 3 inconsistent entry points** (`IntegrationPrompt`, `IntegrationSettings`, `GetStartedCard`) with different redirect origins + different success toasts. Centralize into one `connectInstagram()` helper.
- **"Add Product" writes a DB row on click** (`Products.tsx`) and relies on the editor's close handler to delete unsaved drafts → orphan drafts on accidental clicks / nav-away. Prefer an in-memory draft persisted on first save.

**Medium**
- **"Categories"** actually edits spec/option *templates*, not shopper-facing categories — rename ("Product Templates") + add a one-line explainer.
- **"Keywords"** nav gives no hint it's for AI caption parsing; suggested keywords are hardcoded Albanian even in the EN UI.
- **Header search misses half the app** — no Categories/Keywords/Promotions and no Settings sub-tabs (so "shipping"/"currency" find nothing). Add them (deep-link `?tab=`).
- **"Customize" (dashboard) → `/settings?tab=appearance"` (app theme) vs "Storefront Studio" → `/storefront-studio`** are two "appearance" concepts users will conflate. Rename app one to "App theme"; point "Customize storefront" at the Studio.
- **"Zero out" bulk stock** (`OutOfStock.tsx`) instantly zeroes inventory with no confirm (unlike every other destructive action). Add a confirm.
- **Draft explanation only shows when 0 active** — add per-status tooltips + a persistent (dismissible) draft hint whenever drafts exist.
- **Import vs Sync vs runWithIntegrationCheck** (Products) — three overlapping IG-ingestion actions, never explained. Add tooltips / merge.
- **No account/settings menu in the header** — Settings + Logout live only at the bottom of the sidebar; add the standard top-right avatar menu.

**Low**
- Weak dashboard no-data state; inconsistent add-action verbs/placement (Add vs Create); "Fix Images" forces `window.location.reload()`; non-functional "coming soon" toggles in Account settings; single-item "Sales" divider; Promotions filed under the "Products" nav group.

---

## 🎨 Visual Design & Consistency

**High**
- **Orders table has no horizontal-scroll container** (`overflow-hidden` on the wrapper) → clipped on mobile/tablet. Use `overflow-x-auto` or a responsive card layout; truncate the customer email.
- **Duplicate page titles** — `Header.tsx` renders the page `<h1>`, yet `Keywords.tsx` + `Promotions.tsx` render a second big in-page `<h1>`. Standardize (one or the other, app-wide).
- **Radius scale is inverted** — only `--radius`-derived `sm/md/lg` are branded; `rounded-xl` stays Tailwind's 12px, so command bars (`rounded-xl`) are *less* rounded than cards (`rounded-lg`=24px). Standardize on the token scale; stop using `rounded-xl`.
- **Premium shadow scale barely renders** — `Card` hardcodes `shadow-sm` and pages pass `shadow-sm`, so `shadow-card`/`shadow-premium` almost never show. Make `Card` default `shadow-card`; reserve `shadow-premium` for hero cards.
- **Big display numbers don't use Clash Display** — stat values render in `<p>/<span>` (Inter). Add `font-heading` to display figures.

**Medium**
- Container strategy inconsistent (Billing `max-w-5xl`, Admin `max-w-6xl`, Settings `max-w-[1800px]`, others full-bleed) — adopt one page max-width wrapper.
- Search input height inconsistent (Products `h-10` vs others `h-9`; OutOfStock/Admin use a different bordered search).
- Primary "Add" button size/icon differs per page; `CardTitle` swings `text-2xl` ↔ `text-base`.
- Off-brand raw `gray/slate/zinc` neutrals for cancelled/expired/muted states — use the violet-cast `muted` tokens.
- Billing uses raw `.brand-gradient` buttons instead of the `BrandButton` wrapper (different hover behavior).

**Low / polish**
- Loading skeletons don't mirror final layout (Billing, Products table); interactive stat pills + view toggles lack `focus-visible` rings; two visually-different bulk toolbars; two different amber warning-banner recipes; Promotions type accents use `violet` (clashes with brand primary).

---

_Full per-finding detail (with line numbers) is in the three audit passes; the items above are the deduplicated, prioritized synthesis._
