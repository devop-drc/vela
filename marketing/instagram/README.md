# Vela — Instagram launch kit

Everything here advertises the platform **as it is today** (no expansion-plan content).
All copy follows the brand guidelines: Albanian-first, "ti" form, **sistemi** (never "AI"),
**mesazhe** (never "DM"), **postimet** (never "feed").

## Feed posts — seamless 3-tile rows

`feed/out/` contains 9 tiles (1080×1440, 3:4 — Instagram's current grid ratio), sliced from
three continuous 3240×1440 canvases. `grid-preview.png` shows how the profile will look.

| Row | Theme | Tiles |
|---|---|---|
| A (dark) | Manifesto — "Kthe Instagramin në dyqan online." | row-a-1..3.png |
| B (light) | Si funksionon — 3 hapa | row-b-1..3.png |
| C (dark) | Veçoritë — pagesa / vitrina / porositë | row-c-1..3.png |

**Posting order matters.** The grid places the *newest* post top-left, so within each row
post the **right tile first**: `row-x-3.png` → `row-x-2.png` → `row-x-1.png`.
Post rows bottom-up (C, then B, then A) so the manifesto row ends up on top.
Post all 3 tiles of a row back-to-back so nothing else lands between them.

Suggested captions (feel free to tweak):
- **Row A:** `Dyqani yt online — direkt nga Instagrami. Pa kod, pagesa në Lekë, porositë në një panel. Provo falas 7 ditë → linku në bio. #dyqanonline #shqiperi #ecommerce #instagramshop #vela`
- **Row B:** `Tre hapa dhe je live: lidh Instagramin → sistemi ndërton produktet → ndaj linkun & shit. 🛍️ Provo falas 7 ditë → linku në bio.`
- **Row C:** `Pagesa me kartë në Lekë (RaiAccept), vitrinë që duket si marka jote dhe porositë live në një panel. Gjithçka për dyqanin tënd → linku në bio.`

To edit a row: change `feed/row-*.html`, re-render at 3240×1440 with headless Chrome
(`--window-size=3240,1440 --screenshot=...`), then re-slice (see git history / slice script).

## Stories — animated MP4s (1080×1920, 30fps)

Rendered to `stories/`. Source compositions live in `src/compositions/stories/*`
(Remotion; `StoryFeatures` is GSAP-timeline-driven). Preview/edit with `npm run studio`,
re-render with `npx remotion render src/remotion.ts <CompId> out.mp4 --codec=h264 --crf=18`.

| File | Length | Content | Note |
|---|---|---|---|
| StoryIntro.mp4 | 7s | Brand opener + tagline + trial CTA | good as first highlight |
| StoryProblem.mp4 | 8s | "Sa kushton?" mesazhe pile → customers buy on their own | |
| StorySteps.mp4 | 10s | 3 hapa + "Gati për të shitur?" | |
| StoryFeatures.mp4 | 9s | 4 feature cards (payments, studio, orders, stock) | |
| StoryCTA.mp4 | 6s | Full-gradient trial offer + "Linku në bio" | add the LINK sticker over the chip |

Safe areas respected (content stays clear of IG's top/bottom chrome). When posting,
add Instagram's native **link sticker** on StoryCTA pointing to the signup page, and pin
the set as a highlight ("Si funksionon") after 24h.

## Suggested account setup

- Handle: **@vela.al** · Name: "Vela — Dyqani yt online" (searchable keywords)
- Bio: `Kthe Instagramin në dyqan online. Pa kod · Pagesa në Lekë · Porositë në një panel. Provo falas 7 ditë ↓`
- Category: Software; link: signup URL (or Linktree with demo + signup)
- Convert to a **Business** account (needed anyway for the platform story, and unlocks insights/boosting)
