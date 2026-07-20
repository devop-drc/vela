/**
 * Instagram FEED POSTS (1080×1350 · 30fps) — hook-first, tools-focused.
 *
 *  PostOrders ~8s  HOOK: a "Porosi e re! 🎉" notification pops — then they
 *                  stack in a cha-ching cascade with a daily counter.
 *                  Message: porosi online + pagesa me kartë, në Lekë.
 *  PostPanel  ~8s  HOOK: "Gjithçka nën kontroll." — the admin panel as
 *                  motion graphics: stat tiles count up, an order row
 *                  slides in and flips to "U dërgua ✓".
 *  PostSteps  ~7s  The whole pitch in 3 numbered beats: Lidh → Sistemi
 *                  ndërton → Ti merr porositë. Payoff: "Kaq."
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { BRAND, CLASH, SATOSHI, GRAD, GRAD_TEXT, NightShell, Cta, springy, rise, exitUp, OrderNotif, StatTile, CurrencyRoll } from "./mkKit";

const clamp = (f: number, a: [number, number], b: [number, number], ease?: (t: number) => number) =>
  interpolate(f, a, b, { extrapolateLeft: "clamp", extrapolateRight: "clamp", ...(ease ? { easing: ease } : {}) });

/* ══ POST 1 — orders & payments ═════════════════════════════════════════ */
const ORDERS = [
  { name: "Elisa nga Tirana", amount: "4,500 L" },
  { name: "Andi nga Durrësi", amount: "2,900 L" },
  { name: "Sara nga Vlora", amount: "6,900 L" },
  { name: "Klea nga Shkodra", amount: "3,400 L" },
];

export const PostOrders: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stageOut = clamp(frame, [168, 180], [0, 1], Easing.in(Easing.cubic));
  const count = Math.min(ORDERS.length, Math.max(0, Math.floor((frame - 16) / 26) + 1));

  return (
    <NightShell chrome={false}>
      {/* HOOK + cascade */}
      {frame < 182 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40, ...exitUp(stageOut) }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, ...rise(springy(frame, fps, 60)) }}>
            <span style={{ fontFamily: SATOSHI, fontSize: 34, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Sot</span>
            <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 56, backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{count} porosi</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center" }}>
            {ORDERS.map((o, i) => {
              const s = springy(frame, fps, 16 + i * 26, { damping: 12, stiffness: 210 });
              if (s <= 0.01) return null;
              return (
                <div key={i} style={{ opacity: Math.min(1, s * 1.6), transform: `translateY(${(1 - s) * -80}px) scale(${0.9 + s * 0.1})` }}>
                  <OrderNotif name={o.name} amount={o.amount} />
                </div>
              );
            })}
          </div>
          <div style={{ ...rise(springy(frame, fps, 126)), textAlign: "center", fontFamily: CLASH, fontWeight: 700, fontSize: 66, color: "#fff", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            Porosi online.<br />
            <span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Pagesa me kartë, në </span>
            <CurrencyRoll size={66} gradient width={290} style={{ textAlign: "left" }} />
          </div>
        </AbsoluteFill>
      )}
      {/* PAYOFF */}
      {frame >= 178 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40 }}>
          <div style={{ ...rise(springy(frame, fps, 184)), fontFamily: CLASH, fontWeight: 700, fontSize: 84, color: "#fff", textAlign: "center", lineHeight: 1.15 }}>
            Kjo ndjesi.<br />Çdo ditë.
          </div>
          <div style={{ ...rise(springy(frame, fps, 198)) }}>
            <Cta size={40}>Provo 7 ditë falas → vela.al</Cta>
          </div>
        </AbsoluteFill>
      )}
    </NightShell>
  );
};
export const POST_ORDERS_FRAMES = 246;

/* ══ POST 2 — the panel (control everything) ════════════════════════════ */
export const PostPanel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stageOut = clamp(frame, [176, 188], [0, 1], Easing.in(Easing.cubic));

  const n = (target: number, from: number, dur = 26) => Math.round(clamp(frame, [from, from + dur], [0, 1], Easing.out(Easing.cubic)) * target);
  const shipped = frame > 140;

  return (
    <NightShell chrome={false}>
      {frame < 190 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 36, ...exitUp(stageOut) }}>
          {/* HOOK */}
          <div style={{ ...rise(springy(frame, fps, 4, { damping: 12, stiffness: 210 })), fontFamily: CLASH, fontWeight: 700, fontSize: 88, color: "#fff", letterSpacing: "-0.02em" }}>
            Gjithçka nën <span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>kontroll.</span>
          </div>
          {/* the panel, as motion graphics */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, width: 880 }}>
            {[
              { label: "Porositë sot", value: `${n(12, 34)}`, accent: true },
              { label: "Të ardhurat", value: `${n(84, 44)},500 L` },
              { label: "Produkte live", value: `${n(36, 54)}` },
              { label: "Vizitorë sot", value: `${n(341, 64)}` },
            ].map((t, i) => (
              <div key={t.label} style={{ ...rise(springy(frame, fps, 30 + i * 10)) }}>
                <StatTile label={t.label} value={t.value} accent={(t as any).accent} />
              </div>
            ))}
          </div>
          {/* an order row that flips to shipped */}
          <div style={{ ...rise(springy(frame, fps, 96)), width: 880, display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.13)", borderRadius: 26, padding: "26px 34px", fontFamily: SATOSHI }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <span style={{ width: 56, height: 56, borderRadius: 16, backgroundImage: GRAD, display: "grid", placeItems: "center", fontSize: 28 }}>📦</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 30, color: "#fff" }}>Porosia #4F2A · Atlete Vrapi Air</div>
                <div style={{ fontSize: 24, color: "rgba(255,255,255,0.5)" }}>Elisa · Tiranë · me kartë</div>
              </div>
            </div>
            <div style={{ borderRadius: 999, padding: "12px 28px", fontSize: 26, fontWeight: 800, transition: "all .2s", ...(shipped ? { background: "rgba(35,159,80,0.2)", color: "#4ADE80", border: "2px solid rgba(74,222,128,0.4)" } : { background: "rgba(245,158,11,0.18)", color: "#FACC15", border: "2px solid rgba(250,204,21,0.35)" }) }}>
              {shipped ? "U dërgua ✓" : "Në pritje"}
            </div>
          </div>
        </AbsoluteFill>
      )}
      {/* PAYOFF */}
      {frame >= 186 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40 }}>
          <div style={{ ...rise(springy(frame, fps, 192)), fontFamily: CLASH, fontWeight: 700, fontSize: 84, color: "#fff", textAlign: "center", lineHeight: 1.15 }}>
            Një panel.<br /><span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Gjithë biznesi yt.</span>
          </div>
          <div style={{ ...rise(springy(frame, fps, 206)) }}>
            <Cta size={40}>Shihe vetë → vela.al</Cta>
          </div>
        </AbsoluteFill>
      )}
    </NightShell>
  );
};
export const POST_PANEL_FRAMES = 254;

/* ══ POST 3 — the 3 steps, condensed ════════════════════════════════════ */
const STEPS3 = [
  { n: "01", t: "Lidh Instagramin", d: "një prekje, pa kod" },
  { n: "02", t: "Sistemi ndërton dyqanin", d: "postimet → produkte, vetë" },
  { n: "03", t: "Ti merr porositë", d: "me kartë ose në dorëzim" },
];

export const PostSteps: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stageOut = clamp(frame, [150, 162], [0, 1], Easing.in(Easing.cubic));

  return (
    <NightShell chrome={false}>
      {frame < 164 && (
        <AbsoluteFill style={{ alignItems: "flex-start", justifyContent: "center", padding: "0 90px", gap: 44, ...exitUp(stageOut) }}>
          <div style={{ ...rise(springy(frame, fps, 4, { damping: 12, stiffness: 210 })), fontFamily: CLASH, fontWeight: 700, fontSize: 92, color: "#fff", letterSpacing: "-0.02em" }}>
            Si funksionon<span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>?</span>
          </div>
          {STEPS3.map((s, i) => {
            const sp = springy(frame, fps, 26 + i * 30, { damping: 14 });
            return (
              <div key={s.n} style={{ ...rise(sp), display: "flex", alignItems: "center", gap: 30 }}>
                <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 84, backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", width: 120 }}>{s.n}</span>
                <div>
                  <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 52, color: "#fff", letterSpacing: "-0.01em" }}>{s.t}</div>
                  <div style={{ fontFamily: SATOSHI, fontSize: 32, fontWeight: 500, color: "rgba(255,255,255,0.55)", marginTop: 4 }}>{s.d}</div>
                </div>
              </div>
            );
          })}
        </AbsoluteFill>
      )}
      {frame >= 160 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40 }}>
          <div style={{ ...rise(springy(frame, fps, 166, { damping: 11, stiffness: 220 })), fontFamily: CLASH, fontWeight: 700, fontSize: 170, letterSpacing: "-0.02em", backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
            Kaq.
          </div>
          <div style={{ ...rise(springy(frame, fps, 180)) }}>
            <Cta size={40}>Fillo falas → vela.al</Cta>
          </div>
        </AbsoluteFill>
      )}
    </NightShell>
  );
};
export const POST_STEPS_FRAMES = 228;
