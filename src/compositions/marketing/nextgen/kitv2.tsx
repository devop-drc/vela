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

/** Filmic grain overlay (subtle) — kills the flat "AI-generated" look. */
const GRAIN = "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";
export const Grain: React.FC<{ opacity?: number; blend?: "overlay" | "multiply" }> = ({ opacity = 0.05, blend = "overlay" }) => (
  <AbsoluteFill style={{ opacity, mixBlendMode: blend, backgroundImage: GRAIN, pointerEvents: "none" }} />
);

/** Landing-style rotating aurora on the near-black wine canvas + vignette + grain. */
export const AuroraDark: React.FC<{ frame: number }> = ({ frame }) => {
  const rot = frame * 0.14; // slow, continuous
  const rot2 = -frame * 0.1;
  return (
    <AbsoluteFill style={{ background: BRAND.dark, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute", inset: "-30%",
          background: `conic-gradient(from ${rot}deg at 50% 40%, rgba(255,46,77,0.22), rgba(250,204,21,0.14), rgba(245,158,11,0.17), rgba(200,30,60,0.13), rgba(127,29,59,0.19), rgba(255,46,77,0.22))`,
          filter: "blur(110px)",
        }}
      />
      <div
        style={{
          position: "absolute", inset: "5%", borderRadius: 9999,
          background: `conic-gradient(from ${rot2}deg at 46% 55%, rgba(250,204,21,0.12), rgba(255,46,77,0.10), rgba(163,18,52,0.14), rgba(250,204,21,0.12))`,
          filter: "blur(120px)", opacity: 0.75,
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(100% 75% at 50% 32%, transparent 42%, rgba(9,6,11,0.62) 100%)" }} />
      <Grain opacity={0.06} blend="overlay" />
    </AbsoluteFill>
  );
};

/** Warm paper canvas with a whisper-soft brand wash + faint paper grain. */
export const CreamBase: React.FC<{ frame: number }> = ({ frame }) => {
  const d = Math.sin(frame / 90) * 40;
  return (
    <AbsoluteFill style={{ background: CREAM }}>
      <div style={{ position: "absolute", width: 900, height: 900, borderRadius: 9999, left: -200 + d, top: -260, background: "radial-gradient(circle, rgba(163,18,52,0.06), transparent 70%)", filter: "blur(40px)" }} />
      <div style={{ position: "absolute", width: 820, height: 820, borderRadius: 9999, right: -220 - d, bottom: -200, background: "radial-gradient(circle, rgba(245,158,11,0.07), transparent 70%)", filter: "blur(40px)" }} />
      <Grain opacity={0.028} blend="multiply" />
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
  // `zoom` scales the WHOLE device (frame + UI) as one unit — a clean push-in
  // that never crops the app UI (previously the screenshot was scaled inside a
  // clipped frame, cutting off edges).
  return (
    <div style={{ width, borderRadius: kind === "phone" ? 54 : 30, overflow: "hidden", background: dark, border: "2px solid rgba(255,255,255,0.14)", boxShadow: "0 70px 150px -50px rgba(0,0,0,0.85)", transform: `scale(${zoom}) translateY(${drift}px)`, transformOrigin: "center" }}>
      {kind === "browser" && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 24px", background: "rgba(255,255,255,0.05)" }}>
          <span style={{ width: 14, height: 14, borderRadius: 999, background: "#ff5f57" }} />
          <span style={{ width: 14, height: 14, borderRadius: 999, background: "#febc2e" }} />
          <span style={{ width: 14, height: 14, borderRadius: 999, background: "#28c840" }} />
          <span style={{ marginLeft: 18, padding: "6px 22px", borderRadius: 999, background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", fontSize: 22, fontFamily: CLASH }}>{url}</span>
        </div>
      )}
      <Img src={src} style={{ width: "100%", display: "block" }} />
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

/* ── iOS-style liquid glass ────────────────────────────────────────────
   Translucent, backdrop-blurred surfaces with a bright specular edge so cards
   read as frosted glass floating over the aurora/cream — not flat panels. */
export const glassDark: React.CSSProperties = {
  background: "rgba(28,18,26,0.48)",
  backdropFilter: "blur(30px) saturate(1.7)",
  WebkitBackdropFilter: "blur(30px) saturate(1.7)",
  border: "1px solid rgba(255,255,255,0.16)",
  boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.28), 0 44px 90px -44px rgba(0,0,0,0.7)",
};
export const glassLight: React.CSSProperties = {
  background: "rgba(255,255,255,0.5)",
  backdropFilter: "blur(30px) saturate(1.6)",
  WebkitBackdropFilter: "blur(30px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.95), 0 32px 66px -34px rgba(120,20,40,0.2)",
};
/** Liquid-glass surface with a soft top-left specular sheen. */
export const LiquidGlass: React.FC<{ dark?: boolean; radius?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ dark = true, radius = 28, style, children }) => (
  <div style={{ position: "relative", borderRadius: radius, overflow: "hidden", ...(dark ? glassDark : glassLight), ...style }}>
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: dark
      ? "radial-gradient(130% 80% at 18% -12%, rgba(255,255,255,0.18), transparent 52%)"
      : "radial-gradient(130% 80% at 18% -12%, rgba(255,255,255,0.9), transparent 52%)" }} />
    <div style={{ position: "relative", zIndex: 1, height: "100%" }}>{children}</div>
  </div>
);

/* ── weighty, punchy (but subtle) spring ───────────────────────────────
   Higher mass + a touch of overshoot = things arrive with weight and settle. */
export const POP = { damping: 14, mass: 1.05, stiffness: 130 };
/** Entrance: y-rise + a small scale pop, driven by the weighty spring. */
export const popIn = (frame: number, fps: number, delay = 0, rise = 46) => {
  const s = springIn(frame, fps, delay, POP);
  return { opacity: interpolate(s, [0, 1], [0, 1], clamp), transform: `translateY(${(1 - s) * rise}px) scale(${0.94 + 0.06 * Math.min(s, 1)})` };
};

export const useAnim = () => {
  ensureClash();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { frame, fps };
};
