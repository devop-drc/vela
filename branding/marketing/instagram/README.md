# Vela — Instagram Marketing Set

Motion graphics + typography only. Every asset is **generated from code**
(Remotion compositions in `src/compositions/marketing/`) so it can be
re-rendered, re-worded or re-branded in minutes. Night canvas with the brand
blobs + film grain, Clash Display headlines, the wine→neon→gold gradient as
spice, springs with weight, blur-rise type — the same design language as the
landing page and brand book.

**Re-render everything:**
```bash
# videos
npx remotion render src/remotion.ts ReelChaos     branding/marketing/instagram/reels/01-dm-chaos.mp4   --codec=h264 --crf=19
npx remotion render src/remotion.ts ReelNumbers   branding/marketing/instagram/reels/02-numbers.mp4    --codec=h264 --crf=19
npx remotion render src/remotion.ts ReelManifesto branding/marketing/instagram/reels/03-manifesto.mp4  --codec=h264 --crf=19
npx remotion render src/remotion.ts PostSting     branding/marketing/instagram/posts/01-brand-sting.mp4 --codec=h264 --crf=19
npx remotion render src/remotion.ts PostNoCode    branding/marketing/instagram/posts/02-pa-kod.mp4      --codec=h264 --crf=19
npx remotion render src/remotion.ts PostTrial     branding/marketing/instagram/posts/03-7-dite.mp4      --codec=h264 --crf=19
# stills (--frame=25 so the fade-in chrome is fully visible)
npx remotion still src/remotion.ts StillReelHook      branding/marketing/instagram/reel-stills/01-hook.png       --frame=25
npx remotion still src/remotion.ts StillReelManifesto branding/marketing/instagram/reel-stills/02-manifesto.png  --frame=25
npx remotion still src/remotion.ts StillReelChecklist branding/marketing/instagram/reel-stills/03-checklist.png  --frame=25
npx remotion still src/remotion.ts StillPostQuote     branding/marketing/instagram/post-stills/01-quote.png      --frame=25
npx remotion still src/remotion.ts StillPostLogo      branding/marketing/instagram/post-stills/02-brand-card.png --frame=25
npx remotion still src/remotion.ts GallerySlide1      branding/marketing/instagram/post-stills/03-carousel-1.png --frame=25
npx remotion still src/remotion.ts GallerySlide2      branding/marketing/instagram/post-stills/03-carousel-2.png --frame=25
npx remotion still src/remotion.ts GallerySlide3      branding/marketing/instagram/post-stills/03-carousel-3.png --frame=25
```
**Tweak visually:** `npm run studio` opens Remotion Studio — every composition
appears in the sidebar with a scrubbing timeline; edit the .tsx, see it live.
The `remotion-documentation` MCP server (`.mcp.json`) gives AI assistants
direct access to Remotion docs while editing these.

---

## REELS — video (1080×1920 · 30fps) · `reels/`

### 1 · `01-dm-chaos.mp4` — "DM-t s'janë dyqan" (~11s)
**Prompt / creative brief:**
> Vertical kinetic-typography reel on a near-black wine canvas with slow
> drifting brand-color glow blobs and film grain. Act 1 (0–4s): white
> iMessage-style chat bubbles containing real Albanian DM questions ("Sa
> kushton? 🙏", "A ka masë M?", "Çmimi ju lutem"…) spring in one after
> another, scattered and slightly tilted, faster and faster until the frame
> feels claustrophobic; a red badge counts "47 mesazhe". Act 2 (4–5s): a
> glowing diagonal gradient blade (wine→neon-red→gold) sweeps through like
> the brand's hull-arrow and physically throws every bubble off-screen.
> Act 3 (5–8s): huge Clash Display type slams in with a weighted spring —
> "Ti poston." in white, then "Vela shet." in the brand gradient. Act 4
> (8–11s): the tag-sails boat floats in bobbing gently, CTA pill "Fillo
> falas → vela.al". Handle @vela.al fades in top-center.

**Caption:**
> DM-t s'janë dyqan. Ti poston — Vela shet. 🛍️
> Provo 7 ditë falas → vela.al
> #dyqanionline #shitjenëinstagram #vela

### 2 · `02-numbers.mp4` — "Dyqan në shifra" (~10s)
**Prompt / creative brief:**
> Vertical stat-beat typography reel, night canvas + blobs + grain. Four
> beats, ~1.9s each, numbered "01/04…". In each: a giant gradient-filled
> Clash Display number springs in from blur and counts up (3 → "3 min · nga
> postimi te dyqani", 0 → "0 rreshta kod", 10+ → "10+ template për
> vitrinën", 100% → "100% pagesa në Lekë"), with the white label rising
> under it; each beat exits upward with motion blur as the next arrives.
> Ends on the boat + "Vela. Dyqani yt online." + CTA pill.

**Caption:**
> 3 minuta. 0 kod. 100% në Lekë. 📊
> Dyqani yt online → vela.al
> #ecommerce #shqipëri #biznesonline

### 3 · `03-manifesto.mp4` — Manifesti (~11s)
**Prompt / creative brief:**
> Vertical manifesto reel — pure typography on the night canvas. Left-aligned
> Clash Display lines rise from blur one by one: "Postimet e tua." /
> "Produktet e tua." / "Klientët e tu." As the final line lands the earlier
> ones dim to 40%: "Dyqani YT." in the brand gradient, larger, and a glowing
> gradient underline draws itself left→right finishing in a small gold
> arrow-head (the hull arrow). Everything blurs away and the horizontal Vela
> wordmark scales in with a CTA pill "Fillo falas → vela.al".

**Caption:**
> Postimet e tua. Produktet e tua. Dyqani YT. ⛵
> Fillo falas → vela.al
> #dyqanionline #vela #instagramshop

---

## REEL STILLS — image (1080×1920) · `reel-stills/`

### 1 · `01-hook.png` — hook poster
**Prompt:** Vertical typographic poster, night canvas + glow blobs + grain.
Eyebrow pill "PËR SHITËSIT NË INSTAGRAM". Stacked Clash Display: "KTHE"
(solid white) / "INSTAGRAMIN" (outline stroke only) / "NË NJË" (solid) /
"DYQAN." (gradient fill). Gradient bar under, CTA pill "Fillo falas →
vela.al".

**Caption:**
> Dyqani yt është një postim larg. ✨
> vela.al — fillo falas
> #shitjenëinstagram #dyqanionline

### 2 · `02-manifesto.png` — manifesto poster
**Prompt:** The manifesto as a still: four left-aligned lines with rising
brightness (42% → 62% → 82% → full gradient "Dyqani YT." with glowing
underline), boat + "vela.al — fillo falas" signature at the bottom.

**Caption:**
> E jotja. E gjitha. 🖤
> vela.al
> #vela #biznesonline

### 3 · `03-checklist.png` — "Çfarë merr me Vela"
**Prompt:** Vertical checklist poster: eyebrow "ÇFARË MERR ME VELA", headline
"Gjithçka që të duhet për të shitur.", four frosted-glass rows with gradient
✓ chips (Produkte nga postimet — vetë · Pagesa me kartë, në Lekë · Porositë
në një panel · Dyqan me emrin tënd), CTA pill "Provo 7 ditë falas".

**Caption:**
> Gjithçka gati. Ti vetëm posto. ✅
> Provo 7 ditë falas → vela.al
> #ecommerceshqip #vela

---

## POSTS — video (1080×1350 · 30fps) · `posts/`

### 1 · `01-brand-sting.mp4` — brand sting (6s, loops)
**Prompt:** Square-ish brand reveal. On the night canvas a gradient "sea
line" draws itself; the tag-sails boat sails in from the left with a soft
spring, bobbing on ±1.6°; a golden sheen periodically sweeps across the
sails (loop-synced); the white wordmark and the tagline "Kthe Instagramin
në dyqan online." rise from blur beneath. Runs as a seamless-feeling loop.

**Caption:**
> Vela. Dy vela, një drejtim: përpara. ⛵
> vela.al
> #vela #brand

### 2 · `02-pa-kod.mp4` — "Pa kod." (8s)
**Prompt:** Warm cream canvas (the landing's paper) with soft red/amber
corner glows. Eyebrow pill "DYQANI YT ONLINE". Three ink-black Clash lines
revealed one by one by a traveling vertical gradient bar (wipe reveal):
"Pa kod." / "Pa website." / "Pa stres." Then the payoff in gradient type:
"Vetëm posto." + CTA pill "Provo falas → vela.al".

**Caption:**
> Pa kod. Pa website. Pa stres. Vetëm posto. 🎯
> vela.al
> #nokode #dyqanionline

### 3 · `03-7-dite.mp4` — "7 ditë falas" (7s)
**Prompt:** Night canvas. A giant gradient "7" spring-slams in from blur with
a slight rotation settle; around it a ring of tracked uppercase type orbits
continuously — "DITË FALAS • PA KARTË • PA RREZIK •" — with every few
characters in gold; a soft gradient halo pulses behind. CTA pill "Provo 7
ditë falas → vela.al" rises at the end.

**Caption:**
> 7 ditë. 0 karta. 0 rrezik. ⏳
> Provo → vela.al
> #provofalas #vela

---

## POST STILLS — image (1080×1350) · `post-stills/`

### 1 · `01-quote.png` — quote card
**Prompt:** Giant open-quote glyph in gradient, then "Ti poston." (white) /
"Vela shet." (gradient) centered in Clash Display; small boat + tracked
"VELA.AL" signature underneath. Night canvas.

**Caption:**
> Kaq e thjeshtë. 🤝
> vela.al
> #vela #shitjenëinstagram

### 2 · `02-brand-card.png` — brand card
**Prompt:** The clean brand post: cream paper canvas with faint warm corner
glows and grain, the tag-sails boat centered, "Vela" in Clash Display ink,
gradient bar, tagline "Kthe Instagramin në dyqan online." Breathing room
everywhere — a premium print-style card.

**Caption:**
> Vela — dyqani yt online. ⛵
> vela.al
> #vela #brand

### 3 · `03-carousel-{1,2,3}.png` — 3-slide gallery (post together)
**Prompt:** Three-night-slide carousel with a numbered eyebrow system.
Slide 1 "01 — PROBLEMI": "DM-t nuk janë dyqan." + two sentences of pain +
"Rrëshqit →". Slide 2 "02 — ZGJIDHJA": "Vela i kthen postimet në produkte."
(last word gradient) + three gradient-dot bullets (Postim → Produkt · Vitrinë
me emrin tënd · Pagesa me kartë në Lekë). Slide 3: boat + "Gati për dyqanin
tënd?" + CTA pill "Provo 7 ditë falas" + "Pa kartë · pa kod · vela.al".

**Caption:**
> Nga DM-t te dyqani yt — rrëshqit. 👉
> Provo 7 ditë falas → vela.al
> #dyqanionline #instagramshqip #vela

---

## Posting notes

- Order for launch week: brand card → hook still → DM-chaos reel → carousel
  → numbers reel → checklist still → pa-kod post → manifesto reel → quote →
  7-ditë post → manifesto still → brand sting (loop, pin it).
- Reels: add trending low-key audio; all type is finished by 80% of each
  reel so end-screens survive IG's UI overlays.
- Stills use the same safe areas as the reels (IG chrome top ~250px /
  bottom ~280px on 9:16).
