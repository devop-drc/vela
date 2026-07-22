/**
 * Vela launch campaign — Asset #3 (see content-plan.md).
 * "Paneli live & shitjet reale" · LIGHT · 9:16 · 10s (300f).
 * Rolling sales counter (proof) → real dashboard + live "porosi e re" → one-tap
 * management → CTA. Social proof / live demo; cream editorial, real app UI.
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { springIn, float } from "../../lib/motion";
import { BRAND, CLASH, INTER, INK, CreamBase, Shimmer, FloatShot, GlareChip, ShipColored, shot, scene, kenBurns, glassLight, ensureClash } from "../marketing/nextgen/kitv2";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SPRING = { damping: 14, mass: 1.05, stiffness: 130 }; // weighty, small punch
const H: (size: number) => React.CSSProperties = (size) => ({ fontFamily: CLASH, fontWeight: 700, fontSize: size, lineHeight: 1.04, letterSpacing: "-0.02em", color: INK, textAlign: "center", margin: 0 });

export const LAUNCH_DASH_FRAMES = 10 * 30; // 300

export const LaunchDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  ensureClash();

  // scene envelopes
  const s1 = interpolate(frame, [0, 52, 66], [1, 1, 0], clamp);
  const s2 = scene(frame, 60, 192);
  const s3 = scene(frame, 186, 248);
  const s4 = interpolate(frame, [242, 260, 300], [0, 1, 1], clamp);

  const val = Math.round(interpolate(frame, [8, 54], [0, 100100], clamp)).toLocaleString("en-US");
  const toast = springIn(frame, fps, 96, SPRING);
  const knob = springIn(frame, fps, 206, SPRING); // toggle flips on
  const point = Math.abs(Math.sin((frame - 242) / 11)) * 14;

  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <CreamBase frame={frame} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 14, background: "linear-gradient(90deg,#A31234,#FF2E4D,#F59E0B)" }} />

      {/* ── Scene 1 · Proof hook: rolling counter ── */}
      <AbsoluteFill style={{ opacity: s1, alignItems: "center", justifyContent: "center", gap: 20, padding: "0 90px" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 14, fontFamily: CLASH, fontWeight: 600, fontSize: 28, letterSpacing: ".18em", textTransform: "uppercase", color: BRAND.wine }}>
          <span style={{ width: 16, height: 16, borderRadius: 999, background: "linear-gradient(115deg,#7F1D3B,#A31234 40%,#FF2E4D 75%,#F59E0B 115%)" }} /> Paneli i shitjeve
        </div>
        <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 150, letterSpacing: "-0.03em", color: INK, lineHeight: 1 }}>ALL {val}</div>
        <div style={{ ...H(60), marginTop: 10 }}>Pse të presësh në DM?<br /><span style={{ color: BRAND.muted, fontSize: 44 }}>Shih si vijnë porositë <Shimmer frame={frame}>vetë.</Shimmer></span></div>
      </AbsoluteFill>

      {/* ── Scene 2 · Real dashboard + live order ── */}
      <AbsoluteFill style={{ opacity: s2.opacity, transform: `scale(${s2.scale})`, alignItems: "center", justifyContent: "center", gap: 50, padding: "150px 60px 190px" }}>
        <div style={H(72)}>Shitjet, në <Shimmer frame={frame}>kohë reale.</Shimmer></div>
        <div style={{ position: "relative", transform: `translateY(${float(frame, 7, 34)}px)` }}>
          <FloatShot src={shot("01-dashboard.png")} frame={frame} zoom={kenBurns(frame, 60, 192, 1.0, 1.06)} width={880} url="vela.al/paneli" />
          {/* live "new order" toast springs in over the panel */}
          <div style={{ position: "absolute", right: -24, top: 150, opacity: toast, transform: `translateX(${(1 - toast) * 120}px)` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "24px 30px", borderRadius: 24, ...glassLight }}>
              <span style={{ width: 56, height: 56, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(16,185,129,0.15)", fontSize: 28 }}>🎉</span>
              <div><div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 32, color: INK }}>Porosi e re!</div><div style={{ fontFamily: INTER, fontSize: 24, color: BRAND.muted }}>+ALL 37,000 · me kartë</div></div>
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* ── Scene 3 · One-tap management ── */}
      <AbsoluteFill style={{ opacity: s3.opacity, transform: `scale(${s3.scale})`, alignItems: "center", justifyContent: "center", gap: 50, padding: "0 80px" }}>
        <div style={H(72)}>Menaxho gjithçka<br /><Shimmer frame={frame}>me një klik.</Shimmer></div>
        <div style={{ width: 760, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "40px 48px", borderRadius: 30, ...glassLight }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <span style={{ width: 18, height: 18, borderRadius: 999, background: "#10B981", boxShadow: `0 0 ${knob * 26}px rgba(16,185,129,${knob})` }} />
            <span style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 44, color: INK }}>Dyqani është Aktiv</span>
          </div>
          {/* toggle: knob slides to the right + track greens as it flips on */}
          <div style={{ width: 108, height: 60, borderRadius: 999, background: `rgb(${237 - knob * 221},${228 + knob * -43},${225 + knob * -96})`, position: "relative", transition: "none" }}>
            <div style={{ position: "absolute", top: 6, left: 6, width: 48, height: 48, borderRadius: 999, background: "#fff", boxShadow: "0 4px 10px rgba(0,0,0,.2)", transform: `translateX(${knob * 48}px)` }} />
          </div>
        </div>
        <p style={{ fontFamily: INTER, fontSize: 36, color: BRAND.muted, textAlign: "center", margin: 0 }}>Stoku, çmimet dhe dërgesat — të gjitha nga një panel.</p>
      </AbsoluteFill>

      {/* ── Scene 4 · CTA ── */}
      <AbsoluteFill style={{ opacity: s4, alignItems: "center", justifyContent: "center", gap: 44, padding: "0 90px" }}>
        <ShipColored size={180} style={{ transform: `translateY(${float(frame, 10, 26)}px)` }} />
        <div style={H(84)}>Paneli yt, gjithmonë <Shimmer frame={frame}>live.</Shimmer></div>
        <GlareChip frame={frame} fontSize={46}>Shto shitjet e tua sot →</GlareChip>
        <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 38, color: BRAND.wine, transform: `translateY(${-point}px)` }}>Kthe Instagramin në dyqan · vela.al</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
