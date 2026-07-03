# InstantShop — Master Improvement & Monetization Plan

> Living document. Owner: Darien. Created 2026-07-02.
> Status legend: ☐ not started · ◐ in progress · ☑ done

This plan covers the full scope requested:
1. App-wide walkthrough & bug/logic/design fixes
2. Layout & design polish
3. Completing **Storefront Studio** into a cohesive, full-coverage design tool
4. A high-converting, GSAP-animated **landing page**
5. **Pricing** strategy for the Albanian market
6. A **paywall + 7-day free trial** (SaaS subscription system)
7. **Online payments** via Raiffeisen Albania **RaiAccept**
8. An **admin panel** to manage all users
9. **Onboarding** with tutorials via **React Joyride**

---

## 0. Current State (verified via codebase audit, 2026-07-02)

### Stack
React 18.3 + TS + Vite 6, Tailwind + shadcn/Radix, TanStack Query + 9 React Contexts, i18next (en/sq), framer-motion. Backend: Supabase (Postgres + Auth + 20+ Deno edge functions + realtime + storage). No GSAP, no tour lib, no payment SDK.

### Routing / layouts
Four layouts in `App.tsx`: DashboardLayout (behind `ProtectedRoute`), custom Storefront (`/shop/*`), Instagram Shop (`/instagramShop/*`), Auth pages. **No `OnboardingGuard`.**

### Data model (Supabase)
User chain: `auth.users` (= `profiles.id`) → `businesses` (1:1) → `shop_details` (1:1). Trigger `handle_new_business` auto-creates all three on signup. `design_settings(user_id PK, settings jsonb)` holds both dashboard theme (flat keys) and Storefront Studio config (`settings.storefront`). RLS is **strictly per-owner**; `profiles` has **no email/role/plan** columns.

### Billing / payments — GREENFIELD
- No SaaS subscription/plan/trial/billing tables or code.
- No payment gateway. Customer checkout = Cash on Delivery; card is a cosmetic TODO. Orders persist in ALL via `place_order` RPC.
- `pricing_type`/`billing_interval` in code = a *merchant's product* attribute, unrelated to us billing them.

### Admin — GREENFIELD
No role/is_admin concept; RLS blocks reading other users. Needs a role mechanism + service-role edge function; emails live in `auth.users` (service-role only).

### Storefront Studio — ~PHASES 1–5 DONE
Built at `src/components/settings/studio/` + `src/storefront/`. Working: token engine (scoped `data-storefront-root`), 8 templates, live iframe preview via postMessage, homepage page-builder, header/footer/nav/card variants, colors/type/shape/effects panels.
**Gaps:** product-detail page builder is dead config (never rendered; `ProductDetailPage` hardcoded); **reviews don't render** on custom storefront; `nav.desktop:'sidebar'` is a no-op; footer `columns` == `rich`; ~9 spec content blocks missing (promoBanner, richText, valueProps, testimonials, newsletter, instagramGallery, productCarousel, splitFeature, spacer/divider, featuredCollection); no per-block prop editor; no drag-reorder; no gradient builder / dark-token editor / contrast checker / shadow tint / background pattern+filters UI; line-height & body-weight not exposed; no save-as-template; no undo/redo; no single-product fetch (deep-link paginates whole catalog).

### Dashboard UI
Good token discipline, skeletons, empty states. **Issues:** floating-layout mobile gutter bug (`paddingLeft: calc(var(--sidebar-width)…)` applied even when sidebar hidden); duplicated ad-hoc status color maps w/ inconsistent dark variants (StatCard, ActivityFeed, Orders `getStatusColor`, Products chips, Promotions); raw red overrides on Products Import/Sync buttons; mixed shadow scale in Products toolbar; **no React error boundary**; inline error+retry only on Index; `GetStartedCard` fully untranslated + many toasts hardcoded English; duplicate integration status in Account tab; page-local `StatCard` name collision in Promotions; read-only profile (no edit form).

---

## 1. App-Wide Fixes (Phase 1 — foundation)

### 1.1 Reliability
- ☑ Fix `loadError` undefined crash in `Index.tsx` (hook didn't return it). **DONE.**
- ☐ Add a route-level **ErrorBoundary** wrapping the dashboard `<Outlet/>` in `DashboardLayout` (and storefront). Friendly fallback + reload/retry. (currently a render error blanks the whole SPA.)
- ☐ Add inline **error + retry** states to Orders, Keywords, Categories, Promotions, Settings (only Index has one). Standardize on a shared `<QueryError onRetry/>` component.

### 1.2 Layout bug
- ☐ `DashboardLayout` floating mode: don't apply the sidebar-width left padding on mobile (sidebar is hidden, `BottomNav` shows). Add mobile horizontal padding; replace magic `pt-24`/`7rem` with a shared CSS var (`--header-h`).
- ☐ Reconcile `docked` vs `floating` padding systems so page spacing doesn't depend on an appearance setting.

### 1.3 Design tokens / consistency
- ☐ Introduce semantic status tokens (`--success`, `--warning`, `--info`, `--danger` + `-foreground` + subtle bg variants) in `index.css` for light & dark. One shared `statusStyles` map in `src/lib/statusColors.ts`.
- ☐ Refactor StatCard `colorMap`, ActivityFeed `TYPE_CONFIG`, Orders `getStatusColor`, Products stat chips, Promotions `statusConfig`, ProductCard stock badges to use it (fixes missing dark variants).
- ☐ Replace raw red overrides on Products Import/Sync buttons with a proper `variant`/token; normalize the mixed `shadow-sm/md/lg` toolbar.
- ☐ Adopt a single radius scale (map ad-hoc `rounded-md/lg/xl/2xl` to a documented scale).
- ☐ Rename page-local `StatCard` in Promotions (or reuse shared one).

### 1.4 i18n gaps
- ☐ Translate `GetStartedCard`, Products single-delete dialog, Orders cancel dialog, Promotions label helpers (`getPromotionDetails`/`getTypeLabel`/`statusConfig`), and the `showError/showSuccess` toast strings. Add missing `sq` keys.

### 1.5 Settings polish
- ☐ Make profile fields editable (name/phone form) in `AccountSettings`.
- ☐ De-duplicate integration status (shown twice on Account tab); give Integrations its own tab.
- ☐ Wire or clearly gate the `comingSoon` notification prefs.

---

## 2. Layout & Design Polish (Phase 2)

- ☐ Dashboard home (`Index`): relax the rigid `h-[calc(100vh-7rem)]` full-viewport lock; allow natural scroll on short laptops so the right column (Profile/Top Sellers/Activity) isn't cramped.
- ☐ Consistent page header pattern (title + subtitle + actions) component across pages.
- ☐ Density & spacing audit pass on Products toolbar and Orders filters.
- ☐ Dark mode QA sweep across all dashboard pages after token refactor.
- ☐ Empty/loading/error state consistency sweep (shared components).

---

## 3. Storefront Studio — Complete the Tool (Phase 3)

Goal: make Studio cover **every** design aspect of the custom storefront, cohesively.

### 3.−1 STOREFRONT REBUILD — ✅ SHIPPED 2026-07-03 (owner request 2026-07-02: "rework completely from scratch, modular, multiple layouts/design styles per section and page, perfect on any screen size")
Assessment held: rebuilt the RENDERING LAYER on the existing token-engine/registry skeleton. Delivered:
- ☑ **Section variants** (registry metadata `variantProp`/`variants`/`editableProps` drives the Studio picker): hero 8 (banner/full/split/**collage**/**editorial**/minimal/compact/gradient; split now falls back to a product photo), product sections 4 (carousel/grid/**masonry**/**editorial rows**), categoryGrid 3 (tiles/**pills**/**photo mosaic**), announcement 4 (marquee/static/gradient/**stacked pills**), viewAllCta 3 (button/**gradient banner**/**link**).
- ☑ **New content blocks**: `valueProps` (row/cards), `richText` (centered/split, defaults to shop about), `promoBanner` (gradient/outline). `newsletter` deliberately deferred until email backend exists (no fake forms).
- ☑ **Product-detail page composable**: 7 detail blocks registered (gallery w/ carousel/grid variant, productInfo, description, variantSelector, addToCart, specifications, relatedProducts); `ProductDetailPage` renders `config.pages.productDetail` via `ProductDetailContext` (gallery + info-column blocks side-by-side per `DETAIL_INFO_COLUMN_TYPES`, rest below). Verified live with real products.
- ☑ **All 8 templates recomposed** with distinct variant mixes (editorial = masthead+mosaic+editorial-rows; boutique = collage+masonry; organic = stacked pills+value cards+polaroid masonry; etc.).
- ☑ **Studio editor**: new `SectionList` (@dnd-kit drag reorder, per-row expand → variant pills + prop editors) for home AND productDetail lists; add-section menus for both scopes; nav-tab hero picker now reads registry variants. Verified end-to-end (pick collage → saved to design_settings → live shop renders it).
- ☑ **Responsive QA matrix**: 8 templates × {360, 768, 3440} home + real-shop detail/products/cart/orders at 360 — zero horizontal overflow after fixes. Bugs fixed: centered header didn't collapse nav on mobile (aurora/boutique overflow); gradient marquee wrapper missing overflow-hidden; DemoShop home missing sf-container.
- Incidental fixes: **supabase-js 2.57.4 → 2.110.0** (cold-load `getSession()` navigator-locks deadlock = infinite spinner on every full page load with a stored session — critical); `LayoutWireframe` crash (`HeaderBar is not defined` → white-screen on Studio Layout tab); bestSellers duplicate-key fallback (`product_id ?? id`); admin account provisioned (business + shop `darien-shop-9644` + 6 test products + 30-day trial via admin-api).
- Deferred to later phases: reviews block (§3.0), per-page layout presets beyond current products/orders options, container queries (not needed — zero overflow as-is), 1024/1440 sweep columns (covered by spot checks).

### 3.0 Client (customer) accounts + full review system — ADDED 2026-07-02
- ☐ **Client register/login** on the storefront: lightweight customer auth so shoppers can create an account, see order history, and leave reviews as a verified user. Options: Supabase Auth (separate "customer" role) scoped per-shop, or a shop-scoped `customers` table. Keep it simple — email/password + magic link, storefront-branded.
- ☐ **Full review system with replies:** reviews on the custom storefront (currently reviews render only on Instagram storefront). Extend `product_reviews` with: merchant **reply** (`reply_message` exists — surface it + timestamp + author), review status/moderation, helpful votes, verified-purchase badge (already order-gated via `submit-review`). Merchant-side review management UI (list, reply, hide/report). Customer-side: write/edit own review, see merchant replies. Wire into product-detail block (§3.1).

### 3.1 Make product-detail editable (highest value)
- ☐ Implement productDetail blocks in the registry: `gallery`, `productInfo`, `variantSelector`, `addToCart`, `description`, `specifications`, `reviews`, `relatedProducts`.
- ☐ Refactor `ProductDetailPage.tsx` to render `config.pages.productDetail` via `SectionRenderer` (remove hardcoding).
- ☐ Add a **Reviews** block/section to the custom storefront (port/generalize `ProductReviews.tsx` which is currently Instagram-only). Wire to `submit-review` + `product_reviews`.
- ☐ Add `fetchProductById` to `StorefrontContext` + a `get-public-product` edge function (fixes deep-link pagination limitation).

### 3.2 Missing homepage content blocks
- ☐ Add: `promoBanner`, `richText`, `valueProps`, `testimonials`, `newsletter`, `instagramGallery`, `productCarousel`, `splitFeature`, `featuredCollection`, `spacer/divider`. Each with sensible defaults + variant options.

### 3.3 Per-block editing & reordering
- ☐ Per-block **props editor** panel (title, source, item limit, layout, CTA text/href) in the Sections tab.
- ☐ Replace up/down arrows with **@dnd-kit drag-reorder** (already a dependency).

### 3.4 Fill the design-control gaps
- ☐ **Gradient builder** (from/to/angle) for theme + background gradient stops.
- ☐ **Dark-token editor** (edit `theme.darkTokens` overrides, not just mode switch).
- ☐ **Contrast checker** UI (WCAG AA badges) alongside auto-contrast.
- ☐ **Shadow tint** control (`effects.shadowColor`).
- ☐ Background: **pattern** type + full filter set (saturation/contrast/hue/blur) + curated-image/upload picker (Supabase `shop-assets` bucket).
- ☐ Typography: expose `lineHeight` + `bodyWeight` sliders.

### 3.5 Structural no-ops → real
- ☐ Implement desktop **sidebar navigation** chrome so `nav.desktop:'sidebar'` renders (currently silent no-op).
- ☐ Make footer **`columns`** a distinct multi-column layout (currently == `rich`).

### 3.6 Power features (polish)
- ☐ **Save as custom template** (per-shop template library, parallels legacy `customThemes`).
- ☐ **Undo/redo** (config history stack).
- ☐ "Surprise me / randomize" in Studio.
- ☐ Consider real-renderer iframe thumbnails for templates (currently synthetic skeleton).

---

## 4. Landing / Marketing Page (Phase 4)

New public route `/` (marketing) — but note `/` is currently the dashboard. **Plan:** move the marketing site to `/` for logged-out users and redirect logged-in users to `/dashboard` (rename dashboard route to `/dashboard`, update all nav/links/redirects). Keep `/login`, `/register`, `/demo`.

- ☑ **Route restructure DONE** — dashboard moved to `/dashboard`; Landing at `/`. Updated Sidebar/BottomNav/Header nav, Login/Register redirects, and IntegrationPrompt OAuth `origin` → `/dashboard`. Build green.
- ☑ Add **GSAP** (+ ScrollTrigger) — installed; used only in Landing (lazy chunk). framer-motion stays for app.
- ☑ **Landing page built** (`src/pages/Landing.tsx` + `src/components/landing/useReveal.ts`): sticky blur nav, GSAP hero with looping "IG post → product" phone mockup, stats, problem/solution, 3-step how-it-works, 6 feature cards, Storefront Studio spotlight, pricing (monthly/annual toggle, 990/1990/3990 ALL), testimonials, FAQ accordion, gradient CTA, footer. Reduced-motion aware. Redirects authed users to `/dashboard`.
- ☑ **Landing v2 redesign (2026-07-02):** React Bits-style components implemented locally in `src/components/landing/bits.tsx` (SplitText, BlurText, ShinyText, SpotlightCard, Tilted, StarBorder, Particles) + `landing.css`.
- ☑ **Landing v4 final (2026-07-02):** **Light-first theme with dark toggle** (scoped `.landing` / `.landing-dark` token overrides — app untouched); **Albanian-primary bilingual copy** (`src/components/landing/copy.ts`, sq default for new visitors, SQ/EN switcher in nav wired to app i18n); **Clash Display + Satoshi** via Fontshare; **full-screen hero** (100svh) with browser+phone DOM storefront mockups, floating order/revenue/IG cards, mouse parallax, SplitText/BlurText, particles, aurora, grid; per-section upgrades: bordered stats band w/ counters, split problem/solution cards (grad-border), how-it-works w/ ghost numerals + scroll-drawn line, bento w/ decorative art (AI flow, RaiAccept card, order rows), studio w/ pulsing swatches + color-morph demo, gradient-border featured pricing, testimonial initials/quotes, FAQ card, breathing CTA panel, 3-column footer. Three.js was tried then removed per owner. Visually verified light+dark, sq+en via Playwright. Fixed: spotlight-card position override bug, heading tracking, badge overlap.
- ☑ **Landing v5 (2026-07-02):** hero browser mock now renders the **real app** — `/demo` dashboard in a scaled iframe (desktop, mounted after hero settles, DOM storefront preview as instant fallback; URL pill flips to /demo when live); phone mock matches real storefront ProductCard (4:5 images); **annual = 2 months free on Pro & Business only** (Starter billed 12×); **smooth anchor scrolling** (`html.ls-smooth` + scroll-padding); **animated hero bg** (rotating conic mesh + aurora + particles + grid); branding pass (Eyebrow section labels, refined BrandMark, brand selection color); **marquee v2** — two rows opposite directions, Remix icon chips (react-icons/ri) with tinted circles, edge fade masks; mobile responsive pass (floating cards hidden <sm, bento title width fix). Verified desktop+mobile via Playwright; fixed spotlight glow clipping the featured-pricing badge.
- ☑ **Landing v6 — real UI everywhere (2026-07-02):** new public `/demo-shop` route (`src/pages/DemoShop.tsx`) renders the REAL storefront (actual Header/HeroBlock/SectionRenderer/Footer + token engine) over mock Albanian boutique data via the now-exported `StorefrontContext` + real `CartProvider`; supports `?template=<id>` and `?cycle=1` (rotates through real Studio templates with crossfade). Landing hero phone = `/demo-shop` iframe (scaled, DOM fallback); Studio panel = `/demo-shop?cycle=1` iframe showing real template switching; hero browser stays `/demo` (real dashboard). All verified via Playwright.
- ☑ **Landing v7 (2026-07-02):** annual "2 months free" moved off the billing toggle into gift chips on the Pro/Business cards; testimonials section hidden (no real reviews yet — JSX commented, copy kept); new **"I'm interested"** section (`#interest`): one-click mailto to info@squaddcrm.com with prefilled sq/en template + name/message form composing a custom mailto; more idle motion (browser mock slow float, step-icon bobbing, CTA bolt wiggle, pulsing eyebrow dots, drifting CTA grid); card design pass (`.ls-card` top gradient hairline + layered shadows); new React Bits pieces: **CircularText** rotating hero sticker, **GlareHover** sweep on bento/interest cards. Verified via Playwright.
- ☑ **Landing v8 — design-lead pass (2026-07-02, via frontend-design plugin skill):** signature element added — an orchestrated **"Sa kushton?" Instagram DM story** in the hero (customer bubble → typing dots → gradient seller reply with shop-link card; GSAP loop, sq/en) replacing the generic IG-post skeleton; restraint pass — gradient-text shimmer now reserved for the hero headline only (static gradients elsewhere), redundant "AI ✓" pill removed, stats rebuilt as a quiet dashed **receipt strip** (plain Clash numerals, no gradient billboard); fixed pre-existing duplicate-key React warning in Demo.tsx sidebar. Verified via Playwright MCP plugin.
- ☑ **Landing v9 (2026-07-02):** **GlassSurface navbar** (liquid-glass: backdrop blur+saturate, specular refraction band, inset highlights, both themes); **Remotion journey film** (`src/components/landing/journey/`) — 10-chapter motion graphic of the full flow (IG posts → login → AI sync → products panel → storefront live → search → cart → pay RaiAccept/COD → order lands → fulfill) rendered live via @remotion/player using REAL UI (shadcn primitives + real storefront ProductCard/theme engine + demo data), with animated cursor, synced clickable chapter rail grouped by phase (Lidhja/Lansimi/Klienti/Porosia), pause/progress controls; replaces the old 3-card how-it-works; **AWWWards outline-text marquee divider** ("NGA POSTIMI · TE PAGESA"). Lazy chunk (253kB) loads on demand. Verified playing + seeking via Playwright MCP.
- ☑ **Landing v10 (2026-07-02):** Journey film v2 — faithful Instagram profile UI (story ring, stats, bio, Ndiq/Mesazh, highlights, tabs, 3-col grid), real admin chrome (icon sidebar sq labels, header bar, stat chips, live order badge), blur cross-dissolve scene transitions, in-film narrated info bar (n/10 + title + description + phase), fly-to-cart dot, confetti at launch/fulfill; real Unsplash product photos across all demos (verified URLs); journey section enlarged (88rem, film ~2/3) + CTA at peak understanding; **Lenis inertia scrolling** synced to ScrollTrigger; pricing: **yearly default**, "2 months free" chip only on yearly with grid-rows reveal/collapse animation; Vite stale-cache fix documented (rm node_modules/.vite); reduced-motion diagnosis (Windows animation effects) confirmed with owner.
- ☑ **Landing v11 — full-page audit pass (2026-07-02):** copy tightened everywhere (hero sub → one line; problem/solution items → 3-4 words; bento bodies halved; studio/CTA subs cut — both langs); **section reorder** for narrative: Hero → Problem/Solution → divider → Journey(+CTA) → marquee → stats → bento → studio → pricing → FAQ → interest → CTA → footer (marquee+stats demoted from the priority slot); **journey morph transitions** — browser chrome + info bar render identically across scenes (persistent device illusion), only page content dissolves w/ micro-scale + ≤2.5px blur, URL and bar text fade; **cursor clicks verified accurate** (recomputed geometry; login click frozen-frame verified on the Hyr button; same method for cart/pay/fulfill).
- ☐ **TODO landing (polish):** pause film when offscreen; soften reduced-motion mode (fades instead of nothing); duplicate-key warnings inside /demo iframe; SEO/OG meta; real testimonials (hidden); edge-function email for interest form; self-host demo images before launch.
- ☐ Sections (high-converting, IG-seller narrative):
  1. **Hero** — headline "Turn your Instagram into a store in minutes", animated device mockup showing IG post → product, primary CTA "Start 7-day free trial", social proof strip. GSAP timeline reveal + parallax.
  2. **Problem → Solution** — pain of manual DM selling vs automated storefront.
  3. **How it works** (3 steps: Connect IG → AI builds products → Share your shop link). Scroll-pinned sequence.
  4. **Feature showcase** — AI product analysis, Storefront Studio, order management, inventory, promotions, analytics. Scroll-reveal cards.
  5. **Storefront Studio spotlight** — animated theme-morph preview.
  6. **Pricing** — 3 tiers (from §5) with monthly/annual toggle, "7-day free trial, no card to start".
  7. **Testimonials / results** (placeholder-ready).
  8. **FAQ** (accordion) + final CTA + footer.
- ☐ Fully responsive, dark-mode aware, i18n (en/sq), SEO meta + OG tags, `prefers-reduced-motion` fallback.
- ☐ Performance: lazy-load GSAP, respect Lighthouse.

## 5. Pricing Strategy — Albanian Market (Phase 5, decision-gated)

Context: Albania GDP/capita ~$8k; SMBs price-sensitive; 1 EUR ≈ 100 ALL, 1 USD ≈ 90 ALL. Target buyer = Instagram boutique/reseller. Publer (AL-founded) is $4–8/mo globally; local WTP is lower. All prices stored in ALL, displayed in ALL (with EUR hint).

**Recommended tiers (monthly; annual = 2 months free ≈ 17% off):**

| Tier | ALL/mo | ~EUR | Limits & features |
|---|---|---|---|
| **Free trial** | 0 for 7 days | — | Full Pro access, no card required to start |
| **Starter** | **990** | ~€10 | 1 storefront, up to 50 products, Instagram storefront, COD orders, basic analytics |
| **Pro** ⭐ | **1,990** | ~€20 | Unlimited products, **Storefront Studio (custom)**, promotions, online card payments, full analytics, reviews |
| **Business** | **3,990** | ~€40 | Everything + priority support, advanced analytics, (future) multi-user, higher AI sync limits |

Rationale & alternatives are decision-gated — see "Open Decisions". These numbers are the working default; adjustable via config (`plans` table), no code changes to move them.

---

## 6. Paywall + 7-Day Free Trial (Phase 6)

### 6.1 Data model (new migration)
- ☐ `plans` table: `id text PK` (`starter`/`pro`/`business`), `name`, `price_all int`, `price_all_annual int`, `features jsonb`, `product_limit int null`, `is_active`, `display_order`.
- ☐ `subscriptions` table: `id`, `user_id UNIQUE → auth.users`, `plan_id → plans`, `status text` (`trialing`/`active`/`past_due`/`canceled`/`expired`), `trial_ends_at timestamptz`, `current_period_start/end`, `cancel_at_period_end bool`, `raiaccept_customer_ref text`, `raiaccept_card_token text`, `created_at`, `updated_at`.
- ☐ `payments` table: `id`, `subscription_id`, `user_id`, `amount_all int`, `status`, `raiaccept_order_id`, `raiaccept_transaction_id`, `type` (`initial`/`renewal`/`retry`), `created_at`, raw `payload jsonb`.
- ☐ Extend `handle_new_business` trigger (or a new one) to create a `subscriptions` row with `status='trialing'`, `trial_ends_at = now()+7d`, `plan_id='pro'` on signup.
- ☐ RLS: users read own subscription/payments; writes via service role only.

### 6.2 Entitlements (frontend)
- ☐ `SubscriptionContext` (mount alongside `ShopProvider`): loads subscription + plan, exposes `status`, `isActive` (trialing|active), `trialDaysLeft`, `plan`, `can(feature)`, `withinProductLimit`.
- ☐ `SubscriptionGuard` (parallel to `ProtectedRoute`): if `status ∈ {expired, canceled(past period), past_due}` → route to `/billing` paywall (allow Settings/Billing/Logout only). Trialing/active pass through.
- ☐ Feature gating: Storefront Studio "custom" type + online payments gated to Pro+; product creation gated to plan `product_limit`.
- ☐ Trial UI: banner "X days left in trial → Choose a plan"; nudge at ≤3 days.

### 6.3 Billing page (`/billing` + Settings tab)
- ☐ Plan cards, monthly/annual toggle, current status, renewal date, upgrade/downgrade, cancel, payment history, update card.

## 7. RaiAccept Payment Integration (Phase 7)

Integration model (from docs): username+password (generated in Merchant Portal) + static ClientId `kr2gs4117arvbnaperqff5dml` → Amazon Cognito token. Flow: authenticate → **Create order entry** (with `notificationUrl` webhook + success/failure redirect URLs) → redirect to hosted payment form (redirect or iframe) → return to success/failure URL → **webhook** → **Retrieve order details** to confirm status server-side. **Recurring:** pass `customerReference`; RaiAccept returns a **card token** to store & reuse for renewals. Supports ALL; PCI-DSS/PSD2 compliant. Test cards available in docs.

### 7.1 Secrets & config
- ☐ Store in Supabase secrets: `RAIACCEPT_USERNAME`, `RAIACCEPT_PASSWORD`, `RAIACCEPT_CLIENT_ID`, `RAIACCEPT_BASE_URL`, `RAIACCEPT_WEBHOOK_SECRET`. Sandbox first.

### 7.2 Edge functions (Deno)
- ☐ `raiaccept-auth` helper (shared): Cognito token fetch + cache.
- ☐ `create-subscription-payment`: auth caller → create RaiAccept order entry (amount = plan price ALL, `customerReference = user_id`, redirect + `notificationUrl`) → return hosted payment URL. Insert `payments(status='pending')`.
- ☐ `raiaccept-webhook`: verify signature → call Retrieve order details → on success: store card token on `subscriptions`, set `status='active'`, set period dates, insert/settle `payment`; on failure mark `past_due`.
- ☐ `charge-renewal` (pg_cron daily): for subs with `current_period_end <= now()` and stored token → create recurring charge via token; update period or mark `past_due` (retry schedule).
- ☐ (Optional later) wire the **customer storefront** card checkout to RaiAccept too — the same infra unlocks the long-standing "card payment TODO" for merchants' shoppers. Track separately.

### 7.3 Frontend flow
- ☐ Billing page "Subscribe/Upgrade" → call `create-subscription-payment` → redirect to hosted page (or iframe modal) → return handler polls `payments`/subscription status → success screen.

## 8. Admin Panel (Phase 8)

Route `/admin/*`, gated to admins only.

### 8.1 Access control
- ☐ Add `profiles.role text default 'user'` (or a `user_roles` table + `has_role()` SECURITY DEFINER helper — preferred for RLS). Seed `info@squaddcrm.com` as `admin`.
- ☐ `AdminGuard` (client) + server enforcement: all admin data via a service-role `admin-api` edge function that verifies caller role before returning data (RLS won't let the browser read other users).

### 8.2 Features
- ☐ **Users list**: join `auth.users` (email, created_at, last_sign_in) + `profiles` (name, phone) + `businesses`/`shop_details` (shop name, slug, storefront_type) + `subscriptions` (plan, status, trial_ends_at). Search, sort, filter by plan/status.
- ☐ **User detail**: profile, shop, subscription & payment history, product/order counts, integration status; actions (extend trial, change plan, suspend, impersonate-view-only later).
- ☐ **Dashboard metrics**: total users, trialing vs paying, MRR (ALL), churn, signups over time.
- ☐ Pagination + CSV export.

## 9. Onboarding + Tutorials (Phase 9)

- ☐ Add **react-joyride** dependency.
- ☐ Re-introduce an **OnboardingGuard**: read `profiles.onboarding_complete` (currently hardcoded `true` in Register — change to `false`), route new users through a welcome/setup flow.
- ☐ **Setup wizard** (post-signup): (1) welcome + choose plan/start trial, (2) connect Instagram, (3) run first sync / add first product, (4) pick storefront type & template, (5) go live + copy shop link. Progress tracked; `GetStartedCard` becomes the persistent checklist.
- ☐ **Joyride product tours** per surface: Dashboard, Products, Storefront Studio, Orders. Triggerable from a "?" Help menu; auto-run once per surface (persist "seen" flags).
- ☐ Translate all onboarding/tour copy (en/sq).

---

## Phase 6/7 progress (2026-07-02) — monetization scaffold BUILT
- ☑ Migration `20260702120000_saas_billing.sql`: plans (seeded 990/1990/3990, annual_free_months 0/2/2), subscriptions (card-upfront lifecycle: incomplete→trialing→active→past_due/canceled/expired), payments; RLS read-own/service-role writes; signup trigger creates `incomplete` shell; existing users grandfathered into 7-day trial. **NOT YET APPLIED** — run `supabase db push` (or SQL editor).
- ☑ `SubscriptionContext` (fails open if no sub row → safe pre-migration), `SubscriptionGuard` (locked → /billing; /billing outside guard), `/billing` page (plan cards w/ annual default + bonus badges, status banners, payment history, RaiAccept redirect flow), sidebar link + nav.billing locales.
- ☑ Edge fns: `_shared/raiaccept.ts` (Cognito token w/ cache; env-config BASE_URL since docs are gated), `create-subscription-payment` (JWT auth → order → hosted URL), `raiaccept-webhook` (re-fetches order server-side, settles payment, activates sub, stores card token).
- ☑ **RaiAccept client rewritten against the OFFICIAL docs (owner pasted them 2026-07-02):** auth `https://authenticate.raiaccept.com` (Cognito InitiateAuth wrapper, Bearer **IdToken**); API `https://trapi.raiaccept.com`; hosted form `https://payment.raiaccept.com/checkout?paymentSession=…&preferredLocale=al`. Two-step flow implemented: `POST /orders` (returns `orderIdentification`) → `POST /orders/{id}/checkout` with the **identical payload** (docs requirement). Correct payload schema: `invoice{amount,currency,description,merchantOrderReference(unique=payment uuid),items}`, `paymentMethodPreference:"CARD"`, `urls{successUrl,cancelUrl,failUrl,notificationUrl}`, `recurring{customerReference,recurringModel:"ONE_CLICK_CHECKOUT",cardToken?}`. **Card-upfront trial implemented properly**: `trialSetup` → zero-amount card-verification order (per docs) → webhook starts 7-day trial + stores cardToken. Webhook: parses `order.orderIdentification`/`transaction.statusCode` ("0000"=success), **re-verifies via `POST /orders/{id}/transactions`** before settling (docs: webhooks aren't final), idempotent vs the documented ≤3 retries. Billing handles success/cancel/failure returns.
- ☑ Journey film autoplay fixed (offscreen-pause observer raced Player autoPlay; now tracks explicit user-pause only) — verified advancing live.
- ☑ **DEPLOYED & LIVE-TESTED (2026-07-02, owner-authorized):** migrations `20260702120000` + `20260702130000` applied to remote (plans seeded — verified via REST); secrets set; both functions deployed (webhook `--no-verify-jwt`). **Live API tests against trapi.raiaccept.com:** auth ✓; create order 201 (`orderIdentification: P-005-ORD-…`) ✓; checkout session 201 → response is `{ sessionId, paymentRedirectURL }` (client updated) ✓; zero-amount card-verification requires PURE token flow (no customerReference) — client updated ✓. ⚠️ `P-` prefix (docs demo shows `D-`) ⇒ **these look like PRODUCTION credentials** — real cards will be charged; get sandbox creds for full E2E payment testing, or test with a real card + refund. Billing page: trial CTA (0-ALL card verification) when status=incomplete; expiry cron (`expire_subscriptions`, */30min via pg_cron): trial→expired, active→past_due.
- ☐ REMAINING: full E2E payment test w/ a card (webhook→verification→activation); **unattended auto-charge is NOT in RaiAccept's documented API** (one-click = consumer-present) — current model: expiry → paywall → one-click pay w/ prefilled saved card; ask bank rep about merchant-initiated transactions if true auto-renew is wanted; landing/signup → /billing trial CTA flow polish; webhook IP allowlist if firewalled.

## Phase 8 — ADMIN PANEL: DONE (2026-07-02)
- ☑ `user_roles` table (roles: admin/management/support; RLS read-own; service-role writes) + `has_role()`; migrations `20260702140000` + `150000` applied.
- ☑ `admin-api` edge fn (deployed): JWT + role check on every call; actions: overview (users/trials/active/MRR ALL/signups30), users (paginated + search by email/name/shop), user detail (+payments/product/order counts), extend_trial, set_status, **create_user** (email_confirm'd; auth triggers provision profile/business/shop/subscription; optional admin role).
- ☑ `/admin` UI: stats cards, searchable user table, detail dialog w/ actions, create-account dialog w/ admin checkbox; sidebar link shows only for admins (`useIsAdmin`); route outside SubscriptionGuard.
- ☑ **Owner admin account**: darien.cepani42@gmail.com (user e47bb8ae…, role CONFIRMED, temp password set — change it); earlier squaddcrm account deleted; migration seed updated to the gmail address.
- ☑ **Login/Register redesigned**: shared split-screen `AuthLayout` (brand gradient panel w/ DM story + product + order cards, value bullets, trial messaging), bilingual sq/en, rounded inputs, gradient CTAs; register keeps exact provisioning logic; verified via screenshot.
- ☑ **Brand system v2 (2026-07-02):** Clash Display + Satoshi now load app-wide (globals.css) w/ `.font-display-brand`/`.font-sans-brand` utilities — applied to auth pages; **fluid animated brand gradient** — `.brand-gradient` (4 radial blobs drifting on independent paths over a pink base, 13s alternate, reduced-motion safe) replaced the static gradient EVERYWHERE via the shared BRAND constants (landing buttons/icons/cards/CTA panel/marquee chips tints, journey film, auth panels/buttons, billing); `.grad-border` rim animated w/ pan; AuthLayout v2 (structured floating story grid w/ rotations, display-font headings, footer note). Blob motion verified via time-separated screenshots.

## 10. Instagram Publishing + Post Registry (Phase 10 — ADDED 2026-07-02)

Owner request: manual product → AI caption → auto-post to Instagram; bulletproof post↔product tracking.

- ☐ **`instagram_posts` registry table**: `ig_media_id text PK`, `user_id`, `business_id`, `caption`, `media_url`, `media_type`, `permalink`, `posted_at`, `status` (`new` | `not_product` | `converted` | `published_from_product` | `ignored`), `product_id FK`, `origin` (`instagram` | `app`), `analyzed_at`. Backfill from `products.instagram_post_id` (status=converted). RLS per-owner.
- ☐ **Sync rework**: `background-sync` upserts every fetched media into the registry first; skips `not_product`/`ignored`/`converted`/`published_from_product` (no more re-analyzing non-products on full sync); AI verdict "not a product" → status `not_product`.
- ☐ **`generate-caption` edge fn**: Gemini generates caption + hashtags + price + shop link from product fields; user edits before publishing.
- ☐ **`publish-to-instagram` edge fn**: Graph API `POST /{ig-user-id}/media` (image_url, caption) → `media_publish`; store returned media id in registry as `published_from_product` + `product_id`, origin `app` → future syncs can never duplicate it. Handle 25-posts/day limit + media must be public URL (Supabase storage).
- ☐ **UI**: ProductEditor "Publiko në Instagram" action (caption preview modal); Products page "Postimet" tab listing non-product posts w/ "Ktheje në produkt" / "Injoro" actions.
- ⚠️ **Dependency**: `instagram_content_publish` permission requires Meta App Review for production (dev mode works for owner accounts immediately). Start review early.

## Sequencing

- **Phase 1** App-wide fixes (foundation, no external deps) — start now.
- **Phase 2** Layout/design polish.
- **Phase 3** Storefront Studio completion.
- **Phase 6** Subscription data model + entitlements + paywall (config-driven; independent of exact prices).
- **Phase 8** Admin panel (needs role mechanism).
- **Phase 9** Onboarding + Joyride.
- **Phase 4** Landing page (GSAP).
- **Phase 5/7** Finalize pricing numbers + RaiAccept (needs merchant sandbox creds).

Phases 1–3, 6, 8, 9, 4 can proceed without external credentials. Phase 7 (live payments) needs RaiAccept sandbox credentials from the bank.

## Decisions (confirmed with owner 2026-07-02)
1. **Pricing** — Starter **990** / Pro **1,990** / Business **3,990** ALL/mo (annual = 2 months free). Stored in `plans` config table.
2. **Trial model** — **Card required upfront.** Collect + tokenize card via RaiAccept at signup; 7 days free; auto-charge on day 7; cancel anytime before to avoid charge.
3. **RaiAccept** — Owner HAS credentials (RECEIVED 2026-07-02, stored in gitignored `supabase/.raiaccept.secrets.local`, ClientId `kr2gs4117arvbnaperqff5dml`). Still need: confirm sandbox `RAIACCEPT_BASE_URL`. Set as Supabase Function secrets at Phase 7.
4. **Admin account** — `info@squaddcrm.com`.
5. **Implementation order** — **Landing page (Phase 4) FIRST**, then foundation/monetization/studio/admin/onboarding.

### Implication of "card required upfront"
Trial signup now depends on RaiAccept tokenization, so Phase 6 (paywall) and Phase 7 (RaiAccept) are coupled and must ship together. The onboarding wizard's first step becomes "start trial → enter card (tokenize)". `subscriptions.status='trialing'` still set for 7 days, but a valid `raiaccept_card_token` is required to reach it.
