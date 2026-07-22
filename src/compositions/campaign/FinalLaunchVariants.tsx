/**
 * Vela — FinalLaunch format variants:
 *   Reels covers (1080×1920, content in the 1:1-safe centre for the feed grid)
 *   1:1 square posts (1080×1080) for feature spotlights + manifesto
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { BRAND, CLASH, INTER, INK, AuroraDark, CreamBase, ShipWhite, ShipColored, ensureClash } from "../marketing/nextgen/kitv2";

export const VAR_FRAMES = 1;
const GRAD = "linear-gradient(115deg,#A31234,#FF2E4D)";
const barTop: React.CSSProperties = { position: "absolute", top: 0, left: 0, right: 0, height: 12, background: "linear-gradient(90deg,#A31234,#FF2E4D,#F59E0B)" };
const Hi: React.FC<{ text: string; hi?: string }> = ({ text, hi }) => {
  if (!hi || !text.includes(hi)) return <>{text}</>;
  const [a, b] = text.split(hi);
  return <>{a}<span style={{ backgroundImage: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{hi}</span>{b}</>;
};

/* ── Reels cover template (centred → survives the 1:1 grid crop) ── */
const ReelCover: React.FC<{ tag: string; title: string; hi?: string }> = ({ tag, title, hi }) => {
  const frame = useCurrentFrame(); ensureClash();
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <AuroraDark frame={frame} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30, padding: "0 90px" }}>
        <ShipWhite size={104} style={{ filter: "drop-shadow(0 24px 54px rgba(127,29,59,0.5))" }} />
        <span style={{ display: "inline-block", padding: "10px 26px", borderRadius: 999, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.85)", fontFamily: CLASH, fontWeight: 700, fontSize: 26, letterSpacing: ".18em", textTransform: "uppercase" }}>{tag}</span>
        <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 100, lineHeight: 1.02, letterSpacing: "-0.02em", color: "#fff", textAlign: "center", maxWidth: 900 }}><Hi text={title} hi={hi} /></div>
        <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 38, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>vela.al</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
export const CoverFL01: React.FC = () => <ReelCover tag="Meme" title="Çmimi në DM 💀" hi="DM" />;
export const CoverFL02: React.FC = () => <ReelCover tag="Meme" title="Sa e le? 🤝" hi="le?" />;
export const CoverFL03: React.FC = () => <ReelCover tag="Meme" title="147 DM pa përgjigje" hi="147" />;
export const CoverFL04: React.FC = () => <ReelCover tag="Meme" title="Të vjetra a të reja?" hi="reja?" />;
export const CoverFL05: React.FC = () => <ReelCover tag="Klienti" title="45 min scroll, 0 blerje" hi="0 blerje" />;
export const CoverFL06: React.FC = () => <ReelCover tag="Klienti" title="5 pyetje për 1 blerje" hi="5" />;
export const CoverFL10: React.FC = () => <ReelCover tag="Udhëzues" title="Vela në 3 hapa" hi="3 hapa" />;
export const CoverFL12: React.FC = () => <ReelCover tag="Brand" title={'Pse "Vela"?'} hi="Vela" />;
export const CoverFL13: React.FC = () => <ReelCover tag="Brand" title="Ndërtohet me ju" hi="ju" />;
export const CoverFL14: React.FC = () => <ReelCover tag="Statistika" title="8 nga 10 blejnë online" hi="8 nga 10" />;
export const CoverFL15: React.FC = () => <ReelCover tag="Statistika" title="50h/muaj në DM?" hi="50h" />;
export const CoverFL25: React.FC = () => <ReelCover tag="Demo" title="Vela nga brenda" hi="brenda" />;
export const CoverFL26: React.FC = () => <ReelCover tag="Veçori" title="Postimi → Produkt" hi="Produkt" />;
export const CoverFL27: React.FC = () => <ReelCover tag="Veçori" title="Dyqani yt, si ti" hi="si ti" />;

/* ── 1:1 square feature spotlights (1080×1080) ── */
const SquareSpotlight: React.FC<{ icon: string; title: React.ReactNode; benefit: string }> = ({ icon, title, benefit }) => {
  const frame = useCurrentFrame(); ensureClash();
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <CreamBase frame={frame} />
      <div style={barTop} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-start", padding: "80px 80px 150px", gap: 26 }}>
        <div style={{ width: 128, height: 128, borderRadius: 34, background: GRAD, display: "grid", placeItems: "center", fontSize: 64, boxShadow: "0 28px 64px -20px rgba(163,18,52,0.5)" }}>{icon}</div>
        <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 88, lineHeight: 1.0, letterSpacing: "-0.02em", color: INK }}>{title}</div>
        <div style={{ fontFamily: INTER, fontSize: 40, lineHeight: 1.34, color: BRAND.muted, maxWidth: 840 }}>{benefit}</div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 80, bottom: 62, display: "flex", alignItems: "center", gap: 16 }}>
        <ShipColored size={58} /><span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 38, color: BRAND.wine }}>vela.al</span>
      </div>
    </AbsoluteFill>
  );
};
export const SqSearch: React.FC = () => <SquareSpotlight icon="🔎" title={<>Kërkim &amp; filtra</>} benefit="Klientët gjejnë çfarë duan — në sekonda, pa scroll pafund." />;
export const SqShop247: React.FC = () => <SquareSpotlight icon="🕐" title={<>Shitje 24/7</>} benefit="Dyqani yt merr porosi edhe kur ti fle. Zero orar, zero DM." />;
export const SqCurrency: React.FC = () => <SquareSpotlight icon="💱" title={<>Çdo monedhë</>} benefit="Lekë, Euro ose Dollarë — çmime të qarta, pa kalkulator." />;
export const SqCheckout: React.FC = () => <SquareSpotlight icon="🛒" title={<>Blerje me 1 klik</>} benefit="Kartë ose cash. Dërgesa dhe stoku përditësohen automatikisht." />;

/* ── 1:1 square manifesto ── */
export const SqManifesto: React.FC = () => {
  const frame = useCurrentFrame(); ensureClash();
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <AuroraDark frame={frame} />
      <AbsoluteFill style={{ alignItems: "flex-start", justifyContent: "center", padding: "0 80px", paddingBottom: 190, gap: 6 }}>
        <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 48, color: "rgba(255,255,255,0.58)", lineHeight: 1.08 }}>Ti nuk je qendër<br />mesazhesh.</div>
        <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 132, letterSpacing: "-0.03em", lineHeight: 0.98, color: "#fff", marginTop: 10 }}>Ti je <span style={{ backgroundImage: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>biznes.</span></div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, bottom: 0, width: 1080, background: "#F5F0E6", padding: "40px 80px", display: "flex", alignItems: "center", gap: 22 }}>
        <ShipColored size={74} />
        <div>
          <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 42, color: INK, lineHeight: 1.05 }}>Vela e kthen Instagramin në dyqan.</div>
          <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 30, color: BRAND.wine, marginTop: 4 }}>Shitje pa DM · vela.al</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
