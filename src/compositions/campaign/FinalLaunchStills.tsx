/**
 * Vela — FinalLaunch STILLS (IG feed posters, 1080×1350). Same meme-native
 * Albanian humor + clean SERIOUS Clash typography as the FinalLaunch reels, and
 * the same mixed light↔dark language — but as single-frame posters.
 *
 *   07 Split   "PARA / PAS"  — dark DM chaos over a clean light Vela checkout
 *   08 DmMeme  "Çmimi në DM" — the classic joke as a static post + light Vela strip
 *   09 Stat    "45 min → 3 sek" — minimal light editorial stat
 */
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { BRAND, CLASH, INTER, INK, AuroraDark, CreamBase, ShipColored, ensureClash } from "../marketing/nextgen/kitv2";

const W = 1080, H = 1350;
export const STILL_FRAMES = 1;
const GRAD = "linear-gradient(115deg,#A31234,#FF2E4D)";
const eyebrow = (dark: boolean): React.CSSProperties => ({ display: "inline-block", padding: "12px 28px", borderRadius: 999, fontFamily: CLASH, fontWeight: 700, fontSize: 28, letterSpacing: ".16em", textTransform: "uppercase", ...(dark ? { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff" } : { background: GRAD, color: "#fff" }) });
const chip = (t: string, rot: number, extra?: React.CSSProperties) => (
  <div key={t + rot} style={{ display: "inline-block", background: "rgba(255,255,255,0.96)", color: "#1a1216", borderRadius: 22, borderBottomLeftRadius: 8, padding: "16px 26px", fontFamily: INTER, fontWeight: 700, fontSize: 34, boxShadow: "0 22px 56px -18px rgba(0,0,0,0.6)", transform: `rotate(${rot}deg)`, ...extra }}>{t}</div>
);

/* ══════════════════ 07 · PARA / PAS split (mixed themes in one frame) ══════════════════ */
export const FinalLaunch07Split: React.FC = () => {
  const frame = useCurrentFrame(); ensureClash();
  const SEAM = 770;
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      {/* ── TOP · DARK · the DM chaos ── */}
      <div style={{ position: "absolute", top: 0, left: 0, width: W, height: SEAM, overflow: "hidden" }}>
        <AuroraDark frame={frame} />
        <div style={{ position: "absolute", top: 64, left: 70 }}><span style={eyebrow(true)}>Para</span></div>
        <div style={{ position: "absolute", left: 60, top: 150 }}>{chip("Çmimi në DM 🙏", -5)}</div>
        <div style={{ position: "absolute", right: 60, top: 250 }}>{chip("Sa e le? 🤝", 4)}</div>
        <div style={{ position: "absolute", left: 90, top: 372 }}>{chip("Ku ndodheni?", -3)}</div>
        <div style={{ position: "absolute", right: 90, top: 470 }}>{chip("A bëni dërgesa?", 5)}</div>
        <div style={{ position: "absolute", left: 70, bottom: 70, display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ background: "#E5484D", color: "#fff", borderRadius: 999, padding: "14px 30px", fontFamily: CLASH, fontWeight: 800, fontSize: 34 }}>Kaos në DM 😵‍💫</span>
        </div>
      </div>
      {/* ── BOTTOM · LIGHT · the clean Vela checkout ── */}
      <div style={{ position: "absolute", top: SEAM, left: 0, width: W, height: H - SEAM, overflow: "hidden" }}>
        <CreamBase frame={frame} />
        <div style={{ position: "absolute", top: 90, left: 70 }}><span style={eyebrow(false)}>Pas</span></div>
        <div style={{ position: "absolute", top: 150, left: 70, right: 70, display: "flex", alignItems: "center", gap: 28 }}>
          <Img src={staticFile("campaign/dress.jpg")} style={{ width: 190, height: 240, objectFit: "cover", borderRadius: 24 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 46, color: INK }}>Fustan i kuq</div>
            <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 40, color: BRAND.wine, marginTop: 4 }}>3,500 L</div>
            <div style={{ marginTop: 16, display: "inline-block", background: GRAD, color: "#fff", borderRadius: 14, padding: "16px 34px", fontFamily: CLASH, fontWeight: 600, fontSize: 34 }}>Paguaj · Porosia u krye ✓</div>
          </div>
        </div>
      </div>
      {/* seam: ship badge + hairline */}
      <div style={{ position: "absolute", top: SEAM, left: 0, width: W, height: 3, background: GRAD }} />
      <div style={{ position: "absolute", top: SEAM, left: W - 150, transform: "translateY(-50%)", width: 108, height: 108, borderRadius: 30, background: "#fff", display: "grid", placeItems: "center", boxShadow: "0 24px 60px -18px rgba(0,0,0,0.5)" }}><ShipColored size={64} /></div>
    </AbsoluteFill>
  );
};

/* ══════════════════ 08 · "Çmimi në DM" meme poster ══════════════════ */
export const FinalLaunch08DmMeme: React.FC = () => {
  const frame = useCurrentFrame(); ensureClash();
  const Bubble = (who: "b" | "s", t: string) => (
    <div style={{ display: "flex", justifyContent: who === "b" ? "flex-start" : "flex-end" }}>
      <div style={{ maxWidth: "80%", padding: "24px 34px", fontFamily: INTER, fontWeight: 600, fontSize: 44, borderRadius: who === "b" ? "32px 32px 32px 10px" : "32px 32px 10px 32px", ...(who === "b" ? { background: "rgba(255,255,255,0.96)", color: "#1a1216" } : { backgroundImage: GRAD, color: "#fff" }), boxShadow: "0 26px 64px -24px rgba(0,0,0,0.55)" }}>{t}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <AuroraDark frame={frame} />
      <div style={{ position: "absolute", top: 70, left: 0, width: W, textAlign: "center" }}>
        <span style={eyebrow(true)}>Klasika shqiptare</span>
      </div>
      <div style={{ position: "absolute", top: 200, bottom: 250, left: 70, right: 70, display: "flex", flexDirection: "column", justifyContent: "center", gap: 30 }}>
        {Bubble("b", "Sa kushton fustani? 😍")}
        {Bubble("s", "Çmimi në DM 🙏")}
        {Bubble("b", "…po jemi në DM 💀")}
      </div>
      {/* light Vela strip anchored to the bottom */}
      <div style={{ position: "absolute", left: 0, bottom: 0, width: W, background: "#F5F0E6", padding: "56px 70px", display: "flex", alignItems: "center", gap: 26 }}>
        <ShipColored size={92} />
        <div>
          <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 48, color: INK, lineHeight: 1.05 }}>Me Vela, çmimi rri te produkti.</div>
          <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 34, color: BRAND.wine, marginTop: 8 }}>Pa "çmimi në DM" · vela.al</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ══════════════════ 09 · Stat poster (light editorial) ══════════════════ */
export const FinalLaunch09Stat: React.FC = () => {
  const frame = useCurrentFrame(); ensureClash();
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <CreamBase frame={frame} />
      <div style={{ position: "absolute", top: 0, left: 0, width: W, height: 12, background: "linear-gradient(90deg,#A31234,#FF2E4D,#F59E0B)" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: "0 90px" }}>
        <span style={{ ...eyebrow(false), marginBottom: 40 }}>Klientët e tu</span>
        <div style={{ display: "flex", alignItems: "center", gap: 30, fontFamily: CLASH, fontWeight: 700, letterSpacing: "-0.02em" }}>
          <span style={{ fontSize: 120, color: "#B8B2A6", textDecoration: "line-through" }}>45 min</span>
        </div>
        <div style={{ fontFamily: INTER, fontSize: 40, color: BRAND.muted, margin: "10px 0 6px" }}>duke skrolluar pafund në profil</div>
        <div style={{ fontSize: 150, fontFamily: CLASH, fontWeight: 700, letterSpacing: "-0.03em", color: INK, lineHeight: 1.02, marginTop: 30 }}>
          3 <span style={{ backgroundImage: "linear-gradient(100deg,#F59E0B,#FF2E4D 60%,#A31234)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>sekonda</span>
        </div>
        <div style={{ fontFamily: INTER, fontSize: 40, color: BRAND.muted, marginTop: 6 }}>me kërkim &amp; filtra në Vela</div>
        <div style={{ marginTop: 70, display: "inline-block", background: GRAD, color: "#fff", borderRadius: 999, padding: "26px 52px", fontFamily: CLASH, fontWeight: 700, fontSize: 44, boxShadow: "0 30px 70px -22px rgba(163,18,52,0.6)" }}>Klientët gjejnë vetë → vela.al</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
