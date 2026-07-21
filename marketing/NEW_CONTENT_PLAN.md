# Vela — New Content Plan (next-gen suite)

_Built from `CONTENT_LEARNINGS.md` (old-kit findings) + the .docx strategy blueprint._
_Language: **Albanian-first, "ti" form.** **sistemi** (not AI), **mesazhe** (not DM), **postimet** (not feed)._

## Standards for every piece
- **9:16 · 1080×1920 · 30 FPS** (Reels/TikTok/grid all identical). No more 3:4 feed.
- **Poster frame (frame 0):** a settled, high-contrast cover that doubles as the grid thumbnail — never mid-animation.
- **3s hook:** frame 0 = pattern interrupt (tension or motion), never a logo.
- **Motion engine (reuse ours):** `springIn` (`{damping:12–14, mass:0.5–0.9, stiffness:100–130}`), `exitLift`, `float`, `pulse`; GSAP-seek for the premium piece; **clamp every interpolate**. Signature entrance = the **blur-up word reveal** from StoryIntro, standardised across the suite.
- **Brand:** wine `#A31234` / neon-red `#FF2E4D` / gold `#FACC15` / deep `#7F1D3B`; Clash Display (headline) + Inter/Satoshi (body); headline = white clause + **gradient-clipped** second clause.
- **Real UI:** frame screenshots from `marketing/app-screenshots/` inside a `DeviceMockup`; spotlight (dim frame, zoom active element).
- **Trust stack:** "Provo falas · pa kartë · anulo kurdo" · "Linku në bio" · **vela.al**.
- **Burn-in SEO keywords:** *dyqan online pa kod*, *automatizo Instagramin*, *porosi automatike*, *pagesa në Lekë*.

Folder: `src/remotion/` — `Root.tsx`, `compositions/`, `components/` (`DeviceMockup`, `CoverThumbnail`, `SpotlightCard`, `SpringText`, `BrandMesh`, `Poster`). Shared tokens: one `src/remotion/brand.ts` (kills the feed/story duplication).

---

## PILLAR A — Macro "Big Shift" reels

### C1 · MacroShift — "80% e punës, e mbaruar" (Dark · 20s / 600f)
**Idea.** The macro promise: Vela absorbs 80% of the daily Instagram grind so the merchant scales instead of replying to messages. Hook on the grind, not the brand.
**Description.** Pain montage → the shift → proof in real dashboard → trial CTA.
**Poster frame.** Dark. Huge gradient **"80%"** numeral, under it white "më pak punë çdo ditë", small ship top-right. Reads instantly in-grid.
**Script (on-screen, kinetic):**
- 0–3s: "Gjithë dita — **mesazhe, porosi, stok**." (three words strike in on beat)
- 3–7s: "Po sikur **80%** ta bënte vetë?" (80% blur-ups huge, gradient)
- 7–13s: "Vela e kthen Instagramin në **dyqan online**." → dashboard screenshot spotlights revenue chart.
- 13–17s: "Ti fokusohesh te **rritja**." → storefront-live screenshot slides up.
- 17–20s: CTA — "Provo falas · pa kartë" + "Linku në bio · vela.al".
**Animation.** Words: blur-up `springIn(delay+i*5,{damping:12})` + `blur((1-s)*10)`. "80%" scales `0.6→1` with a `pulse` glow held 1s. Screenshots enter in a phone `DeviceMockup` from `y:+160` `springIn({damping:13})`, then a slow 1.04× Ken-Burns; spotlight vignette dims the frame while the revenue line draws. Scene-to-scene = `exitLift(20,50)`. Ambient wine/gold blobs `float` behind.
**Scenes (beats).** F0–90 poster hold + hook words · F90–210 "80%" reveal · F210–390 dashboard proof · F390–510 storefront proof · F510–600 CTA mesh + bouncing 👆.
**Typography.** Hook words Clash 700 ~110px; "80%" Clash 700 210px gradient; body Inter 500 40px; CTA chip Clash 600 40px on gradient fill.
**Reuse.** `01-dashboard.png`, `06-storefront-live.png`.

### C2 · MacroShift — "Qetësia" (Light · 20s / 600f)
**Idea.** Same macro shift, emotional register: calm, time back, a modern shop overnight. Light/paper for contrast in the grid.
**Poster frame.** Paper `#FDFCFD`, thin gradient top bar, headline "Dyqani yt — **gati sot.**" (second clause gradient), ship colored.
**Script:**
- 0–4s: "Nesër në mëngjes, dyqani yt është **online**." 
- 4–9s: "Pa kod. Pa dizajner. Pa stres." (three chips pop)
- 9–15s: storefront-studio screenshot — "Zgjedh pamjen. **Sistemi** e ndërton."
- 15–20s: "Kohë për ty. Shitje për dyqanin." + trial CTA.
**Animation.** Softer springs (`{damping:16}`), slower stagger. Chips scale `0.9→1`. Studio screenshot in a browser `DeviceMockup`, mobile preview parallaxes at 0.5×. Warm, minimal — light pieces stay calm per the learnings.
**Scenes.** F0–100 poster + line 1 · F100–260 three chips · F260–450 studio proof · F450–600 payoff + CTA.
**Typography.** Clash 600 100px headline; Inter 500 38px; eyebrow 700 `.24em` uppercase "PA KOD".
**Reuse.** `04-storefront-studio.png`.

---

## PILLAR B — Micro pain-point reels

### C3 · MicroDmFlow — "Nga mesazhi te checkout" (Light · 15s / 450f)
**Idea.** Isolate the #1 friction: answering "Sa kushton?" all day. Show it convert to a real order automatically. Strongest hook — open on the pile (learning: lead on tension).
**Poster frame.** A stack of chat bubbles ("Sa kushton? 🙏", "Si porosis?") frozen — instantly relatable.
**Script:**
- 0–4s: bubbles pile in — "Sa kushton?" ×4 (real buyer phrases). Text: "Përsëri?"
- 4–8s: swipe left → "Klientët blejnë **vetë**." storefront-mobile screenshot.
- 8–12s: tap → product → checkout; "Pagesa në **Lekë**. Automatike."
- 12–15s: "Ti s'humb asnjë porosi." + CTA.
**Animation.** Act structure like StoryProblem: bubbles `springIn` at 22/38/54/68 alt left/right; **act exits sliding left** `translateX(-out*260)`. Mobile screenshot enters, a finger-tap ripple, checkout button **pulses** (`0.92+…*pulse(f,18)`). Clamp all.
**Scenes.** F0–120 bubble pile (hook) · F120–150 slide-out · F150–360 buy-it-themselves flow · F360–450 CTA.
**Typography.** Bubble text Inter 500 34px; payoff Clash 600 84px (gradient "vetë"); body 38px.
**Reuse.** `07-storefront-mobile.png`, `06-storefront-live.png`.

### C4 · MicroOrderDash — "Porositë pa Excel" (Dark · 15s / 450f)
**Idea.** Every order in one panel, live, stock reserved automatically — no spreadsheets, no missed sales.
**Poster frame.** Dark. Orders-panel screenshot dimmed with one row spotlighted + big label "Të gjitha porositë — **një panel.**"
**Script:**
- 0–4s: "Porositë në **mesazhe**, **stok** në kokë, **Excel** në telefon." (chaos)
- 4–9s: "Mjaft." → orders screenshot resolves into focus.
- 9–13s: "Çdo porosi, njoftim në çast. Stoku **rezervohet vetë**."
- 13–15s: CTA.
**Animation.** Chaos icons jitter then get replaced by the clean panel (crossfade + `exitLift` on the chaos). Orders screenshot in `DeviceMockup`; a status pill animates Pending→Fulfilled; a live "Porosi e re +37,000 ALL" toast `springIn` from the right. Spotlight one order row (zoom 1.06×, dim rest).
**Scenes.** F0–120 chaos hook · F120–150 "Mjaft" cut · F150–360 panel proof + toast · F360–450 CTA.
**Typography.** "Mjaft." Clash 700 128px centered gradient; body Inter 500 40px; pill labels 30px.
**Reuse.** `05-orders.png`, `08-dashboard-dark.png`.

### C5 · BeforeAfterFlow — "Para / Pas" (Dark · 15s / 450f)
**Idea.** A 3-beat before→after workflow comparison. Split-screen pattern interrupt on frame 0.
**Poster frame.** Vertical split: left "PARA" (grey, messy), right "PAS" (wine gradient, clean). Diagonal seam.
**Script (three beats):**
1. "PARA: postim → screenshot → mesazh → Excel."  ↔  "PAS: postim → **produkt**." 
2. "PARA: 'Sa kushton?' ×20."  ↔  "PAS: **checkout** automatik."
3. "PARA: stok në letër."  ↔  "PAS: stoku **rezervohet vetë**."
- End: "Nga kaosi te **dyqani**." + CTA.
**Animation.** A moving vertical seam wipes each beat; left side desaturated & static, right side springs in with the gradient. Each beat swaps via `exitLift` + slide. Real UI on the "PAS" side (products/storefront). The seam is the signature device.
**Scenes.** F0–60 poster split · F60–170 beat 1 · F170–280 beat 2 · F280–390 beat 3 · F390–450 payoff + CTA.
**Typography.** "PARA"/"PAS" eyebrows 700 `.24em`; beat text Clash 600 52px; payoff gradient 100px.
**Reuse.** `02-products.png`, `06-storefront-live.png`.

---

## PILLAR C — Static / motion grid posts (5s loop, poster = frame 0)

### C6 · MatrixStaticPost — "Para vs. Pas" matrix (Light · 5s / 150f)
**Idea.** A 2-column efficiency matrix — the 80% gain at a glance. Saveable, screenshot-able.
**Poster/still.** Paper, title "Para vs. Pas" (gradient "Pas"); 4 rows: Mesazhe→Automatik · Excel→Një panel · Screenshot→Produkt · Pa pagesa→Lekë me kartë. Right column check-marked in gold.
**Script (on-image):** row labels above; footer "Vela · dyqan online pa kod · vela.al".
**Animation (subtle loop):** rows `springIn` stagger 6f; gold checks draw in on the right; a soft `float` on the whole card; loops seamlessly. Poster = fully-settled frame 0.
**Typography.** Title Clash 600 92px; rows Inter 600 40px; eyebrow "EFIKASITET".

### C7 · StatCardPost — "80% kohë e kursyer" (Dark · 5s / 150f)
**Idea.** One high-impact metric pop — the shareable stat card.
**Poster/still.** Dark mesh; giant gradient **"80%"** (210px) center; under it "më pak punë çdo ditë"; small supporting stats row (⚡ porosi automatike · 🛍️ pagesa në Lekë · 📦 stok vetiu).
**Animation.** "80%" scales `0.6→1` `springIn({damping:12})` + `pulse` glow; supporting chips stagger in; mesh `drift` breathes; loops.
**Typography.** "80%" Clash 700 210px gradient; caption Clash 600 56px; chips 30px.
**Reuse (optional).** faint `01-dashboard.png` chart behind the mesh at 12% opacity.

### C8 · TrustProofPost — "Garancitë" (Dark · 5s / 150f)
**Idea.** A minimalist saved-post checklist of guarantees — the "why trust it" reference.
**Poster/still.** Dark. Title "Çfarë merr me Vela". 6 checklist items, gold checks:
✓ Dyqan online pa kod · ✓ Pagesa në Lekë (RaiAccept) · ✓ Porositë në një panel · ✓ Stoku rezervohet vetë · ✓ Vitrina jote nga Storefront Studio · ✓ Provë falas, pa kartë.
**Animation.** Items `springIn` stagger 5f; each check scribbles in; ship colored bottom-right `float`; loops.
**Typography.** Title Clash 600 84px; items Inter 500 42px; footer wordmark eyebrow `.3em`.

---

## Poster-frame + render notes
- Every comp exports a **frame-0 poster** (own `<Poster>` layout, or a hand-picked settled frame) → PNG grid cover.
- Suggested `Root.tsx` metadata: all `width:1080, height:1920, fps:30`; durations 600/600/450/450/450/150/150/150.
- Render (per .docx): `npx remotion render src/remotion/Root.tsx C1_MacroShift out/C1.mp4 --codec=h264 --crf=18`;
  poster `npx remotion still src/remotion/Root.tsx C7_StatCard out/C7.png --frame=0`; batch via `npm run render:content`.
- **Theme mix:** dark C1/C4/C5/C7/C8, light C2/C3/C6 → ~50/50 across the grid.
- **Posting cadence:** Reels C1–C5 as feed Reels; C6–C8 as static posts + pin the stories set as a "Si funksionon" highlight.

## Build order (recommended)
1. `src/remotion/brand.ts` + shared components (`DeviceMockup`, `BrandMesh`, `Poster`, `SpringText`) — unify tokens first.
2. C3 (MicroDmFlow) and C4 (MicroOrderDash) — strongest hooks, prove the real-UI + spotlight pattern.
3. C1/C2 macro reels.
4. C5 before/after.
5. C6–C8 static cards (fast, reuse the components).
