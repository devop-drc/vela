# Vela — Launch Campaign · Master Content Plan

> **Brand:** Vela (`vela.al`) · **Tagline:** *"Kthe Instagramin në dyqan online — brenda pak minutash."*
> **Version:** 3.0 (July 2026) · **Market:** Albania + Kosovo + region · **Audience:** IG/TikTok merchants, 18–60.
> **Goal:** High-converting lead-gen + DM→storefront migration. Albanian-first, everyday language.

Six assets — **3 Remotion motion reels (9:16)** + **3 still posts** — balanced dark/light. Built one at a
time, each render-verified before the next. Compositions live in `src/compositions/campaign/`, reusing the
premium kit (`src/compositions/marketing/nextgen/kitv2.tsx`) and motion primitives (`src/lib/motion.ts`).

---

## Design system (enforced on every asset)

| Token | Hex | Use |
|---|---|---|
| Cream (light canvas) | `#FBF6F4` | dominant light bg (~60%) — never pure white |
| Night (dark canvas) | `#140A0E` | rose-cast dark bg (~60%) — never pure black |
| Ink (text on light) | `#2A1D22` | body/headlines on cream |
| Deep Wine | `#7F1D3B` | gradient depth |
| Wine · Primary | `#A31234` | primary actions, key UI |
| Neon Red · Accent | `#FF2E4D` | focus, dark-mode primary |
| Amber | `#F59E0B` | gradient warmth |
| Gold | `#FACC15` | rewards, growth arrow, "selected" |

- **Gradient (spice, not surface):** `linear-gradient(115deg,#7F1D3B,#A31234 40%,#FF2E4D 75%,#F59E0B 115%)` — CTAs, badges, text-highlight clips only. Never floods a background.
- **Ratio:** canvas ~60% · ink/structure ~30% · wine/neon/gold ~10%.
- **Type:** Clash Display (headlines, 600/700, tracking −2%, one gradient keyword) · Satoshi/Inter (body 400/500). Eyebrow: UPPERCASE 600, `.18em`, gradient dot.
- **Surfaces:** cards `24px` radius, warm glass; CTAs full pills.
- **Motion:** spring `{damping:16, mass:0.8, stiffness:120}` (small overshoot); blur-reveal for display type; 55ms staggered cascades; gradient drifts (lava-lamp), scale never pulses; spring/easeInOut only — no linear.
- **Language:** flawless Albanian, correct `ë`/`ç`, no corporate jargon, no hype stacks.
- **9:16 safe zone:** keep key text within center `1080×1440` (avoid top 180px / bottom 280px).

## Motion & ad psychology (why each asset is built the way it is)

- **Pattern interrupt (3s rule):** open on relatable DM chaos or bold-contrast type before the solution.
- **Curiosity loop (Zeigarnik):** open questions ("Po humb 40% të shitjeve pa e ditur…").
- **Loss aversion:** frame manual DMs as lost time / missed midnight sales vs. passive automated orders.
- **Cognitive ease / staccato:** 3–5 word Albanian lines ("Ti poston. Vela shet.").
- **Social proof + local alignment:** Lekë, RaiAccept, COD, local couriers, Albanian-first.
- **Kinetic micro-delight:** spring physics + blur-reveal so it never reads "AI-generated".

---

## Asset #1 — Motion reel · "Nga haosi në DM → dyqan automatik" · DARK
- **Format:** Remotion `1080×1920` · 30fps · **12s (360f)** · id `LaunchDmToShop`
- **Trigger:** pattern interrupt + loss aversion. **Objective:** hook DM merchants; show orders automate.
- **Scene 1 · Hook (0–2.5s / 0–75f):** Night bg + drifting wine glow. DM chat bubbles pop/overlap with spring (damping 12), freeze with slight tilt. Bubble text: *"Çmimi?"* · *"A keni masën M?"* · *"A bëni dërgesa në Shkodër?"* · *"Pse s'po përgjigjeni?"*. Headline blur-reveal: **"Nga haosi në DM…"**
- **Scene 2 · Transform (2.5–6s / 75–180f):** bubbles collapse toward the ship mark; a glass product panel rises (real app UI) — IG post → structured product (**Atlete Vrapi Air · ALL 4,760 · Aktiv**). Text: **"Vela lexon postimet. Krijon dyqanin automatikisht."** (gradient keyword *automatikisht*).
- **Scene 3 · Order & payment (6–9s / 180–270f):** checkout sheet; payment rows highlight gold — **Kartë · RaiAccept · Shumë monedha** + **Para në dorë (COD)**. Order toast springs down: **"Porosi e re! · ALL 4,760 · Erion Kola, Tiranë"**. Text: **"Pagesa me kartë ose cash. Pa mundim. Pa kod."** (multi-currency — not Lekë-only).
- **Scene 4 · CTA (9–12s / 270–360f):** ship mark + gradient GlareChip **"Kthe Instagramin në dyqan →"**, sub **"Nise falas sot · vela.al"**. Gradient drifts, chip breathes 1→1.03.
- **CTA:** *Nise falas sot · vela.al*

## Asset #2 — Still carousel · "Si funksionon në 3 hapa" · LIGHT
- **Format:** 4 slides · **1080×1350 (4:5)** · ids `LaunchStepsCover/1/2/3`
- **Trigger:** educational, remove friction. **Objective:** prove extreme simplicity → confidence.
- **Slide 1 · Cover:** cream; eyebrow **• UDHËZUESI I SHPEJTË**; headline **"Si ta kthesh Instagramin në dyqan në 3 hapa të thjeshtë."** (gradient *3 hapa*); hero glass card: Instagram icon → golden line → Vela mark; sub **"Pa programues. Pa njohuri teknike."**
- **Slide 2 · Hapi 01 — Lidh profilin:** glass card with 1-click **[ Lidh me Instagram ]**; body **"Vela lidhet me faqen tënde në pak sekonda — pa asnjë rresht kod."**; micro-pill **"Zgjat 30 sekonda"**.
- **Slide 3 · Hapi 02 — Sinkronizimi automatik:** headline **"Sistemi krijon produktet"**; 3 product cards popping from posts (foto → titull → çmim ALL → variante S/M/L); body **"Sistemi lexon vetë fotot, çmimet dhe përshkrimet nga postimet e tua."**
- **Slide 4 · Hapi 03 — Porositë (CTA):** headline **"Prano pagesa & porosi automatike"**; live counter **"14 porosi aktive · ALL 87,400"**; RaiAccept + COD badges; gradient pill **"Provo Vela falas →"**; footer **vela.al**.
- **CTA:** *Provo Vela falas → vela.al*

## Asset #3 — Motion reel · "Paneli live & shitjet reale" · LIGHT
- **Format:** Remotion `1080×1920` · 30fps · **10s (300f)** · id `LaunchDashboard`
- **Trigger:** social proof / live demo. **Objective:** show the calm admin + real-time sales.
- **Scene 1 · Proof hook (0–2s):** cream; giant counter rolls **ALL 0 → ALL 87,400** (Clash Bold); eyebrow **• PANELI I SHITJEVE**; text **"Pse të presësh në DM? Shih si vijnë porositë vetë."**
- **Scene 2 · Dashboard (2–6s):** real dashboard (FloatShot) — KPI cards stagger 55ms (Të ardhura ALL 87,400 · Shitjet 10 · Produkte 14); activity feed slides in (*Porosi e re nga Erion K. — ALL 1,900* …); subtle card tilt.
- **Scene 3 · Ease (6–8s):** a tap on **[ Dyqani është Aktiv ]**; green **Aktiv** chip lights; text **"Menaxho stokun, çmimet dhe dërgesat me një klik."**
- **Scene 4 · Outro (8–10s):** ship + wordmark; gradient pill **"Shto shitjet e tua sot →"**; tagline **vela.al**.
- **CTA:** *Shto shitjet e tua sot · vela.al*

## Asset #4 — Still post · "E ndërtuar për tregun shqiptar" · DARK
- **Format:** **1080×1350 (4:5)** · id `LaunchLocal`
- **Trigger:** hyper-localization + feature superiority. **Objective:** own the local-friction story.
- **Layout:** Night bg, top wine gradient bar; eyebrow **• NATIVE PËR SHQIPËRINË & RAJONIN**; headline **"E ndërtuar posaçërisht për tregun shqiptar."** (gradient *shqiptar*). 4 glass feature cards (`24px`, `#1F0F17`, warm border, Lucide-style icons, gold stroke):
  1. **RaiAccept & Lekë (ALL)** — *"Prano pagesa me kartë direkt në valutën tonë."* (CreditCard)
  2. **Para në dorë (COD)** — *"Mbështetje e plotë për pagesën në dorëzim."* (Banknote)
  3. **Lidhja me postat lokale** — *"Të dhënat e dërgesës gjenerohen vetë për çdo qytet."* (Truck)
  4. **Shqip e para** — *"Platforma dhe dyqani flasin shqip të pastër, për çdo moshë."* (Languages)
- **Bottom:** gradient pill **"Provo platformën falas →"** · footer **vela.al**.
- **CTA:** *Provo platformën falas · vela.al*

## Asset #5 — Motion reel · "E ardhmja: përtej Instagramit" · DARK
- **Format:** Remotion `1080×1920` · 30fps · **12s (360f)** · id `LaunchFuture`
- **Trigger:** future value / FOMO. **Objective:** show scalability beyond IG.
- **Scene 1 · Beyond IG (0–3s):** Night; Instagram node expands into slow multi-orbit rings — **TikTok Shop · Web Storefront · WhatsApp Business · Google Shopping**; nodes pulse neon-red. Text **"E ardhmja nuk është vetëm në DM."**
- **Scene 2 · Value stack (3–7.5s):** cards spring up (y:100→0, stagger 55ms): **01 Dyqan web autonom** · **02 Marketing automatik** (*ri-synon klientët që lanë shportën*) · **03 Sinkronizim multi-kanal** (*stoku përditësohet kudo*).
- **Scene 3 · Promise (7.5–9.5s):** the hull-arrow sweeps up; gold/wine graph line shoots up. Text **"Rritu pa kufinj — me platformën që zhvillohet me ty."**
- **Scene 4 · CTA (9.5–12s):** brand lockup; gradient pill **"Bëhu pjesë e së ardhmes →"**; **vela.al**.
- **CTA:** *Bëhu pjesë e së ardhmes · vela.al*

## Asset #6 — Still post · "Nise sot falas" (lead-gen offer) · LIGHT
- **Format:** **1080×1080 (1:1)** · id `LaunchOffer`
- **Trigger:** direct response + risk reversal. **Objective:** drive immediate sign-ups.
- **Layout:** cream, inner white glass card (`24px`); top badge **• OFERTA E HAPJES** (wine on 10% wine pill); headline **"Fillo sot 100% FALAS. Kthe ndjekësit në blerës."** (gradient *FALAS*). Checklist (Lucide checks, wine):
  - Krijo dyqanin në më pak se 3 minuta
  - Pa kartë krediti për regjistrim
  - Prano porosi direkt sot
  - Mbështetje në shqip
- **Hero CTA:** gradient pill **"Krijo dyqanin tënd tani →"**; below **"Nuk kërkohet kartë · provoje falas · vela.al"**.
- **CTA:** *Krijo dyqanin tënd tani · vela.al*

---

## Production & render

- Compositions registered in `src/Root.tsx`; preview with `npm run studio`.
- Reels: `npx remotion render src/remotion.ts <id> out/<id>.mp4 --codec=h264 --crf=18`
- Stills / carousel slides: `npx remotion still src/remotion.ts <id> out/<id>.png --frame=<n>` (poster = a settled frame).
- Fonts embedded (Clash + Satoshi from `public/fonts`); real app UI from `public/marketing/app`.

## Build tracker (one at a time)

- [x] **#1** `LaunchDmToShop` — dark reel · DM chaos → automation · **COMPLETED** (4 scenes render-verified: hook / product-extraction / checkout-in-Lekë / CTA)
- [x] **#2** `LaunchSteps*` — light carousel · 3 hapa · **COMPLETED** (4 slides render-verified: cover / lidh / produktet / porositë+CTA)
- [ ] **#3** `LaunchDashboard` — light reel · live dashboard
- [ ] **#4** `LaunchLocal` — dark still · built for Albania
- [ ] **#5** `LaunchFuture` — dark reel · future value
- [ ] **#6** `LaunchOffer` — light still · lead-gen offer
