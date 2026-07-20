# Vela — Instagram Marketing Set (v2 · hook-first)

Motion graphics + typography only — every asset is **generated from code**
(Remotion compositions in `src/compositions/marketing/`) so it can be
re-rendered, re-worded or re-branded in minutes. Night canvas with the brand
blobs + film grain, **Clash Display** headlines, **Satoshi** for all support
text, the wine→neon→gold gradient as spice, weighted springs and blur-rise
type — the same design language as the landing page and brand book.

**The v2 strategy.** Twelve assets, five messages, zero filler. Each asset
opens with a **hook in the first second** (a bold claim, a giant number, a
rising curve, a cha-ching notification), shows the **actual process or tool**
as stylized UI motion graphics (Instagram post card → product card, countdown
timer, live stat tiles, order notifications), and lands on a **payoff + CTA**.
The five core messages:

| # | Message | Video | Still |
|---|---------|-------|-------|
| 1 | Postimet → produkte, vetë | `reels/01-post-to-product` | `reel-stills/01` |
| 2 | Dyqani gati për 5 minuta | `reels/02-5-minuta` | `reel-stills/02` |
| 3 | Bumi digjital në Shqipëri — mos e humb | `reels/03-boom` | `reel-stills/03`, carousel slide 1 |
| 4 | Porosi online + pagesa me kartë, në Lekë | `posts/01-porosite` | `post-stills/01` |
| 5 | Paneli që kontrollon gjithçka | `posts/02-paneli` | `post-stills/02` |
| + | Si funksionon, në 3 hapa | `posts/03-si-funksionon` | carousel slides 2–3 |

**Re-render everything:**
```bash
# videos
npx remotion render src/remotion.ts ReelPostToProduct branding/marketing/instagram/reels/01-post-to-product.mp4
npx remotion render src/remotion.ts ReelFiveMin       branding/marketing/instagram/reels/02-5-minuta.mp4
npx remotion render src/remotion.ts ReelBoom          branding/marketing/instagram/reels/03-boom.mp4
npx remotion render src/remotion.ts PostOrders        branding/marketing/instagram/posts/01-porosite.mp4
npx remotion render src/remotion.ts PostPanel         branding/marketing/instagram/posts/02-paneli.mp4
npx remotion render src/remotion.ts PostSteps         branding/marketing/instagram/posts/03-si-funksionon.mp4
# stills (--frame=25 so the fade-in chrome is fully visible)
npx remotion still src/remotion.ts StillPostToProduct branding/marketing/instagram/reel-stills/01-post-to-product.png --frame=25
npx remotion still src/remotion.ts StillFiveMin       branding/marketing/instagram/reel-stills/02-5-minuta.png        --frame=25
npx remotion still src/remotion.ts StillBoom          branding/marketing/instagram/reel-stills/03-boom.png            --frame=25
npx remotion still src/remotion.ts StillOrders        branding/marketing/instagram/post-stills/01-porosite.png        --frame=25
npx remotion still src/remotion.ts StillPanel         branding/marketing/instagram/post-stills/02-paneli.png          --frame=25
npx remotion still src/remotion.ts GallerySlide1      branding/marketing/instagram/post-stills/03-carousel-1.png      --frame=25
npx remotion still src/remotion.ts GallerySlide2      branding/marketing/instagram/post-stills/03-carousel-2.png      --frame=25
npx remotion still src/remotion.ts GallerySlide3      branding/marketing/instagram/post-stills/03-carousel-3.png      --frame=25
```
**Tweak visually:** `npm run studio` opens Remotion Studio — every composition
appears in the sidebar with a scrubbing timeline; edit the .tsx, see it live.
The `remotion-documentation` MCP server (`.mcp.json`) gives AI assistants
direct access to Remotion docs while editing these.

---

## REELS — video (1080×1920 · 30fps) · `reels/`

### 1 · `01-post-to-product.mp4` — "Postimi bëhet produkt" (~12s)
**Hook:** a bold claim over a real-looking IG post — *this post just became a
product* — then you watch it happen.

**Prompt / creative brief:**
> Vertical reel, night canvas + brand glow blobs + grain. HOOK (0–2s): Clash
> Display slams in — "Ky postim" / "sapo u bë **produkt**." (gradient word).
> PROCESS (2–8s): a stylized Instagram post card (avatar `dyqani.yt`, product
> photo panel, real Albanian caption "Atlete vrapi ✨ çmimi 4,500 L · masat
> 40–44 · DM për porosi 🙏") springs to center; a glowing gradient scan-line
> sweeps down it like the AI reading it, and three chips fly out of the
> caption — "Emri ✓ Atlete Vrapi", "Çmimi ✓ 4,500 L", "Variantet ✓ 40–44" —
> caption below: "Sistemi po e lexon postimin…". Then the IG card **morphs
> into a shop product card**: title, size chips 40–44, price 4,500 L, "Shto
> në shportë" button, "Në stok" badge — "Gati për t'u shitur. Vetë."
> PAYOFF (8–12s): "Çdo postim. / Automatikisht." + boat + CTA pill
> "Fillo falas → vela.al".

**Caption:**
> Ti e postove. Vela e shet. 🛍️
> Çdo postim → produkt, vetë. Fillo falas → vela.al
> #dyqanionline #shitjenëinstagram #vela

### 2 · `02-5-minuta.mp4` — "Dyqan për 5 minuta" (~12s)
**Hook:** a question everyone doubts — *an online shop in 5 minutes?* — then
a live countdown proves it.

**Prompt / creative brief:**
> Vertical reel, night canvas. HOOK (0–2s): "Dyqan online për **5 minuta**?"
> / "Po. Ja si:". PROCESS (2–8.5s): a giant gradient countdown timer runs
> 5:00 → 0:00 while three frosted step rows fill their own gradient progress
> bars in sequence — "01 Lidh Instagramin · 30 sek", "02 Sistemi ndërton
> produktet · 3 min", "03 Publiko & ndaj linkun · 90 sek" — each row lights
> up as its bar completes. As the timer hits zero, a huge gradient "Gati."
> stamps in. PAYOFF (8.5–12.4s): "5 minuta. / Dyqani yt, online." + boat +
> CTA "Provo tani → vela.al".

**Caption:**
> 5 minuta. Kaq i duhet dyqanit tënd. ⏱️
> Lidh Instagramin → sistemi ndërton gjithçka → publiko.
> Provo tani → vela.al
> #dyqanionline #biznesonline #shqipëri

### 3 · `03-boom.mp4` — "Bumi digjital" (~11.7s)
**Hook:** a market fact with a rising curve — FOMO, not features.

**Prompt / creative brief:**
> Vertical reel, night canvas. HOOK (0–2s): "Shqipëria po **blen online**."
> (gradient words). PROCESS (2–7s): a cinematic chart draws itself — a
> wine→neon→gold gradient curve rising steeply left to right with a glowing
> gold tip, years 2022–2026 fading in beneath; the curve accelerates like the
> market. PIVOT (7–9s): the chart dims and giant type asks — "Pyetja s'është
> NËSE." / "Por **KUR**." PAYOFF (9–11.7s): "Zër vendin tënd. / **Sot**." +
> boat + CTA "Fillo falas → vela.al".

**Caption:**
> Tregu online në Shqipëri po rritet çdo vit. 📈
> Pyetja s'është nëse — por kur. Zër vendin tënd → vela.al
> #ecommerceshqip #biznesonline #vela

---

## REEL STILLS — image (1080×1920) · `reel-stills/`

### 1 · `01-post-to-product.png` — the transformation, frozen
**Prompt:** Vertical poster, night canvas. Headline "Ky postim mund të ishte
**produkt**." (gradient word). Below: the stylized IG post card, a gradient
arrow flowing down, and the shop product card it becomes (size chips, price,
"Shto në shportë", "Në stok"). Footer line "Vela e bën vetë. Ti vetëm poston."

**Caption:**
> Postimi yt më i mirë = produkti yt më i shitur. ✨
> vela.al — fillo falas
> #shitjenëinstagram #dyqanionline

### 2 · `02-5-minuta.png` — the giant 5
**Prompt:** Vertical poster, night canvas. Eyebrow pill "SA SHPEJT?". A giant
420px gradient "5" with "minuta deri te dyqani yt." beside it in white Clash.
Three frosted step rows with gradient numbers and timings (Lidh Instagramin ·
30 sek / Sistemi ndërton produktet · 3 min / Publiko & ndaj linkun · 90 sek).
CTA pill "Provo tani → vela.al".

**Caption:**
> Më shpejt se një kafe. ☕
> Dyqani yt online për 5 minuta → vela.al
> #dyqanionline #vela

### 3 · `03-boom.png` — the market curve
**Prompt:** Vertical poster, night canvas. Eyebrow pill "TREGU DIGJITAL ·
SHQIPËRI". Headline "Shqipëria po **blen online**." Static gradient growth
curve with glowing gold tip, years 2022–2026. Underneath: giant gradient
"Ti?" + "Mos e humb momentin." CTA pill "Zër vendin tënd → vela.al".

**Caption:**
> Klientët e tu tashmë blejnë online. Ti? 📈
> vela.al — zër vendin tënd
> #ecommerceshqip #biznesonline

---

## POSTS — video (1080×1350 · 30fps) · `posts/`

### 1 · `01-porosite.mp4` — "Porosi e re! 🎉" (~8.2s)
**Hook:** the sound every merchant wants — order notifications stacking up.

**Prompt / creative brief:**
> Feed video, night canvas. HOOK+PROCESS (0–6s): "Porosi e re! 🎉"
> notification cards cascade in one after another (Elisa nga Tirana · 4,500 L,
> Andi nga Durrësi · 2,900 L, Sara nga Vlora, Klea nga Shkodra — all "pagesë
> me kartë"), while a counter ticks "Sot: 1…4 porosi". Beneath: "Porosi
> online. / **Pagesa me kartë, në Lekë**." PAYOFF (6–8.2s): "Kjo ndjesi. /
> Çdo ditë." + CTA "Provo 7 ditë falas → vela.al".

**Caption:**
> Kjo ndjesi kur bie porosia. 🎉
> Porosi online, pagesa me kartë, në Lekë → vela.al
> #porosionline #pagesaonline #vela

### 2 · `02-paneli.mp4` — "Gjithçka nën kontroll" (~8.5s)
**Hook:** the admin panel itself, alive — numbers counting, an order shipping.

**Prompt / creative brief:**
> Feed video, night canvas. HOOK (0–1.5s): "Gjithçka nën **kontroll**."
> PROCESS (1.5–6s): a 2×2 grid of dashboard stat tiles springs in and counts
> up live — Porositë sot 12 (gold), Të ardhurat 84,500 L, Produkte live 36,
> Vizitorë sot 341 — then an order row slides in ("Porosia #4F2A · Atlete
> Vrapi Air · Elisa · Tiranë · me kartë") and its badge flips "Në pritje" →
> "**U dërgua ✓**". PAYOFF (6–8.5s): "Një panel. / Gjithë biznesi yt." +
> CTA "Shihe vetë → vela.al".

**Caption:**
> Porositë, stoku, pagesat — një panel. 📊
> Kontrollo gjithçka nga telefoni → vela.al
> #biznesonline #vela

### 3 · `03-si-funksionon.mp4` — "Si funksionon?" (~7.6s)
**Hook:** the question itself — answered in three beats and one word.

**Prompt / creative brief:**
> Feed video, night canvas. HOOK (0–1.5s): "Si funksionon**?**" PROCESS
> (1.5–5.5s): three numbered rows spring in — "01 Lidh Instagramin · një
> prekje, pa kod", "02 Sistemi ndërton dyqanin · postimet → produkte, vetë",
> "03 Ti merr porositë · me kartë ose në dorëzim". PAYOFF (5.5–7.6s):
> everything exits and a giant gradient "**Kaq.**" slams in + CTA
> "Fillo falas → vela.al".

**Caption:**
> Lidh. Ndërto. Shit. Kaq. 🎯
> Fillo falas → vela.al
> #dyqanionline #pakod #vela

---

## POST STILLS — image (1080×1350) · `post-stills/`

### 1 · `01-porosite.png` — the cha-ching card
**Prompt:** Feed poster, night canvas. Three "Porosi e re! 🎉" notification
cards stacked with slight rotation and depth-dimming (top ones faded), each
with buyer name + city + "pagesë me kartë" + amount in gradient. Headline
"Kjo ndjesi. / **Çdo ditë**." Support line "Porosi online · pagesa me kartë ·
në Lekë". CTA pill "Provo 7 ditë falas → vela.al".

**Caption:**
> Njoftimi më i bukur i ditës. 🎉
> vela.al — porosi online, pagesa në Lekë
> #porosionline #vela

### 2 · `02-paneli.png` — the dashboard card
**Prompt:** Feed poster, night canvas. Headline "Gjithçka nën **kontroll**."
2×2 grid of frosted dashboard stat tiles (Porositë sot 12 in gold, Të
ardhurat 84,500 L, Produkte live 36, Vizitorë sot 341). Support line
"Porositë, stoku, pagesat — një panel." CTA pill "Shihe vetë → vela.al".

**Caption:**
> Gjithë biznesi yt, në një ekran. 📊
> vela.al
> #biznesonline #vela

### 3 · `03-carousel-{1,2,3}.png` — 3-slide gallery (post together)
**Prompt:** Numbered-eyebrow carousel on the night canvas.
Slide 1 "01 — MOMENTI": "Shqipëria po blen online. / **Pa ty?**" + FOMO copy
("Blerjet online rriten çdo vit — dhe klientët e tu tashmë janë aty. Mos e
humb momentin.") + "Rrëshqit →".
Slide 2 "02 — VELA": "Nga postimi te pagesa — **vetë**." + four gradient-dot
bullets (Postimet → produkte, me çmim e variante · Dyqani yt gati për 5
minuta · Porosi online, kartë në Lekë · Një panel për gjithçka) + "Rrëshqit →".
Slide 3: boat + "Zër vendin tënd. / **Sot**." + CTA pill "Provo 7 ditë falas"
+ "Pa kartë · pa kod · vela.al".

**Caption:**
> Tregu po lëviz. Ti? Rrëshqit. 👉
> Provo 7 ditë falas → vela.al
> #ecommerceshqip #dyqanionline #vela

---

## Posting notes

- **Launch order (2 weeks, message-per-day):** boom still → post-to-product
  reel → porosite post → 5-minuta still → paneli post → carousel → post-to-
  product still → 5-minuta reel → porosite still → si-funksionon post →
  boom reel → paneli still. Hooks alternate between FOMO / product-magic /
  cha-ching so the grid never repeats a beat twice in a row.
- Reels: add trending low-key audio; all type finishes by 80% of each reel
  so end-screens survive IG's UI overlays.
- Stills use the same safe areas as the reels (IG chrome top ~250px /
  bottom ~280px on 9:16).
- Fonts: Clash Display (headlines) + Satoshi (support text) — both loaded
  from `public/fonts/` inside the compositions, so renders never depend on
  the network.
