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
- [ ] **05 ClientScroll rework** — use the real IG theme filled with products; seamlessly loop **only the product grid** (past the profile header), not the whole page looping back
- [ ] **25 AppDemo** — more dynamic animation + **3D perspective** on the UI cards
- [ ] **Out-of-stock reel** — customer asks about an out-of-stock product → Vela shows live "Jashtë stokut" + notify-me + auto stock (accurate; no false auto-archive claim)
- [ ] **Themes reel** — familiar **Instagram theme vs custom design**, using **real UI/screenshots**
- [ ] **Real UI everywhere** — prefer real app/landing screenshots over mock UI in the reels
- [ ] **Text wrapping** — no split/awkward multi-line headers across all reels (covers done; apply `text-wrap: balance` to remaining headlines)
- [ ] **IG shop-name font** — style the shop name in IG mockups like real Instagram
- [ ] **Clean re-capture** of IG storefront (fix broken candle image + sticky-nav-baked-mid-page artifact)

## 🛠️ App / Landing — TODO
- [ ] **Storefront page transitions** — clean fade/slide on route change between storefront pages
- [ ] **Hero film** — 3D perspectives for the UI demos + nicer storefront screenshot (custom + IG theme)
- [ ] **Repost-on-restock** automation — when stock goes 0→positive, auto-publish a fresh IG post w/ new caption (needs design review before wiring to real publish; rate limits)
- [ ] **New app screenshots** — capture nicer custom + IG theme (owner set up their theme; capture the *public* storefront — no login needed on my side)

## Notes / constraints
- Marketing voice: "sistemi/platforma", never "AI"; multi-currency (ALL/EUR/GBP).
- I will not type account passwords (hard rule) — screenshots use the public storefront.
- Dev server currently running on :5175; demo storefront at `/instagramShop/dyqani-yt`.
