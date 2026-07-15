# Vela — Landing Page Redesign Spec

> A single source of truth for the rebuilt landing page: positioning, design
> language, motion system, and a section‑by‑section blueprint. Everything here
> is tuned to Vela's product (turn an Instagram profile into a real, paid
> e‑commerce shop with AI, in minutes) and its brand (the sail — "Ngri velën").

---

## 0. Positioning & goal

**Product in one line:** *Vela turns your Instagram into a real online store —
products, payments, orders — in a couple of minutes, no code.*

**Audience:** Albanian (and Balkan) Instagram sellers — boutiques, jewelry,
sneakers, cosmetics, handmade. Currently selling via DMs, screenshots, cash.

**The landing's one job:** make a DM‑drowning IG seller *feel* the pain of
"Instagram only," then show — with real product UI and motion — how Vela erases
that pain, and get them to start the free trial.

**Primary conversion:** `Fillo falas` (start free trial). Secondary: `Shiko një demo live`.

---

## 1. Inspiration — what we borrow (and from whom)

| Source | What we take |
|---|---|
| **monogram.ai** | Airy, confident hero with a real product visual; a **rotating use‑case carousel** that shows concrete real‑world scenarios instead of abstract features. |
| **ploy.ai** | The **problem→solution→proof→action** narrative; **personification** ("You slept 8 hours. Ploy didn't."); **concrete metrics** grounding claims; a "works while you sleep" **activity timeline**; named, credible modules. Confident, slightly cheeky voice. |
| **nor.ma** | **Minimalist premium restraint**; one bold statement per section; **an interactive calculator** ("years of your life"); **preset scenario chips**; a **comparison table vs. alternatives**; poetic‑but‑practical microcopy. Lots of whitespace. |
| **bridge.surf** | Stark, utilitarian confidence; a **grid of product shots that create intrigue**; task‑phrased copy ("Clean up my messy desktop"). |
| **seesaw.website** | **Editorial, typography‑first** minimalism; **live social proof** ("60 joined today"); **category taxonomy** as a browsing device; monochrome + restraint. |

**Synthesis / north star:** *Editorial minimalism with warmth and motion.*
Big confident type, generous whitespace, **real product UI everywhere**, a
narrative that personifies the pain and the fix, concrete numbers, one flowing
scroll where **every section animates in with intent** (GSAP). Premium but
friendly — not corporate, not gimmicky.

---

## 2. Design language

### 2.1 Brand foundations
- **Name/metaphor:** *Vela* = sail. Lean into "raise the sail / set off / wind."
  Tagline energy: **"Ngri velën."** The sailboat mark is the hero motif.
- **Personality:** confident, warm, a little playful, unmistakably *for Albania*
  (ALL prices, RaiAccept, Shqip‑first).

### 2.2 Color system
Warm, light, premium — with the signature gradient as the *only* loud element.
- **Base / paper:** `#FBF8F4` warm off‑white (not stark white) → sections
  alternate with pure `#FFFFFF` cards for depth.
- **Ink:** `zinc‑900 (#18181b)` headings, `zinc‑500/600` body.
- **Brand gradient (the one loud thing):** `#FEDA75 → #D62976 → #962FBF → #4F5BD5`
  used sparingly — CTA, key words, accents, the mark. (This is the Instagram‑adjacent
  gradient; ownership through restraint.)
- **Accent solids** pulled from the gradient: fuchsia `#D6249F`, coral `#F59E6B`,
  violet `#8B5CF6`, emerald `#10B981` (success/"solution" states only).
- **One dark section** (the "while you sleep" / momentum section) on near‑black
  `#0C0C0F` for contrast and drama — everything else is light.
- **Never** rainbow everything. Gradient is a spice, not the meal.

### 2.3 Typography
- **Display / headings:** **Clash Display** (already loaded via Fontshare).
  Tight tracking, big sizes: hero `clamp(2.6rem, 6vw, 5.5rem)`, section titles
  `clamp(2rem, 4vw, 3.4rem)`. Weight 600–700.
- **Body / UI:** **Satoshi**. 16–20px, relaxed line‑height (1.5–1.65),
  `zinc‑600`.
- **Micro‑labels / eyebrows:** Satoshi 12–13px, uppercase, `tracking‑[0.18em]`,
  muted — used above every section title.
- **Numerals:** tabular for metrics/counters. Big stat numbers in Clash.
- **One serif‑italic accent** is optional for a single emotional line (à la the
  reference video's "Building plan…") — use at most once.

### 2.4 Spacing, grid & layout
- **Container:** `max-w-[1200px]` default; `max-w-[1320px]` for showcase rows;
  full‑bleed for the dark momentum band and marquees.
- **Section rhythm:** vertical padding `py-24 sm:py-32` (generous). Let sections
  breathe — whitespace is the premium signal (nor.ma).
- **Grid:** 12‑col mental model; most content 1‑ or 2‑col. Feature/use‑case
  blocks are **card grids** (`rounded-3xl`, subtle border `border-black/5`, soft
  shadow). Alternate **text‑left / visual‑right** then flip, down the page.
- **Corners:** `rounded-2xl`–`rounded-[28px]`. Consistent, soft, modern.
- **Borders/shadows:** hairline `border-black/5`; shadows soft and low
  (`0 30px 80px -30px rgba(30,10,50,.25)`), never harsh.

### 2.5 Components (design‑system primitives to build/reuse)
- **Eyebrow** (uppercase micro‑label with a gradient dot).
- **Gradient CTA** (pill, `h-12/14`, magnetic hover, subtle sheen).
- **Ghost/secondary button** (outline pill).
- **Pill/badge** (announcement bar, "new", category chips).
- **Card** (glassy white, hairline border, soft shadow, hover lift).
- **Stat tile** (big Clash number + label + tiny trend).
- **Browser/phone frame** (to present real screenshots — reuse from the hero film).
- **Comparison table** (3 columns: *Instagram only* / *Shopify & co.* / **Vela**).
- **FAQ accordion** (smooth height + rotate chevron).
- **Marquee** (infinite, gradient‑masked edges).

### 2.6 Imagery & visuals
- **Real product UI is the hero visual language** — the seeded demo screenshots
  (`public/hero/*.png`) presented in browser/phone frames, plus the Remotion
  **morphing story film** in the hero.
- Product photos (the Unsplash catalog images already used) for "shop" texture.
- **No cheesy stock, no generic 3D blobs.** Depth comes from soft gradient
  glows, glass, and layered UI — not clip‑art.
- A subtle **sail / wind** line‑motif can recur as a divider or background stroke.

### 2.7 Motion principles (the soul of the redesign)
1. **Everything enters on scroll** — nothing just "is there." Fade + rise
   (16–28px), 0.6–0.9s, `power3.out`, staggered children (0.06–0.1s).
2. **One idea per viewport.** Reveal in the order the eye should read.
3. **Eased, never linear.** Cubic/quart eases; springy only on playful accents.
4. **Purposeful, calm, premium** — not a fireworks show. Motion guides
   attention; it doesn't shout (learned the hard way — avoid busy blur/spotlight
   clutter).
5. **Respect `prefers-reduced-motion`** — degrade to instant/opacity‑only.
6. **60fps.** Animate `transform`/`opacity`; avoid layout‑thrash and heavy
   filters during scroll.

---

## 3. Voice & copy

- **Shqip‑first**, EN parallel (bilingual toggle already exists). Keep both in
  `copy.ts`.
- **Confident + warm + a bit cheeky** (ploy.ai). Address the reader as *ti*.
- **Personify the pain and the fix.** e.g. *"Ti fle. Dyqani yt shet."* (You
  sleep. Your shop sells.)
- **Concrete over abstract.** Numbers, real tasks: *"87 komente pa përgjigje,"*
  *"nga postimi te pagesa në 2 minuta."*
- **Task‑phrased benefits** (bridge.surf): *"Kthe një postim në produkt,"*
  *"Merr pagesa me kartë në Lekë."*
- Every section title is a **statement**, not a label.

---

## 4. Animation system — GSAP (required)

### 4.1 Stack
- **GSAP core + ScrollTrigger** (already have `gsap`; add `ScrollTrigger`,
  `useGSAP` via `@gsap/react`). Optional **Lenis** for smooth‑scroll (pairs with
  ScrollTrigger via `lenis.on('scroll', ScrollTrigger.update)`).
- Register once in a top‑level effect: `gsap.registerPlugin(ScrollTrigger, useGSAP)`.
- Wrap page animations in `gsap.context()` scoped to the page root; clean up on
  unmount. A small `useReveal()` hook standardizes the default reveal.
- Keep the **Remotion hero film** as‑is (its own rAF); GSAP drives the *page*.

### 4.2 Global patterns (build once, reuse)
- **`data-reveal`** batch: any element/row with this attr fades+rises when it
  enters (ScrollTrigger `batch`, `start: "top 85%"`, stagger). Default for 90%
  of content.
- **Split‑text hero:** headline animates in by word/line (mask + `y` + stagger)
  on load; the gradient word draws/þfills.
- **Pinned scroll sections:** "How it works" pins and advances its 3 steps as
  you scroll (progress line fills, active step scales/brightens).
- **Horizontal scroll rail:** the **use‑case / category carousel** scrolls
  horizontally while the section is pinned (translate X mapped to scroll).
- **Count‑up stats:** metric numbers tween from 0 → value when in view
  (`snap`, tabular).
- **Parallax:** hero visual + section screenshots drift a few % against scroll
  (`yPercent` on ScrollTrigger scrub). Subtle.
- **Sticky/shrinking nav:** nav condenses + gains a blurred bg after ~40px.
- **Marquee:** seamless infinite loop (gsap `x` + modifiers, or the existing
  Marquee).
- **Magnetic buttons + hover lifts:** pointer‑follow on CTAs; cards lift +
  shadow on hover.
- **Comparison table:** rows stagger in; the **Vela column** highlights
  (gradient border draw) when the block centers.
- **Section transitions:** soft gradient‑glow "wipes" between the dark momentum
  band and the light sections; the sail‑line stroke draws (`strokeDashoffset`)
  as a divider.
- **Reduced motion:** a single guard swaps all of the above for opacity‑only /
  no‑scrub.

### 4.3 Performance
- `will-change` only during active tweens; `ScrollTrigger.batch` over
  per‑element triggers; `fastScrollEnd`; `invalidateOnRefresh`. Kill triggers on
  route change.

---

## 5. Page structure — section by section

Order top→bottom. Each: **purpose · layout · content · motion**.

### S1 · Navbar
- *Purpose:* wayfinding + persistent CTA.
- *Layout:* left mark "⛵ Vela" · center links (Si funksionon, Veçoritë, Studio,
  Çmimet, Pyetje) · right lang toggle + `Hyr` + gradient `Fillo falas`.
- *Motion:* transparent over hero → after 40px scroll: blur bg, hairline border,
  slight shrink. Links underline‑grow on hover. Mobile: full‑screen sheet.

### S2 · Hero  *(text left · morphing story film right)*
- *Purpose:* the promise + the product in motion, instantly.
- *Content:* announcement pill ("Ndërtuar për shitësit e Instagramit në
  Shqipëri"); H1 **"Ktheje Instagramin tënd në një dyqan të plotë — brenda pak
  minutash."** (gradient on the last line); one‑line subhead; `Fillo falas` +
  `Shiko një demo live`; risk‑reversal line (7‑day trial). Right: the **Remotion
  morphing film** (already built) floating on the page.
- *Motion:* on load — headline split‑text mask reveal (word stagger), subhead
  blur‑in, CTAs pop, film fades+scales in. Gentle parallax on the film as you
  begin to scroll. A faint gradient aurora drifts behind.

### S3 · Trust strip
- *Purpose:* instant credibility.
- *Content:* one line — *"Besuar nga shitësit shqiptarë"* + a **live‑ish metric**
  (seesaw): *"+120 dyqane të hapura këtë muaj"* and a row of category/brand
  chips (Modë · Bukuri · Bizhuteri · Atlete · Handmade …) as a slow marquee.
- *Motion:* marquee loop; count‑up on the metric.

### S4 · The problem  *("Vetëm në Instagram")*  — **personified, ploy‑style**
- *Purpose:* make them feel the pain.
- *Layout:* a short **"a day selling in DMs"** narrative — 3–4 beats as a
  vertical timeline / stacked cards: *87 komente "sa kushton?", porosi nëpër
  screenshot‑e, stok i mbajtur me dorë (mbishitje), zero të dhëna.* Punch line:
  **"Ti mbyll sytë. Porositë humbasin."**
- *Motion:* timeline line draws as you scroll; each beat slides in; a small
  "unread DMs" counter climbs; the punch line snaps in bold.

### S5 · The turn  *("Ka një mënyrë më të mirë")*
- *Purpose:* pivot from pain to Vela — a breath.
- *Content:* big centered statement + the sail mark igniting; segues into how.
- *Motion:* mark scales/draws in; background shifts from tense to warm.

### S6 · How it works  *(3 steps — pinned)*
- *Purpose:* show it's genuinely 3 steps, minutes.
- *Content:* **1 Lidh Instagram · 2 AI ndërton produktet · 3 Ndaj linkun & shit.**
  Each step with a real UI snippet.
- *Motion:* section **pins**; a progress line fills 1→2→3; the active step's card
  brightens/scales and its mini‑UI animates; unpins into S7.

### S7 · Feature showcase  *(alternating rows, real UI)*
- *Purpose:* depth — the product is real and complete.
- *Content:* alternating text/visual rows using real screenshots + frames:
  **AI analizë** (post→produkt), **Storefront Studio** (templates, live preview),
  **Inventar & variante** (s'shet kurrë tepër), **Pagesa me kartë në Lekë
  (RaiAccept)**, **Menaxhim porosish**, **Analitikë**.
- *Motion:* each row: visual parallax + `data-reveal` stagger of copy; screenshot
  frames do a subtle Ken‑Burns; the Studio row can cycle templates.

### S8 · Use‑case rail  *(horizontal scroll — monogram/nor.ma)*
- *Purpose:* "this is for MY kind of shop."
- *Content:* scenario cards — *Butik modë, Bizhuteri, Atlete, Kozmetikë, Punime
  dore, Ushqim…* each a mini mock storefront + one‑line outcome.
- *Motion:* **pinned horizontal scroll**; cards scale up at center; parallax
  imagery.

### S9 · Momentum band  *("Ti fle. Vela shet.") — the DARK section*
- *Purpose:* the emotional peak — automation/while‑you‑sleep (ploy).
- *Layout:* near‑black band, a **live activity timeline** (23:00 → 08:00): orders
  arrive, AI syncs a new post, inventory reserves, revenue ticks — with **count‑up
  metrics** (të ardhura, porosi, klientë).
- *Motion:* timeline events type/slide in on scrub; numbers count up; a gradient
  glow pulses; strong contrast entrance/exit wipes.

### S10 · Comparison  *(Instagram only / Shopify & co. / Vela)* — nor.ma
- *Purpose:* why Vela specifically (and why it fits Albania).
- *Content:* rows — *Pa kod, Postime→produkte me AI, Pagesa me kartë në Lekë
  (RaiAccept), Para në dorë, Vitrinë e personalizueshme, Çmim, Kohë deri live.*
- *Motion:* rows stagger; the **Vela column** gets a drawn gradient border + soft
  glow when centered; check/cross icons pop.

### S11 · Interactive calculator  *("Sa po humbet?")* — nor.ma
- *Purpose:* personalized "aha."
- *Content:* two sliders — *postime në javë* + *çmim mesatar* → outputs *porosi/
  të ardhura të humbura në DM në muaj* vs *me Vela*. Playful, directional (not a
  quote).
- *Motion:* outputs count‑up as sliders move; a small bar/line grows.

### S12 · Testimonials
- *Purpose:* proof from peers.
- *Content:* 2–3 Albanian sellers, photo + quote + result (*"U shlye brenda një
  jave"*). Optional star rating.
- *Motion:* cards reveal; subtle auto‑advance or drag carousel; quote marks draw.

### S13 · Pricing
- *Purpose:* remove cost anxiety.
- *Content:* Starter / **Pro (popular)** / Business, **në Lekë**, monthly↔annual
  toggle (2 months free), 7‑day trial, feature checklists. RaiAccept trust note.
- *Motion:* cards rise/stagger; Pro card lifts + gradient border; toggle animates
  prices (count between values); feature ticks stagger.

### S14 · FAQ
- *Purpose:* kill last objections (trial, card, no‑website, IG requirements).
- *Motion:* accordion smooth height + chevron rotate; items reveal on scroll.

### S15 · Final CTA  *("Çfarë po pret? Ngri velën!")*
- *Purpose:* the close.
- *Content:* big gradient panel, **"Çfarë po pret? Ngri velën!"** + *"Nga
  Instagram në e‑commerce brenda pak minutave."* + `Fillo falas`. (Copy already
  set.)
- *Motion:* the sail/wind stroke sweeps; button breathes; gradient shifts;
  headline scales in.

### S16 · Footer
- *Purpose:* close + links.
- *Content:* mark + tagline, product/account/legal columns, lang, social, made‑in
  note.
- *Motion:* reveal on scroll; back‑to‑top with a little sail bob.

---

## 6. New / upgraded vs. today

**Add:** trust strip w/ live metric (S3), personified problem timeline (S4),
pinned how‑it‑works (S6), horizontal use‑case rail (S8), **dark momentum band**
(S9), comparison table (S10), interactive calculator (S11).
**Keep & restyle:** hero (+ morphing film), features, studio, pricing, testimonials,
FAQ, final CTA, footer.
**Retire/fold:** the old marquee‑divider + standalone journey film (the morphing
film now lives in the hero; a slimmer process lives in S6).

---

## 7. Implementation plan (build order)

1. **Foundations:** add `ScrollTrigger` + `@gsap/react`; `registerPlugin`; create
   `useReveal()` + a `<Reveal>` wrapper + `data-reveal` batch initializer;
   reduced‑motion guard; (optional) Lenis. Design tokens: confirm base paper
   color, container widths, shadow/border utilities in `globals.css`.
2. **Primitives:** Eyebrow, GradientButton (magnetic), Card, StatTile, Pill,
   Frame (browser/phone), ComparisonTable, Accordion, Marquee, CountUp.
3. **Sections top→down** (S1→S16), each with its scroll animation, wired through
   `copy.ts` (SQ/EN). Reuse `public/hero/*.png` + the morphing film.
4. **Polish pass:** timing, easing, stagger, mobile, reduced‑motion, 60fps check,
   Lighthouse.

**Guardrails:** light/warm base + gradient‑as‑spice; generous whitespace; real UI
over clip‑art; motion calm & purposeful; Shqip‑first; every section animates in.
