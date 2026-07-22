/**
 * Next-gen static / motion grid posts (9:16 · 1080x1920 · 30fps · 5s loop).
 * Settled at frame 0 (perfect grid covers) with ambient motion only.
 *   C6 · Matrix     "Para vs. Pas"     (light)
 *   C7 · StatCard   "80% kohë e kursyer" (dark)
 *   C8 · TrustProof "Garancitë"        (dark)
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { float, pulse } from "../../../lib/motion";
import { BRAND, CLASH, INTER, gradText, Blobs, BrandMesh, ShipColored, ensureClash } from "./kit";

export const STILL_FRAMES = 5 * 30; // 150

/* ═══════════ C6 · Matrix (light) ═══════════ */
const MATRIX = [
  ["Mesazhe pa fund", "Checkout automatik"],
  ["Katalogu në Excel", "Gjithçka në një panel"],
  ["Screenshot çmimesh", "Produkt me një klik"],
  ["“S’pranoj kartë”", "Pagesa në Lekë"],
];

export const C6Matrix: React.FC = () => {
  const frame = useCurrentFrame();
  ensureClash();
  return (
    <AbsoluteFill style={{ background: BRAND.paper, fontFamily: INTER, padding: "150px 84px", justifyContent: "center" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 18, background: "linear-gradient(90deg,#A31234,#FF2E4D,#F59E0B)" }} />
      <p style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 30, letterSpacing: "0.24em", textTransform: "uppercase", color: BRAND.primary, margin: "0 0 20px" }}>Efikasitet</p>
      <h1 style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 96, letterSpacing: "-0.02em", color: BRAND.ink, margin: "0 0 56px" }}>
        Para vs. <span style={gradText}>Pas</span>
      </h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        {MATRIX.map(([para, pas], i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "stretch" }}>
            <div style={{ padding: "30px 34px", borderRadius: 26, background: "#F1EBEE", color: BRAND.muted, fontSize: 38, fontWeight: 500, textDecoration: "line-through", textDecorationColor: "rgba(163,18,52,0.4)" }}>{para}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "30px 34px", borderRadius: 26, background: "linear-gradient(115deg,#A31234,#FF2E4D)", color: "#fff", fontSize: 38, fontWeight: 600 }}>
              <span style={{ color: BRAND.yellow, fontSize: 44, transform: `scale(${0.9 + (pulse(frame + i * 8, 26) - 0.85) * 0.3})` }}>✓</span>
              {pas}
            </div>
          </div>
        ))}
      </div>
      <p style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 34, color: BRAND.muted, marginTop: 56 }}>Vela · dyqan online pa kod · <span style={{ color: BRAND.primary }}>vela.al</span></p>
    </AbsoluteFill>
  );
};

/* ═══════════ C7 · StatCard (dark) ═══════════ */
const STATS = ["⚡ Porosi automatike", "🛍️ Pagesa në Lekë", "📦 Stok vetiu"];

export const C7StatCard: React.FC = () => {
  const frame = useCurrentFrame();
  ensureClash();
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <BrandMesh frame={frame} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 10, padding: "0 80px" }}>
        <p style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 30, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(255,255,255,0.75)", margin: 0 }}>Kohë e kursyer</p>
        <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 440, lineHeight: 1, color: "#fff", transform: `scale(${0.98 + (pulse(frame, 26) - 0.85) * 0.16})`, textShadow: "0 30px 80px rgba(0,0,0,0.4)" }}>80%</div>
        <h2 style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 60, color: "#fff", margin: "0 0 40px", textAlign: "center" }}>më pak punë çdo ditë</h2>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", justifyContent: "center" }}>
          {STATS.map((s, i) => (
            <div key={s} style={{ padding: "20px 36px", borderRadius: 999, background: "rgba(15,12,19,0.4)", border: "2px solid rgba(255,255,255,0.35)", color: "#fff", fontFamily: CLASH, fontWeight: 600, fontSize: 34, transform: `translateY(${float(frame + i * 12, 5, 30)}px)` }}>{s}</div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ═══════════ C8 · TrustProof (dark) ═══════════ */
const GUARANTEES = [
  "Dyqan online pa kod",
  "Pagesa në Lekë (RaiAccept)",
  "Porositë në një panel",
  "Stoku rezervohet vetë",
  "Vitrina jote nga Storefront Studio",
  "Provë falas, pa kartë",
];

export const C8TrustProof: React.FC = () => {
  const frame = useCurrentFrame();
  ensureClash();
  return (
    <AbsoluteFill style={{ background: BRAND.dark, fontFamily: INTER, padding: "160px 90px", justifyContent: "center" }}>
      <Blobs frame={frame} opacity={0.6} />
      <div style={{ position: "relative" }}>
        <h1 style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 84, letterSpacing: "-0.02em", color: "#fff", margin: "0 0 56px" }}>
          Çfarë merr <span style={gradText}>me Vela</span>
        </h1>
        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          {GUARANTEES.map((g, i) => (
            <div key={g} style={{ display: "flex", alignItems: "center", gap: 26 }}>
              <span style={{ display: "grid", placeItems: "center", width: 60, height: 60, borderRadius: 18, background: "rgba(250,204,21,0.14)", color: BRAND.yellow, fontSize: 40, transform: `scale(${0.92 + (pulse(frame + i * 10, 24) - 0.85) * 0.3})` }}>✓</span>
              <span style={{ fontFamily: INTER, fontSize: 46, fontWeight: 500, color: "rgba(255,255,255,0.92)" }}>{g}</span>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 60 }}>
          <ShipColored size={70} style={{ transform: `translateY(${float(frame, 5, 30)}px)` }} />
          <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 30, letterSpacing: "0.3em", color: "rgba(255,255,255,0.6)" }}>VELA · VELA.AL</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
