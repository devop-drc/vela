# Vela — IA / Reorganization Plan

_Focus: regroup features by relevance, clarify names, and remove redundancy so the app is easier to understand and use. Companion to `docs/UX_AUDIT.md` (which covers a11y + visual polish)._

---

## 1. Sidebar navigation — regroup + rename

### Current (as-is)
```
Dashboard
── PRODUCTS ──
Products
Stock            → route /out-of-stock, title "stock", icon Archive
Categories       → actually edits spec/option TEMPLATES
Keywords         → AI caption-parsing hints
Promotions       ← a marketing concept living under "Products"
── SALES ──
Orders           ← lone item under its own divider
── STOREFRONT ──
Storefront Studio
── APP ──
Billing
Settings
```
Problems: **Promotions is mis-grouped** under Products; **"Sales" holds a single item**; **three items are mislabeled/opaque** (Stock, Categories, Keywords); Storefront Filters config is **orphaned** (`/filters` route in no menu) and **duplicated** (also opened from Products via a gear icon).

### Proposed
```
Dashboard

── CATALOG ──            (everything about the products themselves)
Products
Inventory                (rename "Stock"; icon → boxes, not Archive; route → /inventory)
Categories & Types       (rename "Categories"; + 1-line "define product templates" hint)
AI Keywords              (rename "Keywords"; hint "help the AI read your captions")

── SALES ──              (turning products into revenue)
Orders
Promotions               (moved out of Catalog — offers/discounts drive sales)

── STOREFRONT ──         (your customer-facing shop)
Storefront Studio        (fold "Storefront Filters" in here as a panel — see §3)

── ACCOUNT ──
Billing
Settings
```
Net effect: 4 clear job-based groups + Dashboard; Promotions relevant-grouped with Orders; the single-item "Sales" group is gone; ambiguous names fixed.

---

## 2. Rename the confusing items (biggest "understanding" win)

| Now | Rename to | Why |
|---|---|---|
| **Stock** (`Archive` icon, `/out-of-stock`) | **Inventory** (boxes icon, `/inventory`) | "Stock/Archive/out-of-stock" are 3 names for one feature; Archive reads as "deleted". |
| **Categories** | **Categories & Types** (+ subtitle) | The page edits spec/option *templates*, not the shopper-facing categories users assume. |
| **Keywords** | **AI Keywords** (+ tooltip) | Nothing signals it's for AI caption parsing; add a one-line explainer on the page + sidebar tooltip. |
| Settings → **Appearance** tab | **App theme** | Currently conflated with *storefront* design (which is the Studio). Rename so "theme of the admin app" vs "design of your shop" is unambiguous. |

Keep route redirects for renamed paths (`/out-of-stock` → `/inventory`) so links/bookmarks don't break.

---

## 3. Consolidate redundancy (remove duplicate/dead paths)

- **Storefront Filters** (which filters shoppers can use) has **two entry points + a dead route**: the `Settings2` gear button on Products, the `FilterVisibilitySheet`, AND the orphan `/filters` page — all writing the same `localStorage` keys. → Keep ONE home: a **"Filters" panel inside Storefront Studio** (it's a storefront concern). Remove the Products gear button and the `/filters` route.
- **"Customize" (Dashboard quick action) → Settings→Appearance** vs **"Storefront Studio"**: two "customize/appearance" concepts. → Point the dashboard "Customize" at **Storefront Studio** (design the shop); rename the Settings tab to **App theme** (§2).
- **Instagram connect has 3 UIs** (`IntegrationPrompt`, `IntegrationSettings`, `GetStartedCard`) with different redirect origins + toasts. → One `connectInstagram()` helper; surface it in **Settings → Integrations** (see §4) and the first-run card only.
- **Import vs Quick/Full Sync** on Products — three overlapping IG-ingestion actions. → Group them under one **"Add from Instagram ▾"** menu (Quick sync / Full sync / Pick posts) with one-line descriptions.

---

## 4. Settings — regroup into relevant tabs

### Current: `Account · Shop · Appearance` (with Integrations buried inside Account)

### Proposed
```
Profile        — your name, email, password, language, delete account
Shop           — shop name, headline, about, currency, contact, storefront URL,  + SHIPPING (missing today), + storefront-type toggle
Integrations   — Instagram / Facebook connect + status  (promoted out of Account)
Notifications  — email prefs (or hide until the "coming soon" toggles actually ship)
App theme      — the app-appearance panel (was "Appearance")
```
Rationale: one tab per real concern; **Shipping settings currently have no home** (only per-order + as a promo type) — add them under Shop. Integrations deserves its own tab (it's the make-or-break onboarding step), not a card inside Account.

---

## 5. Header — add the missing account menu

The top bar is only Title + Search + "Shop URL". Standard SaaS expectation is an **avatar / account menu top-right** — put **Settings, Billing, Language, and Log out** there (they currently live only at the *bottom of the sidebar*, which feels hidden). Also make the **global search cover the whole app** (today it misses Categories, Keywords, Promotions, and Settings sub-tabs — so "shipping"/"currency" find nothing) and deep-link Settings tabs via `?tab=`.

---

## 6. Dashboard — group the actions by intent

`QuickActions` mixes setup, sync, and navigation in one row. Group into labelled clusters: **Set up** (Connect Instagram, Add product) · **Sync** (Quick/Full) · **Go to** (Orders, Storefront, Studio). Give the first-run `GetStartedCard` primacy until the shop has active products.

---

## 7. Floating widgets — one stack, one order

Chat + Notifications now share a bottom-right stack, but **`SyncStatusWidget`** still floats independently and can collide (esp. mobile, above `BottomNav`). → Put all three in one managed stack with a fixed order (Chat · Notifications · Sync) and consistent offsets/z-index.

---

## 8. Storefront (customer-facing) — quick notes

- The customer shop's own top-left brand still shows a generic wordmark rather than the **merchant's shop name** (it should reflect *their* brand, not the platform's).
- Storefront nav (Home / Shop / Orders) is clear; ensure the **cart + "My Orders"** are equally reachable on desktop and mobile (today some live only in drawers via global events).

---

## Priority order (highest understanding-per-effort first)
1. **Rename** Stock→Inventory, Categories→Categories & Types, Keywords→AI Keywords, Settings "Appearance"→"App theme" (+ redirects). _(§2)_
2. **Regroup** the sidebar: move Promotions to Sales, drop the single-item Sales divider. _(§1)_
3. **Kill the redundancy**: remove the orphan `/filters` route + Products gear; fold storefront-filters into the Studio. _(§3)_
4. **Add the header account menu** + make global search cover Settings/Categories/Keywords/Promotions. _(§5)_
5. **Settings tabs**: add Shipping (Shop) + promote Integrations to its own tab. _(§4)_
6. Dashboard action grouping, floating-stack unification, storefront brand name. _(§6–8)_

Each step is independently shippable and non-breaking (with redirects for renamed routes).
