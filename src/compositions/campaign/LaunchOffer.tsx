/**
 * Vela launch campaign — Asset #6 (see content-plan.md).
 * "Nise sot falas" (lead-gen offer) · LIGHT · 1:1 (1080×1080) · still.
 * Direct response + risk reversal: opening-offer badge, benefit checklist,
 * strong CTA. Cream canvas, inner liquid-glass card, one gradient keyword.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Check } from "lucide-react";
import { BRAND, CLASH, INTER, INK, CreamBase, Shimmer, LiquidGlass, ShipColored, ensureClash } from "../marketing/nextgen/kitv2";

const GRAD = "linear-gradient(115deg,#7F1D3B,#A31234 40%,#FF2E4D 75%,#F59E0B 115%)";
export const OFFER_W = 1080, OFFER_H = 1080, OFFER_FRAMES = 90;

const BENEFITS = [
  "Krijo dyqanin në më pak se 3 minuta",
  "Pa kartë krediti për regjistrim",
  "Prano porosi direkt sot",
  "Mbështetje në shqip, për çdo moshë",
];

export const LaunchOffer: React.FC = () => {
  const frame = useCurrentFrame();
  ensureClash();
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <CreamBase frame={frame} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 14, background: GRAD, zIndex: 3 }} />
      <AbsoluteFill style={{ padding: 64, zIndex: 2 }}>
        <LiquidGlass dark={false} radius={44} style={{ flex: 1, padding: "52px 58px" }}>
         <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* opening-offer badge */}
          <span style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 12, padding: "13px 26px", borderRadius: 999, background: "rgba(163,18,52,0.1)", color: BRAND.wine, fontFamily: CLASH, fontWeight: 600, fontSize: 25, letterSpacing: ".14em", textTransform: "uppercase" }}>
            <span style={{ width: 14, height: 14, borderRadius: 999, background: GRAD }} /> Oferta e hapjes
          </span>

          <h1 style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 60, lineHeight: 1.05, letterSpacing: "-0.02em", color: INK, margin: "20px 0 0" }}>
            Fillo sot 100% <Shimmer frame={frame}>FALAS.</Shimmer><br />Kthe ndjekësit në blerës.
          </h1>

          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 32 }}>
            {BENEFITS.map((b) => (
              <div key={b} style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <span style={{ width: 48, height: 48, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(163,18,52,0.1)", border: "1px solid rgba(163,18,52,0.2)", flexShrink: 0 }}><Check size={26} color={BRAND.wine} strokeWidth={2.6} /></span>
                <span style={{ fontFamily: INTER, fontSize: 33, fontWeight: 500, color: INK }}>{b}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginTop: "auto" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 14, padding: "26px 56px", borderRadius: 999, background: GRAD, color: "#fff", fontFamily: CLASH, fontWeight: 600, fontSize: 42, boxShadow: "0 28px 60px -24px rgba(163,18,52,0.6)" }}>Krijo dyqanin tënd tani →</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 22, fontFamily: CLASH, fontWeight: 600, fontSize: 27, color: BRAND.muted }}>
            <ShipColored size={36} /> Nuk kërkohet kartë · provoje falas · vela.al
          </div>
         </div>
        </LiquidGlass>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
