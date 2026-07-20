# Vela — FINAL campaign

The production wave. Two complete language trees rendered from ONE
parameterized codebase (`src/compositions/marketing/final/` — change copy in
`copy.ts`, re-run the script, both languages update).

```
final/
  PLAN.md        the full creative spec: trend research, validation, per-asset
                 second-by-second timelines, animation techniques, captions
  en/  sq/
    reels/          01-the-machine (30s) · 02-you-dont-need (15s) · 03-open-247 (13s)
    reel-covers/    01-the-machine.png  (grid cover for the 30s reel)
    posts/          01-control-room (20s) · 02-five-minutes (10s)   [4:5 video]
    single-posts/   01-the-split.png · 02-money-clean.png           [4:5 image]
    carousels/      01-voyage-{1..5}.png — SEAMLESS 5-slide panorama:
                    upload in order, the canvas continues across slides
    stories/        01-trial-picker.png · 02-tonight.png — the y1150–1560 band
                    is deliberately empty: drop the LINK STICKER there in-app
    tiktok/         01-you-dont-need · 02-open-247 (TikTok-safe masters —
                    attach Commercial Music Library sound in-app)
```

**Re-render:** `node scripts/render-final-marketing.mjs` (or `stills` /
`videos`). Carousel slides must always be re-rendered together — they share
one 5400px canvas.

**Posting order (2-week rotation, alternate languages by audience):**
carousel (flagship, saves) → the-machine reel + its cover → the-split single →
control-room post → you-dont-need reel (+ TikTok) → money-clean single →
five-minutes post → open-247 reel (+ TikTok) → stories throughout as
link-drivers (trial-picker after every reel, tonight on quiet days).

Captions + hashtags per asset: bottom of PLAN.md. First-generation waves
(night/light/duo/secure/meme sets) are archived in `../first-generations/`
and remain useful as the organic filler layer between campaign beats.
