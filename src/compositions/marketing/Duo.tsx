/**
 * DUO SERIES (07–09) — the hybrid wave: night × paper in the same frame.
 * Mixes wave 1 (night canvas, gradient headlines, weighted springs) with
 * wave 2 (clean white UI fragments, ink type, morph moves). Signature
 * effects: a gradient BLADE WIPE that swaps night→paper mid-reel, white UI
 * cards floating on the night canvas, and live theme-morphing product cards.
 *
 *  ReelBeforeAfter ~12s  night DM chaos → blade wipe → paper order calm → payoff
 *  ReelDayWithVela ~12.3s a merchant's day in 4 timestamped beats (UI on night)
 *  ReelYourBrand   ~11.7s product card re-themes itself live → night payoff
 *  PostNightSales  ~8.2s  23:47 — notifications while you sleep
 *  PostSplit       ~8s    split-screen para/pas with traveling divider
 *  PostThemes      ~7.7s  theme picker: one card, three brands
 *  + one still per concept (3 × 9:16, 3 × 4:5)
 */
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND, CLASH, SATOSHI, GRAD, GRAD_TEXT, Blobs, Grain, NightShell, Cta, springy, rise, exitUp, CurrencyRoll } from "./mkKit";
import { LNotif, LStat, LIgPost, LProductCard, photoPanel } from "./Light";

const clamp = (f: number, a: [number, number], b: [number, number], ease?: (t: number) => number) =>
  interpolate(f, a, b, { extrapolateLeft: "clamp", extrapolateRight: "clamp", ...(ease ? { easing: ease } : {}) });

const INK = BRAND.dark;
const MUTED = "#796770";
const LINE = "#EDE4E1";
const CREAM = "#FBF6F4";
const WINE = "#A31234";
const SHADOW = "0 30px 70px -34px rgba(20,10,14,0.28)";

/* raw canvases (no chrome) for layered/wiped comps */
export const NightBg: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: BRAND.dark, fontFamily: SATOSHI }}>
      <Blobs frame={frame} />
      <Grain />
      {children}
    </AbsoluteFill>
  );
};
export const PaperBg: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: CREAM, fontFamily: SATOSHI }}>
    <div style={{ position: "absolute", right: -260, top: -300, width: 940, height: 940, borderRadius: 999, background: "rgba(163,18,52,0.05)", filter: "blur(160px)" }} />
    <div style={{ position: "absolute", left: -300, bottom: -340, width: 980, height: 980, borderRadius: 999, background: "rgba(245,158,11,0.06)", filter: "blur(160px)" }} />
    <Grain opacity={0.028} />
    {children}
  </AbsoluteFill>
);

/* DM bubble (the chaos side) */
export const Bubble: React.FC<{ text: string; style?: React.CSSProperties }> = ({ text, style }) => (
  <div style={{ display: "inline-block", background: "rgba(255,255,255,0.96)", color: "#222", borderRadius: 26, borderBottomLeftRadius: 8, padding: "18px 28px", fontSize: 27, fontWeight: 700, fontFamily: SATOSHI, boxShadow: "0 24px 60px -22px rgba(0,0,0,0.55)", ...style }}>
    {text}
  </div>
);

const BUBBLES: [string, number, number, number, number][] = [
  // text, left(px on 1080), top(px), rotate, delay
  ["Sa kushton? 🙏", 100, 560, -5, 18],
  ["A ka masë M?", 520, 640, 4, 34],
  ["Çmimi ju lutem", 180, 780, -2, 50],
  ["E keni në të zezë?", 470, 890, 5, 66],
  ["A bëni dërgesa?", 120, 1010, -4, 82],
  ["Sa kushton??", 540, 1110, 2, 98],
  ["Ende pa përgjigje…", 260, 1240, -3, 116],
];

/* ══ REEL 7 — para / pas with a gradient blade wipe ═════════════════════ */
export const ReelBeforeAfter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wipe = clamp(frame, [150, 196], [0, 1], Easing.inOut(Easing.cubic)); // 0 = full night, 1 = full paper
  const payoff = clamp(frame, [286, 300], [0, 1], Easing.inOut(Easing.cubic));
  const paperOut = clamp(frame, [278, 290], [0, 1], Easing.in(Easing.cubic));

  return (
    <AbsoluteFill style={{ fontFamily: SATOSHI }}>
      {/* PAPER (revealed) */}
      <PaperBg>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34, padding: "270px 84px 280px", ...exitUp(paperOut) }}>
          <div style={{ ...rise(springy(frame, fps, 196, { damping: 12, stiffness: 210 })), fontFamily: CLASH, fontWeight: 700, fontSize: 96, color: INK }}>
            Pas<span style={{ color: WINE }}>.</span>
          </div>
          <div style={{ ...rise(springy(frame, fps, 212)) }}><LNotif /></div>
          <div style={{ ...rise(springy(frame, fps, 226)) }}><LNotif name="Andi nga Durrësi" amount="2,900 L" /></div>
          <div style={{ ...rise(springy(frame, fps, 240)) }}><LStat /></div>
          <div style={{ ...rise(springy(frame, fps, 256)), fontSize: 31, fontWeight: 700, color: MUTED }}>Porositë vijnë vetë. Ti vetëm dërgon.</div>
        </AbsoluteFill>
      </PaperBg>
      {/* NIGHT (clipped away by the wipe) */}
      <AbsoluteFill style={{ clipPath: `inset(0 ${wipe * 100}% 0 0)` }}>
        <NightBg>
          <AbsoluteFill style={{ padding: "270px 84px 280px" }}>
            <div style={{ ...rise(springy(frame, fps, 8, { damping: 12, stiffness: 210 })), textAlign: "center", fontFamily: CLASH, fontWeight: 700, fontSize: 96, color: "#fff" }}>
              Para<span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>.</span>
            </div>
            {BUBBLES.map(([t, x, y, r, d]) => {
              const s = springy(frame, fps, d, { damping: 12, stiffness: 220 });
              if (s <= 0.01) return null;
              return (
                <div key={t + x} style={{ position: "absolute", left: x, top: y, opacity: Math.min(1, s * 1.5), transform: `translateY(${(1 - s) * 60}px) rotate(${r}deg) scale(${0.92 + s * 0.08})` }}>
                  <Bubble text={t} />
                </div>
              );
            })}
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 320, display: "flex", justifyContent: "center", ...rise(springy(frame, fps, 126)) }}>
              <span style={{ background: "#E5484D", color: "#fff", borderRadius: 999, padding: "16px 36px", fontSize: 30, fontWeight: 800, boxShadow: "0 24px 70px -20px rgba(229,72,77,0.7)" }}>
                47 DM pa përgjigje
              </span>
            </div>
          </AbsoluteFill>
        </NightBg>
      </AbsoluteFill>
      {/* the blade */}
      {wipe > 0.001 && wipe < 0.999 && (
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${(1 - wipe) * 100}%`, width: 10, marginLeft: -5, backgroundImage: GRAD, boxShadow: "0 0 60px 14px rgba(255,46,77,0.55)" }} />
      )}
      {/* NIGHT PAYOFF overlay */}
      {payoff > 0.001 && (
        <AbsoluteFill style={{ opacity: payoff }}>
          <NightBg>
            <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 44 }}>
              <div style={{ ...rise(springy(frame, fps, 300)), textAlign: "center", fontFamily: CLASH, fontWeight: 700, fontSize: 92, color: "#fff", lineHeight: 1.16 }}>
                Nga kaosi<br />
                te <span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>kontrolli.</span>
              </div>
              <div style={{ ...rise(springy(frame, fps, 316)) }}>
                <Cta size={40}>Fillo falas → vela.al</Cta>
              </div>
              <div style={{ position: "absolute", bottom: 92, left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 24, fontWeight: 700, letterSpacing: "0.3em" }}>
                VELA — DYQANI YT ONLINE
              </div>
            </AbsoluteFill>
          </NightBg>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
export const REEL_BA_FRAMES = 360;

/* ══ REEL 8 — a day with Vela (white UI on the night canvas) ════════════ */
const DAY_BEATS: { t: string; label: string; from: number; to: number; card: React.ReactNode }[] = [
  { t: "08:00", label: "Ti poston, si gjithmonë.", from: 8, to: 96, card: <LIgPost width={540} /> },
  { t: "12:30", label: "Sistemi e kthen në produkt.", from: 96, to: 182, card: <LProductCard width={560} /> },
  {
    t: "17:45", label: "Porositë vijnë.", from: 182, to: 264,
    card: (
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <LNotif width={640} />
        <LNotif width={640} name="Sara nga Vlora" amount="6,900 L" />
      </div>
    ),
  },
  { t: "23:10", label: "Ti sheh vetëm shifrat.", from: 264, to: 322, card: <LStat width={660} /> },
];

export const ReelDayWithVela: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <NightShell reel>
      {DAY_BEATS.map((b) => {
        if (frame < b.from - 4 || frame > b.to + 8) return null;
        const out = clamp(frame, [b.to - 10, b.to], [0, 1], Easing.in(Easing.cubic));
        return (
          <AbsoluteFill key={b.t} style={{ alignItems: "center", justifyContent: "center", gap: 30, ...exitUp(out) }}>
            <div style={{ ...rise(springy(frame, fps, b.from, { damping: 12, stiffness: 220 })), fontFamily: CLASH, fontWeight: 700, fontSize: 110, backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", letterSpacing: "-0.01em" }}>
              {b.t}
            </div>
            <div style={{ ...rise(springy(frame, fps, b.from + 8)), fontSize: 37, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{b.label}</div>
            <div style={{ ...rise(springy(frame, fps, b.from + 18)), marginTop: 8 }}>{b.card}</div>
          </AbsoluteFill>
        );
      })}
      {frame >= 326 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 42 }}>
          <div style={{ ...rise(springy(frame, fps, 330)), textAlign: "center", fontFamily: CLASH, fontWeight: 700, fontSize: 88, color: "#fff", lineHeight: 1.16 }}>
            Një ditë me Vela.<br />
            <span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Çdo ditë, vetë.</span>
          </div>
          <div style={{ ...rise(springy(frame, fps, 344)) }}>
            <Cta size={40}>Fillo falas → vela.al</Cta>
          </div>
        </AbsoluteFill>
      )}
    </NightShell>
  );
};
export const REEL_DAY_FRAMES = 370;

/* ══ theme-morphing product card ════════════════════════════════════════ */
export const THEMES = [
  { name: "Vera", accent: WINE, btn: INK, badgeBg: "#EAF7EE", badgeFg: "#1E7C3F" },
  { name: "Deti", accent: "#0E7490", btn: "#0E7490", badgeBg: "#E0F2FE", badgeFg: "#0C4A6E" },
  { name: "Ari", accent: "#B45309", btn: "#B45309", badgeBg: "#FEF3C7", badgeFg: "#92400E" },
];

export const ThemedProduct: React.FC<{ theme: (typeof THEMES)[0]; width?: number }> = ({ theme, width = 580 }) => (
  <div style={{ width, background: "#fff", borderRadius: 28, overflow: "hidden", border: `2px solid ${LINE}`, boxShadow: SHADOW, fontFamily: SATOSHI }}>
    {photoPanel(width * 0.44)}
    <div style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: 13 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 31, color: INK }}>Atlete Vrapi Air</div>
        <div style={{ background: theme.badgeBg, color: theme.badgeFg, borderRadius: 99, padding: "6px 16px", fontSize: 20, fontWeight: 700 }}>Në stok</div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 36, color: theme.accent }}>4,500 L</div>
        <div style={{ background: theme.btn, color: "#fff", borderRadius: 999, padding: "12px 26px", fontSize: 22, fontWeight: 700 }}>Shto në shportë</div>
      </div>
    </div>
  </div>
);

export const ThemeDots: React.FC<{ s1: number; s2: number }> = ({ s1, s2 }) => {
  const ringX = 78 * s1 + 78 * s2; // dot spacing 78
  return (
    <div style={{ position: "relative", display: "flex", gap: 30 }}>
      {THEMES.map((t) => (
        <div key={t.name} style={{ width: 48, height: 48, borderRadius: 99, background: t.accent, boxShadow: "0 12px 34px -12px rgba(20,10,14,0.45)" }} />
      ))}
      <div style={{ position: "absolute", top: -8, left: -8 + ringX, width: 64, height: 64, borderRadius: 99, border: `4px solid ${INK}` }} />
    </div>
  );
};

/** Cross-faded theme stack: which theme shows follows the two springs. */
export const ThemeMorph: React.FC<{ s1: number; s2: number; width?: number }> = ({ s1, s2, width = 580 }) => {
  const ops = [1 - s1, s1 * (1 - s2), s2];
  return (
    <div style={{ position: "relative", width, height: width * 0.44 + 150 }}>
      {THEMES.map((t, i) => (
        <div key={t.name} style={{ position: "absolute", inset: 0, opacity: ops[i], filter: `blur(${(1 - ops[i]) * 4}px)` }}>
          <ThemedProduct theme={t} width={width} />
        </div>
      ))}
    </div>
  );
};

/* ══ REEL 9 — your shop, your brand ═════════════════════════════════════ */
export const ReelYourBrand: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s1 = springy(frame, fps, 128, { damping: 14 });
  const s2 = springy(frame, fps, 192, { damping: 14 });
  const paperOut = clamp(frame, [244, 256], [0, 1], Easing.in(Easing.cubic));
  const night = clamp(frame, [252, 268], [0, 1], Easing.inOut(Easing.cubic));

  return (
    <AbsoluteFill style={{ fontFamily: SATOSHI }}>
      <PaperBg>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40, padding: "270px 84px 280px", ...exitUp(paperOut) }}>
          <div style={{ ...rise(springy(frame, fps, 6, { damping: 12, stiffness: 210 })), textAlign: "center", fontFamily: CLASH, fontWeight: 700, fontSize: 92, color: INK, lineHeight: 1.14 }}>
            Dyqani yt.<br /><span style={{ color: WINE }}>Marka jote.</span>
          </div>
          <div style={{ ...rise(springy(frame, fps, 42)) }}>
            <ThemeMorph s1={s1} s2={s2} />
          </div>
          <div style={{ ...rise(springy(frame, fps, 66)) }}>
            <ThemeDots s1={s1} s2={s2} />
          </div>
          <div style={{ ...rise(springy(frame, fps, 84)), fontSize: 30, fontWeight: 700, color: MUTED }}>Ngjyrat, stili, emri — të gjitha të tuat.</div>
        </AbsoluteFill>
      </PaperBg>
      {night > 0.001 && (
        <AbsoluteFill style={{ opacity: night }}>
          <NightBg>
            <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 44 }}>
              <div style={{ ...rise(springy(frame, fps, 268)), textAlign: "center", fontFamily: CLASH, fontWeight: 700, fontSize: 90, color: "#fff", lineHeight: 1.16 }}>
                Jo një marketplace.<br />
                Dyqani <span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>YT.</span>
              </div>
              <div style={{ ...rise(springy(frame, fps, 284)) }}>
                <Cta size={40}>Ndërtoje tëndin → vela.al</Cta>
              </div>
              <div style={{ position: "absolute", bottom: 92, left: 0, right: 0, textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 24, fontWeight: 700, letterSpacing: "0.3em" }}>
                VELA — DYQANI YT ONLINE
              </div>
            </AbsoluteFill>
          </NightBg>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
export const REEL_BRAND_FRAMES = 350;

/* ══ POST 7 — sells while you sleep ═════════════════════════════════════ */
export const PostNightSales: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <NightShell>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30 }}>
        <div style={{ ...rise(springy(frame, fps, 6, { damping: 12, stiffness: 220 })), fontFamily: CLASH, fontWeight: 700, fontSize: 130, backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
          23:47
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "center" }}>
          {[
            { name: "Klea nga Shkodra", amount: "3,400 L", d: 42 },
            { name: "Andi nga Durrësi", amount: "2,900 L", d: 72 },
          ].map((n) => {
            const s = springy(frame, fps, n.d, { damping: 12, stiffness: 210 });
            if (s <= 0.01) return null;
            return (
              <div key={n.name} style={{ opacity: Math.min(1, s * 1.6), transform: `translateY(${(1 - s) * -70}px) scale(${0.92 + s * 0.08})` }}>
                <LNotif width={680} name={n.name} amount={n.amount} />
              </div>
            );
          })}
        </div>
        <div style={{ ...rise(springy(frame, fps, 118)), textAlign: "center", fontFamily: CLASH, fontWeight: 700, fontSize: 84, color: "#fff", lineHeight: 1.18 }}>
          Ti fle.<br />
          <span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Dyqani shet.</span>
        </div>
        <div style={{ ...rise(springy(frame, fps, 148)), fontSize: 29, fontWeight: 700, color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center" }}>
          Porosi edhe natën — me kartë, në&nbsp;<CurrencyRoll size={29} color="rgba(255,255,255,0.85)" width={120} />
        </div>
        <div style={{ ...rise(springy(frame, fps, 176)), marginTop: 8 }}>
          <Cta size={38}>Provo 7 ditë falas → vela.al</Cta>
        </div>
      </AbsoluteFill>
    </NightShell>
  );
};
export const POST_NIGHT_FRAMES = 246;

/* ══ POST 8 — split screen para / pas ═══════════════════════════════════ */
export const PostSplit: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wipe = clamp(frame, [36, 104], [0, 0.5], Easing.inOut(Easing.cubic)); // settle at 50/50
  return (
    <AbsoluteFill style={{ fontFamily: SATOSHI }}>
      <PaperBg>
        {/* PAS side (right half) */}
        <div style={{ position: "absolute", right: 40, top: 0, bottom: 0, width: 460, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 26 }}>
          <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 54, color: INK, ...rise(springy(frame, fps, 96)) }}>
            Pas<span style={{ color: WINE }}>.</span>
          </div>
          <div style={{ transform: "scale(0.66)", margin: "-24px 0", ...rise(springy(frame, fps, 108)) }}><LNotif /></div>
          <div style={{ transform: "scale(0.66)", margin: "-24px 0", ...rise(springy(frame, fps, 120)) }}><LNotif name="Sara nga Vlora" amount="6,900 L" /></div>
          <div style={{ ...rise(springy(frame, fps, 134)), background: "#EAF7EE", color: "#1E7C3F", borderRadius: 99, padding: "12px 26px", fontSize: 23, fontWeight: 800 }}>
            Gjithçka nën kontroll ✓
          </div>
        </div>
      </PaperBg>
      <AbsoluteFill style={{ clipPath: `inset(0 ${wipe * 100}% 0 0)` }}>
        <NightBg>
          {/* PARA side (left half once settled) */}
          <div style={{ position: "absolute", left: 40, top: 0, bottom: 0, width: 460, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 24 }}>
            <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 54, color: "#fff", ...rise(springy(frame, fps, 8)) }}>
              Para<span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>.</span>
            </div>
            {[["Sa kushton? 🙏", -4, 22], ["Çmimi ju lutem", 3, 38], ["A ka masë M?", -2, 54]].map(([t, r, d]) => {
              const s = springy(frame, fps, d as number, { damping: 12, stiffness: 220 });
              if (s <= 0.01) return null;
              return (
                <div key={t as string} style={{ opacity: Math.min(1, s * 1.5), transform: `rotate(${r}deg) translateY(${(1 - s) * 40}px)` }}>
                  <Bubble text={t as string} style={{ fontSize: 24, padding: "14px 22px" }} />
                </div>
              );
            })}
            <div style={{ ...rise(springy(frame, fps, 70)), background: "#E5484D", color: "#fff", borderRadius: 999, padding: "12px 26px", fontSize: 23, fontWeight: 800 }}>
              47 DM pa përgjigje
            </div>
          </div>
        </NightBg>
      </AbsoluteFill>
      {/* divider */}
      {wipe > 0.02 && (
        <div style={{ position: "absolute", top: 0, bottom: 0, left: `${(1 - wipe) * 100}%`, width: 8, marginLeft: -4, backgroundImage: GRAD, boxShadow: "0 0 46px 10px rgba(255,46,77,0.5)" }} />
      )}
      {/* floating verdict card */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 90, display: "flex", justifyContent: "center", ...rise(springy(frame, fps, 156)) }}>
        <div style={{ background: "#fff", borderRadius: 26, boxShadow: "0 34px 90px -30px rgba(0,0,0,0.5)", padding: "26px 42px", display: "flex", alignItems: "center", gap: 26 }}>
          <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 34, color: INK }}>Ti zgjedh anën.</span>
          <span style={{ backgroundImage: GRAD, color: "#fff", borderRadius: 999, padding: "12px 28px", fontFamily: CLASH, fontWeight: 600, fontSize: 26 }}>Provo falas → vela.al</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
export const POST_SPLIT_FRAMES = 240;

/* ══ POST 9 — one card, three brands ════════════════════════════════════ */
export const PostThemes: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s1 = springy(frame, fps, 92, { damping: 14 });
  const s2 = springy(frame, fps, 152, { damping: 14 });
  return (
    <AbsoluteFill style={{ fontFamily: SATOSHI }}>
      <PaperBg>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34, padding: "150px 84px" }}>
          <div style={{ ...rise(springy(frame, fps, 4, { damping: 12, stiffness: 210 })), fontFamily: CLASH, fontWeight: 700, fontSize: 84, color: INK }}>
            Marka jote, <span style={{ color: WINE }}>jo e jona.</span>
          </div>
          <div style={{ ...rise(springy(frame, fps, 24)) }}>
            <ThemeMorph s1={s1} s2={s2} width={620} />
          </div>
          <div style={{ ...rise(springy(frame, fps, 44)) }}>
            <ThemeDots s1={s1} s2={s2} />
          </div>
          <div style={{ ...rise(springy(frame, fps, 190)), fontSize: 30, fontWeight: 700, color: MUTED }}>
            Personalizoje si të duash → <span style={{ color: INK }}>vela.al</span>
          </div>
        </AbsoluteFill>
      </PaperBg>
    </AbsoluteFill>
  );
};
export const POST_THEMES_FRAMES = 230;

/* ══ DUO STILLS ═════════════════════════════════════════════════════════ */

/** 9:16 — the split poster. */
export const StillBeforeAfter: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: SATOSHI }}>
    <PaperBg>
      <div style={{ position: "absolute", right: 20, top: 0, bottom: 0, width: 500, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 24 }}>
        <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 64, color: INK }}>Pas<span style={{ color: WINE }}>.</span></div>
        <div style={{ transform: "scale(0.68)", margin: "-20px 0" }}><LNotif /></div>
        <div style={{ transform: "scale(0.68)", margin: "-20px 0" }}><LNotif name="Sara nga Vlora" amount="6,900 L" /></div>
        <div style={{ transform: "scale(0.68)", margin: "-20px 0" }}><LStat /></div>
        <div style={{ background: "#EAF7EE", color: "#1E7C3F", borderRadius: 99, padding: "12px 26px", fontSize: 24, fontWeight: 800 }}>Nën kontroll ✓</div>
      </div>
    </PaperBg>
    <AbsoluteFill style={{ clipPath: "inset(0 50% 0 0)" }}>
      <NightBg>
        <div style={{ position: "absolute", left: 20, top: 0, bottom: 0, width: 500, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 26 }}>
          <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 64, color: "#fff" }}>Para<span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>.</span></div>
          {[["Sa kushton? 🙏", -4], ["Çmimi ju lutem", 3], ["A ka masë M?", -2], ["A bëni dërgesa?", 4]].map(([t, r]) => (
            <div key={t as string} style={{ transform: `rotate(${r}deg)` }}>
              <Bubble text={t as string} style={{ fontSize: 25, padding: "15px 24px" }} />
            </div>
          ))}
          <div style={{ background: "#E5484D", color: "#fff", borderRadius: 999, padding: "12px 28px", fontSize: 24, fontWeight: 800 }}>47 DM pa përgjigje</div>
        </div>
      </NightBg>
    </AbsoluteFill>
    <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 8, marginLeft: -4, backgroundImage: GRAD, boxShadow: "0 0 46px 10px rgba(255,46,77,0.5)" }} />
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 130, display: "flex", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 26, boxShadow: "0 34px 90px -30px rgba(0,0,0,0.5)", padding: "28px 44px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 40, color: INK }}>Ti zgjedh anën.</span>
        <span style={{ backgroundImage: GRAD, color: "#fff", borderRadius: 999, padding: "14px 34px", fontFamily: CLASH, fontWeight: 600, fontSize: 28 }}>Provo 7 ditë falas → vela.al</span>
      </div>
    </div>
  </AbsoluteFill>
);

/** 9:16 — the day timeline poster. */
export const StillDayTimeline: React.FC = () => (
  <NightShell reel>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30 }}>
      <div style={{ textAlign: "center", fontFamily: CLASH, fontWeight: 700, fontSize: 88, color: "#fff", lineHeight: 1.12, marginBottom: 10 }}>
        Një ditë<br />me <span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Vela.</span>
      </div>
      {[
        ["08:00", "Ti poston, si gjithmonë."],
        ["12:30", "Sistemi e kthen në produkt."],
        ["17:45", "Porositë vijnë — me kartë."],
        ["23:10", "Ti sheh vetëm shifrat."],
      ].map(([t, l]) => (
        <div key={t} style={{ width: 860, display: "flex", alignItems: "center", gap: 30, background: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.13)", borderRadius: 24, padding: "26px 34px" }}>
          <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 52, backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", width: 190 }}>{t}</span>
          <span style={{ fontSize: 31, fontWeight: 700, color: "rgba(255,255,255,0.88)" }}>{l}</span>
        </div>
      ))}
      <div style={{ marginTop: 20 }}>
        <Cta size={38}>Fillo falas → vela.al</Cta>
      </div>
    </AbsoluteFill>
  </NightShell>
);

/** 9:16 — your brand poster (three themed cards fanned). */
export const StillBrand: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: SATOSHI }}>
    <PaperBg>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 44, padding: "270px 60px 280px" }}>
        <div style={{ textAlign: "center", fontFamily: CLASH, fontWeight: 700, fontSize: 92, color: INK, lineHeight: 1.14 }}>
          Dyqani yt.<br /><span style={{ color: WINE }}>Marka jote.</span>
        </div>
        <div style={{ position: "relative", width: 900, height: 560 }}>
          <div style={{ position: "absolute", left: 20, top: 46, transform: "rotate(-7deg) scale(0.82)", transformOrigin: "bottom left" }}><ThemedProduct theme={THEMES[1]} /></div>
          <div style={{ position: "absolute", right: 20, top: 46, transform: "rotate(7deg) scale(0.82)", transformOrigin: "bottom right" }}><ThemedProduct theme={THEMES[2]} /></div>
          <div style={{ position: "absolute", left: 160, top: 0 }}><ThemedProduct theme={THEMES[0]} /></div>
        </div>
        <div style={{ display: "flex", gap: 30 }}>
          {THEMES.map((t) => (
            <div key={t.name} style={{ width: 44, height: 44, borderRadius: 99, background: t.accent, boxShadow: "0 12px 34px -12px rgba(20,10,14,0.45)" }} />
          ))}
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: MUTED }}>Ngjyrat, stili, emri — të gjitha të tuat.</div>
      </AbsoluteFill>
    </PaperBg>
  </AbsoluteFill>
);

/** 4:5 — sells while you sleep. */
export const StillNightSales: React.FC = () => (
  <NightShell>
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 28 }}>
      <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 120, backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>23:47</div>
      <LNotif width={680} name="Klea nga Shkodra" amount="3,400 L" />
      <LNotif width={680} name="Andi nga Durrësi" amount="2,900 L" />
      <div style={{ textAlign: "center", fontFamily: CLASH, fontWeight: 700, fontSize: 80, color: "#fff", lineHeight: 1.18 }}>
        Ti fle.<br />
        <span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Dyqani shet.</span>
      </div>
      <Cta size={36}>Provo 7 ditë falas → vela.al</Cta>
    </AbsoluteFill>
  </NightShell>
);

/** 4:5 — the settled split. */
export const StillSplitPost: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: SATOSHI }}>
    <PaperBg>
      <div style={{ position: "absolute", right: 30, top: 0, bottom: 0, width: 480, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 22 }}>
        <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 56, color: INK }}>Pas<span style={{ color: WINE }}>.</span></div>
        <div style={{ transform: "scale(0.64)", margin: "-26px 0" }}><LNotif /></div>
        <div style={{ transform: "scale(0.64)", margin: "-26px 0" }}><LNotif name="Sara nga Vlora" amount="6,900 L" /></div>
        <div style={{ background: "#EAF7EE", color: "#1E7C3F", borderRadius: 99, padding: "12px 24px", fontSize: 22, fontWeight: 800 }}>Nën kontroll ✓</div>
      </div>
    </PaperBg>
    <AbsoluteFill style={{ clipPath: "inset(0 50% 0 0)" }}>
      <NightBg>
        <div style={{ position: "absolute", left: 30, top: 0, bottom: 0, width: 480, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 20 }}>
          <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 56, color: "#fff" }}>Para<span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>.</span></div>
          {[["Sa kushton? 🙏", -4], ["Çmimi ju lutem", 3], ["A ka masë M?", -2]].map(([t, r]) => (
            <div key={t as string} style={{ transform: `rotate(${r}deg)` }}>
              <Bubble text={t as string} style={{ fontSize: 23, padding: "13px 20px" }} />
            </div>
          ))}
          <div style={{ background: "#E5484D", color: "#fff", borderRadius: 999, padding: "11px 24px", fontSize: 22, fontWeight: 800 }}>47 DM pa përgjigje</div>
        </div>
      </NightBg>
    </AbsoluteFill>
    <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 8, marginLeft: -4, backgroundImage: GRAD, boxShadow: "0 0 46px 10px rgba(255,46,77,0.5)" }} />
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, display: "flex", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 24, boxShadow: "0 34px 90px -30px rgba(0,0,0,0.5)", padding: "22px 38px", display: "flex", alignItems: "center", gap: 24 }}>
        <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 32, color: INK }}>Ti zgjedh anën.</span>
        <span style={{ backgroundImage: GRAD, color: "#fff", borderRadius: 999, padding: "12px 26px", fontFamily: CLASH, fontWeight: 600, fontSize: 24 }}>Provo falas → vela.al</span>
      </div>
    </div>
  </AbsoluteFill>
);

/** 4:5 — theme picker still. */
export const StillThemes: React.FC = () => (
  <AbsoluteFill style={{ fontFamily: SATOSHI }}>
    <PaperBg>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30, padding: "120px 60px" }}>
        <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 82, color: INK }}>
          Marka jote, <span style={{ color: WINE }}>jo e jona.</span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center" }}>
          {THEMES.map((t, i) => (
            <div key={t.name} style={{ width: 330, display: "flex", justifyContent: "center", zIndex: i === 1 ? 2 : 1 }}>
              <div style={{ transform: `scale(0.55) rotate(${(i - 1) * 4}deg) translateY(${i === 1 ? 0 : 30}px)`, transformOrigin: "top center" }}>
                <ThemedProduct theme={t} width={600} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 28, marginTop: -150 }}>
          {THEMES.map((t) => (
            <div key={t.name} style={{ width: 42, height: 42, borderRadius: 99, background: t.accent, boxShadow: "0 12px 34px -12px rgba(20,10,14,0.45)" }} />
          ))}
        </div>
        <div style={{ fontSize: 29, fontWeight: 700, color: MUTED }}>
          Zgjidh stilin. Një klik. → <span style={{ color: INK }}>vela.al</span>
        </div>
      </AbsoluteFill>
    </PaperBg>
  </AbsoluteFill>
);
