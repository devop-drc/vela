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
- [ ] **⭐ NEXT (direct, fresh session) — Hero film 3D.** Rework the landing hero video's UI demos:
  - Files: `src/compositions/HeroFilm.tsx` + `src/components/landing/story/*` (find where it renders app/storefront UI screenshots or device mockups).
  - **3D perspective:** wrap the UI-demo cards in `perspective` + animated `rotateY/rotateX` (settle-in from depth + gentle sway), same technique as `FinalLaunch25AppDemo`/`29Themes` (`src/compositions/campaign/FinalLaunchDemo.tsx`) — reuse that pattern.
  - **Nicer storefront screenshots (custom + IG):** captured this session and ready to drop in — `public/campaign/custom-storefront.png` (custom theme, `/shop/velaeshop` products page, 1440×900) and `public/campaign/ig-storefront.png` (IG theme mobile, 440×1320). Re-capture if the hero needs other framing (dev server on :5175; custom `/shop/velaeshop`, IG `/instagramShop/dyqani-yt`; Playwright loaded).
  - Verify frame-by-frame (`npx remotion still src/remotion.ts HeroFilm out/verify/... --frame=N`) — it's a polished, pre-rendered landing asset; don't degrade it. If it renders to an alpha WebM, re-render per its existing pipeline.
- [ ] (skipped per owner) Repost-on-restock automation
- [ ] **Repost-on-restock** automation — when stock goes 0→positive, auto-publish a fresh IG post w/ new caption (needs design review before wiring to real publish; rate limits)
- [ ] **New app screenshots** — capture nicer custom + IG theme (owner set up their theme; capture the *public* storefront — no login needed on my side)

## Notes / constraints
- Marketing voice: "sistemi/platforma", never "AI"; multi-currency (ALL/EUR/GBP).
- I will not type account passwords (hard rule) — screenshots use the public storefront.
- Dev server currently running on :5175; demo storefront at `/instagramShop/dyqani-yt`.
