# Vela — TikTok Set (Albanian meme formats)

Four meme-format ads built on Albania's shopping-culture canon, rendered from
code (`src/compositions/marketing/TikTok.tsx`, 1080×1920 · 30fps). They follow
TikTok's own creative guidance: the hook owns the first second (90% of ad
recall lands inside 6s), all text sits inside the safe zone (TikTok's UI
covers ~120px top/bottom + the right rail), captions are big outlined
"TikTok classic" type, and the CTA lands in the final beats.

**Why memes, not polish:** native-grammar content (POV, chat skits,
punch-zooms) reads as content, not ads — the aesthetic is casual, the
strategy isn't. Every video is a *relatable pain* the Albanian buyer/seller
already jokes about, with Vela as the punchline-fix.

**Re-render:**
```bash
npx remotion render src/remotion.ts TkPriceInDm branding/marketing/tiktok/01-cmimi-ne-dm.mp4
npx remotion render src/remotion.ts TkOldLek    branding/marketing/tiktok/02-leke-te-vjetra.mp4
npx remotion render src/remotion.ts TkPovSeller branding/marketing/tiktok/03-pov-shites.mp4
npx remotion render src/remotion.ts TkHaggle    branding/marketing/tiktok/04-sa-e-le.mp4
```

## ⚠️ Sound (do this in the TikTok app)

Videos are rendered SILENT on purpose. For a business/advertiser account you
must use sounds from TikTok's **Commercial Music Library** (regular trending
sounds are not licensed for ads). When posting:
1. Upload the MP4 → tap "Add sound" → filter by Commercial Music Library.
2. Pick a currently-trending comedic/suspense sound — for the meme cuts
   (01, 02, 04) a "build-up → record-scratch/drop" structure lands the
   punchline; for 03 pick something chaotic that calms at the panel reveal.
3. Sync check: the hard cut to the Vela payoff sits at ~7.5–8s in every
   video — scrub the sound so its drop/beat change lands there.

## The four videos

### 01 · `01-cmimi-ne-dm.mp4` — "Çmimi në DM 🙏" (~14s)
THE Albanian online-shopping meme: you ask the price, the shop replies
"çmimi në DM" — while you are already in the DM. Chat skit → rage shake →
"Shqipëria e tërë në një foto 💀" → cut: Vela product card with the price
*on the product*.

**Caption:** Taguaj dyqanin që e bën këtë 😭 | çmimi te produkti → vela.al
**Hashtags:** #cmiminedm #shqip #dyqanionline #memeshqip #vela

### 02 · `02-leke-te-vjetra.mp4` — "Lekë të vjetra apo të reja?" (~13s)
The eternal 1-milion-lekë panic: every Albanian purchase is a math exam
(10,000 old = 1,000 new). Numbers flip 10,000↔1,000 with a shake →
"çdo blerje = provim matematike 💀" → cut: clean Vela pricing + the
multi-currency roll.

**Caption:** Të vjetra apo të reja? PO PYES PËR NJË SHOK 😭 | vela.al
**Hashtags:** #leketevjetra #shqiperia #memeshqip #blerjeonline #vela

### 03 · `03-pov-shites.mp4` — "POV: shet në Instagram pa dyqan" (~14s)
Seller-side POV: DM bubbles rain in with punch-zoom while the counter climbs
to "147 DM pa përgjigje" → cut: order notifications arriving by themselves +
"Ti fle. Dyqani shet. 😴💸".

**Caption:** Dedikuar çdo shitësi që flen me telefonin në dorë 📱💀 | vela.al
**Hashtags:** #biznesonline #shitesonline #povshqip #dyqanionline #vela

### 04 · `04-sa-e-le.mp4` — "Sa e le?" (~13s)
The haggling classic: "Sa e le? / 3,000 i jap, hajde se rregullohemi 🤝" →
red buzzer "❌ DYQANI S'BËN PAZAR" → cut: checkout pays 4,500 L, done.
"Çmimi është çmim. Karta është kartë."

**Caption:** Pazari ka mbetur te zarzavatet 🍅 dyqani yt punon me çmim fiks | vela.al
**Hashtags:** #saele #pazarshqip #memeshqip #pagesaonline #vela

## Posting playbook

- **Cadence:** 1 video every 2–3 days; refresh/remix creatives every 7–14
  days (ad fatigue sets in fast on TikTok).
- **A/B the hooks:** re-render with an alternative first line (e.g. 01:
  "Mos e pyet kurrë një dyqan shqiptar sa kushton") — the hook text is a
  single string in `TikTok.tsx`.
- **Organic first, then Spark Ads:** post organically, let 48h of signal
  accumulate, then boost the best performer as a Spark Ad instead of a cold
  in-feed ad — meme formats keep their comments/social proof that way.
- **Comments are the second punchline:** pin a comment like "çmimi në bio 🙏"
  (self-aware) on 01 — comment-bait drives the algorithm.
- **Safe zone:** all type already sits inside 120px top/bottom margins; don't
  add app-side text at the very bottom, it collides with the caption/rail.

Sources for the format rules: TikTok For Business creative best practices
(hook ≤3s, 21–34s for polished ads vs shorter meme cuts, text-overlay safe
zones, CML licensing), 2026 creative-agency guidance on native-grammar hooks.
