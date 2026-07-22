/**
 * Next-gen marketing reels (9:16 · 1080x1920 · 30fps) from marketing/NEW_CONTENT_PLAN.md.
 * Poster-first: frame 0 is a settled cover (clean grid thumbnail); motion is the
 * proof beat + CTA. Real app UI via DeviceMockup instead of mock screens.
 *
 *   C4 · MicroOrderDash  — "Porositë pa Excel"  (dark)
 *   C3 · MicroDmFlow     — "Nga mesazhi te checkout" (light)
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { springIn, exitLift, float, pulse } from "../../../lib/motion";
import {
  BRAND, CLASH, INTER, gradText, Blobs, Chip, ShipWhite,
  DeviceMockup, BrandMesh, Headline, Toast, shot, dim, ensureClash,
} from "./kit";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/* ═══════════════════════════ C4 · MicroOrderDash (dark) ═══════════════════════════ */

export const MICRO_ORDERS_FRAMES = 15 * 30; // 450

export const C4MicroOrders: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  ensureClash();

  const CTA = 330;
  // Scene A (poster + proof) is settled at frame 0, then exits into the CTA.
  const aExit = exitLift(frame, CTA, 24, 70);
  const kb = interpolate(frame, [90, CTA], [1, 1.06], clamp); // slow Ken-Burns
  const spot = interpolate(frame, [90, 140], [0, 1], clamp); // dim lifts on the proof beat
  const cap = interpolate(frame, [150, 176], [0, 1], clamp);
  const toast = springIn(frame, fps, 188, { damping: 12 });

  // CTA scene
  const ctaFade = interpolate(frame, [CTA, CTA + 16], [0, 1], clamp);
  const point = Math.abs(Math.sin((frame - CTA) / 11)) * 16;

  return (
    <AbsoluteFill style={{ background: BRAND.dark, fontFamily: INTER }}>
      <Blobs frame={frame} />

      {/* ── Scene A: orders panel proof ── */}
      <AbsoluteFill style={{ opacity: aExit.opacity, transform: `translateY(${aExit.y}px)`, padding: "150px 70px 170px" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <Headline a="Të gjitha porositë," b="një panel." size={92} align="center" style={{ transform: `translateY(${float(frame, 5, 34)}px)` }} />
          <p style={{ fontFamily: INTER, fontSize: 40, color: "rgba(255,255,255,0.62)", marginTop: 18, opacity: cap, textAlign: "center" }}>
            Njoftim në çast · Stoku <span style={{ color: "#fff", fontWeight: 600 }}>rezervohet vetë</span>.
          </p>

          <div style={{ position: "relative", marginTop: 48, transform: `scale(${kb})` }}>
            <DeviceMockup src={shot("05-orders.png")} kind="browser" url="vela.al/porosite" width={820} />
            <div style={dim(spot)} />
            {/* live "new order" toast slides in from the right */}
            <Toast
              title="Porosi e re 🎉"
              sub="+37,000 ALL · me kartë"
              style={{
                position: "absolute",
                right: -20,
                top: 150,
                opacity: toast,
                transform: `translateX(${(1 - toast) * 120}px)`,
              }}
            />
          </div>
        </div>
      </AbsoluteFill>

      {/* ── Scene B: CTA ── */}
      {frame >= CTA - 4 && (
        <AbsoluteFill style={{ opacity: ctaFade }}>
          <BrandMesh frame={frame} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40, padding: "0 90px" }}>
            <ShipWhite size={200} style={{ transform: `translateY(${float(frame, 10, 26)}px)`, filter: "drop-shadow(0 30px 70px rgba(127,29,59,0.6))" }} />
            <Headline a="Porositë e tua," b="pa kaos." size={104} align="center" />
            <Chip filled style={{ fontSize: 44 }}>Provo falas · pa kartë</Chip>
            <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 40, color: "#fff", transform: `translateY(${-point}px)` }}>
              👆 Linku në bio · vela.al
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/* ═══════════════════════════ C3 · MicroDmFlow (light) ═══════════════════════════ */

export const MICRO_DM_FRAMES = 15 * 30; // 450

const Bubble: React.FC<{ text: string; right?: boolean; y: number; frame: number; delay: number; fps: number }> = ({ text, right, y, frame, delay, fps }) => {
  const s = springIn(frame, fps, delay, { damping: 12 });
  return (
    <div
      style={{
        alignSelf: right ? "flex-end" : "flex-start",
        maxWidth: 640,
        margin: "0 0 22px 0",
        padding: "26px 38px",
        borderRadius: right ? "34px 34px 10px 34px" : "34px 34px 34px 10px",
        background: right ? "linear-gradient(115deg,#A31234,#FF2E4D)" : "#F1EBEE",
        color: right ? "#fff" : BRAND.ink,
        fontFamily: INTER,
        fontSize: 40,
        fontWeight: 500,
        opacity: s,
        transform: `translateY(${(1 - s) * 40 + float(frame, 3, 40)}px) scale(${0.9 + s * 0.1})`,
        boxShadow: "0 24px 60px -30px rgba(80,20,40,0.35)",
      }}
    >
      {text}
    </div>
  );
};

export const C3MicroDm: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  ensureClash();

  const ACT2 = 168;
  const CTA = 360;

  // Act 1 (message pile) — settled at frame 0 as the poster, exits sliding left.
  const a1Out = interpolate(frame, [ACT2 - 22, ACT2], [0, 1], { ...clamp, easing: undefined });
  // Act 2 (storefront buys itself)
  const dev = springIn(frame, fps, ACT2 + 8, { damping: 13 });
  const cap = interpolate(frame, [ACT2 + 30, ACT2 + 56], [0, 1], clamp);
  const buy = pulse(frame, 18);
  const a2Exit = exitLift(frame, CTA, 22, 60);
  // CTA
  const ctaFade = interpolate(frame, [CTA, CTA + 16], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ background: BRAND.paper, fontFamily: INTER }}>
      {/* thin brand bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 18, background: "linear-gradient(90deg,#A31234,#FF2E4D,#F59E0B)" }} />

      {/* ── Act 1: the message pile (poster) ── */}
      {frame < ACT2 + 4 && (
        <AbsoluteFill
          style={{
            padding: "200px 90px 220px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            opacity: 1 - a1Out,
            transform: `translateX(${-a1Out * 280}px)`,
          }}
        >
          <p style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 30, letterSpacing: "0.24em", textTransform: "uppercase", color: BRAND.primary, margin: "0 0 26px" }}>
            Përsëri?
          </p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <Bubble text="Sa kushton? 🙏" y={0} frame={frame} delay={0} fps={fps} />
            <Bubble text="Si porosis?" right y={0} frame={frame} delay={8} fps={fps} />
            <Bubble text="A ke masë L?" y={0} frame={frame} delay={16} fps={fps} />
            <Bubble text="Ende aty? 🥺" right y={0} frame={frame} delay={24} fps={fps} />
            <Bubble text="Sa kushton??" y={0} frame={frame} delay={32} fps={fps} />
          </div>
        </AbsoluteFill>
      )}

      {/* ── Act 2: the storefront sells itself ── */}
      {frame >= ACT2 - 4 && frame < CTA + 4 && (
        <AbsoluteFill
          style={{
            padding: "210px 90px 240px",
            opacity: a2Exit.opacity,
            transform: `translateY(${a2Exit.y}px)`,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Headline a="Klientët blejnë" b="vetë." size={100} align="center" style={{ color: BRAND.ink }} />
            <p style={{ fontFamily: INTER, fontSize: 40, color: BRAND.muted, marginTop: 16, opacity: cap, textAlign: "center" }}>
              Pa mesazhe · Pagesa në <span style={{ color: BRAND.primary, fontWeight: 700 }}>Lekë</span>
            </p>
            <div style={{ position: "relative", marginTop: 40, opacity: dev, transform: `translateY(${(1 - dev) * 120}px)` }}>
              <DeviceMockup src={shot("07-storefront-mobile.png")} kind="phone" width={520} />
              <div
                style={{
                  position: "absolute",
                  bottom: 60,
                  left: "50%",
                  transform: `translateX(-50%) scale(${0.94 + Math.min(cap, 1) * 0.06 * buy})`,
                  padding: "20px 44px",
                  borderRadius: 999,
                  background: "linear-gradient(115deg,#A31234,#FF2E4D)",
                  color: "#fff",
                  fontFamily: CLASH,
                  fontWeight: 600,
                  fontSize: 34,
                  opacity: cap,
                  boxShadow: "0 24px 60px -20px rgba(163,18,52,0.6)",
                }}
              >
                Checkout ✓
              </div>
            </div>
          </div>
        </AbsoluteFill>
      )}

      {/* ── CTA (light) ── */}
      {frame >= CTA - 4 && (
        <AbsoluteFill style={{ opacity: ctaFade, alignItems: "center", justifyContent: "center", gap: 40, padding: "0 90px" }}>
          <Headline a="Dyqani yt online —" b="sot." size={110} align="center" style={{ color: BRAND.ink }} />
          <Chip filled style={{ fontSize: 44 }}>Provo falas · pa kartë</Chip>
          <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 40, color: BRAND.primary, transform: `translateY(${-Math.abs(Math.sin((frame - CTA) / 11)) * 16}px)` }}>
            👆 Linku në bio · vela.al
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
