/**
 * Marketing kit — shared pieces for the @vela.al Instagram content set
 * (branding/marketing/instagram). Motion-graphics + typography only, on the
 * Vela design language: night canvas with drifting brand blobs, Clash Display
 * headlines, the wine→neon→gold gradient as spice, springs with weight,
 * blur-reveal type, and the remade tag-sails boat (public/brand/*).
 */
import React from "react";
import { AbsoluteFill, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND, CLASH, INTER, Blobs, gradText, ensureClash } from "../stories/storyKit";

ensureClash();

export { BRAND, CLASH, INTER, Blobs, gradText };

export const GRAD = "linear-gradient(115deg,#7F1D3B,#A31234 40%,#FF2E4D 75%,#F59E0B 115%)";
export const GRAD_TEXT = "linear-gradient(100deg,#FACC15 5%,#F59E0B 30%,#FF2E4D 62%,#A31234 95%)";

export const REEL = { width: 1080, height: 1920, fps: 30 };
export const POST = { width: 1080, height: 1350, fps: 30 };

/** Weighted spring — the brand's "arrives with weight and settles" feel. */
export const springy = (frame: number, fps: number, delay = 0, cfg?: { damping?: number; stiffness?: number }) =>
  spring({ frame: frame - delay, fps, config: { damping: cfg?.damping ?? 16, stiffness: cfg?.stiffness ?? 170, mass: 1 } });

/** Blur-rise text reveal (the landing hero's signature entrance). */
export const rise = (s: number): React.CSSProperties => ({
  opacity: Math.min(1, s * 1.4),
  filter: `blur(${Math.max(0, 1 - s) * 10}px)`,
  transform: `translateY(${(1 - s) * 26}px)`,
});

/** Film-grain overlay (the landing's .landing-noise, baked for video). */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.05 }) => (
  <AbsoluteFill
    style={{
      opacity,
      mixBlendMode: "overlay",
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
    }}
  />
);

/** The remade tag-sails boat (no tile), with an optional gentle sail-bob. */
export const Boat: React.FC<{ size?: number; bob?: boolean; style?: React.CSSProperties }> = ({ size = 300, bob, style }) => {
  const frame = useCurrentFrame();
  const rock = bob ? Math.sin((frame / 30) * Math.PI * 0.5) * 1.6 : 0;
  const lift = bob ? Math.sin((frame / 30) * Math.PI * 0.5 + 1) * 5 : 0;
  return (
    <img
      src={staticFile("brand/ship-nobg.svg")}
      style={{ width: size, transform: `translateY(${lift}px) rotate(${rock}deg)`, transformOrigin: "50% 80%", ...style }}
    />
  );
};

/** Horizontal wordmark for dark canvases (white "Vela" + light tile mark). */
export const Wordmark: React.FC<{ width?: number; style?: React.CSSProperties }> = ({ width = 460, style }) => (
  <img src={staticFile("brand/wordmark-dark-bg.svg")} style={{ width, ...style }} />
);

/** Gradient CTA pill — the landing's primary button, verbatim. */
export const Cta: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({ children, size = 44, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 18,
      padding: `${size * 0.62}px ${size * 1.45}px`,
      borderRadius: 999,
      backgroundImage: GRAD,
      color: "#fff",
      fontFamily: CLASH,
      fontWeight: 600,
      fontSize: size,
      letterSpacing: "-0.01em",
      boxShadow: "0 30px 80px -24px rgba(255,46,77,0.55)",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Night canvas: blobs + grain + handle top / link bottom, safe-padded. */
export const NightShell: React.FC<{
  children: React.ReactNode;
  reel?: boolean;
  chrome?: boolean;
  chromeFrom?: number;
}> = ({ children, reel, chrome = true, chromeFrom = 10 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // Clamped so short still-comps (30f) can't produce a non-monotonic range.
  const inA = chromeFrom;
  const inB = chromeFrom + 18;
  const outA = Math.max(inB + 1, durationInFrames - 14);
  const outB = Math.max(outA + 1, durationInFrames - 2);
  const chromeOpacity = interpolate(frame, [inA, inB, outA, outB], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ background: BRAND.dark, fontFamily: INTER }}>
      <Blobs frame={frame} />
      <Grain />
      {chrome && (
        <>
          <div style={{ position: "absolute", top: reel ? 96 : 64, left: 0, right: 0, textAlign: "center", opacity: chromeOpacity, color: "rgba(255,255,255,0.55)", fontSize: reel ? 30 : 26, fontWeight: 500, zIndex: 6 }}>
            @vela.al
          </div>
          <div style={{ position: "absolute", bottom: reel ? 92 : 60, left: 0, right: 0, textAlign: "center", opacity: chromeOpacity * 0.85, color: "rgba(255,255,255,0.5)", fontSize: reel ? 24 : 22, fontWeight: 700, letterSpacing: "0.3em", zIndex: 6 }}>
            VELA — DYQANI YT ONLINE
          </div>
        </>
      )}
      <AbsoluteFill style={{ padding: reel ? "270px 84px 280px" : "150px 84px 150px", zIndex: 3 }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Warm paper canvas (the landing's cream) with soft corner glows. */
export const PaperShell: React.FC<{ children: React.ReactNode; reel?: boolean }> = ({ children, reel }) => (
  <AbsoluteFill style={{ background: "#FBF6F4", fontFamily: INTER }}>
    <div style={{ position: "absolute", right: -220, top: -260, width: 900, height: 900, borderRadius: 999, background: "rgba(255,46,77,0.10)", filter: "blur(150px)" }} />
    <div style={{ position: "absolute", left: -260, bottom: -300, width: 950, height: 950, borderRadius: 999, background: "rgba(245,158,11,0.13)", filter: "blur(150px)" }} />
    <Grain opacity={0.035} />
    <AbsoluteFill style={{ padding: reel ? "270px 84px 280px" : "140px 84px 140px", zIndex: 3 }}>{children}</AbsoluteFill>
  </AbsoluteFill>
);

/** Eyebrow pill (gradient dot + tracked uppercase) — landing section opener. */
export const Eyebrow: React.FC<{ children: React.ReactNode; dark?: boolean; style?: React.CSSProperties }> = ({ children, dark, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 14,
      padding: "16px 34px",
      borderRadius: 999,
      border: `2px solid ${dark ? "rgba(255,255,255,0.18)" : "#EDE4E1"}`,
      background: dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)",
      color: dark ? "rgba(255,255,255,0.75)" : BRAND.muted,
      fontSize: 26,
      fontWeight: 700,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      ...style,
    }}
  >
    <span style={{ width: 14, height: 14, borderRadius: 99, backgroundImage: GRAD }} />
    {children}
  </div>
);
