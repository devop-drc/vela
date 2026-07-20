# Vela — FINAL campaign (July 2026) · plan, validation & build spec

Every asset below exists in **two languages** (`final/en/`, `final/sq/`) from
one parameterized Remotion codebase (`src/compositions/marketing/final/`).
Prior waves live untouched in `../first-generations/`.

## Trend base (researched 2026-07-21)

| Finding | How this campaign applies it |
|---|---|
| Hooks must be *emotionally/utility specific* in ≤3s; completion rate is the ranking king | Every video opens with a specific claim or named pain, never vague curiosity; all videos ≤30s, quick ones ≤15s |
| **Carousels now beat Reels on engagement/saves; seamless panoramas get ~2× swipe-through** | The flagship asset is a 5-slide *continuous-canvas* carousel (5400×1350 panorama): a gradient journey beam, a dashed course line and the Vela boat physically cross every slide boundary so the eye demands the next swipe |
| Fast emotional payoff, ONE takeaway per video | Each asset owns exactly one message (see coverage matrix) |
| Reveal-transition formats (wipe/cut-on-beat) are the native grammar | Gradient blade micro-wipes between chapters; hard cuts at ~60% for payoffs |
| Soft premium aesthetic: vibrant gradients, glassmorphism, clean type | Existing Vela system (night canvas + wine→neon→gold, Clash/Satoshi, frosted cards) is already the trend — kept |
| Series energy > one-offs | All assets share the chapter-dot system + numbering so the feed reads as one series |

Sources: newengen.com/insights/instagram-trends, thesocialcontentfactory.com/reel-trends,
slidycreator.com/blog/instagram-carousel-trends, socialchamp.com/blog/instagram-carousel,
startups.co.uk/news/social-media-trends-july-2026.

## Coverage matrix — every feature, every pain point

| Feature / pain | Primary asset | Also appears in |
|---|---|---|
| The system: post → product (magic) | FS1 single post | FR1, carousel s2 |
| 5-minute setup, zero code | FP2 post video | FR2, carousel s2 |
| Storefront themes / your brand | FR1 ch.2 | FP1, carousel s3 |
| Shop = one link | FR1 ch.2 | carousel s3 |
| Bilingual storefront (SQ/EN) + light/dark | carousel s3 | FST2 |
| Orders in one panel | FP1 post video | FR1 ch.4, carousel s4 |
| Stock & variants auto-count | FP1 | FR2 ("Excel ✗"), carousel s4 |
| Card + cash payments, multi-currency | FS2 single post | FR1 ch.3, carousel s3 |
| RaiAccept / bank-grade security | FS2 | FR3, carousel s5 badge |
| Analytics (revenue/visitors) | FP1 | FR1 ch.4, carousel s4 |
| Sells 24/7 while you sleep | FR3 reel | FST2 |
| Tiered trials 7/14/30 | FST1 story | carousel s5, FR1 end-line |
| PAIN: DM chaos / "price in DM" | FR2 | carousel s1 |
| PAIN: can't afford developers/website | FR2 | FP2 |
| PAIN: notebook/Excel stock | FR2 | FP1 |
| PAIN: cash-only friction & trust | FR3 | FS2 |

Pace mix: **quick & punchy** = FR2, FR3, FP2, FS1, FS2, stories · **thorough &
detailed** = FR1 (30s), FP1 (20s), carousel.

---

## REELS (1080×1920 · 30fps · TikTok-safe zones: 150px top / 240px bottom)

### FR1 · `reels/01-the-machine` — the whole machine, ~30s (thorough)
**Idea:** one unbroken chain from an Instagram post to money in the bank —
every feature shown *working together*, chaptered like a mini-doc.
**Validation:** "how it works" chains are the highest-saving b2b reel format;
30s is the ceiling recommendation; chapter dots exploit completion behavior.
**Timeline** (s): 0–2 HOOK — "Your Instagram is already a shop. It just
doesn't know it yet." / "Instagrami yt është tashmë dyqan. Thjesht s'e di
ende." · 2–7 CH1 "SYSTEM" — IG post card springs in, gradient scan-line reads it,
chips fly out (name ✓ price ✓ sizes ✓), card MORPHS into product card ·
7–12 CH2 "SHOP" — theme dots hop (card re-brands live), link bar types
`dyqani-yt.vela.al` · 12–17 CH3 "MONEY" — order notif ×2, checkout success
ring, RaiAccept badge, currency odometer · 17–24 CH4 "CONTROL" — panel
window assembles (toggle ON, order flips "shipped"), stat tiles count up ·
24–30 PAYOFF — "It all clicks together. By itself." + boat + CTA
"Try free → vela.al · 7, 14 or 30 days".
**Techniques:** weighted springs, blur-rise, scan-line, container morph,
gradient blade micro-wipes between chapters, 4 chapter dots (top, safe zone),
odometer counters, bob-floating boat.

### FR2 · `reels/02-you-dont-need` — rapid pain-kill, ~15s (quick)
**Idea:** the anti-shopping-list: everything a merchant thinks they need,
struck through at speed; the only thing left is their Instagram.
**Validation:** listicle-negation hooks ("you don't need X") are a top
July-2026 opener; 0.9s/beat cutting matches native pacing; ends inside 15s.
**Timeline:** 0–1.5 HOOK "Opening an online shop? You DON'T need:" · then
five 1.6s beats, each = word slam + red strike-through draw + tiny visual:
Developer 👨‍💻 / Designer 🎨 / Excel 📊 / Warehouse app 📦 / A bank visit 🏦 ·
12–15 PAYOFF "You need your Instagram. That's it." + CTA.
**Techniques:** kinetic type slams (scale-settle springs), animated
strike-through (scaleX draw), punch-zooms, micro screen-shake per slam,
emoji props, beat-matched cadence for in-app sound sync.

### FR3 · `reels/03-open-247` — sells while you sleep + trust, ~13s (emotional)
**Idea:** the 23:47 order — the moment that makes merchants believe; now
fused with the trust answer (bank-grade payments) so desire and doubt are
handled in one video.
**Timeline:** 0–1.5 HOOK giant gradient "23:47" · 1.5–6 two order notifs drop
like lockscreen pings + "You're asleep. Your shop isn't." · 6–9.5 padlock
snaps shut + RaiAccept badge + "Card payments, bank-secured." + currency
odometer · 9.5–13 payoff "Open 24/7. Even when you're not." + CTA.
**Techniques:** notification drop physics (negative-Y springs), padlock
shackle spring, glow pulses, currency odometer.

### Reel cover · `reel-covers/01-the-machine.png` — grid-ready 9:16 poster of
FR1 (journey icons chained by the beam) so profile-grid browsing sells too.

## POST VIDEOS (1080×1350 · 30fps)

### FP1 · `posts/01-control-room` — the panel deep-dive, ~20s (thorough)
**Idea:** a guided tour of the admin as a "control room": orders → stock →
revenue → your brand. Left chapter rail = series signature.
**Timeline:** 0–2 HOOK "One screen runs the whole shop." · 2–7 ORDERS —
order row ships (3D badge flip) · 7–11 STOCK — size-42 odometer 12→11 as an
order lands · 11–15 MONEY — revenue tile counts to 84,500 L, visitors 341 ·
15–20 BRAND — theme dots hop, card re-skins + payoff "Everything. One
panel." + CTA.
**Techniques:** chapter rail with active-state slide, odometer roll,
rotateX badge flip, count-up tweens, theme crossfade morph.

### FP2 · `posts/02-five-minutes` — speedrun, ~10s (quick)
**Idea:** the 5:00→0:00 countdown compressed to 10 real seconds — a literal
speedrun of going online. **Timeline:** 0–1 HOOK "Shop. Live. 5 minutes." ·
1–8 timer blitzes down while 3 step rows fill (connect 30s → the system builds 3min
→ publish 90s) · 8–10 "GATI." stamp + CTA.
**Techniques:** time-lapse counter (eased, non-linear), progress bars with
gradient fill, stamp-in with rotation settle, confetti-free (clean).

## SINGLE IMAGE POSTS (1080×1350) — the numbered SYSTEM SERIES

Rebuilt in the legacy visual anatomy (eyebrow pill + gradient dot, @vela.al
handle, real UI-card fragments, letterspaced footer) after the first drafts
read too generic. Five posts, one per part of the system, labeled in order,
alternating canvases like the legacy grid rhythm:

| # | file (en / sq) | canvas | shows |
|---|---|---|---|
| 01 | the-system / sistemi | night | IG post card → gradient arrow → product card; "Same post. Now it sells." |
| 02 | the-shop / dyqani | light | three theme-colored product cards fanned + link pill; "Your brand. One link." |
| 03 | payments / pagesat | duo | white checkout-success card on night + currency chips + RaiAccept badge |
| 04 | control / kontrolli | night | frosted stat tiles (orders/revenue/products/visitors); "Everything under control." |
| 05 | the-harbor / porti | light | boat + trial tier rows 7/14/30; "Start free." |

Post them in order across the week — the labels make the feed read as a
numbered course on how the system works; each also stands alone.

## CAROUSEL (5 × 1080×1350 · seamless 5400px continuous canvas)

### FCAR · `carousels/01-voyage-{1..5}.png` — "The voyage of one post"
**The flagship.** One 5400px panorama: a wine→gold gradient JOURNEY BEAM and
a dashed course line flow through all 5 slides; the Vela boat sails the line,
positioned so it straddles every slide boundary (half on each) — the
psychological swipe-pull. Cards also bleed across cuts.
- **S1 HOOK:** "Every post you make is a shop that never opened." + DM chaos
  bubbles sinking behind the beam start. Corner: "swipe →" and dots 1/5.
- **S2 AI:** IG post card (half of it continues from S1's edge) + scan chips
  name/price/sizes ✓ + "AI builds the product. You just posted."
- **S3 SHOP:** storefront card in 3 theme colors + link pill
  `dyqani-yt.vela.al` + chips: SQ/EN · light/dark · card+cash · L € $.
- **S4 CONTROL:** panel strip (order shipped ✓, stock 11, revenue tile) —
  "Orders, stock, money — one panel."
- **S5 HARBOR:** boat arrives at gradient harbor glow; trial tiers 7/14/30 as
  three moored flags; CTA "Start free → vela.al" + RaiAccept badge footer.
**Validation:** seamless panoramas: ~40% higher completion, 2× swipe-through;
saves-bait via the S3/S4 utility slides.

## STORIES (1080×1920 · link-sticker space reserved)

Both stories keep **y 1150–1560 EMPTY** except a faint dashed "drop link
here" ghost — the link sticker + polls get added in-app. Content lives in
the top 60%; CTA arrow points into the reserved zone.

### FST1 · `stories/01-trial-picker.png` — "Choose how you start": three
tier cards (Business 7 days / Pro 14 / Starter 30) with "same app, full
power" note → arrow to sticker zone → "Tap the link."
### FST2 · `stories/02-tonight.png` — "While you sleep tonight:" checklist
(orders in ✓ stock counted ✓ cards charged ✓ totals ready ✓) + 23:47 clock →
arrow to sticker zone.

## TIKTOK (`tiktok/` in each language folder)

FR2 and FR3 masters are TikTok-safe (safe zones, silent, beat-marked).
Captions there are shorter + comment-bait; attach Commercial-Music-Library
sounds in-app: FR2 → fast-cut percussive; FR3 → soft night-lofi that stops
on the padlock snap. The first-generation meme set (../first-generations/
tiktok) stays the organic warm-up layer; these are the ad-ready layer.

## Captions (post with the asset — EN / SQ)

- FR1: "From a post to a paid order — nothing manual in between. 🛠️→💸 Try
  free: 7, 14 or 30 days → vela.al" / "Nga një postim te një porosi e paguar
  — asgjë manuale në mes. Provo falas: 7, 14 ose 30 ditë → vela.al"
- FR2: "The full startup kit: your Instagram. That's the list. ✅" / "I
  gjithë 'kompleti i biznesit': Instagrami yt. Kaq është lista. ✅"
- FR3: "The best orders arrive at 23:47. 😴💸 Bank-secured card payments →
  vela.al" / "Porositë më të mira vijnë në 23:47. 😴💸 Pagesa të siguruara
  nga banka → vela.al"
- FP1: "POV: your whole business fits on one screen. 📊" / "POV: i gjithë
  biznesi yt futet në një ekran. 📊"
- FP2: "Speedrun: online shop in 5 minutes, no code. ⏱️" / "Speedrun: dyqan
  online për 5 minuta, pa kod. ⏱️"
- FS1: "Left: a post. Right: a business. Same photo. 🧠" / "Majtas: një
  postim. Djathtas: një biznes. E njëjta foto. 🧠"
- FS2: "Card, cash, any currency — secured by Raiffeisen's RaiAccept. 🔒" /
  "Kartë, kesh, çdo monedhë — siguruar nga RaiAccept i Raiffeisen. 🔒"
- FCAR: "The voyage of one post → swipe to the harbor. ⛵ (save this)" /
  "Udhëtimi i një postimi → rrëshqit deri në port. ⛵ (ruaje këtë)"
- Hashtags EN: #onlineshop #instagramseller #smallbusiness #vela ·
  SQ: #dyqanionline #biznesonline #shitjeonline #vela

## Build notes

- All comps take `{ lang: 'en' | 'sq' }` via Remotion props → render twice.
- Carousel comp takes `{ lang, slide }`; the 5400px panorama renders per
  slide with `translateX(-slide*1080)`.
- Re-render everything: `node scripts/render-final-marketing.mjs` (writes
  both language trees).
