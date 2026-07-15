# Vela Motion — Remotion Studio

A self-contained [Remotion](https://remotion.dev) project for designing and rendering motion graphics (title cards, lower thirds, kinetic text, transparent overlays). It lives inside this repo and **coexists with the Vite web app** — Remotion uses its own entry (`src/remotion.ts`) and config (`remotion.config.ts`); Vite ignores them, and the app keeps using `@remotion/player` to embed compositions.

> All `@remotion/*` packages are pinned to **4.0.484** to match the `remotion`/`@remotion/player` the web app already uses. Keep them in lockstep when upgrading.

## Preview (live)

```bash
npm run studio
```

Opens Remotion Studio. Pick a composition on the left, scrub the timeline, and edit props live in the right-hand panel (driven by each composition's zod schema).

## Structure

```
src/
  config/video.ts        # CANVAS: resolution + fps in ONE place
  lib/motion.ts          # shared enter/hold/exit + spring helpers
  compositions/          # one file per graphic
    TitleCard.tsx
    LowerThird.tsx
    KineticText.tsx
    TransparentBadge.tsx # renders on a real transparent background
  Root.tsx               # registers every composition
  remotion.ts            # Remotion entry (registerRoot)
remotion.config.ts       # Remotion CLI config (not used by Vite)
public/                  # fonts, images, audio (served via staticFile())
out/                     # renders land here (git-ignored)
```

## Canvas: resolution & fps

Change them in **one** place — `src/config/video.ts`:

```ts
export const VIDEO = { width: 1920, height: 1080, fps: 30 } as const;
// 4K:    width: 3840, height: 2160
// 60fps: fps: 60
```

`Root.tsx` reads these for every composition, and `sec(seconds)` converts durations to frames at the current fps, so switching to 4K/60 needs no other edits.

## Add a new graphic

1. Create `src/compositions/MyGraphic.tsx`. Export the component **plus** a zod `schema` and matching `defaults`:
   ```tsx
   export const myGraphicSchema = z.object({ heading: z.string(), accent: zColor() });
   export const myGraphicDefaults = { heading: "Hello", accent: "#d946ef" };
   export const MyGraphic = ({ heading, accent }: z.infer<typeof myGraphicSchema>) => { /* ... */ };
   ```
2. Register it in `src/Root.tsx`:
   ```tsx
   <Composition
     id="MyGraphic"
     component={MyGraphic}
     durationInFrames={sec(5)}
     {...common}                 // fps/width/height from src/config/video.ts
     schema={myGraphicSchema}
     defaultProps={myGraphicDefaults}
   />
   ```
3. It now appears in `npm run studio` with a live props editor.

## Render

```bash
# MP4 (H.264)
npx remotion render src/remotion.ts TitleCard out/TitleCard.mp4 --codec=h264 --crf=18

# Transparent (ProRes 4444 with real alpha) — for overlays
npx remotion render src/remotion.ts TransparentBadge out/TransparentBadge.mov \
  --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le --image-format=png

# PNG sequence (per-frame, alpha-capable)
npx remotion render src/remotion.ts TransparentBadge out/TransparentBadge/frame-%04d.png --image-format=png
```

Shortcuts are wired in `package.json`: `npm run render:title`, `npm run render:badge`.

> **Transparency:** overlays (e.g. `TransparentBadge`) paint nothing on the background, so with `--image-format=png` + ProRes 4444 (`yuva444p10le`) or a PNG sequence you get a genuine alpha channel to composite over footage. Plain H.264 MP4 has no alpha.

## Tips

- **Title-safe area:** keep key text within ~10% margins so it survives cropping/overscan. The starters cap content to ~80% width.
- **Full enter AND exit:** every element should animate in, hold, then animate out before the clip ends — never pop in or get cut off mid-motion. Use the `envelope` / `exitLift` helpers in `src/lib/motion.ts`.
- **Natural motion:** avoid linear easing — use `spring` (a little overshoot + settle) and stagger elements a few frames apart.
- **Subtle life while held:** a gentle float, glow pulse, or slow glint keeps the hold alive (see `float`, `pulse`).
- **Trim leading silence** on sound effects so hits land on the frame you expect.

## Nice-to-haves

**Google fonts** (`@remotion/google-fonts`) — no network at render time:

```tsx
import { loadFont } from "@remotion/google-fonts/Inter";
const { fontFamily } = loadFont();
// style={{ fontFamily }}
```

**Sound effects** — drop a file in `public/` and play it inside a `<Sequence>`:

```tsx
import { Audio, Sequence, staticFile } from "remotion";

<Sequence from={12}>
  <Audio src={staticFile("whoosh.mp3")} />
</Sequence>
```
