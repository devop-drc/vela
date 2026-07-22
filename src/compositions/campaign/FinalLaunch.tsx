/**
 * Vela — FinalLaunch reels. Albanian meme-native format (relatable shopping-culture
 * jokes, POV/chat skits, Vela = the punchline-fix) but with CLEAN, SERIOUS brand
 * typography (Clash Display — no outlined "TikTok" font) and mixed light↔dark scenes:
 * a dark chaos/pain hook → hard cut → a clean light Vela payoff.
 *
 *   FinalLaunch01DmPrice  "Çmimi në DM 🙏"  → the price sits on the product
 */
import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { springIn, float } from "../../lib/motion";
import { BRAND, CLASH, INTER, INK, AuroraDark, CreamBase, Shimmer, GlareChip, glassLight, KineticWords, ensureClash } from "../marketing/nextgen/kitv2";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SPRING = { damping: 14, mass: 1.0, stiffness: 140 }; // snappy, a little punch

/** Clean chat bubble — relatable, but on-brand (no meme outline). */
const Bubble: React.FC<{ text: string; who: "buyer" | "seller"; s: number }> = ({ text, who, s }) => (
  <div style={{ display: "flex", justifyContent: who === "buyer" ? "flex-start" : "flex-end", opacity: Math.min(1, s * 1.4), transform: `translateY(${(1 - s) * 44}px) scale(${0.9 + s * 0.1})` }}>
    <div style={{
      maxWidth: "82%", padding: "24px 34px", fontFamily: INTER, fontWeight: 600, fontSize: 42, lineHeight: 1.3,
      borderRadius: who === "buyer" ? "32px 32px 32px 10px" : "32px 32px 10px 32px",
      ...(who === "buyer"
        ? { background: "rgba(255,255,255,0.96)", color: "#1a1216" }
        : { backgroundImage: "linear-gradient(115deg,#A31234,#FF2E4D)", color: "#fff" }),
      boxShadow: "0 26px 64px -24px rgba(0,0,0,0.6)",
    }}>{text}</div>
  </div>
);

const POV: React.FC<{ children: React.ReactNode; frame: number; fps: number; delay?: number }> = ({ children, frame, fps, delay = 2 }) => {
  const s = springIn(frame, fps, delay, SPRING);
  return (
    <div style={{ opacity: interpolate(s, [0, 1], [0, 1]), transform: `translateY(${(1 - s) * 30}px)` }}>
      <span style={{ display: "inline-block", padding: "12px 26px", borderRadius: 14, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.85)", fontFamily: CLASH, fontWeight: 600, fontSize: 34, letterSpacing: ".02em" }}>{children}</span>
    </div>
  );
};

export const FINAL_DM_FRAMES = 11 * 30; // 330
const CUT = 186;

export const FinalLaunch01DmPrice: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  ensureClash();

  const aOut = interpolate(frame, [CUT - 8, CUT], [1, 0], clamp); // hard-ish cut
  const bIn = frame >= CUT ? 1 : 0;
  const b = (d: number) => springIn(frame, fps, CUT + d, SPRING);
  const point = Math.abs(Math.sin((frame - CUT - 90) / 11)) * 12;

  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      {/* ── DARK hook: the DM joke ── */}
      {frame < CUT + 2 && (
        <AbsoluteFill style={{ opacity: aOut }}>
          <AuroraDark frame={frame} />
          <AbsoluteFill style={{ padding: "150px 70px 200px", display: "flex", flexDirection: "column", gap: 30 }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <POV frame={frame} fps={fps}>POV: pyet një dyqan shqiptar për çmimin</POV>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 30 }}>
              <Bubble who="buyer" text="Sa kushton fustani? 😍" s={springIn(frame, fps, 34, SPRING)} />
              <Bubble who="seller" text="Çmimi në DM 🙏" s={springIn(frame, fps, 72, SPRING)} />
              <Bubble who="buyer" text="…po jemi në DM 💀" s={springIn(frame, fps, 120, SPRING)} />
            </div>
            <div style={{ marginTop: "auto", opacity: interpolate(springIn(frame, fps, 150, SPRING), [0, 1], [0, 1]) }}>
              <KineticWords text="Klasika shqiptare." frame={frame} fps={fps} delay={150} highlight="shqiptare" style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 70, color: "#fff", letterSpacing: "-0.02em" }} />
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}

      {/* ── LIGHT payoff: Vela shows the price ── */}
      {bIn === 1 && (
        <AbsoluteFill>
          <CreamBase frame={frame} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 50, padding: "150px 70px" }}>
            <KineticWords text="Me Vela, çmimi rri te produkti." frame={frame} fps={fps} delay={CUT + 4} highlight="produkti" style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 68, color: INK, textAlign: "center", letterSpacing: "-0.02em", maxWidth: 900 }} />
            {/* clean light product card */}
            <div style={{ width: 560, borderRadius: 32, overflow: "hidden", ...glassLight, opacity: b(24), transform: `translateY(${(1 - b(24)) * 60 + float(frame, 6, 40)}px)` }}>
              <Img src={staticFile("campaign/sneaker.jpg")} style={{ width: "100%", height: 380, objectFit: "cover", display: "block" }} />
              <div style={{ position: "relative", padding: "28px 34px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 40, color: INK }}>Atlete Vrapi Air</div>
                <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 44, color: BRAND.wine }}>4,760 L</div>
              </div>
            </div>
            <div style={{ opacity: b(44), transform: `translateY(${(1 - b(44)) * 30}px)` }}>
              <GlareChip frame={frame} fontSize={44}>Dyqani yt falas → vela.al</GlareChip>
            </div>
            <div style={{ opacity: b(58), fontFamily: CLASH, fontWeight: 600, fontSize: 34, color: BRAND.muted, transform: `translateY(${-point}px)` }}>Pa "çmimi në DM". Kurrë më.</div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
