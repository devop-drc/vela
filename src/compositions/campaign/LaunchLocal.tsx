/**
 * Vela launch campaign — Asset #4 (see content-plan.md).
 * "E ndërtuar për tregun shqiptar" · DARK · 4:5 (1080×1350) · still.
 * Hyper-localization: card in shumë monedha (RaiAccept) · COD · local couriers ·
 * Albanian-first. Night aurora, warm dark-glass feature cards, gold-stroke icons.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CreditCard, Banknote, Truck, Languages } from "lucide-react";
import { BRAND, CLASH, INTER, AuroraDark, Shimmer, ShipWhite, ensureClash } from "../marketing/nextgen/kitv2";

const GRAD = "linear-gradient(115deg,#7F1D3B,#A31234 40%,#FF2E4D 75%,#F59E0B 115%)";
export const LOCAL_W = 1080, LOCAL_H = 1350, LOCAL_FRAMES = 90;

const FEATURES = [
  { Icon: CreditCard, title: "Kartë · RaiAccept", text: "Pranon kartë në shumë monedha — Lekë, Euro, Dollarë." },
  { Icon: Banknote, title: "Para në dorë (COD)", text: "Mbështetje e plotë për pagesën në dorëzim." },
  { Icon: Truck, title: "Postat lokale", text: "Të dhënat e dërgesës gjenerohen vetë për çdo qytet." },
  { Icon: Languages, title: "Shqip e para", text: "Platforma dhe dyqani flasin shqip të pastër, për çdo moshë." },
];

export const LaunchLocal: React.FC = () => {
  const frame = useCurrentFrame();
  ensureClash();
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <AuroraDark frame={frame} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 14, background: GRAD, zIndex: 3 }} />
      <AbsoluteFill style={{ padding: "92px 84px 86px", zIndex: 2, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 14, fontFamily: CLASH, fontWeight: 600, fontSize: 25, letterSpacing: ".16em", textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>
          <span style={{ width: 16, height: 16, borderRadius: 999, background: GRAD }} /> Native për Shqipërinë &amp; rajonin
        </div>
        <h1 style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 74, lineHeight: 1.03, letterSpacing: "-0.02em", color: "#fff", margin: "22px 0 0" }}>
          E ndërtuar posaçërisht<br />për tregun <Shimmer frame={frame}>shqiptar.</Shimmer>
        </h1>

        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, margin: "44px 0" }}>
          {FEATURES.map(({ Icon, title, text }) => (
            <div key={title} style={{ background: "#1F0F17", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 28, padding: "40px 36px", display: "flex", flexDirection: "column", position: "relative", boxShadow: "0 30px 70px -34px rgba(0,0,0,0.7)" }}>
              <span style={{ position: "absolute", top: 0, left: 34, right: 34, height: 2, borderRadius: 9, background: "linear-gradient(90deg,transparent,#FF2E4D,#FACC15,transparent)", opacity: 0.6 }} />
              <span style={{ width: 76, height: 76, borderRadius: 20, display: "grid", placeItems: "center", background: "rgba(250,204,21,0.14)", marginBottom: 24 }}><Icon size={40} color={BRAND.yellow} strokeWidth={1.8} /></span>
              <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 34, color: "#fff", marginBottom: 12 }}>{title}</div>
              <div style={{ fontFamily: INTER, fontSize: 25, lineHeight: 1.45, color: "rgba(255,255,255,0.62)" }}>{text}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 14, padding: "26px 52px", borderRadius: 999, background: GRAD, color: "#fff", fontFamily: CLASH, fontWeight: 600, fontSize: 40, boxShadow: "0 26px 56px -24px rgba(163,18,52,0.6)" }}>Provo platformën falas →</span>
          <span style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: CLASH, fontWeight: 600, fontSize: 30, color: "rgba(255,255,255,0.85)" }}><ShipWhite size={44} /> vela.al</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
