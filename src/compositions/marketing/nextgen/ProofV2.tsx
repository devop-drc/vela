/**
 * Rebuilt look — two proofs, one per family (9:16 · 1080x1920 · 30fps).
 *   NightfallProof — dark landing-hero macro reel (Problem/Agitation hook, PAS)
 *   DaybreakProof  — cream editorial micro reel (Direct-benefit hook)
 * Real app UI (FloatShot), spring + easeInOut motion, one accent keyword each.
 */
import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { float } from "../../../lib/motion";
import {
  BRAND, CLASH, INTER, CREAM, INK,
  AuroraDark, CreamBase, Shimmer, MaskUp, FloatShot, GlareChip,
  scene, kenBurns, shot, useAnim,
} from "./kitv2";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/* ══════════════════════ Nightfall — dark hero macro reel (18s / 540f) ══════════════════════ */
export const NIGHTFALL_FRAMES = 18 * 30; // 540

export const NightfallProof: React.FC = () => {
  const { frame, fps } = useAnim();

  const hook = interpolate(frame, [0, 84, 96], [1, 1, 0], clamp);
  const sol1 = scene(frame, 92, 300);
  const sol2 = scene(frame, 294, 452);
  const cta = interpolate(frame, [446, 466, 540], [0, 1, 1], clamp);

  const H1: React.CSSProperties = { fontFamily: CLASH, fontWeight: 600, fontSize: 118, lineHeight: 1.02, letterSpacing: "-0.02em", color: "#fff", textAlign: "center", margin: 0 };

  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <AuroraDark frame={frame} />

      {/* Hook — Problem / Agitation */}
      <AbsoluteFill style={{ opacity: hook, alignItems: "center", justifyContent: "center", gap: 26, padding: "0 80px" }}>
        <div style={H1}>
          <MaskUp frame={frame} fps={fps} delay={4}>80% e ditës</MaskUp>
          <MaskUp frame={frame} fps={fps} delay={12}>
            <Shimmer frame={frame}>e humbur.</Shimmer>
          </MaskUp>
        </div>
        <p style={{ fontFamily: INTER, fontSize: 42, color: "rgba(255,255,255,0.6)", opacity: interpolate(frame, [26, 44], [0, 1], clamp), textAlign: "center", margin: 0 }}>
          Mesazhe. Excel. Porosi të harruara.
        </p>
      </AbsoluteFill>

      {/* Solution 1 — the real dashboard */}
      <AbsoluteFill style={{ opacity: sol1.opacity, transform: `scale(${sol1.scale})`, alignItems: "center", justifyContent: "center", gap: 52, padding: "140px 70px" }}>
        <div style={H1}>
          <MaskUp frame={frame} fps={fps} delay={98}>Kthe Instagramin</MaskUp>
          <MaskUp frame={frame} fps={fps} delay={106}>
            <Shimmer frame={frame}>në dyqan online.</Shimmer>
          </MaskUp>
        </div>
        <FloatShot src={shot("01-dashboard.png")} frame={frame} zoom={kenBurns(frame, 92, 300, 1.0, 1.08)} width={860} url="vela.al/paneli" />
      </AbsoluteFill>

      {/* Solution 2 — the storefront */}
      <AbsoluteFill style={{ opacity: sol2.opacity, transform: `scale(${sol2.scale})`, alignItems: "center", justifyContent: "center", gap: 52, padding: "140px 70px" }}>
        <div style={H1}>
          <MaskUp frame={frame} fps={fps} delay={300}>Ti fokusohesh te</MaskUp>
          <MaskUp frame={frame} fps={fps} delay={308}>
            <Shimmer frame={frame}>rritja.</Shimmer>
          </MaskUp>
        </div>
        <FloatShot src={shot("06-storefront-live.png")} frame={frame} zoom={kenBurns(frame, 294, 452, 1.0, 1.07)} width={860} url="vela.al/dyqani" />
      </AbsoluteFill>

      {/* CTA */}
      <AbsoluteFill style={{ opacity: cta, alignItems: "center", justifyContent: "center", gap: 42, padding: "0 90px" }}>
        <div style={{ ...H1, fontSize: 104 }}>
          Gjithçka, nga <Shimmer frame={frame}>një vend.</Shimmer>
        </div>
        <GlareChip frame={frame}>Provo falas · pa kartë</GlareChip>
        <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 40, color: "#fff", transform: `translateY(${-Math.abs(Math.sin(frame / 11)) * 14}px)` }}>👆 Linku në bio · vela.al</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ══════════════════════ Daybreak — cream editorial micro reel (15s / 450f) ══════════════════════ */
export const DAYBREAK_FRAMES = 15 * 30; // 450

export const DaybreakProof: React.FC = () => {
  const { frame, fps } = useAnim();

  const hook = interpolate(frame, [0, 84, 96], [1, 1, 0], clamp);
  const body = scene(frame, 92, 336);
  const cta = interpolate(frame, [330, 350, 450], [0, 1, 1], clamp);

  const H1: React.CSSProperties = { fontFamily: CLASH, fontWeight: 600, fontSize: 120, lineHeight: 1.0, letterSpacing: "-0.025em", color: INK, textAlign: "center", margin: 0 };

  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <CreamBase frame={frame} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 14, background: "linear-gradient(90deg,#A31234,#FF2E4D,#F59E0B)" }} />

      {/* Hook — Direct benefit */}
      <AbsoluteFill style={{ opacity: hook, alignItems: "center", justifyContent: "center", gap: 28, padding: "0 90px" }}>
        <div style={H1}>
          <MaskUp frame={frame} fps={fps} delay={4}>Klientët blejnë</MaskUp>
          <MaskUp frame={frame} fps={fps} delay={12}>
            <Shimmer frame={frame}>vetë.</Shimmer>
          </MaskUp>
        </div>
        <p style={{ fontFamily: INTER, fontSize: 44, color: BRAND.muted, opacity: interpolate(frame, [26, 44], [0, 1], clamp), margin: 0 }}>
          Pa mesazhe. Pa pritje.
        </p>
      </AbsoluteFill>

      {/* Body — the storefront on a phone */}
      <AbsoluteFill style={{ opacity: body.opacity, transform: `scale(${body.scale})`, alignItems: "center", justifyContent: "center", gap: 46, padding: "130px 70px" }}>
        <div style={{ ...H1, fontSize: 74 }}>
          <MaskUp frame={frame} fps={fps} delay={98}>
            Dyqani yt, në <Shimmer frame={frame}>xhep.</Shimmer>
          </MaskUp>
        </div>
        <FloatShot src={shot("07-storefront-mobile.png")} frame={frame} zoom={kenBurns(frame, 92, 336, 1.0, 1.06)} width={520} kind="phone" />
        <p style={{ fontFamily: INTER, fontSize: 40, color: BRAND.muted, opacity: interpolate(frame, [140, 164], [0, 1], clamp), margin: 0 }}>
          Pagesa në <span style={{ color: BRAND.primary, fontWeight: 700 }}>Lekë</span> · checkout automatik
        </p>
      </AbsoluteFill>

      {/* CTA — minimal, editorial */}
      <AbsoluteFill style={{ opacity: cta, alignItems: "center", justifyContent: "center", gap: 40, padding: "0 90px" }}>
        <div style={{ ...H1, fontSize: 104 }}>
          Dyqani yt online, <Shimmer frame={frame}>sot.</Shimmer>
        </div>
        <div style={{ padding: "22px 54px", borderRadius: 999, border: `2.5px solid ${INK}`, color: INK, fontFamily: CLASH, fontWeight: 600, fontSize: 42 }}>Provo falas · pa kartë</div>
        <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 38, color: BRAND.primary, transform: `translateY(${float(frame, 6, 26)}px)` }}>👆 Linku në bio · vela.al</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
