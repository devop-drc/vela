# Vela — active task checklist

Living tracker for the current batch of requests. `[x]` done & committed · `[ ]` todo · `[~]` in progress.

## ✅ Done this session (committed)
- [x] FinalLaunch reels 01–06 (memes + client-POV) with clear value-prop payoffs
- [x] Stills 07–09; Wave 2 reels 10 HowItWorks, 12 WhyVela, 13 WeListen, 14 Stats, 15 TimeCalc; 11 Manifesto
- [x] Posts 16–19 feature spotlights, 20–24 "3 arsye" carousel
- [x] 25 AppDemo, 26 AutoProduct, 27 Storefront
- [x] Format variants: 14 Reels covers + 5 square posts; output organized into `reels/ posts/ covers/ square/`
- [x] OldLek (04) remade for clarity (chat-skit confusion → auto-conversion payoff)
- [x] 05 ClientScroll v1 → real IG storefront screenshot + smooth loop
- [x] WhyVela copy (name reveal + mission + "Provoje tani · linku në bio"); carousel CTA → "Ngri velat."
- [x] Covers: removed "Meme" tag; balanced title wrapping (`text-wrap: balance`)
- [x] **Storefront Studio fix**: draft theme persists on navigation (sticky preview) + instant preview updates (skip GSAP rebuild while editing)
- [x] Answered: auto-archive IG post on stock-out = NOT possible via IG API; repost-on-restock = feasible

## 🎬 Marketing — TODO
- [x] **05 ClientScroll rework** — loops the real product grid only (header/nav cropped), seamless. (Demo candle image broken — fix that product's photo.)
- [x] **25 AppDemo** — 3D perspective tilt + dynamic depth entrance + sway on the UI cards
- [x] **Custom-theme screenshot** — captured `/shop/velaeshop` products page (real custom design)
- [x] **Out-of-stock reel** (28) — customer asks → "…u shit" (lost sale) → Vela shows live "Jashtë stokut" + auto stock (accurate; no false auto-archive claim)
- [x] **Themes reel** — familiar **Instagram theme vs custom design**, using **real UI/screenshots**
- [~] **Real UI everywhere** — 05/25/27/29 use real captured screenshots; meme reels keep intentional mock chat UI
- [~] **Text wrapping** — covers fixed (`text-wrap: balance`); reel headlines use KineticWords word-wrap (balanced)
- [x] **IG shop-name font** — mock IG username now a Helvetica system sans (authentic)
- [~] **Clean re-capture** of IG storefront — nav fixed; candle broken only in IG-theme thumbnail (data issue on that product's photo)

## 🛠️ App / Landing — TODO
- [x] **Storefront page transitions** — soft fade + up-slide on route change (reuses GSAP Reveal; reduced-motion + motion:'none' aware; preview-safe)
- [x] **Hero film 3D (v8)** — `src/compositions/HeroFilm.tsx`:
  - **3D stage:** the browser window, cursor, click chips and order ping now ride ONE tilted plane (`Stage`, perspective 2600) — settles in from depth, then a slow yaw/pitch sway. Sharing the plane is what keeps the cursor landing on its real click targets.
  - **New storefront shots** (`scripts/capture-hero-storefronts.mjs`, light + dark): products grid / product detail / filled checkout, all from the **velaeshop** custom theme — brand-red instead of the old default-blue dyqani-yt shots, and all three beats now come from one shop so the cuts stay continuous. Measured CART/PAY targets still match the film's existing coordinates.
  - **IG theme:** `PhoneIG` floats the Instagram-theme storefront on a phone over the storefront beat; caption is now "Vitrina jote, live — web ose Instagram".
  - Re-render with `node scripts/render-hero-film.mjs` (all 4 variants + mobile encodes + posters).
- [x] **Hero video tap → fullscreen landscape** (`HeroFilmVideo.tsx`) — click/tap (or Enter/Space) TOGGLES fullscreen + landscape lock, plus a corner close button. The WRAPPER goes fullscreen (a `<video>` can't hold the close button); iOS falls back to the native video player. Fullscreen size is capped in **viewport units** — the centred grid row is content-sized, so `max-h-full` resolves cyclically and the video overflows at its intrinsic 2240×1400. Phone path carries the poster tap through to the `<video>` that mounts after it. Fullscreen swaps `object-cover`→`object-contain` and paints HeroFilm's `bakedBg` behind the alpha WebM (otherwise transparent pixels land on black). Orientation lock is Android-Chrome-only; iOS/desktop fall back to plain fullscreen.
- [x] **App-side mobile audit (modals + elements)** — verified live against the real admin app in Chrome at 320 / 375 / 768 / 1440:
  - **Global (globals.css)**: centred Dialog/AlertDialog content now gets a phone gutter, a `90dvh` height cap with scroll, rounded corners, a header `pr` so the title clears the ✕, and a gap between stacked footer buttons. Tablets (≤1023px) get a 2rem gutter so rem-sized dialogs (`max-w-2xl…6xl`) stop running edge-to-edge. Scoped by the centring utility so Sheets/Drawers are untouched, and gated behind `sm` so desktop is byte-for-byte unchanged (verified at 1440).
  - Every modal-height `vh` → `dvh` (mobile browser chrome no longer eats the footer).
  - `ProductEditMode`: Radix ScrollArea `display:table` blowout (from `-ml-4` / `-m-0.5`) clipped the form's text at 320px → viewport child forced to `block`; tab strip cleared of the ✕; specs header wraps; category/type comboboxes wrap.
  - `ProductViewMode`: variant rows were 136px tall on a phone (fixed price/stock columns squeezed the label column) → price/stock wrap to their own line.
  - Form grids stack on phones (Promotion editor, Announcement editor, Add-product wizard); IG post modal header wraps + stacked panes get a fixed height split; Filter drawer's ✕ back on the title row (`flex` was missing on a grid-based `DrawerHeader`).
  - Fixed React 18 `fetchPriority` console error (`MediaItem`, `HeroFilmVideo`).
  - Verified: 0 horizontal overflow on all 12 admin routes at 320px.
- [ ] (skipped per owner) Repost-on-restock automation
- [ ] **Repost-on-restock** automation — when stock goes 0→positive, auto-publish a fresh IG post w/ new caption (needs design review before wiring to real publish; rate limits)
- [ ] **New app screenshots** — capture nicer custom + IG theme (owner set up their theme; capture the *public* storefront — no login needed on my side)

## Notes / constraints
- Marketing voice: "sistemi/platforma", never "AI"; multi-currency (ALL/EUR/GBP).
- I will not type account passwords (hard rule) — screenshots use the public storefront.
- Dev server currently running on :5175; demo storefront at `/instagramShop/dyqani-yt`.

## 🔎 Found during the mobile audit — not fixed (need a decision)
- **1000 variant rows render un-virtualized** in the product modal's variants list (~90,000px of DOM on a phone). Real perf hit on mobile; fixing means adding virtualization to `ProductViewMode` + `VariantsManager`.
- **Floating chat/notification bubbles** sit low enough to cover filter pills / selects at rest on Products, Orders and Stock. Inherent to FABs (scrolling reveals), but worth raising them above the bottom nav.
- **`src/components/storefront/InstagramCartModal.tsx` is dead code** and imports `SheetHeader/SheetTitle/SheetDescription/SheetFooter`, which `ui/sheet.tsx` does not export — it would crash if ever mounted. Same `flex-row`-on-a-grid header bug as the filter drawer.
- **Storefront Studio fires 5 failed asset requests** per load (400s probing `logo.jpeg/jpg/png`, `favicon.ico/png` for shops without a logo).
