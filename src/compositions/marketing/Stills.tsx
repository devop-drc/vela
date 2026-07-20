/**
 * STILL posters (rendered with `remotion still --frame=25`) — hook-first,
 * tools-focused typographic posters on the night canvas.
 *
 *  1080×1920 (reel/story stills):
 *    StillPostToProduct  the core process as a frozen frame: IG post card →
 *                        gradient arrow → product card
 *    StillFiveMin        giant "5" + the three setup steps
 *    StillBoom           the rising market line + "Ti?"
 *  1080×1350 (feed stills):
 *    StillOrders         the cha-ching stack, frozen
 *    StillPanel          the panel tiles, frozen
 *    GallerySlide1/2/3   carousel: boom hook → how Vela works → CTA
 */
import React from "react";
import { AbsoluteFill } from "remotion";
import { BRAND, CLASH, SATOSHI, GRAD, GRAD_TEXT, NightShell, Boat, Cta, Eyebrow, IgPostCard, ProductCardMock, OrderNotif, StatTile } from "./mkKit";

const H = (p: { children: React.ReactNode; size?: number; grad?: boolean; color?: string; style?: React.CSSProperties }) => (
  <div
    style={{
      fontFamily: CLASH,
      fontWeight: 700,
      fontSize: p.size ?? 130,
      lineHeight: 1.06,
      letterSpacing: "-0.03em",
      ...(p.grad
        ? { backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }
        : { color: p.color ?? "#fff" }),
      ...p.style,
    }}
  >
    {p.children}
  </div>
);

/* ══ Reel stills (1080×1920) ════════════════════════════════════════════ */

export const StillPostToProduct: React.FC = () => (
  <NightShell reel chromeFrom={0}>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30 }}>
      <H size={92} style={{ textAlign: "center" }}>
        Ky postim mund<br />të ishte <span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>produkt.</span>
      </H>
      <div style={{ transform: "scale(0.72) rotate(-2deg)", marginTop: -10, marginBottom: -70 }}>
        <IgPostCard width={640} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, margin: "-30px 0" }}>
        <div style={{ width: 12, height: 74, borderRadius: 99, backgroundImage: GRAD }} />
        <div style={{ fontSize: 44, color: "#FACC15", marginTop: -8 }}>▼</div>
      </div>
      <div style={{ transform: "scale(0.72) rotate(1.5deg)", marginTop: -70, marginBottom: -40 }}>
        <ProductCardMock width={640} />
      </div>
      <div style={{ fontFamily: SATOSHI, fontSize: 34, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
        Vela e bën vetë. Ti vetëm poston.
      </div>
    </AbsoluteFill>
  </NightShell>
);

export const StillFiveMin: React.FC = () => (
  <NightShell reel chromeFrom={0}>
    <AbsoluteFill style={{ alignItems: "flex-start", justifyContent: "center", padding: "0 88px", gap: 30 }}>
      <Eyebrow dark>Sa shpejt?</Eyebrow>
      <div style={{ display: "flex", alignItems: "baseline", gap: 30 }}>
        <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 420, lineHeight: 0.9, letterSpacing: "-0.05em", backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>5</div>
        <H size={92}>minuta<br />deri te<br />dyqani yt.</H>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 22, width: "100%", marginTop: 30 }}>
        {[
          ["01", "Lidh Instagramin", "30 sek"],
          ["02", "Sistemi ndërton produktet", "3 min"],
          ["03", "Publiko & ndaj linkun", "90 sek"],
        ].map(([n, t, d]) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 24, background: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.14)", borderRadius: 26, padding: "26px 34px" }}>
            <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 44, backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{n}</span>
            <span style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 40, color: "#fff", flex: 1 }}>{t}</span>
            <span style={{ fontFamily: SATOSHI, fontSize: 28, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>{d}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 40 }}>
        <Cta size={40}>Provo tani → vela.al</Cta>
      </div>
    </AbsoluteFill>
  </NightShell>
);

export const StillBoom: React.FC = () => {
  const W = 880, Hh = 560;
  const pts = Array.from({ length: 60 }, (_, i) => {
    const x = i / 59;
    return `${i === 0 ? "M" : "L"} ${x * W} ${Hh - Math.pow(x, 1.9) * Hh * 0.92 - 16}`;
  }).join(" ");
  return (
    <NightShell reel chromeFrom={0}>
      <AbsoluteFill style={{ alignItems: "flex-start", justifyContent: "center", padding: "0 88px", gap: 36 }}>
        <Eyebrow dark>Tregu digjital · Shqipëri</Eyebrow>
        <H size={110}>
          Shqipëria po<br /><span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>blen online.</span>
        </H>
        <div style={{ position: "relative", width: W, height: Hh, marginTop: 10 }}>
          {[0.25, 0.5, 0.75].map((g) => (
            <div key={g} style={{ position: "absolute", left: 0, right: 0, top: Hh * g, height: 2, background: "rgba(255,255,255,0.08)" }} />
          ))}
          <svg width={W} height={Hh} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
            <defs>
              <linearGradient id="boomGradS" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#7F1D3B" />
                <stop offset="45%" stopColor="#FF2E4D" />
                <stop offset="100%" stopColor="#FACC15" />
              </linearGradient>
            </defs>
            <path d={pts} stroke="url(#boomGradS)" strokeWidth={14} fill="none" strokeLinecap="round" />
          </svg>
          <div style={{ position: "absolute", right: -14, top: 6, width: 30, height: 30, borderRadius: 99, background: "#FACC15", boxShadow: "0 0 46px 14px rgba(250,204,21,0.5)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: -58, display: "flex", justifyContent: "space-between", fontFamily: SATOSHI, fontSize: 28, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>
            {["2022", "2023", "2024", "2025", "2026"].map((y) => <span key={y}>{y}</span>)}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 26, marginTop: 60 }}>
          <H size={120} grad>Ti?</H>
          <div style={{ fontFamily: SATOSHI, fontSize: 36, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>Mos e humb momentin.</div>
        </div>
        <Cta size={40} style={{ marginTop: 10 }}>Zër vendin tënd → vela.al</Cta>
      </AbsoluteFill>
    </NightShell>
  );
};

/* ══ Feed stills (1080×1350) ════════════════════════════════════════════ */

export const StillOrders: React.FC = () => (
  <NightShell chrome={false}>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 44 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 22, alignItems: "center" }}>
        <div style={{ transform: "rotate(-1.5deg) scale(0.94)", opacity: 0.55 }}><OrderNotif name="Andi nga Durrësi" amount="2,900 L" /></div>
        <div style={{ transform: "rotate(1deg) scale(0.97)", opacity: 0.75 }}><OrderNotif name="Sara nga Vlora" amount="6,900 L" /></div>
        <OrderNotif name="Elisa nga Tirana" amount="4,500 L" />
      </div>
      <H size={92} style={{ textAlign: "center" }}>
        Kjo ndjesi.<br /><span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Çdo ditë.</span>
      </H>
      <div style={{ fontFamily: SATOSHI, fontSize: 34, fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>
        Porosi online · me kartë · në L € $ £ ¥
      </div>
      <Cta size={38}>Provo 7 ditë falas → vela.al</Cta>
    </AbsoluteFill>
  </NightShell>
);

export const StillPanel: React.FC = () => (
  <NightShell chrome={false}>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40 }}>
      <H size={88}>Gjithçka nën <span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>kontroll.</span></H>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, width: 880 }}>
        <StatTile label="Porositë sot" value="12" accent />
        <StatTile label="Të ardhurat" value="84,500 L" />
        <StatTile label="Produkte live" value="36" />
        <StatTile label="Vizitorë sot" value="341" />
      </div>
      <div style={{ fontFamily: SATOSHI, fontSize: 34, fontWeight: 700, color: "rgba(255,255,255,0.65)" }}>
        Porositë, stoku, pagesat — një panel.
      </div>
      <Cta size={38}>Shihe vetë → vela.al</Cta>
    </AbsoluteFill>
  </NightShell>
);

/* ── carousel: boom hook → how it works → CTA ── */

export const GallerySlide1: React.FC = () => (
  <NightShell chrome={false}>
    <AbsoluteFill style={{ alignItems: "flex-start", justifyContent: "center", padding: "0 96px", gap: 24 }}>
      <Eyebrow dark style={{ marginBottom: 16 }}>01 — Momenti</Eyebrow>
      <H size={124}>Shqipëria po<br />blen online.<br /><span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Pa ty?</span></H>
      <div style={{ fontFamily: SATOSHI, fontSize: 42, lineHeight: 1.5, fontWeight: 500, color: "rgba(255,255,255,0.72)", maxWidth: 780, marginTop: 20 }}>
        Blerjet online rriten çdo vit — dhe klientët e tu tashmë janë aty. Mos e humb momentin.
      </div>
      <div style={{ position: "absolute", right: 84, bottom: 90, fontFamily: CLASH, fontSize: 38, color: "rgba(255,255,255,0.5)" }}>Rrëshqit →</div>
    </AbsoluteFill>
  </NightShell>
);

export const GallerySlide2: React.FC = () => (
  <NightShell chrome={false}>
    <AbsoluteFill style={{ alignItems: "flex-start", justifyContent: "center", padding: "0 96px", gap: 22 }}>
      <Eyebrow dark style={{ marginBottom: 16 }}>02 — Vela</Eyebrow>
      <H size={104}>Nga postimi te<br />pagesa — <span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>vetë.</span></H>
      <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 34 }}>
        {[
          "Postimet → produkte, me çmim e variante",
          "Dyqani yt gati për 5 minuta",
          "Porosi online — në L, €, $, £…",
          "Një panel për gjithçka",
        ].map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, fontFamily: SATOSHI, fontSize: 40, fontWeight: 700, color: "#fff" }}>
            <span style={{ width: 16, height: 16, borderRadius: 99, backgroundImage: GRAD, flexShrink: 0 }} />
            {t}
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", right: 84, bottom: 90, fontFamily: CLASH, fontSize: 38, color: "rgba(255,255,255,0.5)" }}>Rrëshqit →</div>
    </AbsoluteFill>
  </NightShell>
);

export const GallerySlide3: React.FC = () => (
  <NightShell chrome={false}>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40, textAlign: "center" }}>
      <Boat size={300} />
      <H size={112}>Zër vendin tënd.<br /><span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Sot.</span></H>
      <Cta size={44}>Provo 7 ditë falas</Cta>
      <div style={{ fontFamily: SATOSHI, fontSize: 34, fontWeight: 500, color: "rgba(255,255,255,0.55)" }}>Pa kartë · pa kod · vela.al</div>
    </AbsoluteFill>
  </NightShell>
);
