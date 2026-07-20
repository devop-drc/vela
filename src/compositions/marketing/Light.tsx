/**
 * LIGHT SERIES — the second wave of the Instagram set. Same strategy
 * (HOOK → PROCESS → PAYOFF) but a different voice: warm paper canvas, ink
 * typography, hairline borders, soft shadows. Gradients almost gone — flat
 * wine (#A31234) accents, with the brand gradient reserved for one word or
 * one tiny dot per asset. The star here is UI: real product-card, admin
 * panel, checkout, stock table and storefront-link fragments rebuilt as
 * clean motion graphics, with card-to-card MORPHS as the signature move.
 *
 *  ReelMorph     ~12s  one white card morphs: IG post → product → order → profit
 *  ReelPanelLive ~11s  the admin panel assembles itself; toggle flips, order ships
 *  ReelQuiet     ~10s  giant ink kinetic type: Pa kod / Pa programues / Vetëm shitje
 *  PostCheckout  ~8s   checkout UI: card dots type in, Paguaj press → success ✓
 *  PostStock     ~8s   stock table: order lands, size-42 count rolls 12 → 11
 *  PostLink      ~7.6s browser bar types dyqani-yt.vela.al → storefront assembles
 *  + one still per concept (3 × 9:16, 3 × 4:5)
 */
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND, CLASH, SATOSHI, GRAD, GRAD_TEXT, Grain, springy, rise, exitUp, CurrencyRoll, CURRENCY_SYMBOLS } from "./mkKit";

const clamp = (f: number, a: [number, number], b: [number, number], ease?: (t: number) => number) =>
  interpolate(f, a, b, { extrapolateLeft: "clamp", extrapolateRight: "clamp", ...(ease ? { easing: ease } : {}) });

/* ── light tokens ─────────────────────────────────────────────────────── */
const INK = BRAND.dark; // #140A0E
const MUTED = "#796770";
const LINE = "#EDE4E1";
const CREAM = "#FBF6F4";
const WINE = "#A31234";
const CARD = "#FFFFFF";
const SHADOW = "0 30px 70px -34px rgba(20,10,14,0.28)";

/** Paper canvas with ink chrome — the light twin of NightShell. */
export const LightShell: React.FC<{ children: React.ReactNode; reel?: boolean; chrome?: boolean; chromeFrom?: number }> = ({ children, reel, chrome = true, chromeFrom = 8 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const inA = chromeFrom;
  const inB = chromeFrom + 16;
  const outA = Math.max(inB + 1, durationInFrames - 14);
  const outB = Math.max(outA + 1, durationInFrames - 2);
  const op = interpolate(frame, [inA, inB, outA, outB], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: CREAM, fontFamily: SATOSHI }}>
      <div style={{ position: "absolute", right: -260, top: -300, width: 940, height: 940, borderRadius: 999, background: "rgba(163,18,52,0.05)", filter: "blur(160px)" }} />
      <div style={{ position: "absolute", left: -300, bottom: -340, width: 980, height: 980, borderRadius: 999, background: "rgba(245,158,11,0.06)", filter: "blur(160px)" }} />
      <Grain opacity={0.028} />
      {chrome && (
        <>
          <div style={{ position: "absolute", top: reel ? 96 : 64, left: 0, right: 0, textAlign: "center", opacity: op, color: "rgba(20,10,14,0.45)", fontSize: reel ? 30 : 26, fontWeight: 700, zIndex: 6 }}>
            @vela.al
          </div>
          <div style={{ position: "absolute", bottom: reel ? 92 : 60, left: 0, right: 0, textAlign: "center", opacity: op * 0.9, color: "rgba(20,10,14,0.35)", fontSize: reel ? 24 : 22, fontWeight: 700, letterSpacing: "0.3em", zIndex: 6 }}>
            VELA — DYQANI YT ONLINE
          </div>
        </>
      )}
      <AbsoluteFill style={{ padding: reel ? "270px 84px 280px" : "150px 84px 150px", zIndex: 3 }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Ink CTA pill — quiet twin of the gradient Cta. */
export const InkCta: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({ children, size = 40, style }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 16, padding: `${size * 0.62}px ${size * 1.4}px`, borderRadius: 999, background: INK, color: CREAM, fontFamily: CLASH, fontWeight: 600, fontSize: size, letterSpacing: "-0.01em", boxShadow: "0 26px 60px -26px rgba(20,10,14,0.55)", ...style }}>
    <span style={{ width: size * 0.3, height: size * 0.3, borderRadius: 99, backgroundImage: GRAD }} />
    {children}
  </div>
);

/* ── light UI fragments ───────────────────────────────────────────────── */
export const photoPanel = (h: number, fs = 30): React.ReactNode => (
  <div style={{ height: h, background: "#EFE5E1", display: "grid", placeItems: "center" }}>
    <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: fs, color: "rgba(20,10,14,0.4)", letterSpacing: "0.06em" }}>FOTO</div>
  </div>
);

export const LIgPost: React.FC<{ width?: number }> = ({ width = 600 }) => (
  <div style={{ width, background: CARD, borderRadius: 28, overflow: "hidden", border: `2px solid ${LINE}`, boxShadow: SHADOW, fontFamily: SATOSHI }}>
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 24px" }}>
      <div style={{ width: 50, height: 50, borderRadius: 999, background: INK }} />
      <div>
        <div style={{ fontWeight: 700, fontSize: 26, color: INK }}>dyqani.yt</div>
        <div style={{ fontSize: 20, color: MUTED }}>Tiranë</div>
      </div>
    </div>
    {photoPanel(width * 0.56)}
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 18, fontSize: 28 }}>❤️ 💬 ✈️</div>
      <div style={{ fontSize: 23, color: "#3d3236", lineHeight: 1.45 }}>Atlete vrapi ✨ 4,500 L · masat 40–44 · DM për porosi</div>
    </div>
  </div>
);

export const LProductCard: React.FC<{ width?: number }> = ({ width = 600 }) => (
  <div style={{ width, background: CARD, borderRadius: 28, overflow: "hidden", border: `2px solid ${LINE}`, boxShadow: SHADOW, fontFamily: SATOSHI }}>
    {photoPanel(width * 0.5)}
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 33, color: INK }}>Atlete Vrapi Air</div>
        <div style={{ background: "#EAF7EE", color: "#1E7C3F", borderRadius: 99, padding: "6px 18px", fontSize: 21, fontWeight: 700 }}>Në stok</div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        {["40", "41", "42", "43", "44"].map((m) => (
          <span key={m} style={{ border: `2px solid ${LINE}`, borderRadius: 12, padding: "6px 16px", fontSize: 22, fontWeight: 700, color: "#4a3f44" }}>{m}</span>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
        <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 38, color: WINE }}>4,500 L</div>
        <div style={{ background: INK, color: CREAM, borderRadius: 999, padding: "12px 28px", fontSize: 23, fontWeight: 700 }}>Shto në shportë</div>
      </div>
    </div>
  </div>
);

export const LNotif: React.FC<{ width?: number; name?: string; amount?: string }> = ({ width = 690, name = "Elisa nga Tirana", amount = "4,500 L" }) => (
  <div style={{ width, display: "flex", alignItems: "center", gap: 20, background: CARD, borderRadius: 26, border: `2px solid ${LINE}`, padding: "22px 28px", boxShadow: SHADOW, fontFamily: SATOSHI }}>
    <div style={{ width: 60, height: 60, borderRadius: 18, background: INK, display: "grid", placeItems: "center", fontSize: 30, flexShrink: 0 }}>🛍️</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 700, fontSize: 27, color: INK }}>Porosi e re!</div>
      <div style={{ fontSize: 22, color: MUTED }}>{name} · me kartë</div>
    </div>
    <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 32, color: WINE, flexShrink: 0 }}>{amount}</div>
  </div>
);

export const LStat: React.FC<{ width?: number }> = ({ width = 730 }) => (
  <div style={{ width, background: CARD, borderRadius: 26, border: `2px solid ${LINE}`, padding: "26px 32px", boxShadow: SHADOW, fontFamily: SATOSHI, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
    <div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: MUTED }}>Të ardhurat sot</div>
      <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 58, lineHeight: 1.1, color: INK }}>18,300 L</div>
    </div>
    <div style={{ color: "#1E7C3F", fontWeight: 800, fontSize: 28, background: "#EAF7EE", borderRadius: 99, padding: "10px 22px" }}>+24%</div>
  </div>
);

/* ══ REEL 4 — the morph: postim → produkt → porosi → fitim ══════════════ */
export const ReelMorph: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hookOut = clamp(frame, [52, 64], [0, 1], Easing.in(Easing.cubic));
  // morph springs
  const t1 = springy(frame, fps, 138, { damping: 15 });
  const t2 = springy(frame, fps, 206, { damping: 15 });
  const t3 = springy(frame, fps, 264, { damping: 15 });
  const stageOut = clamp(frame, [312, 324], [0, 1], Easing.in(Easing.cubic));

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  // ghost card dimensions across the four states
  const w = lerp(lerp(600, 600, t1), lerp(690, 730, t3), t2);
  const h = lerp(lerp(806, 690, t1), lerp(128, 136, t3), t2);
  const layer = (vis: number, node: React.ReactNode) => (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", opacity: vis, filter: `blur(${(1 - vis) * 8}px)`, transform: `scale(${0.94 + vis * 0.06})`, pointerEvents: "none" }}>
      {node}
    </div>
  );
  const captions: [number, string][] = [
    [1 - t1, "Postimi yt në Instagram"],
    [t1 * (1 - t2), "…bëhet produkt në dyqan"],
    [t2 * (1 - t3), "…sjell porosinë e parë"],
    [t3, "…dhe fitimi është yti"],
  ];

  return (
    <LightShell reel>
      {/* HOOK */}
      {frame < 66 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", ...exitUp(hookOut) }}>
          <div style={{ ...rise(springy(frame, fps, 6, { damping: 12, stiffness: 210 })), fontFamily: CLASH, fontWeight: 700, fontSize: 96, color: INK, textAlign: "center", lineHeight: 1.14, letterSpacing: "-0.02em" }}>
            Shiko çfarë bëhet<br />
            <span style={{ color: WINE }}>një postim.</span>
          </div>
        </AbsoluteFill>
      )}
      {/* MORPH CHAIN */}
      {frame >= 60 && frame < 326 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 44, ...exitUp(stageOut) }}>
          <div style={{ ...rise(springy(frame, fps, 62)), position: "relative", width: 760, height: 830, display: "grid", placeItems: "center" }}>
            {/* morphing ghost */}
            <div style={{ position: "absolute", width: w, height: h, borderRadius: 28, background: CARD, border: `2px solid ${LINE}`, boxShadow: SHADOW }} />
            {layer(1 - t1, <LIgPost />)}
            {layer(t1 * (1 - t2), <LProductCard />)}
            {layer(t2 * (1 - t3), <LNotif />)}
            {layer(t3, <LStat />)}
          </div>
          <div style={{ position: "relative", height: 46, width: "100%" }}>
            {captions.map(([vis, txt], i) => (
              <div key={i} style={{ position: "absolute", inset: 0, textAlign: "center", opacity: vis, fontSize: 32, fontWeight: 700, color: MUTED }}>{txt}</div>
            ))}
          </div>
        </AbsoluteFill>
      )}
      {/* PAYOFF */}
      {frame >= 320 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 44 }}>
          <div style={{ ...rise(springy(frame, fps, 326)), fontFamily: CLASH, fontWeight: 700, fontSize: 92, color: INK, textAlign: "center", lineHeight: 1.16 }}>
            Nga postimi<br />te fitimi. <span style={{ color: WINE }}>Vetë.</span>
          </div>
          <div style={{ ...rise(springy(frame, fps, 340)) }}>
            <InkCta>Fillo falas → vela.al</InkCta>
          </div>
        </AbsoluteFill>
      )}
    </LightShell>
  );
};
export const REEL_MORPH_FRAMES = 372;

/* ══ REEL 5 — the panel assembles itself ════════════════════════════════ */
const NAV = ["Paneli", "Porositë", "Produktet", "Stoku", "Pagesat"];

export const PanelWindow: React.FC<{ frame: number; fps: number; from?: number; still?: boolean }> = ({ frame, fps, from = 0, still }) => {
  const s = (d: number, cfg?: { damping?: number; stiffness?: number }) => (still ? 1 : springy(frame, fps, from + d, cfg));
  const on = still || frame >= from + 68; // shop toggle
  const shipped = still || frame >= from + 178;
  const knob = still ? 1 : springy(frame, fps, from + 68, { damping: 13, stiffness: 240 });
  const flip = still ? 0 : clamp(frame, [from + 176, from + 188], [0, 1], Easing.inOut(Easing.cubic));
  const row = (d: number, node: React.ReactNode) => <div style={{ ...rise(s(d)) }}>{node}</div>;
  return (
    <div style={{ width: 900, background: CARD, borderRadius: 32, border: `2px solid ${LINE}`, boxShadow: SHADOW, overflow: "hidden", fontFamily: SATOSHI, transform: `scale(${0.96 + s(0) * 0.04})`, opacity: still ? 1 : Math.min(1, s(0) * 1.5) }}>
      <div style={{ display: "flex", gap: 10, padding: "20px 26px", borderBottom: `2px solid ${LINE}` }}>
        {["#F26B6B", "#F5C043", "#57C46B"].map((c) => <span key={c} style={{ width: 16, height: 16, borderRadius: 99, background: c }} />)}
        <span style={{ marginLeft: 14, fontSize: 21, fontWeight: 700, color: MUTED }}>vela.al / paneli</span>
      </div>
      <div style={{ display: "flex" }}>
        <div style={{ width: 250, borderRight: `2px solid ${LINE}`, padding: "22px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
          {NAV.map((n, i) => (
            <div key={n} style={{ ...rise(s(16 + i * 8)), padding: "13px 18px", borderRadius: 14, fontSize: 23, fontWeight: 700, ...(i === 0 ? { background: INK, color: CREAM } : { color: MUTED }) }}>{n}</div>
          ))}
        </div>
        <div style={{ flex: 1, padding: "24px 26px", display: "flex", flexDirection: "column", gap: 16 }}>
          {row(56, (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `2px solid ${LINE}`, borderRadius: 18, padding: "16px 22px" }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: INK }}>Dyqani</span>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 21, fontWeight: 800, color: on ? "#1E7C3F" : MUTED }}>{on ? "Aktiv" : "Joaktiv"}</span>
                <div style={{ width: 74, height: 40, borderRadius: 99, background: on ? "#1E7C3F" : "#D8CDC9", position: "relative" }}>
                  <span style={{ position: "absolute", top: 5, left: 5 + knob * 34, width: 30, height: 30, borderRadius: 99, background: "#fff" }} />
                </div>
              </div>
            </div>
          ))}
          {[["Atlete Vrapi Air", "4,500 L"], ["Çantë lëkure Mia", "6,900 L"]].map(([n, p], i) =>
            row(96 + i * 16, (
              <div key={n} style={{ display: "flex", alignItems: "center", gap: 16, border: `2px solid ${LINE}`, borderRadius: 18, padding: "14px 20px" }}>
                <span style={{ width: 52, height: 52, borderRadius: 12, background: "#EFE5E1" }} />
                <span style={{ flex: 1, fontSize: 24, fontWeight: 700, color: INK }}>{n}</span>
                <span style={{ fontSize: 23, fontWeight: 700, color: WINE }}>{p}</span>
                <span style={{ fontSize: 19, fontWeight: 800, color: "#1E7C3F", background: "#EAF7EE", borderRadius: 99, padding: "6px 14px" }}>Live</span>
              </div>
            )),
          )}
          {row(140, (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: `2px solid ${LINE}`, borderRadius: 18, padding: "16px 22px", background: "#FDFAF9" }}>
              <div>
                <div style={{ fontSize: 24, fontWeight: 700, color: INK }}>Porosia #4F2A</div>
                <div style={{ fontSize: 20, color: MUTED }}>Elisa · Tiranë · me kartë</div>
              </div>
              <div style={{ perspective: 500 }}>
                <div style={{ transform: `rotateX(${flip * 180}deg)`, transformStyle: "preserve-3d", position: "relative", width: 190, height: 48 }}>
                  <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", backfaceVisibility: "hidden", borderRadius: 99, fontSize: 21, fontWeight: 800, background: "#FBF3E4", color: "#B07B10" }}>Në pritje</span>
                  <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", backfaceVisibility: "hidden", transform: "rotateX(180deg)", borderRadius: 99, fontSize: 21, fontWeight: 800, background: "#EAF7EE", color: "#1E7C3F" }}>U dërgua ✓</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ReelPanelLive: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hookOut = clamp(frame, [48, 60], [0, 1], Easing.in(Easing.cubic));
  const stageOut = clamp(frame, [282, 294], [0, 1], Easing.in(Easing.cubic));
  const under = clamp(frame, [22, 44], [0, 1], Easing.out(Easing.cubic));
  return (
    <LightShell reel>
      {frame < 62 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", ...exitUp(hookOut) }}>
          <div style={{ ...rise(springy(frame, fps, 4, { damping: 12, stiffness: 210 })), fontFamily: CLASH, fontWeight: 700, fontSize: 100, color: INK, textAlign: "center", lineHeight: 1.14 }}>
            Ky është<br />paneli yt.
          </div>
          <div style={{ width: 320 * under, height: 8, borderRadius: 9, background: WINE, marginTop: 30 }} />
        </AbsoluteFill>
      )}
      {frame >= 56 && frame < 296 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40, ...exitUp(stageOut) }}>
          <PanelWindow frame={frame} fps={fps} from={60} />
          <div style={{ ...rise(springy(frame, fps, 220)), fontSize: 32, fontWeight: 700, color: MUTED }}>Gjithçka, pa dalë nga telefoni.</div>
        </AbsoluteFill>
      )}
      {frame >= 290 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 44 }}>
          <div style={{ ...rise(springy(frame, fps, 296)), fontFamily: CLASH, fontWeight: 700, fontSize: 92, color: INK, textAlign: "center", lineHeight: 1.16 }}>
            Kontroll i plotë.<br /><span style={{ color: WINE }}>Zero kaos.</span>
          </div>
          <div style={{ ...rise(springy(frame, fps, 310)) }}>
            <InkCta>Shihe vetë → vela.al</InkCta>
          </div>
        </AbsoluteFill>
      )}
    </LightShell>
  );
};
export const REEL_PANEL_FRAMES = 344;

/* ══ REEL 6 — quiet kinetic type ════════════════════════════════════════ */
const QUIET_WORDS: [string, number, number][] = [
  ["Pa kod.", 6, 62],
  ["Pa programues.", 62, 116],
  ["Pa DM të humbura.", 116, 174],
];

export const ReelQuiet: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const under = clamp(frame, [206, 232], [0, 1], Easing.out(Easing.cubic));
  return (
    <LightShell reel>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {QUIET_WORDS.map(([txt, a, b]) => {
          const sIn = springy(frame, fps, a, { damping: 13, stiffness: 200 });
          const out = clamp(frame, [b - 8, b], [0, 1], Easing.in(Easing.cubic));
          if (frame < a - 4 || frame > b + 6) return null;
          return (
            <div key={txt} style={{ position: "absolute", ...rise(sIn), opacity: Math.min(1, sIn * 1.4) * (1 - out), transform: `translateY(${(1 - sIn) * 26 - out * 60}px) scale(${1 + out * 0.12})`, filter: `blur(${Math.max(0, 1 - sIn) * 10 + out * 8}px)`, fontFamily: CLASH, fontWeight: 700, fontSize: 128, color: INK, letterSpacing: "-0.02em", textAlign: "center" }}>
              {txt}
            </div>
          );
        })}
        {frame >= 172 && frame < 252 && (
          <div style={{ position: "absolute", textAlign: "center", ...exitUp(clamp(frame, [242, 252], [0, 1], Easing.in(Easing.cubic))) }}>
            <div style={{ ...rise(springy(frame, fps, 176, { damping: 12, stiffness: 210 })), fontFamily: CLASH, fontWeight: 700, fontSize: 140, color: INK, lineHeight: 1.1 }}>
              Vetëm<br />
              <span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>shitje.</span>
            </div>
            <div style={{ width: 420 * under, height: 9, borderRadius: 9, backgroundImage: GRAD, margin: "26px auto 0" }} />
          </div>
        )}
        {frame >= 248 && (
          <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
            <div style={{ ...rise(springy(frame, fps, 254)), fontFamily: CLASH, fontWeight: 700, fontSize: 76, color: INK, textAlign: "center", lineHeight: 1.2 }}>
              E thjeshtë, si postimi.
            </div>
            <div style={{ ...rise(springy(frame, fps, 266)) }}>
              <InkCta>Fillo falas → vela.al</InkCta>
            </div>
          </div>
        )}
      </AbsoluteFill>
    </LightShell>
  );
};
export const REEL_QUIET_FRAMES = 306;

/* ══ POST 4 — checkout: dots type, button press, success ════════════════ */
export const PostCheckout: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const groups = [0, 1, 2, 3].map((i) => clamp(frame, [56 + i * 14, 64 + i * 14], [0, 1]));
  const press = clamp(frame, [136, 142], [0, 1], Easing.inOut(Easing.cubic)) - clamp(frame, [142, 150], [0, 1], Easing.inOut(Easing.cubic));
  const done = clamp(frame, [152, 164], [0, 1], Easing.inOut(Easing.cubic));
  const ring = clamp(frame, [156, 186], [0, 1], Easing.out(Easing.cubic));
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <LightShell>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 42 }}>
        <div style={{ ...rise(springy(frame, fps, 4, { damping: 12, stiffness: 210 })), fontFamily: CLASH, fontWeight: 700, fontSize: 84, color: INK, letterSpacing: "-0.02em" }}>
          Kështu duket <span style={{ color: WINE }}>pagesa.</span>
        </div>
        <div style={{ ...rise(springy(frame, fps, 22)), width: 780, background: CARD, borderRadius: 30, border: `2px solid ${LINE}`, boxShadow: SHADOW, padding: "34px 40px", position: "relative", overflow: "hidden", transform: `scale(${1 - press * 0.03})` }}>
          <div style={{ opacity: 1 - done, display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <span style={{ width: 62, height: 62, borderRadius: 14, background: "#EFE5E1" }} />
              <span style={{ flex: 1, fontSize: 27, fontWeight: 700, color: INK }}>Atlete Vrapi Air · 42</span>
              <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 30, color: INK }}>4,500 L</span>
            </div>
            <div style={{ height: 2, background: LINE }} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, color: MUTED, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>Numri i kartës</div>
              <div style={{ display: "flex", gap: 22, border: `2px solid ${LINE}`, borderRadius: 16, padding: "20px 24px" }}>
                {groups.map((g, i) => (
                  <span key={i} style={{ fontSize: 30, fontWeight: 800, color: INK, opacity: 0.2 + g * 0.8, letterSpacing: "0.2em" }}>{i === 3 ? "4242" : "••••"}</span>
                ))}
              </div>
            </div>
            <div style={{ background: INK, color: CREAM, borderRadius: 18, textAlign: "center", padding: "22px 0", fontFamily: CLASH, fontWeight: 600, fontSize: 32 }}>
              Paguaj 4,500 L
            </div>
          </div>
          {/* success layer */}
          <div style={{ position: "absolute", inset: 0, background: CARD, display: done > 0.01 ? "flex" : "none", opacity: done, flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
            <svg width={130} height={130} viewBox="0 0 130 130">
              <circle cx={65} cy={65} r={R} fill="none" stroke="#1E7C3F" strokeWidth={9} strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - ring)} transform="rotate(-90 65 65)" />
              <path d="M42 67 L59 84 L90 50" fill="none" stroke="#1E7C3F" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={80} strokeDashoffset={80 * (1 - clamp(frame, [172, 194], [0, 1], Easing.out(Easing.cubic)))} />
            </svg>
            <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 42, color: INK }}>Porosia u krye</div>
            <div style={{ fontSize: 25, color: MUTED, fontWeight: 700, display: "flex", alignItems: "center" }}>
              Pagesa në&nbsp;<CurrencyRoll size={25} color={INK} width={118} />&nbsp;· e sigurt · në çast
            </div>
          </div>
        </div>
        <div style={{ ...rise(springy(frame, fps, 206)), fontSize: 30, fontWeight: 700, color: MUTED }}>
          Karta ose në dorëzim — ti zgjedh.
        </div>
      </AbsoluteFill>
    </LightShell>
  );
};
export const POST_CHECKOUT_FRAMES = 252;

/* ══ POST 5 — stock table: order lands, count rolls down ════════════════ */
const STOCK_ROWS: [string, number][] = [["40", 8], ["41", 14], ["42", 12], ["43", 9], ["44", 5]];

export const PostStock: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const notifIn = springy(frame, fps, 96, { damping: 12, stiffness: 220 });
  const roll = clamp(frame, [128, 142], [0, 1], Easing.inOut(Easing.cubic));
  const hi = clamp(frame, [120, 132], [0, 1]) - clamp(frame, [176, 196], [0, 1]);
  const chip = springy(frame, fps, 168);
  return (
    <LightShell>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40 }}>
        <div style={{ ...rise(springy(frame, fps, 4, { damping: 12, stiffness: 210 })), fontFamily: CLASH, fontWeight: 700, fontSize: 88, color: INK }}>
          Harroje <span style={{ color: WINE }}>Excel-in.</span>
        </div>
        <div style={{ position: "relative" }}>
          <div style={{ ...rise(springy(frame, fps, 20)), width: 760, background: CARD, borderRadius: 30, border: `2px solid ${LINE}`, boxShadow: SHADOW, padding: "30px 36px", fontFamily: SATOSHI }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 32, color: INK }}>Atlete Vrapi Air — stoku</div>
              <div style={{ fontSize: 21, fontWeight: 700, color: MUTED }}>5 masa</div>
            </div>
            {STOCK_ROWS.map(([size, n], i) => {
              const isHot = size === "42";
              return (
                <div key={size} style={{ ...rise(springy(frame, fps, 34 + i * 9)), display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 20px", borderRadius: 14, background: isHot ? `rgba(163,18,52,${0.07 * Math.max(0, hi)})` : "transparent", borderBottom: i < 4 ? `2px solid ${LINE}` : "none" }}>
                  <span style={{ fontSize: 26, fontWeight: 800, color: INK }}>Masa {size}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    {isHot ? (
                      <span style={{ display: "inline-block", height: 34, overflow: "hidden", fontFamily: CLASH, fontWeight: 700, fontSize: 30, color: INK, lineHeight: "34px" }}>
                        <span style={{ display: "block", transform: `translateY(${-roll * 34}px)` }}>
                          <span style={{ display: "block" }}>{n} copë</span>
                          <span style={{ display: "block" }}>{n - 1} copë</span>
                        </span>
                      </span>
                    ) : (
                      <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 30, color: INK }}>{n} copë</span>
                    )}
                  </div>
                </div>
              );
            })}
            <div style={{ marginTop: 22, opacity: Math.min(1, chip * 1.4), transform: `translateY(${(1 - chip) * 18}px)`, display: "flex", justifyContent: "center" }}>
              <span style={{ background: "#EAF7EE", color: "#1E7C3F", borderRadius: 99, padding: "12px 28px", fontSize: 24, fontWeight: 800 }}>Stoku përditësohet vetë ✓</span>
            </div>
          </div>
          <div style={{ position: "absolute", top: -34, right: -60, opacity: Math.min(1, notifIn * 1.5), transform: `translateY(${(1 - notifIn) * -60}px) rotate(${(1 - notifIn) * 4 + 2}deg)` }}>
            <LNotif width={520} name="Porosi · masa 42" amount="4,500 L" />
          </div>
        </div>
        <div style={{ ...rise(springy(frame, fps, 200)), fontSize: 31, fontWeight: 700, color: MUTED }}>
          Ti shet. <span style={{ color: INK }}>Sistemi numëron.</span>
        </div>
      </AbsoluteFill>
    </LightShell>
  );
};
export const POST_STOCK_FRAMES = 246;

/* ══ POST 6 — the link: address bar types, storefront assembles ═════════ */
const URL_TEXT = "dyqani-yt.vela.al";
const MINI_PRODUCTS: [string, string][] = [["Atlete Vrapi Air", "4,500 L"], ["Çantë Mia", "6,900 L"], ["Fustan Lina", "5,200 L"], ["Syze Aria", "2,400 L"]];

export const PostLink: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chars = Math.floor(clamp(frame, [40, 96], [0, URL_TEXT.length]));
  const caret = frame < 100 && Math.floor(frame / 9) % 2 === 0;
  return (
    <LightShell>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 38 }}>
        <div style={{ ...rise(springy(frame, fps, 4, { damping: 12, stiffness: 210 })), fontFamily: CLASH, fontWeight: 700, fontSize: 86, color: INK }}>
          Dyqani yt = <span style={{ color: WINE }}>një link.</span>
        </div>
        <div style={{ ...rise(springy(frame, fps, 20)), width: 800, display: "flex", alignItems: "center", gap: 18, background: CARD, borderRadius: 99, border: `2px solid ${LINE}`, boxShadow: SHADOW, padding: "20px 32px" }}>
          <span style={{ width: 30, height: 30, borderRadius: 99, border: `3px solid ${MUTED}`, display: "inline-block" }} />
          <span style={{ fontSize: 31, fontWeight: 700, color: INK, letterSpacing: "0.01em" }}>
            {URL_TEXT.slice(0, chars)}
            {caret && <span style={{ color: WINE }}>|</span>}
          </span>
          <span style={{ marginLeft: "auto", background: INK, color: CREAM, borderRadius: 99, padding: "10px 24px", fontSize: 22, fontWeight: 800, opacity: clamp(frame, [98, 108], [0, 1]) }}>Hap ↵</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, width: 800 }}>
          {MINI_PRODUCTS.map(([n, p], i) => {
            const s = springy(frame, fps, 116 + i * 10, { damping: 14 });
            return (
              <div key={n} style={{ opacity: Math.min(1, s * 1.5), transform: `translateY(${(1 - s) * 40}px) scale(${0.94 + s * 0.06})`, background: CARD, borderRadius: 24, border: `2px solid ${LINE}`, boxShadow: SHADOW, overflow: "hidden" }}>
                {photoPanel(150, 24)}
                <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 24, fontWeight: 700, color: INK }}>{n}</span>
                  <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 25, color: WINE }}>{p}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ ...rise(springy(frame, fps, 180)), fontSize: 31, fontWeight: 700, color: MUTED }}>
          Ndaje kudo. <span style={{ color: INK }}>Shit kudo.</span>
        </div>
      </AbsoluteFill>
    </LightShell>
  );
};
export const POST_LINK_FRAMES = 230;

/* ══ LIGHT STILLS ═══════════════════════════════════════════════════════ */
const Scaled: React.FC<{ s: number; children: React.ReactNode }> = ({ s, children }) => (
  <div style={{ transform: `scale(${s})`, transformOrigin: "center" }}>{children}</div>
);
const InkArrow: React.FC = () => (
  <div style={{ width: 3, height: 34, background: INK, opacity: 0.35, position: "relative", margin: "2px 0" }}>
    <span style={{ position: "absolute", bottom: -2, left: -7, borderLeft: "9px solid transparent", borderRight: "9px solid transparent", borderTop: `12px solid rgba(20,10,14,0.35)` }} />
  </div>
);

/** 9:16 — the morph chain as one flow poster. */
export const StillMorphLight: React.FC = () => (
  <LightShell reel>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 10 }}>
      <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 78, color: INK, textAlign: "center", lineHeight: 1.12, marginBottom: 14 }}>
        Nga postimi<br />te <span style={{ color: WINE }}>fitimi.</span>
      </div>
      <Scaled s={0.72}><div style={{ margin: -60 }}><LIgPost /></div></Scaled>
      <InkArrow />
      <Scaled s={0.72}><div style={{ margin: -50 }}><LProductCard /></div></Scaled>
      <InkArrow />
      <Scaled s={0.8}><LNotif /></Scaled>
      <InkArrow />
      <Scaled s={0.8}><LStat /></Scaled>
      <div style={{ marginTop: 22, fontSize: 30, fontWeight: 700, color: MUTED }}>Vela e bën vetë, hap pas hapi.</div>
    </AbsoluteFill>
  </LightShell>
);

/** 9:16 — the panel, assembled. */
export const StillPanelLight: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <LightShell reel>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 44 }}>
        <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 88, color: INK, textAlign: "center", lineHeight: 1.12 }}>
          Ky është<br />paneli yt.
        </div>
        <PanelWindow frame={frame} fps={fps} still />
        <div style={{ fontSize: 30, fontWeight: 700, color: MUTED, textAlign: "center" }}>
          Porositë, produktet, stoku, pagesat.<br />Gjithçka, pa dalë nga telefoni.
        </div>
        <InkCta size={34}>Shihe vetë → vela.al</InkCta>
      </AbsoluteFill>
    </LightShell>
  );
};

/** 9:16 — quiet type poster. */
export const StillQuiet: React.FC = () => (
  <LightShell reel>
    <AbsoluteFill style={{ alignItems: "flex-start", justifyContent: "center", padding: "0 30px", gap: 26 }}>
      {["Pa kod.", "Pa programues.", "Pa DM të humbura."].map((t, i) => (
        <div key={t} style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 104, color: INK, opacity: 0.34 + i * 0.22, letterSpacing: "-0.02em" }}>{t}</div>
      ))}
      <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 124, letterSpacing: "-0.02em", backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
        Vetëm shitje.
      </div>
      <div style={{ width: 400, height: 9, borderRadius: 9, backgroundImage: GRAD }} />
      <div style={{ marginTop: 26 }}>
        <InkCta size={36}>Fillo falas → vela.al</InkCta>
      </div>
    </AbsoluteFill>
  </LightShell>
);

/** 4:5 — checkout success card. */
export const StillCheckout: React.FC = () => {
  const R = 52;
  const C = 2 * Math.PI * R;
  return (
    <LightShell>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40 }}>
        <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 84, color: INK, textAlign: "center", lineHeight: 1.14 }}>
          Pagesa <span style={{ color: WINE }}>online.</span><br />Në monedhën tënde.
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          {CURRENCY_SYMBOLS.map((s) => (
            <span key={s} style={{ border: `2px solid ${LINE}`, background: CARD, borderRadius: 99, padding: "10px 24px", fontFamily: CLASH, fontWeight: 700, fontSize: 28, color: WINE, boxShadow: SHADOW }}>{s}</span>
          ))}
        </div>
        <div style={{ width: 780, background: CARD, borderRadius: 30, border: `2px solid ${LINE}`, boxShadow: SHADOW, padding: "48px 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
          <svg width={130} height={130} viewBox="0 0 130 130">
            <circle cx={65} cy={65} r={R} fill="none" stroke="#1E7C3F" strokeWidth={9} strokeLinecap="round" strokeDasharray={C} />
            <path d="M42 67 L59 84 L90 50" fill="none" stroke="#1E7C3F" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 44, color: INK }}>Porosia u krye</div>
          <div style={{ fontSize: 26, color: MUTED, fontWeight: 700 }}>Atlete Vrapi Air · 4,500 L · me kartë</div>
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: MUTED }}>Karta ose në dorëzim — ti zgjedh.</div>
      </AbsoluteFill>
    </LightShell>
  );
};

/** 4:5 — the stock table. */
export const StillStock: React.FC = () => (
  <LightShell>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 38 }}>
      <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 84, color: INK }}>
        Stoku numërohet <span style={{ color: WINE }}>vetë.</span>
      </div>
      <div style={{ width: 760, background: CARD, borderRadius: 30, border: `2px solid ${LINE}`, boxShadow: SHADOW, padding: "30px 36px", fontFamily: SATOSHI }}>
        <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 32, color: INK, marginBottom: 18 }}>Atlete Vrapi Air — stoku</div>
        {STOCK_ROWS.map(([size, n], i) => (
          <div key={size} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 20px", borderBottom: i < 4 ? `2px solid ${LINE}` : "none", background: size === "42" ? "rgba(163,18,52,0.06)" : "transparent", borderRadius: 14 }}>
            <span style={{ fontSize: 26, fontWeight: 800, color: INK }}>Masa {size}</span>
            <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 30, color: INK }}>{size === "42" ? "11 copë" : `${n} copë`}</span>
          </div>
        ))}
        <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
          <span style={{ background: "#EAF7EE", color: "#1E7C3F", borderRadius: 99, padding: "12px 28px", fontSize: 24, fontWeight: 800 }}>Stoku përditësohet vetë ✓</span>
        </div>
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color: MUTED }}>Ti shet. Sistemi numëron.</div>
    </AbsoluteFill>
  </LightShell>
);

/** 4:5 — the link + mini storefront. */
export const StillLink: React.FC = () => (
  <LightShell>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34 }}>
      <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 84, color: INK }}>
        Dyqani yt = <span style={{ color: WINE }}>një link.</span>
      </div>
      <div style={{ width: 800, display: "flex", alignItems: "center", gap: 18, background: CARD, borderRadius: 99, border: `2px solid ${LINE}`, boxShadow: SHADOW, padding: "20px 32px" }}>
        <span style={{ width: 30, height: 30, borderRadius: 99, border: `3px solid ${MUTED}` }} />
        <span style={{ fontSize: 31, fontWeight: 700, color: INK }}>dyqani-yt.vela.al</span>
        <span style={{ marginLeft: "auto", background: INK, color: CREAM, borderRadius: 99, padding: "10px 24px", fontSize: 22, fontWeight: 800 }}>Hap ↵</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22, width: 800 }}>
        {MINI_PRODUCTS.map(([n, p]) => (
          <div key={n} style={{ background: CARD, borderRadius: 24, border: `2px solid ${LINE}`, boxShadow: SHADOW, overflow: "hidden" }}>
            {photoPanel(150, 24)}
            <div style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: INK }}>{n}</span>
              <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 25, color: WINE }}>{p}</span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color: MUTED }}>Ndaje kudo. Shit kudo.</div>
    </AbsoluteFill>
  </LightShell>
);
