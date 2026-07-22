/**
 * Premium kit v2 — two art-direction families for the rebuilt suite:
 *   Nightfall (dark, landing-hero aurora, dynamic)  ·  Daybreak (cream, editorial, minimal)
 * Faithful to the landing (aurora mesh, gradient text, Clash) and the app UI
 * (real screenshots via DeviceMockup). Motion: spring + easeInOut only.
 */
import React from "react";
import { AbsoluteFill, Img, interpolate, Easing, useCurrentFrame, useVideoConfig } from "remotion";
import { springIn } from "../../../lib/motion";
import { BRAND, CLASH, INTER, ensureClash } from "./kit";
export { shot, DeviceMockup, BRAND, CLASH, INTER, ensureClash, ShipWhite, ShipColored } from "./kit";

export const CREAM = "#F5F0E8";
export const INK = "#161016";

const eio = { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) } as const;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Landing-style rotating aurora on the near-black wine canvas + center vignette. */
export const AuroraDark: React.FC<{ frame: number }> = ({ frame }) => {
  const rot = frame * 0.14; // slow, continuous
  const rot2 = -frame * 0.1;
  return (
    <AbsoluteFill style={{ background: BRAND.dark, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute", inset: "-30%",
          background: `conic-gradient(from ${rot}deg at 50% 40%, rgba(255,46,77,0.18), rgba(250,204,21,0.12), rgba(245,158,11,0.15), rgba(200,30,60,0.11), rgba(127,29,59,0.16), rgba(255,46,77,0.18))`,
          filter: "blur(110px)",
        }}
      />
      <div
        style={{
          position: "absolute", inset: "5%", borderRadius: 9999,
          background: `conic-gradient(from ${rot2}deg at 46% 55%, rgba(250,204,21,0.10), rgba(255,46,77,0.08), rgba(163,18,52,0.12), rgba(250,204,21,0.10))`,
          filter: "blur(120px)", opacity: 0.7,
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(100% 75% at 50% 32%, transparent 42%, rgba(9,6,11,0.6) 100%)" }} />
    </AbsoluteFill>
  );
};

/** Warm paper canvas with a whisper-soft brand wash — the Daybreak base. */
export const CreamBase: React.FC<{ frame: number }> = ({ frame }) => {
  const d = Math.sin(frame / 90) * 40;
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      <div style={{ position: "absolute", width: 900, height: 900, borderRadius: 9999, left: -200 + d, top: -260, background: "radial-gradient(circle, rgba(163,18,52,0.06), transparent 70%)", filter: "blur(40px)" }} />
      <div style={{ position: "absolute", width: 820, height: 820, borderRadius: 9999, right: -220 - d, bottom: -200, background: "radial-gradient(circle, rgba(245,158,11,0.07), transparent 70%)", filter: "blur(40px)" }} />
    </AbsoluteFill>
  );
};

/** Animated gradient shimmer, clipped to the word — the single highlighted keyword. */
export const Shimmer: React.FC<{ children: React.ReactNode; frame: number; style?: React.CSSProperties }> = ({ children, frame, style }) => {
  const pos = interpolate(frame % 120, [0, 120], [140, -40]);
  return (
    <span
      style={{
        backgroundImage: "linear-gradient(100deg,#A31234 0%,#FF2E4D 35%,#F59E0B 60%,#A31234 100%)",
        backgroundSize: "220% 100%",
        backgroundPosition: `${pos}% 0`,
        WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
        ...style,
      }}
    >
      {children}
    </span>
  );
};

/** Mask-up reveal: text rises from under a clip. `delay` in frames. */
export const MaskUp: React.FC<{ children: React.ReactNode; frame: number; fps: number; delay?: number; style?: React.CSSProperties }> = ({ children, frame, fps, delay = 0, style }) => {
  const s = springIn(frame, fps, delay, { damping: 18, stiffness: 120 });
  return (
    <span style={{ display: "block", overflow: "hidden", paddingBottom: "0.08em", ...style }}>
      <span style={{ display: "block", transform: `translateY(${(1 - s) * 118}%)` }}>{children}</span>
    </span>
  );
};

/** Cross-dissolve + gentle scale for a scene window [start,end]. */
export const scene = (frame: number, start: number, end: number, f = 16) => {
  const o = interpolate(frame, [start, start + f, end - f, end], [0, 1, 1, 0], eio);
  const s = interpolate(frame, [start, end], [1.03, 1.0], clamp);
  return { opacity: o, scale: s };
};
/** Poster scene: full from frame 0, fades near end. */
export const sceneFromZero = (frame: number, end: number, f = 18) => ({
  opacity: interpolate(frame, [0, end - f, end], [1, 1, 0], clamp),
  scale: interpolate(frame, [0, end], [1.0, 1.02], clamp),
});

/** Slow Ken-Burns zoom for a screenshot over a window. */
export const kenBurns = (frame: number, start: number, end: number, from = 1.0, to = 1.07) =>
  interpolate(frame, [start, end], [from, to], clamp);

/** A screenshot floating in a soft frame with a slow zoom + drift (dark or light). */
export const FloatShot: React.FC<{ src: string; frame: number; zoom: number; width?: number; kind?: "browser" | "phone"; url?: string }> = ({ src, frame, zoom, width = 820, kind = "browser", url = "vela.al" }) => {
  const drift = Math.sin(frame / 40) * 8;
  const dark = kind === "browser" ? "#1E1014" : "#0B0710";
  return (
    <div style={{ width, borderRadius: kind === "phone" ? 54 : 30, overflow: "hidden", background: dark, border: "2px solid rgba(255,255,255,0.14)", boxShadow: "0 70px 150px -50px rgba(0,0,0,0.85)", transform: `translateY(${drift}px)` }}>
      {kind === "browser" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 24px", background: "rgba(255,255,255,0.05)" }}>
          <span style={{ width: 14, height: 14, borderRadius: 999, background: "#ff5f57" }} />
          <span style={{ width: 14, height: 14, borderRadius: 999, background: "#febc2e" }} />
          <span style={{ width: 14, height: 14, borderRadius: 999, background: "#28c840" }} />
          <span style={{ marginLeft: 18, padding: "6px 22px", borderRadius: 999, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", fontSize: 22, fontFamily: CLASH }}>{url}</span>
        </div>
      )}
      <div style={{ overflow: "hidden" }}>
        <Img src={src} style={{ width: "100%", display: "block", transform: `scale(${zoom})`, transformOrigin: "center top" }} />
      </div>
    </div>
  );
};

/** Gradient CTA chip with a diagonal specular sweep (landing .glare style). */
export const GlareChip: React.FC<{ children: React.ReactNode; frame: number; fontSize?: number }> = ({ children, frame, fontSize = 46 }) => {
  const sweep = interpolate(frame % 90, [0, 90], [-130, 230]);
  return (
    <div style={{ position: "relative", overflow: "hidden", display: "inline-flex", alignItems: "center", gap: 16, padding: "26px 58px", borderRadius: 999, backgroundImage: "linear-gradient(115deg,#7F1D3B,#A31234 40%,#FF2E4D 75%,#F59E0B 115%)", boxShadow: "0 30px 70px -25px rgba(163,18,52,0.6)", color: "#fff", fontFamily: CLASH, fontWeight: 600, fontSize, letterSpacing: "-0.01em" }}>
      {children}
      <span style={{ position: "absolute", inset: 0, background: "linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.4) 50%, transparent 62%)", transform: `translateX(${sweep}%) skewX(-8deg)` }} />
    </div>
  );
};

export const useAnim = () => {
  ensureClash();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { frame, fps };
};
