# Vela — Mobile Audit (2026‑07‑24)

Full mobile pass over every reachable page and its components (modals, drawers,
popovers, cards, buttons, layout, tables, forms). Verified **live** in Chrome
against the real app (shop `mediadesk-albania`, IG‑theme demo `dyqani-yt`) at
**320 / 375 / 414** widths, with a programmatic overflow + tap‑target probe run
per route in addition to visual review.

Framing (impeccable): the admin app is an **Operate** surface — scanability,
consistency, native touch expectations and the real one‑handed usage scene
outrank expression. The public storefront mixes **Persuade** (home) and
**Operate** (browse/checkout).

**Headline result:** no page produces horizontal page overflow at any width
(320 included) — the grid/layout system is sound. Every issue below is
*within-component*: floating widgets colliding with content, touch targets under
the 44px floor, a couple of tables/among control‑rows that don't adapt, type
that reads as merged words, and two data/formatting bugs.

Legend — severity: **P1** unusable/blocks a task · **P2** clearly bad UX /
readability · **P3** polish. Status: ☐ open · ☑ fixed.

## Fix log (2026‑07‑24, same day)
- ☑ **A1** FAB dock now hides on scroll‑down / reveals on scroll‑up (mobile) —
  no longer covers card actions / toggles. `DashboardLayout.tsx`.
- ☑ **A2** heading `word-spacing` added so Clash Display stops merging words.
  `globals.css`.
- ☑ **A3** dashboard quick‑action chips, "View Storefront" link, chart legend
  toggles bumped to ~40px tap height on mobile. `QuickActions.tsx`,
  `OverviewChart.tsx`.
- ☑ **B1** dashboard range toolbar now wraps instead of clipping "Month".
  `OverviewChart.tsx`.
- ☑ **B3** Keywords table fits the phone (table‑fixed, description wraps),
  keyword chip stays on ONE line (owner: no wrapping), delete reachable.
  `KeywordsTable.tsx`.
- ☑ **B4** Billing price no longer flashes decimals mid count‑up. `Billing.tsx`.
- ☑ **B6/B7** IG Studio + Storefront Studio option cards 2‑across on mobile —
  labels no longer truncate. `IgStudioGlyphs.tsx`, `SimpleStudio.tsx`.
- ☑ **B9** MediaItem shows a neutral placeholder when an image fully fails
  (was a broken‑image box). `MediaItem.tsx`.
- **B2** left as‑is — the Products mobile control row is an intentional
  edge‑bleeding horizontal‑scroll chip strip (native‑expected). 
- **B5** reclassified: not a real gap — the 2nd stat‑card row is mid
  scroll‑reveal in the screenshot; all 4 cards render. (artifact, like B10.)
- **B8** deferred (minor chip cramping in the expanded stock row).
- Build passes; impeccable `detect.mjs` on the changed files = clean.
- **New (task #12):** keyword descriptions should display in the merchant's
  language but be sent to the AI in English — separate backend feature
  (migration + classifier change), not started.

---

## A. Systemic (app‑wide) — fix once, benefits every page

### A1 · P1 — Floating chat + notification bubbles overlap content ☐
The two FABs (VelaChat + notifications) sit bottom‑right *just above* the bottom
tab bar and, at rest (no scroll), cover real, interactive content on nearly
every admin page:
- **Promotions:** cover a promotion card's **delete + repost** icons.
- **Filters:** cover the last visibility **toggle** (e.g. "Battery Life").
- **Dashboard:** cover the chart legend / activity rows.
- **Products / Stock / Orders / Keywords / Billing / Settings:** cover the last
  list row / form field / table row.

Root cause: the widgets are `position: fixed` bottom‑right with no awareness of
the bottom nav, and page content has no reserved bottom padding for them.
Fix direction: on mobile, lift the FAB stack clear of the bottom tab bar *and*
reserve bottom padding (safe‑area aware) on scroll containers so nothing lives
under them; consider hide‑on‑scroll‑down / show‑on‑scroll‑up. Files:
`src/components/VelaChat.tsx`, `src/components/layout/NotificationSidebar.tsx`,
and whatever composes the floating stack, plus the `DashboardLayout` scroll
region.

### A2 · P2 — Display headings read as merged words ☐
The heading face (Clash Display, tight tracking) renders multi‑word titles with
almost no visible word gap: "Welcome back" → "Welcomeback", plus "System
Keywords", "Your Promotions", "Shop Details", "Bli sipas". Hurts scanability —
the first thing the eye hits on each page.
Fix: relax letter‑spacing and/or add a small `word-spacing` on the heading
utility at mobile sizes (verify the space glyph isn't being crushed by
`letter-spacing`). File: `src/globals.css` heading utility / `font-heading`.

### A3 · P2 — Touch targets below the 44px floor ☐
Probe flagged many interactive elements under Apple's 44px / WCAG 2.5.5 target
on the dashboard alone: quick‑action chips (**30px** tall), chart legend toggles
(**26px**), "View Storefront" link (**16px**), assorted icon buttons (**28px**).
Fix: raise min tap height to ~40–44px on primary mobile controls (chips, legend
toggles, icon buttons) — pad rather than enlarge visuals where needed.

### A4 · P3 — Reserve bottom padding under the fixed tab bar ☐
Independently of the FABs, several scroll regions let the last row sit flush
under the fixed bottom nav. Add consistent bottom padding (safe‑area inset
aware) to the `DashboardLayout` content scroller.

---

## B. Page‑specific

### B1 · P2 — Dashboard: "Business Overview" range toolbar cramped/clipped ☐
The range buttons (7D/30D/90D/6M/All) + granularity (Month/Day) live in a
horizontal‑scroll strip that clips "Month" at 375/320 and reads as broken.
Fix: wrap to two rows or a segmented control sized for mobile.

### B2 · P2 — Products: inline view‑controls strip clipped ☐
Sort / Group / More Detail / Filters / Select sit in a horizontal‑scroll row;
"More Detail" is clipped. Cramped and easy to miss controls.
Fix: on mobile collapse the secondary controls into a single "View" popover /
sheet (keep Search + Add + Sync primary).

### B3 · P2 — Keywords: keyword/description table overflows horizontally ☐
`KeywordsTable` uses fixed column min‑widths (`w-[180px]` keyword col + desc +
actions) → the card scrolls horizontally on a phone and the per‑row actions and
the last row (behind the FABs) are hard to reach.
Fix: stack to a card/definition layout on mobile (keyword over description),
actions inline; drop the fixed `w-[180px]`.

### B4 · P1 — Billing: plan price formatting bug ☐
Plan shows **"3,289.292 ALL / month"** — three decimal places with ambiguous
thousands/decimal separators for an integer‑lek plan (should read e.g.
"3,990 ALL"). Currency/precision bug in the plan‑price display.
Fix: format ALL as a 0‑decimal grouped integer via the shared currency helper.
File: `src/pages/Billing.tsx`.

### B5 · P3 — Promotions: large empty gap under the stat cards ☐
~140px of dead vertical space between the Active/Scheduled stat row and "Your
Promotions". Tighten the section rhythm on mobile.

### B6 · P3 — Instagram Studio: option‑card labels truncate ☐
Structure/Tone are 4‑across at 375 so labels clip ("Structure…", "Professio…").
Fix: 2‑across on mobile (or allow 2‑line labels).

### B7 · P3 — Storefront Studio: option‑card labels truncate ("Dram…") ☐
Same 4‑/5‑across truncation on Shadows etc. Live preview + device toggle are
good — only the label truncation needs addressing. (2‑across on mobile.)

### B8 · P3 — Stock (expanded row): variant chips cramped ☐
"Storage Capacity: 12GB" chip wraps label/value awkwardly; qty input is small.
Tighten the expanded‑variant layout for phones.

### B9 · P2 — IG shop (`dyqani-yt`): first product image broken ☐
"Qiri aromatik soje" grid tile shows **alt text, no image** (broken/มissing
asset on that product's photo — data issue, not layout). Re‑upload/repair that
product's image or add a graceful image‑fallback in the IG grid tile.

### B10 · P3 — Storefront home relies on scroll‑reveal for all content ☑ (by design)
`sf-reveal` sections start invisible until scrolled into view; fine for real
users (verified content reveals correctly on scroll) but means a
non‑scroll/print/JS‑fail render shows a near‑empty page. Noted as robustness,
not a live bug.

---

## C. What's already good on mobile (verified)
- **Storefront** home (editorial product showcase), products grid, product
  detail (variant picker + add‑to‑cart), empty cart — all excellent.
- **IG shop** 3‑col feed grid + profile header (aside from B9).
- **Storefront Studio** — controls stack, live phone‑framed preview with
  desktop/mobile toggle below.
- **Settings** (Account/Shop), **Chat**, **Filters** list, **Stock** list — clean
  single‑column layouts.
- Global dialog/drawer behaviour from the prior pass (gutter, `dvh` cap, scroll,
  rounded, footer gaps) holds at 320/375/414.

## D. Not covered this pass (auth‑gated redirect)
Landing `/`, `/login`, `/register`, `/reset-password`, `/demo`, 404 redirect to
`/dashboard` while authenticated; auditing them needs a logged‑out session
(won't log out — would forfeit the admin session needed to verify fixes). Flag
for a follow‑up logged‑out pass. `/admin` is superadmin‑gated (redirects) — not
reachable with this account.
