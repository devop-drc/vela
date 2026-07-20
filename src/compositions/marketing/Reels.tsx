/**
 * Instagram REELS (1080×1920 · 30fps) — hook-first structure:
 * HOOK (owns the first beat) → PROCESS (one idea, shown) → PAYOFF (one CTA).
 *
 *  ReelPostToProduct ~12s  THE core process: a stylized IG post gets scanned,
 *                          its data flies out as chips, and it becomes a
 *                          sellable product card.
 *  ReelFiveMin       ~11s  "Dyqan për 5 minuta" — a draining timer races
 *                          through the three setup steps to 0:00 → "Gati."
 *  ReelBoom          ~11s  Albania's online market is booming — rising chart
 *                          line + FOMO pivot "s'është NËSE… por KUR."
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { z } from "zod";
import { BRAND, CLASH, SATOSHI, GRAD, GRAD_TEXT, NightShell, Boat, Cta, springy, rise, exitUp, IgPostCard, ProductCardMock } from "./mkKit";

export const mkSchema = z.object({});
export const mkDefaults = {};

const clamp = (f: number, a: [number, number], b: [number, number], ease?: (t: number) => number) =>
  interpolate(f, a, b, { extrapolateLeft: "clamp", extrapolateRight: "clamp", ...(ease ? { easing: ease } : {}) });

/* shared end card */
const EndCard: React.FC<{ from: number; line: string; cta?: string }> = ({ from, line, cta = "Fillo falas → vela.al" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 44 }}>
      <div style={{ opacity: Math.min(1, springy(frame, fps, from, { damping: 13 }) * 1.4), transform: `translateY(${(1 - springy(frame, fps, from, { damping: 13 })) * -60}px) scale(${0.7 + springy(frame, fps, from, { damping: 13 }) * 0.3})` }}>
        <Boat size={320} bob />
      </div>
      <div style={{ ...rise(springy(frame, fps, from + 10)), fontFamily: CLASH, fontWeight: 700, fontSize: 72, color: "#fff", letterSpacing: "-0.02em", textAlign: "center", lineHeight: 1.15 }}>
        {line}
      </div>
      <div style={{ ...rise(springy(frame, fps, from + 20)) }}>
        <Cta size={42}>{cta}</Cta>
      </div>
    </AbsoluteFill>
  );
};

/* ══ REEL 1 — Post → Product (the core process) ═════════════════════════ */
const CHIPS = [
  { label: "Emri", value: "Atlete Vrapi Air" },
  { label: "Çmimi", value: "4,500 L" },
  { label: "Variantet", value: "Masat 40–44" },
];

export const ReelPostToProduct: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timeline: hook 0-55 · card 40-150 · scan 95-135 · chips 120-200 ·
  // morph 200-240 · product 200-290 · payoff 290-360
  const HOOK_OUT = clamp(frame, [44, 58], [0, 1], Easing.in(Easing.cubic));
  const cardIn = springy(frame, fps, 46, { damping: 15 });
  const scan = clamp(frame, [95, 133], [0, 1], Easing.inOut(Easing.cubic));
  const morph = clamp(frame, [200, 228], [0, 1], Easing.inOut(Easing.cubic));
  const stageOut = clamp(frame, [278, 292], [0, 1], Easing.in(Easing.cubic));

  return (
    <NightShell reel chromeFrom={60}>
      {/* HOOK — one line, full frame */}
      {frame < 60 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", ...exitUp(HOOK_OUT) }}>
          <div style={{ ...rise(springy(frame, fps, 4, { damping: 12, stiffness: 210 })), fontFamily: CLASH, fontWeight: 700, fontSize: 112, color: "#fff", textAlign: "center", lineHeight: 1.08, letterSpacing: "-0.03em" }}>
            Ky postim<br />sapo u bë<br /><span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>produkt.</span>
          </div>
        </AbsoluteFill>
      )}

      {/* PROCESS — IG card scanned → chips → product card */}
      {frame >= 44 && frame < 295 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", ...exitUp(stageOut) }}>
          <div style={{ position: "relative", width: 640 }}>
            {/* IG post card */}
            <div style={{ opacity: Math.min(1, cardIn * 1.5) * (1 - morph), transform: `translateY(${(1 - cardIn) * 120}px) scale(${0.9 + cardIn * 0.1}) rotate(${(1 - morph) * 0 - morph * 4}deg)`, filter: `blur(${morph * 10}px)` }}>
              <IgPostCard width={640} />
            </div>
            {/* product card takes its place */}
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", opacity: morph, transform: `translateY(${(1 - morph) * 60}px) scale(${0.94 + morph * 0.06})` }}>
              <ProductCardMock width={640} />
            </div>
            {/* the scan line */}
            {scan > 0 && scan < 1 && (
              <div style={{ position: "absolute", left: -30, right: -30, top: `${scan * 100}%`, height: 7, borderRadius: 99, backgroundImage: GRAD, boxShadow: "0 0 60px 12px rgba(255,46,77,0.65)" }} />
            )}
            {/* extracted chips fly out to the right of the card */}
            {CHIPS.map((c, i) => {
              const s = springy(frame, fps, 126 + i * 16, { damping: 13 });
              const away = morph; // chips tuck INTO the product card as it morphs
              if (s <= 0.01) return null;
              return (
                <div
                  key={c.label}
                  style={{
                    position: "absolute",
                    right: -46,
                    top: 130 + i * 120,
                    opacity: Math.min(1, s * 1.6) * (1 - away),
                    transform: `translateX(${(1 - s) * 140 - away * 130}px) scale(${0.85 + s * 0.15 - away * 0.2})`,
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    background: "rgba(20,10,14,0.92)",
                    border: "2px solid rgba(255,255,255,0.22)",
                    borderRadius: 999,
                    padding: "18px 30px",
                    fontFamily: SATOSHI,
                    boxShadow: "0 24px 60px -20px rgba(0,0,0,0.7)",
                  }}
                >
                  <span style={{ width: 40, height: 40, borderRadius: 99, backgroundImage: GRAD, display: "grid", placeItems: "center", color: "#fff", fontSize: 22, fontWeight: 800 }}>✓</span>
                  <span style={{ fontSize: 24, color: "rgba(255,255,255,0.55)", fontWeight: 700 }}>{c.label}</span>
                  <span style={{ fontSize: 26, color: "#fff", fontWeight: 700 }}>{c.value}</span>
                </div>
              );
            })}
          </div>
          {/* process caption under the card */}
          <div style={{ marginTop: 46, fontFamily: SATOSHI, fontWeight: 700, fontSize: 38, color: "rgba(255,255,255,0.75)", opacity: clamp(frame, [100, 118], [0, 1]) }}>
            {morph < 0.5 ? "Sistemi po e lexon postimin…" : "Gati për t'u shitur. Vetë."}
          </div>
        </AbsoluteFill>
      )}

      {/* PAYOFF */}
      {frame >= 290 && <EndCard from={296} line={"Çdo postim.\nAutomatikisht."} />}
    </NightShell>
  );
};
export const REEL_P2P_FRAMES = 366;

/* ══ REEL 2 — "Dyqan për 5 minuta" ══════════════════════════════════════ */
const STEPS: Array<{ t: string; take: string }> = [
  { t: "Lidh Instagramin", take: "30 sek" },
  { t: "Sistemi ndërton produktet", take: "3 min" },
  { t: "Publiko & ndaj linkun", take: "90 sek" },
];

export const ReelFiveMin: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const HOOK_END = 62;
  const TIMER_END = 250;
  // the big countdown 5:00 → 0:00 across the step section
  const t = clamp(frame, [HOOK_END, TIMER_END], [300, 0]);
  const mm = Math.floor(t / 60);
  const ss = String(Math.floor(t % 60)).padStart(2, "0");
  const done = frame >= TIMER_END;
  const hookOut = clamp(frame, [HOOK_END - 14, HOOK_END], [0, 1], Easing.in(Easing.cubic));
  const stageOut = clamp(frame, [286, 298], [0, 1], Easing.in(Easing.cubic));

  return (
    <NightShell reel chromeFrom={HOOK_END}>
      {/* HOOK — a challenge */}
      {frame < HOOK_END && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", ...exitUp(hookOut) }}>
          <div style={{ ...rise(springy(frame, fps, 4, { damping: 12, stiffness: 210 })), fontFamily: CLASH, fontWeight: 700, fontSize: 104, color: "#fff", textAlign: "center", lineHeight: 1.1, letterSpacing: "-0.03em" }}>
            Dyqan online<br />për <span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>5 minuta?</span>
          </div>
          <div style={{ ...rise(springy(frame, fps, 22)), marginTop: 30, fontFamily: SATOSHI, fontWeight: 700, fontSize: 42, color: "rgba(255,255,255,0.65)" }}>
            Po. Ja si:
          </div>
        </AbsoluteFill>
      )}

      {/* PROCESS — timer + steps */}
      {frame >= HOOK_END - 4 && frame < 300 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 60, ...exitUp(stageOut) }}>
          <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: done ? 150 : 210, lineHeight: 1, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums", ...(done ? { backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } : { color: "#fff" }), transform: `scale(${0.9 + springy(frame, fps, HOOK_END) * 0.1})` }}>
            {done ? "Gati." : `${mm}:${ss}`}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 26, width: 820 }}>
            {STEPS.map((s, i) => {
              const from = HOOK_END + 14 + i * 56;
              const sp = springy(frame, fps, from, { damping: 14 });
              const fill = clamp(frame, [from + 6, from + 50], [0, 1]);
              return (
                <div key={i} style={{ ...rise(sp), display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontFamily: SATOSHI }}>
                    <span style={{ fontSize: 40, fontWeight: 700, color: "#fff" }}>
                      <span style={{ fontFamily: CLASH, backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", marginRight: 18 }}>{`0${i + 1}`}</span>
                      {s.t}
                    </span>
                    <span style={{ fontSize: 30, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>{s.take}</span>
                  </div>
                  <div style={{ height: 12, borderRadius: 99, background: "rgba(255,255,255,0.1)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${fill * 100}%`, borderRadius: 99, backgroundImage: GRAD }} />
                  </div>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      )}

      {/* PAYOFF */}
      {frame >= 296 && <EndCard from={302} line={"5 minuta.\nDyqani yt, online."} cta="Provo tani → vela.al" />}
    </NightShell>
  );
};
export const REEL_5MIN_FRAMES = 372;

/* ══ REEL 3 — the boom ("mos e humb momentin") ══════════════════════════ */
export const ReelBoom: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const CHART_END = 150;
  const draw = clamp(frame, [40, CHART_END], [0, 1], Easing.inOut(Easing.cubic));
  const stageOut = clamp(frame, [166, 180], [0, 1], Easing.in(Easing.cubic));
  const PIVOT_AT = 182;
  const pivotOut = clamp(frame, [262, 274], [0, 1], Easing.in(Easing.cubic));

  // chart geometry (accelerating growth curve)
  const W = 860, H = 620;
  const pts = Array.from({ length: 60 }, (_, i) => {
    const x = i / 59;
    return { x: x * W, y: H - Math.pow(x, 1.9) * H * 0.92 - 20 };
  });
  const visible = Math.floor(draw * pts.length);
  const path = pts.slice(0, Math.max(2, visible)).map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const tip = pts[Math.max(0, visible - 1)];
  const YEARS = ["2022", "2023", "2024", "2025", "2026"];

  return (
    <NightShell reel>
      {/* HOOK + chart — the claim draws itself */}
      {frame < 182 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40, ...exitUp(stageOut) }}>
          <div style={{ ...rise(springy(frame, fps, 4, { damping: 12, stiffness: 210 })), fontFamily: CLASH, fontWeight: 700, fontSize: 96, color: "#fff", textAlign: "center", lineHeight: 1.1, letterSpacing: "-0.03em" }}>
            Shqipëria po<br /><span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>blen online.</span>
          </div>
          <div style={{ position: "relative", width: W, height: H }}>
            {/* grid hints */}
            {[0.25, 0.5, 0.75].map((g) => (
              <div key={g} style={{ position: "absolute", left: 0, right: 0, top: H * g, height: 2, background: "rgba(255,255,255,0.08)" }} />
            ))}
            <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              <defs>
                <linearGradient id="boomGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#7F1D3B" />
                  <stop offset="45%" stopColor="#FF2E4D" />
                  <stop offset="100%" stopColor="#FACC15" />
                </linearGradient>
              </defs>
              <path d={path} stroke="url(#boomGrad)" strokeWidth={14} fill="none" strokeLinecap="round" />
            </svg>
            {/* glowing tip */}
            {draw > 0.02 && (
              <div style={{ position: "absolute", left: tip.x - 16, top: tip.y - 16, width: 32, height: 32, borderRadius: 99, background: "#FACC15", boxShadow: "0 0 50px 16px rgba(250,204,21,0.55)" }} />
            )}
            {/* years */}
            <div style={{ position: "absolute", left: 0, right: 0, bottom: -64, display: "flex", justifyContent: "space-between", fontFamily: SATOSHI, fontSize: 30, fontWeight: 700, color: "rgba(255,255,255,0.5)" }}>
              {YEARS.map((y, i) => (
                <span key={y} style={{ opacity: draw * YEARS.length > i ? 1 : 0.25 }}>{y}</span>
              ))}
            </div>
          </div>
          <div style={{ ...rise(springy(frame, fps, 110)), fontFamily: SATOSHI, fontWeight: 700, fontSize: 40, color: "rgba(255,255,255,0.75)", marginTop: 40 }}>
            Blerjet online rriten çdo vit. Klientët e tu janë aty.
          </div>
        </AbsoluteFill>
      )}

      {/* PIVOT — the FOMO beat */}
      {frame >= PIVOT_AT && frame < 278 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 20, ...exitUp(pivotOut) }}>
          <div style={{ ...rise(springy(frame, fps, PIVOT_AT + 2)), fontFamily: CLASH, fontWeight: 700, fontSize: 92, color: "#fff", letterSpacing: "-0.02em" }}>
            Pyetja s'është <span style={{ textDecoration: "line-through", textDecorationColor: BRAND.fuchsia, opacity: 0.85 }}>NËSE</span>.
          </div>
          <div style={{ ...rise(springy(frame, fps, PIVOT_AT + 26)), fontFamily: CLASH, fontWeight: 700, fontSize: 130, letterSpacing: "-0.02em", backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
            Por KUR.
          </div>
        </AbsoluteFill>
      )}

      {/* PAYOFF */}
      {frame >= 274 && <EndCard from={280} line={"Zër vendin tënd.\nSot."} cta="Fillo falas → vela.al" />}
    </NightShell>
  );
};
export const REEL_BOOM_FRAMES = 350;
