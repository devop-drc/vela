/**
 * Vela — FinalLaunch wave 2. New angles beyond the meme reels:
 *   10 HowItWorks  · reel  · clean animated explainer (Vela në 3 hapa)
 *   11 Manifesto   · post  · bold typographic statement
 * Same brand system (Clash, 115° gradient, aurora/cream, hard cut) as the set.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Instagram, Tag, ShoppingBag } from "lucide-react";
import { springIn } from "../../lib/motion";
import { BRAND, CLASH, INTER, INK, AuroraDark, CreamBase, GlareChip, ShipColored, glassLight, KineticWords, ensureClash } from "../marketing/nextgen/kitv2";

const SPRING = { damping: 14, mass: 1.0, stiffness: 140 };
const GRAD = "linear-gradient(115deg,#A31234,#FF2E4D)";
const H = (s: number, c: string): React.CSSProperties => ({ fontFamily: CLASH, fontWeight: 700, fontSize: s, letterSpacing: "-0.02em", color: c, textAlign: "center" });
const eyebrowDark: React.CSSProperties = { display: "inline-block", padding: "12px 28px", borderRadius: 999, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.85)", fontFamily: CLASH, fontWeight: 700, fontSize: 26, letterSpacing: ".14em", textTransform: "uppercase" };

/* ══════════════════ 10 · How it works — Vela në 3 hapa (reel) ══════════════════ */
const STEPS = [
  { n: "01", Icon: Instagram, t: "Lidh Instagramin", d: "Një klik. Pa kod, pa mundim." },
  { n: "02", Icon: Tag, t: "Postimet bëhen produkte", d: "Me çmim, madhësi dhe stok." },
  { n: "03", Icon: ShoppingBag, t: "Klientët blejnë vetë", d: "Kartë ose cash. Zero DM." },
];
export const WAVE2_HIW_FRAMES = 11 * 30; // 330
const CUT = 96;
export const FinalLaunch10HowItWorks: React.FC = () => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); ensureClash();
  const b = (d: number) => springIn(frame, fps, CUT + d, SPRING);
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      {/* dark hook */}
      {frame < CUT && (
        <AbsoluteFill>
          <AuroraDark frame={frame} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34, padding: "0 80px" }}>
            <span style={eyebrowDark}>3 hapa · zero DM</span>
            <KineticWords text="Kthe Instagramin në dyqan." frame={frame} fps={fps} delay={6} highlight="dyqan" style={{ ...H(78, "#fff"), maxWidth: 900 }} />
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {/* light explainer */}
      {frame >= CUT && (
        <AbsoluteFill>
          <CreamBase frame={frame} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 12, background: "linear-gradient(90deg,#A31234,#FF2E4D,#F59E0B)" }} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 46, padding: "120px 70px" }}>
            <KineticWords text="Vela, në 3 hapa." frame={frame} fps={fps} delay={CUT - 4} highlight="3" style={{ ...H(72, INK), maxWidth: 900 }} />
            <div style={{ width: 880, display: "flex", flexDirection: "column", gap: 22 }}>
              {STEPS.map(({ n, Icon, t, d }, i) => {
                const a = b(16 + i * 18);
                return (
                  <div key={n} style={{ display: "flex", alignItems: "center", gap: 28, padding: "30px 38px", borderRadius: 28, ...glassLight, opacity: a, transform: `translateY(${(1 - a) * 70}px)` }}>
                    <span style={{ position: "relative", width: 88, height: 88, borderRadius: 24, background: GRAD, display: "grid", placeItems: "center", color: "#fff", flexShrink: 0, boxShadow: "0 18px 40px -14px rgba(163,18,52,0.55)" }}><Icon size={42} strokeWidth={2} /></span>
                    <div style={{ position: "relative", flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                        <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 34, backgroundImage: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{n}</span>
                        <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 42, color: INK }}>{t}</span>
                      </div>
                      <div style={{ fontFamily: INTER, fontSize: 28, color: BRAND.muted, marginTop: 4 }}>{d}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ opacity: b(74), transform: `translateY(${(1 - b(74)) * 30}px)` }}><GlareChip frame={frame} fontSize={44}>Fillo falas → vela.al</GlareChip></div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/* ══════════════════ 11 · Manifesto (post 1080×1350) ══════════════════ */
export const STILL_FRAMES = 1;
export const FinalLaunch11Manifesto: React.FC = () => {
  const frame = useCurrentFrame(); ensureClash();
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <AuroraDark frame={frame} />
      <AbsoluteFill style={{ alignItems: "flex-start", justifyContent: "center", padding: "0 90px", paddingBottom: 240, gap: 8 }}>
        <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 56, color: "rgba(255,255,255,0.58)", lineHeight: 1.08 }}>Ti nuk je qendër<br />mesazhesh.</div>
        <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 168, letterSpacing: "-0.03em", lineHeight: 0.98, color: "#fff", marginTop: 14 }}>Ti je <span style={{ backgroundImage: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>biznes.</span></div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, bottom: 0, width: 1080, background: "#F5F0E6", padding: "48px 90px", display: "flex", alignItems: "center", gap: 26 }}>
        <ShipColored size={88} />
        <div>
          <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 46, color: INK, lineHeight: 1.05 }}>Vela e kthen Instagramin në dyqan.</div>
          <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 32, color: BRAND.wine, marginTop: 6 }}>Shitje pa DM · vela.al</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
