/**
 * Vela — FinalLaunch posts: feature-spotlight set (16–19) + "arsye" carousel (20–24).
 * Static 1080×1350 feed posts, same brand system as the reels.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BRAND, CLASH, INTER, INK, CreamBase, AuroraDark, ShipColored, ShipWhite, ensureClash } from "../marketing/nextgen/kitv2";

export const POST_FRAMES = 1;
const GRAD = "linear-gradient(115deg,#A31234,#FF2E4D)";
const barTop: React.CSSProperties = { position: "absolute", top: 0, left: 0, right: 0, height: 12, background: "linear-gradient(90deg,#A31234,#FF2E4D,#F59E0B)" };
const eyebrowLight: React.CSSProperties = { display: "inline-block", padding: "12px 28px", borderRadius: 999, background: GRAD, color: "#fff", fontFamily: CLASH, fontWeight: 700, fontSize: 26, letterSpacing: ".16em", textTransform: "uppercase" };
const eyebrowDark: React.CSSProperties = { display: "inline-block", padding: "12px 28px", borderRadius: 999, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.85)", fontFamily: CLASH, fontWeight: 700, fontSize: 26, letterSpacing: ".16em", textTransform: "uppercase" };

/* ── feature-spotlight template ── */
const SpotlightPost: React.FC<{ eyebrow: string; icon: string; title: React.ReactNode; benefit: string }> = ({ eyebrow, icon, title, benefit }) => {
  const frame = useCurrentFrame(); ensureClash();
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <CreamBase frame={frame} />
      <div style={barTop} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-start", padding: "110px 90px 200px", gap: 34 }}>
        <span style={eyebrowLight}>{eyebrow}</span>
        <div style={{ width: 150, height: 150, borderRadius: 38, background: GRAD, display: "grid", placeItems: "center", fontSize: 74, boxShadow: "0 30px 70px -22px rgba(163,18,52,0.5)" }}>{icon}</div>
        <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 104, lineHeight: 1.0, letterSpacing: "-0.02em", color: INK }}>{title}</div>
        <div style={{ fontFamily: INTER, fontSize: 46, lineHeight: 1.36, color: BRAND.muted, maxWidth: 840 }}>{benefit}</div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 90, bottom: 74, display: "flex", alignItems: "center", gap: 18 }}>
        <ShipColored size={68} />
        <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 42, color: BRAND.wine }}>vela.al</span>
      </div>
    </AbsoluteFill>
  );
};
export const FinalLaunch16Search: React.FC = () => <SpotlightPost eyebrow="Veçori" icon="🔎" title={<>Kërkim &amp;<br />filtra</>} benefit="Klientët gjejnë saktësisht çfarë duan — në sekonda, pa scroll pafund." />;
export const FinalLaunch17Shop247: React.FC = () => <SpotlightPost eyebrow="Veçori" icon="🕐" title={<>Shitje<br />24/7</>} benefit="Dyqani yt merr porosi edhe kur ti fle. Zero orar, zero DM." />;
export const FinalLaunch18Currency: React.FC = () => <SpotlightPost eyebrow="Veçori" icon="💱" title={<>Çdo<br />monedhë</>} benefit="Lekë, Euro ose Dollarë — çmime të qarta, pa kalkulator." />;
export const FinalLaunch19Checkout: React.FC = () => <SpotlightPost eyebrow="Veçori" icon="🛒" title={<>Blerje me<br />1 klik</>} benefit="Kartë ose cash. Dërgesa dhe stoku përditësohen automatikisht." />;

/* ── carousel: "3 arsye pse dyqanet po kalojnë te Vela" ── */
export const FinalLaunch20CarCover: React.FC = () => {
  const frame = useCurrentFrame(); ensureClash();
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <AuroraDark frame={frame} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-start", padding: "0 90px", gap: 18 }}>
        <span style={eyebrowDark}>Karusel</span>
        <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 200, lineHeight: 0.92, color: "#fff", letterSpacing: "-0.03em", marginTop: 10 }}>3 <span style={{ backgroundImage: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>arsye</span></div>
        <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 54, color: "rgba(255,255,255,0.72)", lineHeight: 1.12, maxWidth: 820, marginTop: 6 }}>pse dyqanet po kalojnë te Vela.</div>
      </AbsoluteFill>
      <div style={{ position: "absolute", right: 90, bottom: 74, fontFamily: CLASH, fontWeight: 700, fontSize: 40, color: "#fff", display: "flex", alignItems: "center", gap: 14 }}>Rrëshqit <span style={{ fontSize: 48 }}>→</span></div>
    </AbsoluteFill>
  );
};
const ReasonSlide: React.FC<{ n: string; icon: string; t: string; d: string }> = ({ n, icon, t, d }) => {
  const frame = useCurrentFrame(); ensureClash();
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <CreamBase frame={frame} />
      <div style={barTop} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-start", padding: "0 90px", gap: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <span style={{ width: 120, height: 120, borderRadius: 32, background: GRAD, display: "grid", placeItems: "center", fontSize: 60, boxShadow: "0 26px 60px -20px rgba(163,18,52,0.5)" }}>{icon}</span>
          <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 150, backgroundImage: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", lineHeight: 1 }}>{n}</span>
        </div>
        <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 100, lineHeight: 1.0, letterSpacing: "-0.02em", color: INK }}>{t}</div>
        <div style={{ fontFamily: INTER, fontSize: 48, lineHeight: 1.35, color: BRAND.muted, maxWidth: 860 }}>{d}</div>
      </AbsoluteFill>
      <div style={{ position: "absolute", right: 90, bottom: 74, fontFamily: CLASH, fontWeight: 700, fontSize: 40, color: BRAND.wine }}>→</div>
    </AbsoluteFill>
  );
};
export const FinalLaunch21CarR1: React.FC = () => <ReasonSlide n="01" icon="💬" t="Zero DM" d="Çmimi rri te produkti. Klientët shohin, klikojnë dhe blejnë vetë — pa asnjë mesazh." />;
export const FinalLaunch22CarR2: React.FC = () => <ReasonSlide n="02" icon="🕐" t="Shitje 24/7" d="Dyqani yt merr porosi edhe kur ti fle. Ti fle — dyqani shet." />;
export const FinalLaunch23CarR3: React.FC = () => <ReasonSlide n="03" icon="⚡" t="Gjithçka automatike" d="Pagesa me kartë ose cash, dërgesa dhe stoku — të gjitha automatikisht." />;
export const FinalLaunch24CarCta: React.FC = () => {
  const frame = useCurrentFrame(); ensureClash();
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <AuroraDark frame={frame} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 90px", gap: 40 }}>
        <ShipWhite size={170} style={{ filter: "drop-shadow(0 30px 70px rgba(127,29,59,0.55))" }} />
        <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 132, lineHeight: 1.0, letterSpacing: "-0.03em", color: "#fff", textAlign: "center" }}>Ngri <span style={{ backgroundImage: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>velat.</span></div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
