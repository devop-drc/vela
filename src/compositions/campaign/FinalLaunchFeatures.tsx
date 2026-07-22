/**
 * Vela — FinalLaunch feature-deep reels:
 *   26 AutoProduct · a post becomes a full product (the core magic)
 *   27 Storefront  · your own branded shop, customised without code
 */
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { springIn, float } from "../../lib/motion";
import { BRAND, CLASH, INTER, INK, AuroraDark, CreamBase, GlareChip, ShipColored, FloatShot, shot, glassLight, KineticWords, ensureClash } from "../marketing/nextgen/kitv2";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SPRING = { damping: 14, mass: 1.0, stiffness: 140 };
const GRAD = "linear-gradient(115deg,#A31234,#FF2E4D)";
const H = (s: number, c: string): React.CSSProperties => ({ fontFamily: CLASH, fontWeight: 700, fontSize: s, letterSpacing: "-0.02em", color: c, textAlign: "center" });
const eyebrowDark: React.CSSProperties = { display: "inline-block", padding: "12px 28px", borderRadius: 999, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.85)", fontFamily: CLASH, fontWeight: 700, fontSize: 26, letterSpacing: ".16em", textTransform: "uppercase" };

/* ══════════════════ 26 · Postimi → Produkt (auto-product · reel) ══════════════════ */
const FIELDS = [
  { k: "Emri", v: "Atlete Vrapi Air", d: 72 },
  { k: "Çmimi", v: "4,760 L", d: 92 },
  { k: "Kategoria", v: "Këpucë", d: 112 },
  { k: "Në stok", v: "12 copë", d: 132 },
];
export const FEAT_AUTO_FRAMES = 11 * 30; // 330
const AUTO_CUT = 200;
export const FinalLaunch26AutoProduct: React.FC = () => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); ensureClash();
  const b = (d: number) => springIn(frame, fps, AUTO_CUT + d, SPRING);
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      {frame < AUTO_CUT && (
        <AbsoluteFill>
          <AuroraDark frame={frame} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30, padding: "0 70px" }}>
            <span style={eyebrowDark}>Magjia e Vela-s</span>
            <KineticWords text="1 postim = 1 produkt." frame={frame} fps={fps} delay={6} highlight="produkt" style={{ ...H(66, "#fff") }} />
            {/* IG post */}
            <div style={{ width: 460, borderRadius: 26, overflow: "hidden", background: "#150d12", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 50px 110px -46px rgba(0,0,0,0.8)", transform: `translateY(${float(frame, 8, 10)}px)` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px" }}>
                <span style={{ width: 44, height: 44, borderRadius: 999, background: GRAD }} />
                <span style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontWeight: 600, fontSize: 26, color: "#fff" }}>vela_eshop</span>
              </div>
              <Img src={staticFile("campaign/sneaker.jpg")} style={{ width: "100%", height: 300, objectFit: "cover", display: "block" }} />
              <div style={{ padding: "16px 20px", fontFamily: INTER, fontSize: 26, color: "rgba(255,255,255,0.82)" }}>Atlete të reja 🔥 çmimi në DM</div>
            </div>
            {/* extracted fields */}
            <div style={{ width: 620, display: "flex", flexDirection: "column", gap: 10 }}>
              {FIELDS.map(({ k, v, d }) => {
                const a = springIn(frame, fps, d, SPRING);
                return (
                  <div key={k} style={{ opacity: a, transform: `translateX(${(1 - a) * 40}px)`, display: "flex", alignItems: "center", gap: 14, ...glassLight, borderRadius: 16, padding: "16px 24px" }}>
                    <span style={{ position: "relative", color: "#10893E", fontWeight: 900, fontSize: 26 }}>✓</span>
                    <span style={{ position: "relative", fontFamily: INTER, fontSize: 28, color: BRAND.muted }}>{k}</span>
                    <span style={{ position: "relative", marginLeft: "auto", fontFamily: CLASH, fontWeight: 600, fontSize: 30, color: INK }}>{v}</span>
                  </div>
                );
              })}
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {frame >= AUTO_CUT && (
        <AbsoluteFill>
          <CreamBase frame={frame} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40, padding: "120px 76px" }}>
            <KineticWords text="Sistemi e krijon produktin — vetë." frame={frame} fps={fps} delay={AUTO_CUT - 4} highlight="vetë" style={{ ...H(58, INK), maxWidth: 920 }} />
            <div style={{ width: 480, borderRadius: 30, overflow: "hidden", ...glassLight, opacity: b(22), transform: `translateY(${(1 - b(22)) * 50}px)` }}>
              <Img src={staticFile("campaign/sneaker.jpg")} style={{ width: "100%", height: 320, objectFit: "cover", display: "block" }} />
              <div style={{ position: "relative", padding: "24px 30px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 34, color: INK }}>Atlete Vrapi Air</span>
                <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 38, color: BRAND.wine }}>4,760 L</span>
              </div>
            </div>
            <div style={{ opacity: b(46), transform: `translateY(${(1 - b(46)) * 30}px)` }}><GlareChip frame={frame} fontSize={44}>Provo falas → vela.al</GlareChip></div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/* ══════════════════ 27 · Dyqani yt, si ti (storefront · reel) ══════════════════ */
const CUSTOM = [["🎨", "Ngjyrat"], ["🖼️", "Logo"], ["🌗", "Tema"], ["✍️", "Fontet"]];
export const FEAT_SHOP_FRAMES = 11 * 30; // 330
const SHOP_CUT = 190;
export const FinalLaunch27Storefront: React.FC = () => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); ensureClash();
  const b = (d: number) => springIn(frame, fps, SHOP_CUT + d, SPRING);
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      {frame < SHOP_CUT && (
        <AbsoluteFill>
          <AuroraDark frame={frame} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 44, padding: "0 70px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <span style={eyebrowDark}>Dyqani yt</span>
              <KineticWords text="Dyqani yt. Stili yt." frame={frame} fps={fps} delay={6} highlight="Stili" style={{ ...H(74, "#fff") }} />
            </div>
            <FloatShot src={shot("07-storefront-mobile.png")} frame={frame} width={430} kind="phone" url="vela.al/dyqani" />
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {frame >= SHOP_CUT && (
        <AbsoluteFill>
          <CreamBase frame={frame} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 38, padding: "120px 76px" }}>
            <KineticWords text="Personalizoje — pa kod." frame={frame} fps={fps} delay={SHOP_CUT - 4} highlight="kod" style={{ ...H(74, INK), maxWidth: 900 }} />
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 18, maxWidth: 820 }}>
              {CUSTOM.map(([ic, t], i) => {
                const a = b(20 + i * 12);
                return (
                  <div key={t} style={{ opacity: a, transform: `translateY(${(1 - a) * 40}px)`, display: "flex", alignItems: "center", gap: 14, ...glassLight, borderRadius: 999, padding: "20px 34px" }}>
                    <span style={{ position: "relative", fontSize: 34 }}>{ic}</span>
                    <span style={{ position: "relative", fontFamily: CLASH, fontWeight: 600, fontSize: 36, color: INK }}>{t}</span>
                  </div>
                );
              })}
            </div>
            <FloatShot src={shot("04-storefront-studio.png")} frame={frame} width={760} kind="browser" url="vela.al/storefront-studio" />
            <div style={{ opacity: b(60), transform: `translateY(${(1 - b(60)) * 30}px)` }}><GlareChip frame={frame} fontSize={44}>Krijoje tëndin → vela.al</GlareChip></div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
