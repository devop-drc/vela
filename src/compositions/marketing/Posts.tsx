/**
 * Instagram FEED POSTS (1080×1350 · 30fps) — motion graphics + typography.
 *
 *  PostSting   6s, loop-friendly  The boat sails in over a drawn "sea line",
 *                                 golden sheen sweeps the sails, wordmark +
 *                                 tagline settle. Brand-reveal post.
 *  PostNoCode  8s                 "Pa kod / Pa website / Pa stres" gradient
 *                                 bar wipes on paper canvas → "Vetëm posto."
 *  PostTrial   7s                 Giant 7 with an orbiting text ring
 *                                 (DITË FALAS • PA KARTË •) → CTA.
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { BRAND, CLASH, GRAD, GRAD_TEXT, NightShell, PaperShell, Boat, Wordmark, Cta, Eyebrow, springy, rise } from "./mkKit";

/* ══ POST 1 — brand sting ═══════════════════════════════════════════════ */
export const PostSting: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const sail = springy(frame, fps, 6, { damping: 15, stiffness: 90 });
  const sealine = interpolate(frame, [0, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const sWord = springy(frame, fps, 40);
  const sTag = springy(frame, fps, 54);
  // periodic golden sheen across the sails (loops with the composition)
  const sheenT = ((frame + 20) % durationInFrames) / durationInFrames;
  const sheenX = interpolate(sheenT, [0.35, 0.62], [-140, 620], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sheenO = interpolate(sheenT, [0.35, 0.45, 0.55, 0.62], [0, 0.5, 0.5, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <NightShell chrome={false}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 10 }}>
        <div style={{ position: "relative", width: 520, height: 460, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          {/* the boat sails in from the left, riding the sea line */}
          <div style={{ transform: `translateX(${(1 - sail) * -560}px)`, opacity: Math.min(1, sail * 2) }}>
            <Boat size={470} bob />
          </div>
          {/* golden sheen clipped to the boat area */}
          <div style={{ position: "absolute", top: 0, bottom: 40, width: 120, left: sheenX, transform: "rotate(14deg)", background: "linear-gradient(90deg, transparent, rgba(250,204,21,0.55), transparent)", filter: "blur(18px)", opacity: sheenO }} />
          {/* sea line draws in */}
          <div style={{ position: "absolute", bottom: 26, left: "50%", transform: "translateX(-50%)", height: 8, width: `${sealine * 660}px`, borderRadius: 99, backgroundImage: GRAD, opacity: 0.85, boxShadow: "0 0 30px rgba(255,46,77,0.5)" }} />
        </div>
        <div style={{ opacity: Math.min(1, sWord * 1.4), filter: `blur(${Math.max(0, 1 - sWord) * 8}px)`, transform: `translateY(${(1 - sWord) * 18}px)`, marginTop: 26 }}>
          <Wordmark width={520} />
        </div>
        <div style={{ ...rise(sTag), fontSize: 40, fontWeight: 500, color: "rgba(255,255,255,0.75)", letterSpacing: "0.01em", marginTop: 6 }}>
          Kthe Instagramin në dyqan online.
        </div>
      </AbsoluteFill>
    </NightShell>
  );
};
export const POST_STING_FRAMES = 180;

/* ══ POST 2 — "Pa kod. Pa website. Pa stres." ═══════════════════════════ */
const NO_LINES = ["Pa kod.", "Pa website.", "Pa stres."];

export const PostNoCode: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const FINAL_AT = 20 + NO_LINES.length * 34 + 16;

  return (
    <PaperShell>
      <AbsoluteFill style={{ alignItems: "flex-start", justifyContent: "center", padding: "0 100px", gap: 34 }}>
        <div style={{ ...rise(springy(frame, fps, 6)) }}>
          <Eyebrow>Dyqani yt online</Eyebrow>
        </div>
        {NO_LINES.map((l, i) => {
          const from = 22 + i * 34;
          // gradient bar wipes across, revealing the line behind it
          const wipe = interpolate(frame - from, [0, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
          const barX = interpolate(frame - from, [0, 30], [0, 108], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
          return (
            <div key={i} style={{ position: "relative", overflow: "hidden", paddingRight: 20 }}>
              <div
                style={{
                  fontFamily: CLASH,
                  fontWeight: 700,
                  fontSize: 118,
                  letterSpacing: "-0.03em",
                  color: BRAND.ink,
                  clipPath: `inset(0 ${100 - wipe * 100}% 0 0)`,
                }}
              >
                {l}
              </div>
              <div style={{ position: "absolute", top: 4, bottom: 4, width: 26, left: `${barX}%`, marginLeft: -30, borderRadius: 99, backgroundImage: GRAD, opacity: barX > 0 && barX < 107 ? 1 : 0 }} />
            </div>
          );
        })}
        <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 30 }}>
          <div style={{ ...rise(springy(frame, fps, FINAL_AT)), fontFamily: CLASH, fontWeight: 700, fontSize: 92, letterSpacing: "-0.02em", backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
            Vetëm posto.
          </div>
          <div style={{ ...rise(springy(frame, fps, FINAL_AT + 14)) }}>
            <Cta size={38}>Provo falas → vela.al</Cta>
          </div>
        </div>
      </AbsoluteFill>
    </PaperShell>
  );
};
export const POST_NOCODE_FRAMES = 240;

/* ══ POST 3 — "7 ditë falas" orbit ══════════════════════════════════════ */
const RING_TEXT = "DITË FALAS • PA KARTË • PA RREZIK • ";

export const PostTrial: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sSeven = springy(frame, fps, 8, { damping: 11, stiffness: 200 });
  const ringIn = interpolate(frame, [16, 42], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const spin = frame * 0.55;
  const chars = RING_TEXT.repeat(2).split("");
  const R = 330;
  const sCta = springy(frame, fps, 120);

  return (
    <NightShell chrome={false}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative", width: 820, height: 820, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {/* pulsing gradient halo */}
          <div style={{ position: "absolute", width: 560 + Math.sin(frame / 14) * 18, height: 560 + Math.sin(frame / 14) * 18, borderRadius: 999, backgroundImage: GRAD, opacity: 0.16, filter: "blur(60px)" }} />
          {/* the giant 7 */}
          <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 500, lineHeight: 1, letterSpacing: "-0.05em", backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", transform: `scale(${0.6 + sSeven * 0.4}) rotate(${(1 - sSeven) * -14}deg)`, opacity: Math.min(1, sSeven * 1.6), filter: `blur(${Math.max(0, 1 - sSeven) * 14}px)` }}>
            7
          </div>
          {/* orbiting ring of type */}
          {chars.map((c, i) => {
            const a = (i / chars.length) * 360 + spin;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "50%",
                  opacity: ringIn * 0.9,
                  transform: `rotate(${a}deg) translateY(-${R * ringIn}px)`,
                  transformOrigin: "0 0",
                  fontFamily: CLASH,
                  fontWeight: 600,
                  fontSize: 40,
                  letterSpacing: "0.1em",
                  color: i % 12 < 2 ? "#FACC15" : "rgba(255,255,255,0.85)",
                }}
              >
                {c}
              </div>
            );
          })}
        </div>
        <div style={{ ...rise(sCta), marginTop: -40 }}>
          <Cta size={40}>Provo 7 ditë falas → vela.al</Cta>
        </div>
      </AbsoluteFill>
    </NightShell>
  );
};
export const POST_TRIAL_FRAMES = 210;
