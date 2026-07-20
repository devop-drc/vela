/**
 * Instagram REELS (1080×1920 · 30fps) — motion graphics + typography only.
 *
 *  ReelChaos     ~11s  DM-question chaos floods in → gradient arrow-sweep
 *                      clears it → "Ti poston. / Vela shet." → boat + CTA.
 *  ReelNumbers   ~10s  Kinetic stat beats (3 min · 0 kod · 10+ template ·
 *                      100% në Lekë) → end card.
 *  ReelManifesto ~11s  Blur-rise manifesto lines → "Dyqani YT." gradient +
 *                      underline sweep → wordmark end card.
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { z } from "zod";
import { BRAND, CLASH, GRAD, GRAD_TEXT, NightShell, Boat, Wordmark, Cta, springy, rise } from "./mkKit";

export const mkSchema = z.object({});
export const mkDefaults = {};

/* ── shared end card: boat + line + CTA ─────────────────────────────────── */
const EndCard: React.FC<{ from: number; line?: string }> = ({ from, line = "Provo 7 ditë falas" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sBoat = springy(frame, fps, from, { damping: 13 });
  const sLine = springy(frame, fps, from + 10);
  const sCta = springy(frame, fps, from + 20);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 44 }}>
      <div style={{ opacity: Math.min(1, sBoat * 1.4), transform: `translateY(${(1 - sBoat) * -60}px) scale(${0.7 + sBoat * 0.3})` }}>
        <Boat size={330} bob />
      </div>
      <div style={{ ...rise(sLine), fontFamily: CLASH, fontWeight: 700, fontSize: 74, color: "#fff", letterSpacing: "-0.02em", textAlign: "center" }}>
        {line}
      </div>
      <div style={{ ...rise(sCta) }}>
        <Cta>Fillo falas → vela.al</Cta>
      </div>
    </AbsoluteFill>
  );
};

/* ══ REEL 1 — "DM-t s'janë dyqan" ═══════════════════════════════════════ */
const QUESTIONS = [
  "Sa kushton? 🙏", "A ka masë M?", "Çmimi ju lutem", "Si porosis? 🥺", "A bëni dërgesa?",
  "Sa kushton?", "Ende në stok?", "Çmimi?? 😩", "A ka të kuqe?", "Postoje çmimin!",
  "Sa kushton kjo?", "Info në DM?", "Çmimi ju lutem 🙏", "A punon me porosi?",
];

// deterministic pseudo-random per index (no Math.random in Remotion)
const rnd = (i: number, salt = 0) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const ReelChaos: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const SWEEP_AT = 128;
  const sweep = interpolate(frame, [SWEEP_AT, SWEEP_AT + 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });

  return (
    <NightShell reel chromeFrom={SWEEP_AT + 30}>
      {/* Act 1 — the DM flood (each bubble springs in, slight scatter+tilt) */}
      {sweep < 1 && (
        <AbsoluteFill style={{ padding: "40px 10px" }}>
          {QUESTIONS.map((q, i) => {
            const delay = 6 + i * 7;
            const s = springy(frame, fps, delay, { damping: 12, stiffness: 200 });
            if (s <= 0.01) return null;
            const x = rnd(i) * 620 - 20;
            const y = 40 + ((i * 173) % 1210);
            const tilt = (rnd(i, 1) - 0.5) * 10;
            // swept away: fly off along the sweep diagonal
            const gone = sweep * 1400;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: x,
                  top: y,
                  transform: `translate(${gone}px, ${-gone * 0.35}px) rotate(${tilt}deg) scale(${0.7 + s * 0.3})`,
                  opacity: Math.min(1, s * 1.5) * (1 - sweep),
                  background: "rgba(255,255,255,0.96)",
                  color: "#111",
                  borderRadius: 32,
                  borderBottomLeftRadius: 8,
                  padding: "22px 34px",
                  fontSize: 34,
                  fontWeight: 600,
                  boxShadow: "0 18px 50px -18px rgba(0,0,0,0.55)",
                  whiteSpace: "nowrap",
                }}
              >
                {q}
              </div>
            );
          })}
          {/* mounting pressure counter */}
          <div style={{ position: "absolute", top: -10, right: 6, opacity: interpolate(frame, [40, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * (1 - sweep), background: "#E11D48", color: "#fff", borderRadius: 999, padding: "14px 30px", fontSize: 32, fontWeight: 800 }}>
            {Math.min(47, Math.max(0, Math.round((frame - 30) / 2)))} mesazhe
          </div>
        </AbsoluteFill>
      )}

      {/* the arrow-sweep — a gradient blade clears the chaos (the hull arrow) */}
      {sweep > 0 && sweep < 1.001 && frame < SWEEP_AT + 40 && (
        <div
          style={{
            position: "absolute",
            top: "-10%",
            bottom: "-10%",
            width: 260,
            left: `${-30 + sweep * 160}%`,
            transform: "rotate(16deg)",
            backgroundImage: GRAD,
            filter: "blur(6px)",
            opacity: 0.95,
            borderRadius: 60,
            boxShadow: "0 0 120px 30px rgba(255,46,77,0.45)",
          }}
        />
      )}

      {/* Act 2 — the answer */}
      {frame >= SWEEP_AT + 18 && frame < 252 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{ ...rise(springy(frame, fps, SWEEP_AT + 22)), fontFamily: CLASH, fontWeight: 700, fontSize: 128, color: "#fff", letterSpacing: "-0.03em" }}>
            Ti poston.
          </div>
          <div style={{ ...rise(springy(frame, fps, SWEEP_AT + 40)), fontFamily: CLASH, fontWeight: 700, fontSize: 128, letterSpacing: "-0.03em", backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", opacity: Math.min(1, springy(frame, fps, SWEEP_AT + 40) * 1.4) * interpolate(frame, [246, 252], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            Vela shet.
          </div>
        </AbsoluteFill>
      )}
      {frame >= 246 && <EndCard from={252} />}
    </NightShell>
  );
};
export const REEL_CHAOS_FRAMES = 330;

/* ══ REEL 2 — "Dyqan në shifra" ═════════════════════════════════════════ */
const STATS: Array<{ big: string; suffix?: string; label: string; count?: number }> = [
  { big: "3", suffix: " min", label: "nga postimi te dyqani", count: 3 },
  { big: "0", label: "rreshta kod", count: 0 },
  { big: "10", suffix: "+", label: "template për vitrinën", count: 10 },
  { big: "100", suffix: "%", label: "pagesa në Lekë", count: 100 },
];
const BEAT = 56;

export const ReelNumbers: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const endFrom = STATS.length * BEAT + 10;

  return (
    <NightShell reel>
      {STATS.map((st, i) => {
        const from = 8 + i * BEAT;
        const local = frame - from;
        if (local < 0 || local > BEAT + 6) return null;
        const s = springy(frame, fps, from, { damping: 12, stiffness: 190 });
        const out = interpolate(local, [BEAT - 10, BEAT + 2], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.cubic) });
        const n = st.count === 0 ? 0 : Math.round(Math.min(1, Math.max(0, local / 20)) * (st.count ?? 0));
        return (
          <AbsoluteFill key={i} style={{ alignItems: "center", justifyContent: "center", opacity: 1 - out, transform: `translateY(${-out * 90}px)`, filter: `blur(${out * 8}px)` }}>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "0.24em", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", marginBottom: 6, opacity: Math.min(1, s * 1.6) }}>
              {String(i + 1).padStart(2, "0")} / 04
            </div>
            <div style={{ transform: `scale(${0.8 + s * 0.2})`, fontFamily: CLASH, fontWeight: 700, fontSize: 300, lineHeight: 0.95, letterSpacing: "-0.04em", backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", filter: `blur(${Math.max(0, 1 - s) * 12}px)` }}>
              {st.count != null ? n : st.big}
              <span style={{ fontSize: 150 }}>{st.suffix ?? ""}</span>
            </div>
            <div style={{ ...rise(springy(frame, fps, from + 10)), fontFamily: CLASH, fontWeight: 600, fontSize: 62, color: "#fff", marginTop: 18, textAlign: "center" }}>
              {st.label}
            </div>
          </AbsoluteFill>
        );
      })}
      {frame >= endFrom - 6 && <EndCard from={endFrom} line="Vela. Dyqani yt online." />}
    </NightShell>
  );
};
export const REEL_NUMBERS_FRAMES = STATS.length * BEAT + 10 + 66;

/* ══ REEL 3 — Manifesto ═════════════════════════════════════════════════ */
const LINES = ["Postimet e tua.", "Produktet e tua.", "Klientët e tu."];

export const ReelManifesto: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const FINAL_AT = 30 + LINES.length * 34 + 8;
  const underline = interpolate(frame, [FINAL_AT + 16, FINAL_AT + 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const outro = interpolate(frame, [FINAL_AT + 82, FINAL_AT + 94], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <NightShell reel>
      <AbsoluteFill style={{ alignItems: "flex-start", justifyContent: "center", padding: "0 90px", gap: 26, opacity: 1 - outro, filter: `blur(${outro * 10}px)` }}>
        {LINES.map((l, i) => {
          const s = springy(frame, fps, 24 + i * 34);
          const dim = frame > FINAL_AT ? 0.38 : 1;
          return (
            <div key={i} style={{ ...rise(s), fontFamily: CLASH, fontWeight: 700, fontSize: 96, letterSpacing: "-0.03em", color: `rgba(255,255,255,${dim})`, transition: "color 0.3s" }}>
              {l}
            </div>
          );
        })}
        <div style={{ position: "relative" }}>
          <div style={{ ...rise(springy(frame, fps, FINAL_AT)), fontFamily: CLASH, fontWeight: 700, fontSize: 128, letterSpacing: "-0.03em", backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
            Dyqani YT.
          </div>
          {/* the hull-arrow underline draws left → right */}
          <div style={{ position: "absolute", left: 4, bottom: -26, height: 14, width: `${underline * 100}%`, borderRadius: 99, backgroundImage: GRAD, boxShadow: "0 0 40px rgba(255,46,77,0.6)" }} />
          <div style={{ position: "absolute", bottom: -40, left: `calc(${underline * 100}% - 20px)`, opacity: underline > 0.15 ? 1 : 0, fontSize: 44, color: "#FACC15", transform: "rotate(-8deg)" }}>➤</div>
        </div>
      </AbsoluteFill>
      {frame >= FINAL_AT + 88 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 48 }}>
          <div style={{ opacity: Math.min(1, springy(frame, fps, FINAL_AT + 92) * 1.4), transform: `scale(${0.85 + springy(frame, fps, FINAL_AT + 92) * 0.15})` }}>
            <Wordmark width={640} />
          </div>
          <div style={{ ...rise(springy(frame, fps, FINAL_AT + 104)) }}>
            <Cta size={40}>Fillo falas → vela.al</Cta>
          </div>
        </AbsoluteFill>
      )}
    </NightShell>
  );
};
export const REEL_MANIFESTO_FRAMES = 30 + LINES.length * 34 + 8 + 170;
