/**
 * Vela launch campaign — Asset #2 (see content-plan.md).
 * "Si funksionon në 3 hapa" · LIGHT · 4:5 (1080×1350) · 4-slide carousel.
 * Cover → Hapi 01 (lidh) → Hapi 02 (produktet) → Hapi 03 (porositë + CTA).
 * Cream editorial; warm-glass cards (24px); gradient-dot eyebrow; one gradient keyword.
 */
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { Instagram, Check, CreditCard, Banknote, Zap } from "lucide-react";
import { BRAND, CLASH, INTER, CREAM, INK, CreamBase, Shimmer, ShipColored, glassLight, ensureClash } from "../marketing/nextgen/kitv2";

const GRAD = "linear-gradient(115deg,#7F1D3B,#A31234 40%,#FF2E4D 75%,#F59E0B 115%)";
const CARD: React.CSSProperties = { ...glassLight, borderRadius: 30 };
const useF = () => { ensureClash(); return useCurrentFrame(); };

const Frame: React.FC<{ children: React.ReactNode; frame: number }> = ({ children, frame }) => (
  <AbsoluteFill style={{ fontFamily: INTER }}>
    <CreamBase frame={frame} />
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 14, background: "linear-gradient(90deg,#A31234,#FF2E4D,#F59E0B)" }} />
    <AbsoluteFill style={{ padding: "96px 84px 90px", zIndex: 2 }}>{children}</AbsoluteFill>
  </AbsoluteFill>
);
const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 14, fontFamily: CLASH, fontWeight: 600, fontSize: 26, letterSpacing: ".18em", textTransform: "uppercase", color: BRAND.wine }}>
    <span style={{ width: 16, height: 16, borderRadius: 999, background: GRAD }} />{children}
  </div>
);
const Footer = () => (
  <div style={{ position: "absolute", left: 84, right: 84, bottom: 54, display: "flex", justifyContent: "space-between", alignItems: "center", fontFamily: CLASH, fontWeight: 600, fontSize: 24, color: BRAND.muted }}>
    <span style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ width: 11, height: 11, borderRadius: 999, background: GRAD }} /> vela.al</span>
    <span>Kthe Instagramin në dyqan online</span>
  </div>
);
const H: (size: number) => React.CSSProperties = (size) => ({ fontFamily: CLASH, fontWeight: 700, fontSize: size, lineHeight: 1.04, letterSpacing: "-0.02em", color: INK, margin: "22px 0 0" });

export const STEP_W = 1080, STEP_H = 1350, STEP_FRAMES = 90;

/* ── Slide 1 · Cover ── */
export const LaunchStepsCover: React.FC = () => {
  const frame = useF();
  return (
    <Frame frame={frame}>
      <Eyebrow>Udhëzuesi i shpejtë</Eyebrow>
      <h1 style={H(66)}>Kthe Instagramin<br />në dyqan në <Shimmer frame={frame}>3 hapa</Shimmer><br />të thjeshtë.</h1>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 30 }}>
        <div style={{ ...CARD, display: "flex", alignItems: "center", gap: 30, padding: "44px 56px" }}>
          <span style={{ width: 116, height: 116, borderRadius: 26, background: GRAD, display: "grid", placeItems: "center", color: "#fff" }}><Instagram size={58} strokeWidth={1.8} /></span>
          <div style={{ position: "relative", width: 150, height: 4, background: "repeating-linear-gradient(90deg,#F59E0B 0 16px,transparent 16px 30px)", borderRadius: 9 }} />
          <span style={{ width: 130, height: 130, borderRadius: 30, background: CREAM, border: "1px solid #EDE4E1", display: "grid", placeItems: "center" }}><ShipColored size={86} /></span>
        </div>
      </div>
      <p style={{ fontFamily: INTER, fontSize: 32, color: BRAND.muted, marginBottom: 40 }}>Pa programues. Pa njohuri teknike.</p>
      <Footer />
    </Frame>
  );
};

/* ── Slide 2 · Hapi 01 ── */
export const LaunchSteps1: React.FC = () => {
  const frame = useF();
  return (
    <Frame frame={frame}>
      <Eyebrow>Hapi 01</Eyebrow>
      <h1 style={H(64)}>Lidh profilin e <Shimmer frame={frame}>Instagramit.</Shimmer></h1>
      <div style={{ flex: 1, display: "flex", alignItems: "center", marginTop: 34 }}>
        <div style={{ ...CARD, width: "100%", padding: "56px 56px 50px" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 16, padding: "26px 52px", borderRadius: 999, background: GRAD, color: "#fff", fontFamily: CLASH, fontWeight: 600, fontSize: 40, boxShadow: "0 24px 50px -22px rgba(163,18,52,.6)" }}>
              <Instagram size={40} strokeWidth={2} /> Lidh me Instagram
            </span>
          </div>
          <p style={{ fontFamily: INTER, fontSize: 30, lineHeight: 1.5, color: BRAND.muted, textAlign: "center", marginTop: 44 }}>Vela lidhet me faqen tënde të biznesit në pak sekonda — pa asnjë rresht kod.</p>
          <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 28px", borderRadius: 999, background: "rgba(163,18,52,.08)", color: BRAND.wine, fontFamily: CLASH, fontWeight: 600, fontSize: 26 }}><Zap size={22} /> Zgjat 30 sekonda</span>
          </div>
        </div>
      </div>
      <Footer />
    </Frame>
  );
};

/* ── Slide 3 · Hapi 02 ── */
const MiniProduct: React.FC<{ img: string; name: string; price: string }> = ({ img, name, price }) => (
  <div style={{ ...CARD, flex: 1, overflow: "hidden", borderRadius: 24 }}>
    <Img src={img} style={{ width: "100%", height: 230, objectFit: "cover" }} />
    <div style={{ padding: "18px 20px 22px" }}>
      <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 26, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
      <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 30, color: BRAND.wine, marginTop: 4 }}>{price}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>{["S", "M", "L"].map((s) => <span key={s} style={{ padding: "6px 14px", borderRadius: 9, border: "1px solid #EDE4E1", color: BRAND.muted, fontFamily: CLASH, fontWeight: 600, fontSize: 20 }}>{s}</span>)}</div>
    </div>
  </div>
);
export const LaunchSteps2: React.FC = () => {
  const frame = useF();
  return (
    <Frame frame={frame}>
      <Eyebrow>Hapi 02</Eyebrow>
      <h1 style={H(64)}>Sistemi krijon <Shimmer frame={frame}>produktet.</Shimmer></h1>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", marginTop: 30, gap: 44 }}>
        <div style={{ display: "flex", gap: 22 }}>
          <MiniProduct img={staticFile("campaign/sneaker.jpg")} name="Atlete Vrapi Air" price="ALL 4,760" />
          <MiniProduct img={staticFile("campaign/dress.jpg")} name="Fustan veror" price="ALL 3,500" />
          <MiniProduct img={staticFile("campaign/bag.jpg")} name="Çantë lëkure" price="ALL 6,900" />
        </div>
        <p style={{ fontFamily: INTER, fontSize: 30, lineHeight: 1.5, color: BRAND.muted, textAlign: "center", maxWidth: 820, margin: "0 auto" }}>Sistemi lexon vetë fotot, çmimet dhe përshkrimet nga postimet që ke publikuar tashmë.</p>
      </div>
      <Footer />
    </Frame>
  );
};

/* ── Slide 4 · Hapi 03 (CTA) ── */
export const LaunchSteps3: React.FC = () => {
  const frame = useF();
  return (
    <Frame frame={frame}>
      <Eyebrow>Hapi 03</Eyebrow>
      <h1 style={H(62)}>Prano pagesa &amp; porosi <Shimmer frame={frame}>automatike.</Shimmer></h1>
      <div style={{ flex: 1, display: "flex", alignItems: "center", marginTop: 30 }}>
        <div style={{ ...CARD, width: "100%", padding: "48px 52px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 18 }}>
            <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 96, color: INK }}>14</span>
            <span style={{ fontFamily: INTER, fontSize: 32, color: BRAND.muted }}>porosi aktive</span>
          </div>
          <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 64, color: BRAND.wine, marginTop: 6 }}>ALL 87,400</div>
          <div style={{ display: "flex", gap: 16, marginTop: 26 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "16px 26px", borderRadius: 16, background: CREAM, border: "1px solid #EDE4E1", fontFamily: CLASH, fontWeight: 600, fontSize: 26, color: INK }}><CreditCard size={26} color={BRAND.wine} /> RaiAccept</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "16px 26px", borderRadius: 16, background: CREAM, border: "1px solid #EDE4E1", fontFamily: CLASH, fontWeight: 600, fontSize: 26, color: INK }}><Banknote size={26} color="#10B981" /> Cash on delivery</span>
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 14, padding: "28px 60px", borderRadius: 999, background: GRAD, color: "#fff", fontFamily: CLASH, fontWeight: 600, fontSize: 44, boxShadow: "0 26px 56px -24px rgba(163,18,52,.6)" }}>Provo Vela falas →</span>
      </div>
      <Footer />
    </Frame>
  );
};
