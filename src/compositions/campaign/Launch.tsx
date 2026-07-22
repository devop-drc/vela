/**
 * Vela launch campaign — Asset #1 (see content-plan.md).
 * "Nga haosi në DM → dyqan automatik" · DARK · 9:16 · 12s (360f).
 * Pattern-interrupt (DM chaos) → transformation (post→product) → order & payment
 * in Lekë → CTA. Reuses the premium kit; brand spring {damping:16,mass:.8,stiffness:120}.
 */
import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { springIn, float, pulse } from "../../lib/motion";
import { BRAND, CLASH, INTER, AuroraDark, Shimmer, GlareChip, ShipWhite, ensureClash } from "../marketing/nextgen/kitv2";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SPRING = { damping: 16, mass: 0.8, stiffness: 120 };
/** Blur-reveal for display type: blur 14→0, y 40→0, scale .94→1. */
const blurIn = (frame: number, fps: number, delay: number) => {
  const s = springIn(frame, fps, delay, SPRING);
  return { opacity: interpolate(s, [0, 1], [0, 1]), filter: `blur(${(1 - s) * 14}px)`, transform: `translateY(${(1 - s) * 40}px) scale(${0.94 + s * 0.06})` };
};
const H: React.CSSProperties = { fontFamily: CLASH, fontWeight: 600, fontSize: 82, lineHeight: 1.04, letterSpacing: "-0.02em", color: "#fff", textAlign: "center", margin: 0 };

/* ── DM chat bubble (dark) ── */
const Bubble: React.FC<{ text: string; right?: boolean; top: number; left: number; frame: number; fps: number; delay: number; tilt: number }> = ({ text, right, top, left, frame, fps, delay, tilt }) => {
  const s = springIn(frame, fps, delay, { damping: 12, mass: 0.8, stiffness: 130 });
  return (
    <div style={{
      position: "absolute", top, left, maxWidth: 560,
      padding: "26px 38px", borderRadius: right ? "34px 34px 8px 34px" : "34px 34px 34px 8px",
      background: right ? "linear-gradient(115deg,#A31234,#FF2E4D)" : "rgba(34,26,38,0.96)",
      border: right ? "none" : "1px solid rgba(255,255,255,0.12)",
      color: "#fff", fontFamily: INTER, fontSize: 40, fontWeight: 500,
      opacity: s, transform: `translateY(${(1 - s) * 50}px) scale(${0.8 + s * 0.2}) rotate(${tilt * s}deg)`,
      boxShadow: "0 30px 70px -30px rgba(0,0,0,0.7)",
    }}>{text}</div>
  );
};

/* ── extracted product card (the "post becomes product" beat) ── */
const ProductCard: React.FC<{ frame: number; fps: number; base: number }> = ({ frame, fps, base }) => {
  const scan = interpolate(frame, [base + 6, base + 34], [0, 100], clamp);
  const scanning = frame > base + 6 && frame < base + 40;
  const f1 = springIn(frame, fps, base + 26, SPRING); // name
  const f2 = springIn(frame, fps, base + 34, SPRING); // price
  const f3 = springIn(frame, fps, base + 42, SPRING); // variants
  const chip = springIn(frame, fps, base + 50, SPRING); // status
  const row = (o: number, y = 22) => ({ opacity: o, transform: `translateY(${(1 - o) * y}px)` });
  return (
    <div style={{ width: 620, borderRadius: 30, overflow: "hidden", background: "rgba(31,15,23,0.92)", border: "1px solid rgba(255,46,77,0.35)", boxShadow: "0 60px 130px -50px rgba(0,0,0,0.85)" }}>
      <div style={{ position: "relative", height: 380, overflow: "hidden" }}>
        <Img src={staticFile("campaign/sneaker.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <span style={{ position: "absolute", left: 20, top: 20, display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 18px", borderRadius: 999, background: "rgba(20,10,14,0.7)", color: "#fff", fontFamily: CLASH, fontWeight: 600, fontSize: 24 }}>◎ Postim IG</span>
        {scanning && <div style={{ position: "absolute", left: 0, right: 0, top: `${scan}%`, height: 4, background: "linear-gradient(90deg,transparent,#FF2E4D,#FACC15,transparent)", boxShadow: "0 0 30px #FF2E4D" }} />}
      </div>
      <div style={{ padding: "30px 34px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ ...row(f1), fontFamily: CLASH, fontWeight: 600, fontSize: 42, color: "#fff" }}>Atlete Vrapi Air</div>
        <div style={{ ...row(f2), display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 46, color: BRAND.yellow }}>ALL 4,760</span>
          <span style={{ ...row(chip), padding: "8px 20px", borderRadius: 999, background: "rgba(35,159,80,0.18)", color: "#3ddc84", fontFamily: CLASH, fontWeight: 600, fontSize: 26 }}>● Aktiv</span>
        </div>
        <div style={{ ...row(f3), display: "flex", gap: 12 }}>
          {["S", "M", "L"].map((v) => <span key={v} style={{ padding: "10px 22px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.22)", color: "rgba(255,255,255,0.85)", fontFamily: CLASH, fontWeight: 600, fontSize: 28 }}>{v}</span>)}
        </div>
      </div>
    </div>
  );
};

/* ── checkout payment row ── */
const PayRow: React.FC<{ title: string; sub: string; icon: string; selected?: boolean; o: number }> = ({ title, sub, icon, selected, o }) => (
  <div style={{
    display: "flex", alignItems: "center", gap: 20, padding: "24px 28px", borderRadius: 22,
    background: "rgba(31,15,23,0.9)", border: selected ? `2px solid ${BRAND.yellow}` : "1px solid rgba(255,255,255,0.14)",
    opacity: o, transform: `translateX(${(1 - o) * -30}px)`,
  }}>
    <span style={{ width: 60, height: 60, borderRadius: 16, display: "grid", placeItems: "center", background: selected ? "rgba(250,204,21,0.16)" : "rgba(255,255,255,0.08)", fontSize: 30 }}>{icon}</span>
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 34, color: "#fff" }}>{title}</div>
      <div style={{ fontFamily: INTER, fontSize: 26, color: "rgba(255,255,255,0.55)" }}>{sub}</div>
    </div>
    {selected && <span style={{ color: BRAND.yellow, fontSize: 40, fontWeight: 700 }}>✓</span>}
  </div>
);

export const LAUNCH_DM_FRAMES = 12 * 30; // 360

export const LaunchDmToShop: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  ensureClash();

  // scene envelopes
  const s1 = interpolate(frame, [0, 72, 88], [1, 1, 0], clamp);
  const s2o = interpolate(frame, [84, 100, 176, 190], [0, 1, 1, 0], clamp);
  const s3o = interpolate(frame, [184, 200, 264, 278], [0, 1, 1, 0], clamp);
  const s4o = interpolate(frame, [272, 292, 360], [0, 1, 1], clamp);

  const scrim = interpolate(frame, [28, 46], [0, 0.62], clamp); // localized dim behind the hook line
  const point = Math.abs(Math.sin((frame - 272) / 11)) * 14;
  const ctaPulse = 1 + Math.sin(frame / 16) * 0.015;

  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <AuroraDark frame={frame} />

      {/* ── Scene 1 · Hook: DM chaos (bubbles up top, hook line lower-center) ── */}
      <AbsoluteFill style={{ opacity: s1 }}>
        <Bubble text="Çmimi? 🙏" left={110} top={300} frame={frame} fps={fps} delay={4} tilt={-3} />
        <Bubble text="A keni masën M?" right left={470} top={450} frame={frame} fps={fps} delay={14} tilt={3} />
        <Bubble text="Dërgesa në Shkodër?" left={90} top={610} frame={frame} fps={fps} delay={24} tilt={-2} />
        <Bubble text="Pse s'po përgjigjeni? 😩" right left={430} top={770} frame={frame} fps={fps} delay={34} tilt={2} />
        {/* localized dark glow behind the headline so bubbles stay visible as chaos */}
        <AbsoluteFill style={{ background: `radial-gradient(58% 20% at 50% 71%, rgba(9,6,11,${scrim}) 0%, transparent 72%)` }} />
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", padding: "0 90px 470px" }}>
          <div style={{ ...H, fontSize: 100, ...blurIn(frame, fps, 28) }}>
            Nga <Shimmer frame={frame}>haosi</Shimmer><br />në DM…
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* ── Scene 2 · Transformation ── */}
      <AbsoluteFill style={{ opacity: s2o, alignItems: "center", justifyContent: "center", gap: 56, padding: "150px 60px 200px" }}>
        <div style={{ ...H, ...blurIn(frame, fps, 84) }}>
          Vela lexon postimet.<br />Krijon dyqanin <Shimmer frame={frame}>vetvetiu.</Shimmer>
        </div>
        <div style={{ transform: `translateY(${float(frame, 7, 34)}px)` }}>
          <ProductCard frame={frame} fps={fps} base={84} />
        </div>
      </AbsoluteFill>

      {/* ── Scene 3 · Order & payment ── */}
      <AbsoluteFill style={{ opacity: s3o, alignItems: "center", justifyContent: "center", gap: 40, padding: "170px 70px 200px" }}>
        <div style={{ ...H, fontSize: 72, ...blurIn(frame, fps, 192) }}>
          Pagesa me kartë ose në dorë.<br /><span style={{ color: "rgba(255,255,255,0.6)", fontSize: 52 }}>Pa mundim. Pa kod.</span>
        </div>
        <div style={{ width: 720, display: "flex", flexDirection: "column", gap: 18 }}>
          <PayRow title="Kartë · RaiAccept" sub="Pagesa në Lekë (ALL)" icon="💳" selected o={springIn(frame, fps, 206, SPRING)} />
          <PayRow title="Para në dorë" sub="Cash on delivery" icon="💵" o={springIn(frame, fps, 216, SPRING)} />
        </div>
        {/* order toast springs down */}
        <div style={{ position: "absolute", top: 150, left: "50%", width: 720, transform: `translateX(-50%) translateY(${(1 - springIn(frame, fps, 236, SPRING)) * -60}px)`, opacity: springIn(frame, fps, 236, SPRING) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "26px 32px", borderRadius: 24, background: "rgba(31,15,23,0.96)", border: "1px solid rgba(61,220,132,0.4)", boxShadow: "0 40px 90px -40px rgba(0,0,0,0.8)" }}>
            <span style={{ width: 60, height: 60, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(61,220,132,0.18)", fontSize: 30 }}>🎉</span>
            <div><div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 34, color: "#fff" }}>Porosi e re!</div><div style={{ fontFamily: INTER, fontSize: 26, color: "rgba(255,255,255,0.6)" }}>ALL 4,760 · Erion Kola, Tiranë</div></div>
          </div>
        </div>
      </AbsoluteFill>

      {/* ── Scene 4 · CTA ── */}
      <AbsoluteFill style={{ opacity: s4o, alignItems: "center", justifyContent: "center", gap: 44, padding: "0 90px" }}>
        <ShipWhite size={190} style={{ transform: `translateY(${float(frame, 10, 26)}px)`, filter: "drop-shadow(0 30px 70px rgba(127,29,59,0.6))" }} />
        <div style={{ ...H, fontSize: 92 }}>Ti poston. <Shimmer frame={frame}>Vela shet.</Shimmer></div>
        <div style={{ transform: `scale(${ctaPulse})` }}><GlareChip frame={frame} fontSize={46}>Kthe Instagramin në dyqan →</GlareChip></div>
        <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 38, color: "rgba(255,255,255,0.85)", transform: `translateY(${-point}px)` }}>Nise falas sot · vela.al</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
