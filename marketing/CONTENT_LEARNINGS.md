# Vela — Marketing Content Learnings & Strategy

_What the first Instagram kit taught us (design, motion, voice), merged with the
Remotion automation blueprint from `Claude_Code_Marketing_Remotion_Master_Strategy.docx`._

> Source of the old kit: `marketing/old/` (renamed from `marketing/instagram`).
> Real app reference captures: `marketing/app-screenshots/` (8 shots, Albanian UI, seeded catalog).
> Language rule for ALL content: **Albanian-first, "ti" form.** Say **sistemi** (never "AI"),
> **mesazhe** (never "DM"), **postimet** (never "feed").

---

## Part 1 — What we shipped (the old kit)

14 pieces, color-matched between feed and stories:

| # | Piece | Format | Theme | Role |
|---|---|---|---|---|
| Feed A1–A3 | Manifesto row | 3× 1080×1440 (3:4), dark | "Kthe Instagramin në dyqan online." | Grid identity anchor |
| Feed B1–B3 | 3-hapa row | 3× 1080×1440 (3:4), light | "Aktiv në tre hapa — pa kod." | How-it-works |
| Feed C1–C3 | Veçoritë row | 3× 1080×1440 (3:4), dark | pagesa / vitrina / porositë | Feature proof |
| StoryIntro | 7s / 210f | 1080×1920 dark | Brand opener + tagline + trial | First highlight |
| StoryProblem | 8s / 240f | 1080×1920 | Message pile → customers buy on their own | Best hook |
| StorySteps | 10s / 300f | 1080×1920 | 3 hapa + "Gati për të shitur?" | How-it-works |
| StoryFeatures | 9s / 270f | 1080×1920 | 4 feature cards (GSAP) | Best motion |
| StoryCTA | 6s / 180f | 1080×1920 | Full-mesh trial offer + "Linku në bio" | Closer |

Feed = HTML/CSS authored as one 3240×1440 canvas per row, sliced into three tiles.
Stories = Remotion (frame-driven; **StoryFeatures is GSAP-timeline-driven**).

---

## Part 2 — Brand & visual system (reuse verbatim)

### Palette — the "red/gold" rebrand
Both `feed.css :root` and the `BRAND` object in `storyKit.tsx` define the **same tokens**
(keep them in sync — this duplication is a known drift risk; unify into one `brand.ts`).

| Token | Hex | Role |
|---|---|---|
| dark | `#140A0E` | near-black wine — dark canvas |
| darkCard | `#1E1014` (cards use `rgba(22,18,28,.88–.92)`) | dark card base |
| paper | `#FDFCFD` | light background |
| ink | `#2A1D22` | text on light |
| muted | `#796770` | secondary text on light |
| border | `#E8DEE2` | hairline on light |
| **primary (wine)** | `#A31234` | anchor brand color |
| pink | `#C81E3C` | crimson |
| **fuchsia (neon-red)** | `#FF2E4D` | electric accent |
| deep | `#7F1D3B` | shadow end of gradients |
| amber | `#F59E0B` | amber |
| gold/yellow | `#FACC15` | gradient highlight |
| red | `#E11D48` | rose-red |

### The signature gradient (`.brand-gradient`)
Wine base + four positioned radial fields (deep-wine → gold → neon-red → amber),
sized 210–250% so only soft color shows. **`StoryCTA` animates the four positions**
with sine `drift()` so the mesh breathes — factor this into ONE reusable component.

```css
background-color:#A31234;
background-image:
  radial-gradient(42% 56% at 20% 25%, #7F1D3B 0%, transparent 100%),
  radial-gradient(48% 62% at 80% 18%, #FACC15 0%, transparent 100%),
  radial-gradient(52% 66% at 72% 82%, #FF2E4D 0%, transparent 100%),
  radial-gradient(44% 54% at 22% 78%, #F59E0B 0%, transparent 100%);
background-size:230% 230%,210% 210%,250% 250%,220% 220%;
```

### Gradient-clipped text (`.brand-text`)
Gold→amber→neon-red→wine, clipped to glyphs — used on the **second clause** of every
headline and the big 01/02/03 numerals.
```css
background:linear-gradient(100deg,#FACC15 5%,#F59E0B 30%,#FF2E4D 62%,#A31234 95%);
-webkit-background-clip:text; color:transparent;
```

### Backgrounds
- **Dark**: `#140A0E` + blurred ambient blobs (`deep/pink/amber/red`, `blur(150–220px)`, drifting on sine paths).
- **Light**: `#FDFCFD` paper + thin 18px `.brand-gradient` top bar + white icon tiles with soft shadow.
- **CTA**: animated mesh + radial vignette `radial-gradient(90% 70% at 50% 42%, transparent 30%, rgba(15,12,19,0.42) 100%)`.

### Logo mark
The boat/sail ("Vela" = sail). `ship-white.svg` / `ship-colored.svg`, ~230–250px, big soft drop-shadow.
Wordmark is text only: `VELA — DYQANI YT ONLINE` as a wide-tracked eyebrow.

---

## Part 3 — Typography

- **Display:** Clash Display (Medium 500 / Semibold 600 / Bold 700). In Remotion, load via
  `ensureClash()` (`FontFace` + `delayRender/continueRender`) so renders wait for the OTF.
- **Body:** Satoshi (feed) / Inter (stories). Fallback `Inter, 'Segoe UI', sans-serif`.

| Use | Feed (3240w) | Story (1080w) | Weight / spacing |
|---|---|---|---|
| Hero H1 | 252px | 92–128px | Clash 600, `-0.02em`, two-part |
| Section H2 | 76px | 84–108px | Clash 600 |
| Step numeral | 210px | 210px | Clash 700, gradient-clipped |
| Card/step title | 64–66px | 44–46px | Clash 600 |
| Body | 33–38px | 31–44px | Satoshi/Inter 400–500, lh 1.45–1.5 |
| Eyebrow | 26–30px | 24–30px | 700, `.24em`, UPPERCASE |
| Chip | 32–40px | 40px | Clash 600, `-0.01em` |

**Headline formula:** white first clause + **gradient-clipped second clause** on its own line.
Display line-heights tight (1.04–1.12). Eyebrows are the inverse (wide tracking, uppercase).

---

## Part 4 — Layout patterns

- **Seamless 3-tile row (feed):** author one 3240×1440 canvas; make elements **span tile cuts** —
  Row A rotated gradient band, Row B dashed journey line + connecting dots, Row C rotated ribbon.
  **Posting order is load-bearing:** post each row right→left (`-3 → -2 → -1`), rows bottom-up
  (C, B, A), tiles back-to-back.
- **Safe areas:** feed margins top 88 / side 96. Stories `StoryShell` pads `280 84 300`
  (clears IG's ~250 top / ~280 bottom chrome); chrome fades in frames 8–26, out at tail.
- **Component vocabulary:**
  - **Chip/pill** — `radius:999px`; outline-on-dark (translucent + `backdrop-blur(6px)`) or
    gradient-filled (`linear-gradient(115deg,#7F1D3B,#A31234 40%,#FF2E4D 75%,#F59E0B 115%)` +
    wine glow shadow).
  - **01/02/03 step device** — giant Clash-700 gradient numeral + tinted icon tile + title + 2-line desc;
    accent cycles fuchsia → crimson → amber. Identical in Row B and StorySteps (good cross-format consistency).
  - **Icon tiles** — rounded squares (`radius 34–48px`), bg tinted ~15% of accent (`${color}26`), thin lucide strokes.
  - **Feature card** — dark glass (`rgba(22,18,28,.88–.92)`), `border:2px rgba(255,255,255,.14)`, `radius 48–64px`, deep shadow, uppercase tag label.

---

## Part 5 — Motion engine (per story)

Shared primitives — `src/lib/motion.ts`:
- **`springIn(frame, fps, delay, config)`** — default `{ damping:13, mass:0.9, stiffness:130 }` (subtle overshoot). Every entrance.
- **`exitLift(frame, dur, frames=20, lift=40)`** — fade + upward lift over the last N frames (cubic-in). Nothing hard-cuts.
- **`float(frame, amp=6, speed=20)`** = `sin(frame/speed)*amp` — idle bob for the held middle.
- **`pulse(frame, speed=24)`** = `0.85 + sin(frame/speed)*0.15` — glow/scale life.
- GSAP bridge — `src/lib/gsapRemotion.ts` builds a paused timeline and **seeks** it to `frame/fps` (frame-exact).

| Story | Signature move (real params) |
|---|---|
| **Intro** | Word-by-word headline: each word `springIn(delay+i*5,{damping:12})` + **blur-up** `blur((1-s)*10px)` + `translateY((1-s)*90)`. Ship drops from `-140px` into `float(8,26)`. |
| **Problem** | Two acts via `<Sequence>` (ACT1=118). Act 1: 5 chat bubbles `springIn` at 22/38/54/68/82, alt left/right; **act exits sliding left** (`translateX(-out*260)`). Act 2: product card + **pulsing "Shto në shportë"** button (`scale(0.92+…*pulse(f,18))`). |
| **Steps** | Beat sequencer (BEAT=78). Elements **fly in from the right** (`translateX((1-x)*300…420)`, trailing cascade); each step **exits left**. Progress dots: active widens to 54px gradient. |
| **Features** | **GSAP timeline** (the standout): headline span stagger `y:90 … stagger:0.08`; four cards overshoot with **alternating ±3° tilt** `back.out(1.4)`, `stagger:0.28`; CTA `back.out(1.7)` then **breathes** (`yoyo scale 1.045, repeat:5`). |
| **CTA** | Full-canvas **animated mesh** (`drift` speeds 70/80/90/75) + vignette; ship + head spring in; **bouncing 👆** `|sin(frame/11)|*16` above the "Linku në bio" chip (where IG's link sticker goes). |

**Cross-story signature:** spring-in entrance (blur-up or slide) → held middle with `float`/`pulse` → `exitLift` fade-up. Deterministic, safe-area aware.

---

## Part 6 — Copy & voice

- **Rules:** Albanian-first, "ti" form. **sistemi** (not AI), **mesazhe** (not DM), **postimet** (not feed).
- **Headlines:** short, two-part, second clause gradient-clipped. Manifesto *"Kthe Instagramin në dyqan online."* Problem-as-question *"Gjithë dita duke u përgjigjur në mesazhe?"* → payoff *"Klientët blejnë vetë. Pa mesazhe. Pa pritje."*
- **Trust stack (repeat everywhere):** **"Provo falas · pa kartë · anulo kurdo"**, **"Linku në bio"**, domain **vela.al**. Name real specifics: *RaiAccept*, *pagesa në Lekë*, *Storefront Studio*, *stoku rezervohet vetë*.
- **Hashtags:** category + geo + English discovery — `#dyqanonline #shqiperi #ecommerce #instagramshop #vela`.
- **Emoji:** sparingly, for warmth (🛍️ 🙏 👗 👆).

---

## Part 7 — Assessment of the old kit

**Strongest:** ① StoryFeatures (GSAP, most premium motion) · ② StoryProblem (best narrative + hook) ·
③ Feed Row A manifesto (identity at a glance) · ④ StoryIntro (ownable blur-up reveal) · ⑤ Feed Row B (best seamless-row execution + needed light contrast).

**Weak / at-risk:** Feed Row C (dense, subtle ribbon reads poorly across cuts); StoryCTA (pretty but sells least).

**Weaknesses to fix next time:**
1. **Aspect-ratio split** — feed is 3:4, stories 9:16. Fiddly 3240-slice workflow, no Reel counterpart.
2. **No poster frames** — MP4 frame-0 is often mid-spring → weak grid thumbnails.
3. **Soft hooks** — several stories open on brand/ship, not tension. (Problem is the exception.)
4. **Duplicated tokens** — `feed.css` vs `storyKit BRAND`; `.brand-gradient` re-typed in StoryCTA.
5. **Claims outrun visuals** — Act-2 mock card instead of the real app UI (now solved — see Part 9).
6. **Neon-red-on-wine** can vibrate; body text at 58–62% white needs a contrast check under IG compression.

---

## Part 8 — Strategy blueprint (from the .docx)

The Master Strategy specifies a **Remotion automation engine** producing a uniform suite.
Standards to adopt for the next generation:

**Format & uniformity**
- **9:16 · 1080×1920 · 30 FPS for EVERY piece** (Reels, TikToks, AND static grid posts) — 100% profile uniformity.
- **Dedicated poster/cover frame at frame 0** — a clean, minimal thumbnail that doubles as the grid cover before playback.
- **50/50 dark/light** mix across the suite; **dual-language EN + SQ** (we run **Albanian-first**).

**Content psychology**
- **3-second hook:** frame 0 = high-contrast pattern interrupt (bold movement / split screen / immediate UI interaction). Never open on a logo. Open on the pain or the transformation.
- **Focal spotlighting:** dim/blur non-essentials, zoom the active UI element; one micro-value per screen.
- **Social-SEO (July 2026):** IG/TikTok are visual search engines — burn in buyer-intent keywords as on-screen text + captions (e.g. *"automatizo Instagramin"*, *"porosi automatike"*, *"dyqan online pa kod"*). Kinetic, high-contrast, readable on silent autoplay.

**Motion standards (already how our stories work — keep)**
- Pure frame-driven: `useCurrentFrame()` / `useVideoConfig()`, no CSS `@keyframes`.
- **Spring over linear:** `spring({ frame, fps, config:{ damping:12, mass:0.5, stiffness:100 }})` for pops/slides/reveals.
- **Always clamp** interpolate: `{ extrapolateLeft:'clamp', extrapolateRight:'clamp' }`.
- **Reuse app components/SVGs** in compositions instead of rebuilding mock UI.

**Trust / IP guardrails**
- Sell the outcome (get 80% of the daily grind back), not the mechanism. Never expose backend/algorithms.

**The .docx content matrix (8 compositions)** — mapped to our next-gen plan in `NEW_CONTENT_PLAN.md`:

| ID | Name | Format | Theme / Lang | Value prop |
|---|---|---|---|---|
| C1 | MacroShift | Reel 20s | Dark / SQ | Automatizo 80% të punës në Instagram |
| C2 | MacroShift (var) | Reel 20s | Light / SQ | Qetësi mendore, kohë e lirë, modernizim |
| C3 | MicroDmFlow | Reel 15s | Light / SQ | Nga mesazhi te checkout automatik |
| C4 | MicroOrderDash | Reel 15s | Dark / SQ | Porositë pa tabela Excel |
| C5 | BeforeAfterFlow | Reel 15s | Dark / SQ | Krahasim hap-pas-hapi |
| C6 | MatrixStaticPost | Still/5s | Light / SQ | Para vs. Pas — matrica e efikasitetit |
| C7 | StatCardPost | Still/5s | Dark / SQ | Metrika "80% kohë e kursyer" |
| C8 | TrustProofPost | Still/5s | Dark / SQ | Lista e garancive & përfitimeve |

---

## Part 9 — Real app screenshots (reusable assets)

Captured from the live app (Albanian UI, seeded demo catalog — 14 products, 30 orders) in
`marketing/app-screenshots/`. These replace mock UI in compositions — the .docx explicitly says
reuse real UI, and it raises credibility (fixes weakness #5).

| File | Shows | Best used in |
|---|---|---|
| `01-dashboard.png` | Light dashboard: revenue chart trending up (ALL 100,100), top sellers, live activity | Macro "big shift", stat callouts |
| `08-dashboard-dark.png` | Same, dark theme | Dark-mode compositions, 50/50 mix |
| `02-products.png` | 15-product grid, filters, statuses | "sistemi ndërton produktet", catalog |
| `03-instagram-studio.png` | Template gallery + realistic IG post preview with caption | Publishing/"looks like a brand" reels |
| `04-storefront-studio.png` | Design tool: template gallery + live desktop/mobile preview | "vitrina jote, marka jote" |
| `05-orders.png` | 30 orders, status pills, one panel | "porositë në një panel" (fixes claim-vs-visual) |
| `06-storefront-live.png` | Customer storefront (IG-style grid, checkout) | "dyqani yt online", before/after |
| `07-storefront-mobile.png` | Storefront on a phone (9:16-friendly) | Vertical Reel device-mockup shots |

**Reuse rules:** frame these inside a phone/browser `DeviceMockup`; use focal spotlighting (dim
the frame, zoom the active element); keep them on-brand by pairing with the wine→gold mesh and
Clash headlines. All are Albanian UI, matching the voice rules.
