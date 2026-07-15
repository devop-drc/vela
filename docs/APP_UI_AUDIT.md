# Actual-App UI Audit (live, logged-in) — 2026-07-14

Audited the **real** app (not the /demo mirror) logged in as `gjkalaja@impuls.al` (shop "Mediadesk Albania"). This account has **"Match dashboard" ON** with an **orange "Bazaar"** storefront palette, so the whole admin adopts orange — a great stress-test of the theme-adoption feature. Walked: Dashboard, Products, Orders, Settings (Account), Storefront Studio, Billing + the Notifications panel and Vela chat. Screenshots taken in the live orange theme.

Companion to `docs/OVERHAUL_PLAN.md` (§7 has the per-page 335-finding depth) and `docs/OVERHAUL_STOREFRONT_STUDIO.md` (match-theme deep-dive). This doc adds what only shows up in the **live themed app**.

---

## ✅ Fixed this session (build passes)

1. **Sidebar labels illegible on the themed sidebar** — section labels were `text-primary-foreground/45` (45% white on saturated orange). → bumped muted to `/65`, nav text to `/80`. `src/components/layout/Sidebar.tsx`.
2. **Inconsistent floating buttons** — the chat FAB used the fixed Vela-violet `.brand-gradient` while the notification FAB was themed (`bg-primary`), so they clashed side-by-side. → chat FAB + send button now themed (`bg-primary`). `src/components/VelaChat.tsx`.
3. **Loud, low-contrast integration banner** — Settings → "Facebook & Instagram" connected banner was a saturated `bg-accent` (teal) block with hardcoded `text-emerald-600` "Connected" text (low contrast on teal, no dark support). → clean `bg-success/5` card, themed icon tile, `text-success` label. `src/components/settings/IntegrationSettings.tsx`.
4. **Rainbow Settings tab icons** — Account/Shop/Appearance icons hardcoded `text-blue-600`/`emerald-600`/`violet-600` (clash with theme, don't adapt to dark). → active icon uses `text-primary`. `src/pages/Settings.tsx`.
5. **Focus rings didn't follow the theme** — "Match dashboard" copied every non-`--sf-` var BUT `buildTokens` never emits `--ring`, so every focused input/button showed the default **Vela fuchsia** ring on the orange app. It *also* leaked the storefront's fonts (contradicting its own "colors + radius only" comment) and copied `--shadow*` vars that reference the stripped `--sf-shadow-color`. → `--ring` now derived from the themed `--primary`; `--font-*` and `--shadow*` skipped. `src/hooks/useStorefrontMatchTheme.ts`.

_Note: the teal Month/Day/Revenue/Clients/Orders chart toggles are NOT a bug — they're the merchant's themed `--accent` (Bazaar = orange primary + teal accent), faithfully applied._

---

## ⛳ Remaining findings (noted, not yet done)

### Theme-adoption polish (match-dashboard)
- **Billing page uses Vela-magenta** ("Most popular" badge, "Current plan" `.brand-gradient` button, "2 months free" chips) while the rest of the app is orange. Defensible (Billing is Vela's own product, not the merchant's shop) but visually inconsistent with the themed chrome. Decide: theme it, or keep Vela-brand deliberately. `src/pages/Billing.tsx`.
- **Match-theme dark mode is scoped to the layout wrapper**, so admin portals (dialogs, dropdowns, the chat/notification popovers) render at the body root and won't get matched-dark. Radius unit also drifts (admin `1.5rem` vs storefront `px`). See `docs/OVERHAUL_STOREFRONT_STUDIO.md §1`.

### Performance / perceived speed
- **Settings and Storefront Studio show large empty skeleton blocks with a visible delay** (no instant hydration; a raw Supabase fetch in `useEffect`). This is the plan's #4 item — every page should hydrate from the `pageCache` SWR + React Query, and one `AuthProvider` should remove the `getUser()` waterfalls. (Tasks #22/#23, pending.)

### Functional bug (not visual, but noisy)
- **`product_reviews` returns HTTP 400 for every product** on any page that renders product cards (Products, Studio preview) — 16 failed requests on the Studio page alone. Ratings never load. The `?select=product_id,rating&product_id=in.(…)` query is malformed or blocked (schema/RLS). Investigate `useProductRating`.

### shadcn component upgrades (from the component-audit agent)
Prioritized; all land in `ui/`, composed wrappers stay in `ui-app/`:
1. **`Spinner`** — replaces **123 `Loader2 + animate-spin`** usages across 50 files. Highest leverage, low risk, mechanical.
2. **`Item`** — replaces hand-rolled list rows (ActivityFeed `TYPE_CONFIG`, order rows, Header search results, notification rows).
3. **`Input Group` + `Kbd`** — rebuild `ui-app/SearchInput` internals + the duplicate Header search; standardize the ⌘K hint.
4. **`Button Group`** — action clusters / split buttons (Sync/Import). Use the already-installed **`ToggleGroup`** for the Grid|Table toggle (not Button Group).
5. **Official chat set** (`message-scroller`/`message`/`bubble`) — retry the registry (previously 404'd); swap the local `ui/message-scroller.tsx` + VelaChat bubbles if parity holds.
- Skip: `Field` (app standardized on RHF `Form`), `Native Select` (Radix `Select` is on-brand). `Empty` optional (custom `ui-app/EmptyState` already covers it).

### Per-page depth
Everything page-specific (Dashboard height clamp, Products stock-column duplication + always-zero "Total Earned", Orders redundant filter surfaces, InstagramPostModal cluster, etc.) is already enumerated in `docs/OVERHAUL_PLAN.md §7` — those still stand.

---

## Suggested next waves
1. **Perf foundation** (unblocks the skeleton/slow-load): `AuthProvider` + React Query seeded from `pageCache` (plan tasks #22/#23).
2. **`Spinner` adoption** (biggest mechanical win) → then `Item`, `Input Group`+`Kbd`.
3. **Fix `product_reviews` 400.**
4. **Match-theme portal-dark + radius** polish; decide Billing theming.
5. Work through `docs/OVERHAUL_PLAN.md §7` per-page items.
