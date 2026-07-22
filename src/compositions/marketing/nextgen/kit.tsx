/**
 * Next-gen marketing kit (9:16, 1080x1920) — builds on the story kit so the
 * whole account stays one visual system. Adds the pieces the new plan needs:
 * a real-UI DeviceMockup (frame a screenshot), an animated BrandMesh, and a
 * Spotlight overlay for focal attention. See marketing/NEW_CONTENT_PLAN.md.
 */
import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { BRAND, CLASH, gradText } from "../../stories/storyKit";

export * from "../../stories/storyKit";

/** staticFile path for an app screenshot copied to public/marketing/app. */
export const shot = (name: string) => staticFile(`marketing/app/${name}`);

/** Two-part display headline: white first clause + gradient-clipped second. */
export const Headline: React.FC<{
  a: string;
  b?: string;
  size?: number;
  align?: React.CSSProperties["textAlign"];
  style?: React.CSSProperties;
}> = ({ a, b, size = 96, align = "left", style }) => (
  <h1
    style={{
      fontFamily: CLASH,
      fontWeight: 600,
      fontSize: size,
      lineHeight: 1.05,
      letterSpacing: "-0.02em",
      color: "#fff",
      textAlign: align,
      margin: 0,
      ...style,
    }}
  >
    {a}
    {b ? (
      <>
        {" "}
        <span style={gradText}>{b}</span>
      </>
    ) : null}
  </h1>
);

/**
 * A screenshot inside a device frame. `kind="phone"` gives a rounded phone body;
 * `kind="browser"` gives a top bar with a url pill. Rounded, bezel, soft shadow.
 */
export const DeviceMockup: React.FC<{
  src: string;
  kind?: "phone" | "browser";
  url?: string;
  width?: number;
  style?: React.CSSProperties;
}> = ({ src, kind = "browser", url = "vela.al/dyqani", width = 760, style }) => {
  if (kind === "phone") {
    return (
      <div
        style={{
          width,
          borderRadius: 56,
          padding: 14,
          background: "#0B0710",
          border: "2px solid rgba(255,255,255,0.14)",
          boxShadow: "0 60px 140px -50px rgba(0,0,0,0.8)",
          ...style,
        }}
      >
        <div style={{ borderRadius: 44, overflow: "hidden", background: "#000" }}>
          <Img src={src} style={{ width: "100%", display: "block" }} />
        </div>
      </div>
    );
  }
  return (
    <div
      style={{
        width,
        borderRadius: 32,
        overflow: "hidden",
        background: BRAND.darkCard,
        border: "2px solid rgba(255,255,255,0.14)",
        boxShadow: "0 60px 140px -50px rgba(0,0,0,0.8)",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 26px", background: "rgba(255,255,255,0.05)" }}>
        <span style={{ width: 16, height: 16, borderRadius: 999, background: "#ff5f57" }} />
        <span style={{ width: 16, height: 16, borderRadius: 999, background: "#febc2e" }} />
        <span style={{ width: 16, height: 16, borderRadius: 999, background: "#28c840" }} />
        <span
          style={{
            marginLeft: 20,
            padding: "8px 24px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.08)",
            color: "rgba(255,255,255,0.7)",
            fontSize: 24,
            fontFamily: CLASH,
          }}
        >
          {url}
        </span>
      </div>
      <Img src={src} style={{ width: "100%", display: "block" }} />
    </div>
  );
};

/**
 * Animated brand mesh (the .brand-gradient, breathing). Drop as a full-bleed
 * background; the four radial positions drift on independent sine speeds.
 */
export const BrandMesh: React.FC<{ frame: number; vignette?: boolean }> = ({ frame, vignette = true }) => {
  const drift = (speed: number, from: number, to: number, phase = 0) =>
    interpolate(Math.sin(frame / speed + phase), [-1, 1], [from, to]);
  const bg = `radial-gradient(42% 56% at ${drift(70, 14, 26)}% ${drift(80, 20, 30, 2)}%, ${BRAND.deep} 0%, transparent 100%),`
    + `radial-gradient(48% 62% at ${drift(90, 74, 86, 1)}% ${drift(75, 12, 24, 3)}%, ${BRAND.yellow} 0%, transparent 100%),`
    + `radial-gradient(52% 66% at ${drift(80, 66, 78, 5)}% ${drift(85, 76, 88, 1)}%, ${BRAND.fuchsia} 0%, transparent 100%),`
    + `radial-gradient(44% 54% at ${drift(75, 16, 28, 3)}% ${drift(90, 70, 82, 4)}%, ${BRAND.amber} 0%, transparent 100%)`;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: BRAND.primary, backgroundImage: bg }} />
      {vignette && (
        <AbsoluteFill
          style={{ background: "radial-gradient(90% 70% at 50% 42%, transparent 30%, rgba(15,12,19,0.5) 100%)" }}
        />
      )}
    </AbsoluteFill>
  );
};

/** Dim overlay that lifts as `t`→1, for focal spotlighting under a raised element. */
export const dim = (t: number): React.CSSProperties => ({
  position: "absolute",
  inset: 0,
  background: "rgba(10,7,12,0.55)",
  opacity: 1 - t,
  pointerEvents: "none",
});

/** A "new order / new sale" toast card (used in the orders proof beat). */
export const Toast: React.FC<{ title: string; sub: string; style?: React.CSSProperties }> = ({ title, sub, style }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 6,
      padding: "26px 34px",
      borderRadius: 28,
      background: "rgba(22,18,28,0.92)",
      border: "2px solid rgba(255,255,255,0.16)",
      boxShadow: "0 40px 90px -40px rgba(0,0,0,0.8)",
      ...style,
    }}
  >
    <span style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 36, color: "#fff" }}>{title}</span>
    <span style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 34, color: BRAND.yellow }}>{sub}</span>
  </div>
);

/** convenience for the frame inside a composition */
export const useFrame = () => useCurrentFrame();
