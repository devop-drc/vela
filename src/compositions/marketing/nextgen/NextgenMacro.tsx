/**
 * Next-gen macro + before/after reels (9:16 · 1080x1920 · 30fps).
 *   C1 · MacroShift  "80% e punës, e mbaruar"        (dark, 20s)
 *   C2 · MacroShift  "Qetësia — dyqani yt gati sot"  (light, 20s)
 *   C5 · BeforeAfter "Para / Pas"                    (dark, 15s)
 * Poster-first (frame 0 is a settled cover). Real app UI via DeviceMockup.
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { springIn, exitLift, float, pulse } from "../../../lib/motion";
import {
  BRAND, CLASH, INTER, gradText, Blobs, Chip, ShipWhite, ShipColored,
  DeviceMockup, BrandMesh, Headline, shot, dim, ensureClash,
} from "./kit";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
/** Fade a scene in/out over [start,end]; hold=1 between. */
const fade = (frame: number, start: number, end: number, f = 14) =>
  interpolate(frame, [start, start + f, end - f, end], [0, 1, 1, 0], clamp);
/** Poster scene: visible from frame 0, fades out near `end`. */
const holdFromZero = (frame: number, end: number, f = 16) =>
  interpolate(frame, [0, end - f, end], [1, 1, 0], clamp);

const Eyebrow: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = BRAND.fuchsia }) => (
  <p style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 30, letterSpacing: "0.24em", textTransform: "uppercase", color, margin: 0 }}>
    {children}
  </p>
);

/* ═══════════════════════════ C1 · MacroShift (dark, 600f) ═══════════════════════════ */
export const MACRO_DARK_FRAMES = 20 * 30; // 600

export const C1MacroDark: React.FC = () => {
  const frame = useCurrentFrame();
  ensureClash();

  const hook = holdFromZero(frame, 156);
  const dash = fade(frame, 150, 366);
  const store = fade(frame, 360, 516);
  const cta = fade(frame, 510, 600);

  const dashKb = interpolate(frame, [150, 366], [1.0, 1.06], clamp);
  const dashSpot = interpolate(frame, [166, 210], [0, 1], clamp);
  const point = Math.abs(Math.sin((frame - 510) / 11)) * 16;

  return (
    <AbsoluteFill style={{ background: BRAND.dark, fontFamily: INTER }}>
      <Blobs frame={frame} />

      {/* Hook / poster — the 80% promise */}
      <AbsoluteFill style={{ opacity: hook, alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Eyebrow>Më pak punë çdo ditë</Eyebrow>
        <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 400, lineHeight: 1, ...gradText, transform: `scale(${0.98 + (pulse(frame, 26) - 0.85) * 0.2})` }}>80%</div>
        <Headline a="e ditës tënde —" b="e mbaruar." size={72} align="center" />
      </AbsoluteFill>

      {/* Proof 1 — real dashboard */}
      <AbsoluteFill style={{ opacity: dash, alignItems: "center", justifyContent: "center", padding: "150px 70px", gap: 44 }}>
        <Headline a="Vela e kthen Instagramin" b="në dyqan online." size={76} align="center" />
        <div style={{ position: "relative", transform: `scale(${dashKb})` }}>
          <DeviceMockup src={shot("01-dashboard.png")} kind="browser" url="vela.al/paneli" width={840} />
          <div style={dim(dashSpot)} />
        </div>
      </AbsoluteFill>

      {/* Proof 2 — storefront */}
      <AbsoluteFill style={{ opacity: store, alignItems: "center", justifyContent: "center", padding: "150px 70px", gap: 44 }}>
        <Headline a="Ti fokusohesh te" b="rritja." size={84} align="center" />
        <DeviceMockup src={shot("06-storefront-live.png")} kind="browser" url="vela.al/dyqani" width={840} style={{ transform: `translateY(${float(frame, 8, 30)}px)` }} />
      </AbsoluteFill>

      {/* CTA */}
      {frame >= 504 && (
        <AbsoluteFill style={{ opacity: cta }}>
          <BrandMesh frame={frame} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40, padding: "0 90px" }}>
            <ShipWhite size={200} style={{ transform: `translateY(${float(frame, 10, 26)}px)`, filter: "drop-shadow(0 30px 70px rgba(127,29,59,0.6))" }} />
            <Headline a="Merr ditën tënde" b="mbrapsht." size={100} align="center" />
            <Chip filled style={{ fontSize: 44 }}>Provo falas · pa kartë</Chip>
            <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 40, color: "#fff", transform: `translateY(${-point}px)` }}>👆 Linku në bio · vela.al</div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/* ═══════════════════════════ C2 · MacroShift (light, 600f) ═══════════════════════════ */
export const MACRO_LIGHT_FRAMES = 20 * 30; // 600

export const C2MacroLight: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  ensureClash();

  const hook = holdFromZero(frame, 156);
  const chips = fade(frame, 150, 336);
  const studio = fade(frame, 330, 510);
  const cta = fade(frame, 504, 600);

  const chipWords = ["Pa kod", "Pa dizajner", "Pa stres"];

  return (
    <AbsoluteFill style={{ background: BRAND.paper, fontFamily: INTER }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 18, background: "linear-gradient(90deg,#A31234,#FF2E4D,#F59E0B)" }} />

      {/* Hook / poster */}
      <AbsoluteFill style={{ opacity: hook, alignItems: "center", justifyContent: "center", gap: 40 }}>
        <ShipColored size={190} style={{ transform: `translateY(${float(frame, 8, 28)}px)` }} />
        <Headline a="Dyqani yt online —" b="gati sot." size={110} align="center" style={{ color: BRAND.ink }} />
        <Eyebrow color={BRAND.primary}>Nesër në mëngjes je live</Eyebrow>
      </AbsoluteFill>

      {/* Three "pa …" chips */}
      <AbsoluteFill style={{ opacity: chips, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 28, flexWrap: "wrap", padding: "0 80px" }}>
        {chipWords.map((w, i) => {
          const s = springIn(frame, fps, 150 + 8 + i * 12, { damping: 13 });
          return (
            <div key={w} style={{ padding: "30px 56px", borderRadius: 999, background: BRAND.ink, color: "#fff", fontFamily: CLASH, fontWeight: 600, fontSize: 56, opacity: s, transform: `scale(${0.9 + s * 0.1})` }}>{w}</div>
          );
        })}
      </AbsoluteFill>

      {/* Studio proof */}
      <AbsoluteFill style={{ opacity: studio, alignItems: "center", justifyContent: "center", padding: "150px 70px", gap: 40 }}>
        <Headline a="Zgjedh pamjen." b="Sistemi e ndërton." size={72} align="center" style={{ color: BRAND.ink }} />
        <DeviceMockup src={shot("04-storefront-studio.png")} kind="browser" url="vela.al/storefront-studio" width={860} style={{ transform: `translateY(${float(frame, 7, 32)}px)` }} />
      </AbsoluteFill>

      {/* CTA (light) */}
      {frame >= 498 && (
        <AbsoluteFill style={{ opacity: cta, alignItems: "center", justifyContent: "center", gap: 40, padding: "0 90px" }}>
          <Headline a="Kohë për ty." b="Shitje për dyqanin." size={92} align="center" style={{ color: BRAND.ink }} />
          <Chip filled style={{ fontSize: 44 }}>Provo falas · pa kartë</Chip>
          <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 40, color: BRAND.primary, transform: `translateY(${-Math.abs(Math.sin((frame - 504) / 11)) * 16}px)` }}>👆 Linku në bio · vela.al</div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/* ═══════════════════════════ C5 · BeforeAfter (dark, 450f) ═══════════════════════════ */
export const BEFORE_AFTER_FRAMES = 15 * 30; // 450

const BEATS = [
  { para: "postim → screenshot → mesazh → Excel", pasA: "postim →", pasB: "produkt.", shotSrc: "02-products.png" },
  { para: "“Sa kushton?” × 20", pasA: "checkout", pasB: "automatik.", shotSrc: "06-storefront-live.png" },
  { para: "stoku në letër", pasA: "stoku", pasB: "rezervohet vetë.", shotSrc: "05-orders.png" },
];

export const C5BeforeAfter: React.FC = () => {
  const frame = useCurrentFrame();
  ensureClash();

  const CTA = 390;
  const BEAT = Math.floor(CTA / 3); // 130
  const idx = Math.min(Math.floor(frame / BEAT), 2);
  const local = frame - idx * BEAT;
  const beat = BEATS[idx];
  const swap = interpolate(local, [0, 16], [0, 1], clamp); // beat text settle
  const outExit = exitLift(frame, CTA, 24, 60);
  const cta = interpolate(frame, [CTA, CTA + 16], [0, 1], clamp);
  const point = Math.abs(Math.sin((frame - CTA) / 11)) * 16;

  return (
    <AbsoluteFill style={{ background: BRAND.dark, fontFamily: INTER }}>
      <Blobs frame={frame} opacity={0.5} />

      {frame < CTA + 4 && (
        <AbsoluteFill style={{ opacity: outExit.opacity, transform: `translateY(${outExit.y}px)` }}>
          {/* Top half — PARA (grey, static) */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "48%", background: "rgba(255,255,255,0.04)", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 90px", gap: 20 }}>
            <Eyebrow color="rgba(255,255,255,0.5)">Para</Eyebrow>
            <p style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 58, color: "rgba(255,255,255,0.55)", margin: 0, lineHeight: 1.1 }}>{beat.para}</p>
          </div>

          {/* Seam */}
          <div style={{ position: "absolute", top: "48%", left: 0, right: 0, height: 6, background: "linear-gradient(90deg,#A31234,#FF2E4D,#F59E0B)" }} />

          {/* Bottom half — PAS (wine, real UI) */}
          <div style={{ position: "absolute", top: "48.5%", left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 90px", gap: 24, opacity: swap, transform: `translateY(${(1 - swap) * 30}px)` }}>
            <Eyebrow>Pas</Eyebrow>
            <Headline a={beat.pasA} b={beat.pasB} size={64} />
            <div style={{ marginTop: 8, transform: "scale(0.9)", transformOrigin: "left top" }}>
              <DeviceMockup src={shot(beat.shotSrc)} kind="browser" url="vela.al" width={620} />
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* CTA */}
      {frame >= CTA - 4 && (
        <AbsoluteFill style={{ opacity: cta }}>
          <BrandMesh frame={frame} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40, padding: "0 90px" }}>
            <ShipWhite size={200} style={{ transform: `translateY(${float(frame, 10, 26)}px)` }} />
            <Headline a="Nga kaosi te" b="dyqani." size={108} align="center" />
            <Chip filled style={{ fontSize: 44 }}>Provo falas · pa kartë</Chip>
            <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 40, color: "#fff", transform: `translateY(${-point}px)` }}>👆 Linku në bio · vela.al</div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
