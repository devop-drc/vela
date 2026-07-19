/**
 * Shared kit for the Vela Instagram story compositions (1080x1920).
 * Brand tokens, Clash Display loading, the dark blob background, and the
 * story-safe layout (IG chrome covers ~top 250px / bottom 280px).
 */
import React from "react";
import { AbsoluteFill, continueRender, delayRender, interpolate, staticFile } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

export const INTER = loadFont().fontFamily;
export const CLASH = "Clash Display";

/* Instagram-era palette (commented for reference):
   primary #C520C5 · pink #DB2777 · fuchsia #D946EF · deep #C026D3 · red #EF4444 */
export const BRAND = {
  dark: "#140A0E",
  darkCard: "#1E1014",
  paper: "#FDFCFD",
  ink: "#2A1D22",
  muted: "#796770",
  border: "#E8DEE2",
  primary: "#A31234", // wine
  pink: "#C81E3C", // crimson
  fuchsia: "#FF2E4D", // neon red
  deep: "#7F1D3B", // deep wine
  amber: "#F59E0B",
  yellow: "#FACC15",
  red: "#E11D48",
  success: "#239F50",
} as const;

/* Load the real Clash Display OTFs from public/fonts/clash. */
let clashLoading = false;
export const ensureClash = () => {
  if (clashLoading || typeof document === "undefined") return;
  clashLoading = true;
  const handle = delayRender("Clash Display");
  const faces = [
    ["ClashDisplay-Medium.otf", "500"],
    ["ClashDisplay-Semibold.otf", "600"],
    ["ClashDisplay-Bold.otf", "700"],
  ].map(([file, weight]) =>
    new FontFace(CLASH, `url('${staticFile(`fonts/clash/${file}`)}') format('opentype')`, { weight }).load(),
  );
  Promise.all(faces)
    .then((loaded) => {
      loaded.forEach((f) => document.fonts.add(f));
      continueRender(handle);
    })
    .catch(() => continueRender(handle));
};
ensureClash();

/** Gradient-clipped display text (static rendering of .brand-text). */
export const gradText: React.CSSProperties = {
  // was (Instagram-era): linear-gradient(100deg,#D946EF 5%,#DB2777 32%,#EF4444 55%,#F59E0B 90%)
  backgroundImage: "linear-gradient(100deg,#FACC15 5%,#F59E0B 30%,#FF2E4D 62%,#A31234 95%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

/** Drifting blurred brand blobs on the dark canvas. */
export const Blobs: React.FC<{ frame: number; opacity?: number }> = ({ frame, opacity = 1 }) => {
  const d = (speed: number, amp: number, phase = 0) => Math.sin(frame / speed + phase) * amp;
  const blob = (bg: string, size: number, x: number, y: number, o: number): React.CSSProperties => ({
    position: "absolute",
    width: size,
    height: size,
    borderRadius: 999,
    background: bg,
    filter: "blur(150px)",
    opacity: o * opacity,
    left: x,
    top: y,
  });
  return (
    <AbsoluteFill>
      <div style={blob(BRAND.deep, 900, -260 + d(90, 60), -220 + d(70, 80, 2), 0.4)} />
      <div style={blob(BRAND.pink, 780, 560 + d(80, 70, 1), 700 + d(95, 90, 4), 0.32)} />
      <div style={blob(BRAND.amber, 700, -180 + d(75, 80, 3), 1250 + d(85, 70, 1), 0.22)} />
      <div style={blob(BRAND.red, 560, 620 + d(70, 60, 5), -120 + d(80, 70, 3), 0.2)} />
    </AbsoluteFill>
  );
};

/** Dark story canvas: blobs + top handle + bottom wordmark, safe-area padded. */
export const StoryShell: React.FC<{
  frame: number;
  durationInFrames: number;
  children: React.ReactNode;
  light?: boolean;
}> = ({ frame, durationInFrames, children, light }) => {
  const chromeOpacity = interpolate(frame, [8, 26, durationInFrames - 16, durationInFrames - 4], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fg = light ? BRAND.muted : "rgba(255,255,255,0.6)";
  return (
    <AbsoluteFill style={{ background: light ? BRAND.paper : BRAND.dark, fontFamily: INTER }}>
      {!light && <Blobs frame={frame} />}
      <div style={{ position: "absolute", top: 88, left: 0, right: 0, textAlign: "center", opacity: chromeOpacity, color: fg, fontSize: 30, fontWeight: 500, letterSpacing: "0.02em", zIndex: 5 }}>
        @vela.al
      </div>
      <div style={{ position: "absolute", bottom: 84, left: 0, right: 0, textAlign: "center", opacity: chromeOpacity * 0.8, color: fg, fontSize: 24, fontWeight: 700, letterSpacing: "0.3em", zIndex: 5 }}>
        VELA — DYQANI YT ONLINE
      </div>
      <AbsoluteFill style={{ padding: "280px 84px 300px", zIndex: 2 }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Rounded CTA chip (outline on dark, gradient fill variant). */
export const Chip: React.FC<{ children: React.ReactNode; filled?: boolean; style?: React.CSSProperties }> = ({ children, filled, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 16,
      padding: "24px 52px",
      borderRadius: 999,
      fontFamily: CLASH,
      fontWeight: 600,
      fontSize: 40,
      letterSpacing: "-0.01em",
      color: "#fff",
      ...(filled
        // was (Instagram-era): linear-gradient(115deg,#C026D3,#DB2777 45%,#EF4444 75%,#F59E0B 115%)
        ? { backgroundImage: "linear-gradient(115deg,#7F1D3B,#A31234 40%,#FF2E4D 75%,#F59E0B 115%)", boxShadow: "0 30px 70px -25px rgba(163,18,52,0.6)" }
        : { border: "2.5px solid rgba(255,255,255,0.4)", background: "rgba(15,12,19,0.4)" }),
      ...style,
    }}
  >
    {children}
  </div>
);

export const ShipWhite: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 200, style }) => (
  <img src={staticFile("ship-icon-white.svg")} style={{ width: size, ...style }} />
);
export const ShipColored: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 200, style }) => (
  <img src={staticFile("ship-icon-colored.svg")} style={{ width: size, ...style }} />
);
