/**
 * STILL posters (rendered with `remotion still`) — typography-first, on the
 * night canvas with brand blobs + grain, or the warm paper canvas.
 *
 *  1080×1920 (reel/story stills):
 *    StillReelHook       KTHE / INSTAGRAMIN / NË DYQAN — mixed fill stack
 *    StillReelManifesto  the manifesto lines, last one gradient + arrow
 *    StillReelChecklist  "Çfarë merr me Vela" glass check rows
 *  1080×1350 (feed stills):
 *    StillPostQuote      "Ti poston. Vela shet." giant quote
 *    StillPostLogo       clean lockup on paper — the brand card
 *    GallerySlide1/2/3   3-slide carousel: hook → how → CTA
 */
import React from "react";
import { AbsoluteFill } from "remotion";
import { BRAND, CLASH, INTER, GRAD, GRAD_TEXT, NightShell, PaperShell, Boat, Wordmark, Cta, Eyebrow, Grain } from "./mkKit";

const H = (p: { children: React.ReactNode; size?: number; grad?: boolean; outline?: boolean; color?: string; style?: React.CSSProperties }) => (
  <div
    style={{
      fontFamily: CLASH,
      fontWeight: 700,
      fontSize: p.size ?? 150,
      lineHeight: 1.02,
      letterSpacing: "-0.03em",
      ...(p.grad
        ? { backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }
        : p.outline
          ? { color: "transparent", WebkitTextStroke: "3px rgba(255,255,255,0.85)" }
          : { color: p.color ?? "#fff" }),
      ...p.style,
    }}
  >
    {p.children}
  </div>
);

/* ══ Reel stills (1080×1920) ════════════════════════════════════════════ */

export const StillReelHook: React.FC = () => (
  <NightShell reel chromeFrom={0}>
    <AbsoluteFill style={{ alignItems: "flex-start", justifyContent: "center", padding: "0 88px", gap: 10 }}>
      <Eyebrow dark style={{ marginBottom: 34 }}>Për shitësit në Instagram</Eyebrow>
      <H size={168}>KTHE</H>
      <H size={137} outline style={{ letterSpacing: "-0.02em" }}>INSTAGRAMIN</H>
      <H size={168}>NË NJË</H>
      <H size={168} grad>DYQAN.</H>
      <div style={{ height: 12, width: 320, borderRadius: 99, backgroundImage: GRAD, marginTop: 34, boxShadow: "0 0 44px rgba(255,46,77,0.6)" }} />
      <div style={{ marginTop: 60 }}>
        <Cta size={42}>Fillo falas → vela.al</Cta>
      </div>
    </AbsoluteFill>
  </NightShell>
);

export const StillReelManifesto: React.FC = () => (
  <NightShell reel chromeFrom={0}>
    <AbsoluteFill style={{ alignItems: "flex-start", justifyContent: "center", padding: "0 92px", gap: 30 }}>
      <H size={104} color="rgba(255,255,255,0.42)">Postimet e tua.</H>
      <H size={104} color="rgba(255,255,255,0.62)">Produktet e tua.</H>
      <H size={104} color="rgba(255,255,255,0.82)">Klientët e tu.</H>
      <div style={{ position: "relative" }}>
        <H size={136} grad>Dyqani YT.</H>
        <div style={{ position: "absolute", left: 4, bottom: -26, height: 14, width: "94%", borderRadius: 99, backgroundImage: GRAD, boxShadow: "0 0 40px rgba(255,46,77,0.55)" }} />
      </div>
      <div style={{ marginTop: 90, display: "flex", alignItems: "center", gap: 30 }}>
        <Boat size={130} />
        <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 44, color: "rgba(255,255,255,0.85)" }}>vela.al — fillo falas</div>
      </div>
    </AbsoluteFill>
  </NightShell>
);

const CHECKS = [
  "Produkte nga postimet — vetë",
  "Pagesa me kartë, në Lekë",
  "Porositë në një panel",
  "Dyqan me emrin tënd",
];

export const StillReelChecklist: React.FC = () => (
  <NightShell reel chromeFrom={0}>
    <AbsoluteFill style={{ alignItems: "flex-start", justifyContent: "center", padding: "0 84px", gap: 26 }}>
      <Eyebrow dark style={{ marginBottom: 8 }}>Çfarë merr me Vela</Eyebrow>
      <H size={116} style={{ marginBottom: 34 }}>Gjithçka që<br />të duhet<br />për të shitur.</H>
      {CHECKS.map((c, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 26, background: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.14)", borderRadius: 28, padding: "28px 38px", width: "100%" }}>
          <span style={{ width: 52, height: 52, borderRadius: 99, backgroundImage: GRAD, display: "grid", placeItems: "center", color: "#fff", fontSize: 30, fontWeight: 800, flexShrink: 0 }}>✓</span>
          <span style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 44, color: "#fff", letterSpacing: "-0.01em" }}>{c}</span>
        </div>
      ))}
      <div style={{ marginTop: 44 }}>
        <Cta size={40}>Provo 7 ditë falas</Cta>
      </div>
    </AbsoluteFill>
  </NightShell>
);

/* ══ Feed stills (1080×1350) ════════════════════════════════════════════ */

export const StillPostQuote: React.FC = () => (
  <NightShell chrome={false}>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center" }}>
      <div style={{ fontFamily: CLASH, fontSize: 220, lineHeight: 0.4, backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>“</div>
      <H size={140}>Ti poston.</H>
      <H size={140} grad>Vela shet.</H>
      <div style={{ marginTop: 80, display: "flex", alignItems: "center", gap: 24 }}>
        <Boat size={96} />
        <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 36, color: "rgba(255,255,255,0.6)", letterSpacing: "0.18em" }}>VELA.AL</div>
      </div>
    </AbsoluteFill>
  </NightShell>
);

export const StillPostLogo: React.FC = () => (
  <AbsoluteFill style={{ background: "#FBF6F4", fontFamily: INTER }}>
    <div style={{ position: "absolute", right: -200, top: -240, width: 860, height: 860, borderRadius: 999, background: "rgba(255,46,77,0.10)", filter: "blur(140px)" }} />
    <div style={{ position: "absolute", left: -240, bottom: -280, width: 900, height: 900, borderRadius: 999, background: "rgba(245,158,11,0.14)", filter: "blur(140px)" }} />
    <Grain opacity={0.03} />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 48 }}>
      <Boat size={380} />
      <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 170, letterSpacing: "-0.03em", color: BRAND.ink, lineHeight: 1 }}>Vela</div>
      <div style={{ height: 12, width: 300, borderRadius: 99, backgroundImage: GRAD }} />
      <div style={{ fontFamily: CLASH, fontWeight: 500, fontSize: 46, color: BRAND.muted }}>Kthe Instagramin në dyqan online.</div>
    </AbsoluteFill>
  </AbsoluteFill>
);

/* ── carousel: hook → how → CTA ── */

export const GallerySlide1: React.FC = () => (
  <NightShell chrome={false}>
    <AbsoluteFill style={{ alignItems: "flex-start", justifyContent: "center", padding: "0 96px", gap: 20 }}>
      <Eyebrow dark style={{ marginBottom: 20 }}>01 — Problemi</Eyebrow>
      <H size={130}>DM-t nuk<br />janë dyqan.</H>
      <div style={{ fontFamily: INTER, fontSize: 44, lineHeight: 1.5, color: "rgba(255,255,255,0.72)", maxWidth: 760, marginTop: 24 }}>
        Pyetje pa fund, çmime në mesazhe, porosi që humbasin. Shitja në DM të kushton kohë — dhe shitje.
      </div>
      <div style={{ position: "absolute", right: 84, bottom: 90, fontFamily: CLASH, fontSize: 40, color: "rgba(255,255,255,0.5)" }}>Rrëshqit →</div>
    </AbsoluteFill>
  </NightShell>
);

export const GallerySlide2: React.FC = () => (
  <NightShell chrome={false}>
    <AbsoluteFill style={{ alignItems: "flex-start", justifyContent: "center", padding: "0 96px", gap: 20 }}>
      <Eyebrow dark style={{ marginBottom: 20 }}>02 — Zgjidhja</Eyebrow>
      <H size={110}>Vela i kthen<br />postimet në<br /><span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>produkte.</span></H>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 40 }}>
        {["Postim → Produkt, me çmim e variante", "Vitrinë me emrin tënd", "Pagesa me kartë, në Lekë"].map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 20, fontFamily: INTER, fontSize: 42, fontWeight: 600, color: "#fff" }}>
            <span style={{ width: 16, height: 16, borderRadius: 99, backgroundImage: GRAD, flexShrink: 0 }} />
            {t}
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", right: 84, bottom: 90, fontFamily: CLASH, fontSize: 40, color: "rgba(255,255,255,0.5)" }}>Rrëshqit →</div>
    </AbsoluteFill>
  </NightShell>
);

export const GallerySlide3: React.FC = () => (
  <NightShell chrome={false}>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40, textAlign: "center" }}>
      <Boat size={300} />
      <H size={120}>Gati për<br /><span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>dyqanin tënd?</span></H>
      <Cta size={44}>Provo 7 ditë falas</Cta>
      <div style={{ fontFamily: INTER, fontSize: 36, color: "rgba(255,255,255,0.55)" }}>Pa kartë · pa kod · vela.al</div>
    </AbsoluteFill>
  </NightShell>
);
