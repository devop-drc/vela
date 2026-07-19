/**
 * TransparentBadge — an overlay demo on a REAL transparent background (no bg
 * fill), so it exports with a genuine alpha channel for compositing over your
 * own footage. A cursor moves in and presses; on the press an expanding ring of
 * light fires and the badge pops in with overshoot; it holds with a soft glow
 * and a slow glint, then scales down and fades out.
 *
 * Render transparent: see the ProRes 4444 command in REMOTION.md.
 */
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { loadFont } from "@remotion/google-fonts/Inter";
import { springIn, pulse } from "../lib/motion";

const { fontFamily } = loadFont();

export const transparentBadgeSchema = z.object({
  label: z.string(),
  accent: zColor(),
  accent2: zColor(),
});
export const transparentBadgeDefaults: z.infer<typeof transparentBadgeSchema> = {
  label: "VERIFIED",
  accent: "#ff2e4d", // was #d946ef (Instagram-era)
  accent2: "#f97316",
};

const PRESS = 18;

export const TransparentBadge = ({ label, accent, accent2 }: z.infer<typeof transparentBadgeSchema>) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const cx = width / 2;
  const cy = height / 2;

  // cursor: glide in → press (ripple) → glide out
  const inT = interpolate(frame, [0, PRESS], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const outT = interpolate(frame, [PRESS + 8, PRESS + 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  const curX = cx + 150 - inT * 150 + outT * 220;
  const curY = cy + 150 - inT * 150 + outT * 160;
  const press = springIn(frame, fps, PRESS, { damping: 10, stiffness: 170 });
  const cursorVisible = frame < PRESS + 30;

  // badge pops on press; holds; scales down + fades at the end
  const pop = springIn(frame, fps, PRESS, { damping: 9, stiffness: 150 });
  const exit = interpolate(frame, [durationInFrames - 18, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
  const scale = pop * (1 - exit * 0.4);
  const opacity = pop * (1 - exit);

  // expanding light ring on press
  const ring = interpolate(frame, [PRESS, PRESS + 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  // slow glint sweep across the badge while held
  const glint = interpolate((frame - PRESS) % 70, [0, 70], [-140, 240]);

  return (
    <AbsoluteFill>
      {/* expanding ring of light (geometric, not particles) */}
      {ring > 0 && ring < 1 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 220 + ring * 360, height: 220 + ring * 360, borderRadius: 999, border: `3px solid ${accent}`, opacity: (1 - ring) * 0.8 }} />
        </AbsoluteFill>
      )}

      {/* the badge */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: `scale(${scale})`, opacity }}>
          <div style={{ position: "relative", overflow: "hidden", padding: "26px 46px", borderRadius: 999, fontFamily, fontSize: 46, fontWeight: 800, letterSpacing: "0.14em", color: "#fff", background: `linear-gradient(120deg, ${accent}, ${accent2})`, boxShadow: `0 20px 60px -12px ${accent}` , filter: `saturate(1.1)`, }}>
            {/* glow pulse */}
            <div style={{ position: "absolute", inset: -2, borderRadius: 999, boxShadow: `0 0 40px ${accent}`, opacity: pulse(frame) * 0.6, pointerEvents: "none" }} />
            {/* glint */}
            <div style={{ position: "absolute", top: 0, bottom: 0, left: `${glint}%`, width: 70, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)", transform: "skewX(-18deg)", pointerEvents: "none" }} />
            <span style={{ position: "relative" }}>{label}</span>
          </div>
        </div>
      </AbsoluteFill>

      {/* cursor with press ripple */}
      {cursorVisible && (
        <div style={{ position: "absolute", left: curX, top: curY }}>
          {frame >= PRESS && (
            <span style={{ position: "absolute", left: -14, top: -14, width: 40, height: 40, borderRadius: 999, border: `2px solid ${accent}`, opacity: 1 - press, transform: `scale(${0.3 + press * 1.6})` }} />
          )}
          <svg width="30" height="30" viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,.4))" }}>
            <path d="M5 3l14 8-6 1.5L9.5 19 5 3z" fill="white" stroke="#111" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </AbsoluteFill>
  );
};
