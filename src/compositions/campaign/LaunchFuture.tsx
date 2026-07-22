/**
 * Vela launch campaign — Asset #5 (see content-plan.md).
 * "E ardhmja: përtej Instagramit" · DARK · 9:16 · 12s (360f).
 * Beyond IG (multi-channel orbit) → future value stack → growth promise → CTA.
 * Future value / FOMO; night aurora, neon-red accents, spring physics.
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Instagram, Music2, Globe, MessageCircle, ShoppingBag } from "lucide-react";
import { springIn, float, pulse } from "../../lib/motion";
import { BRAND, CLASH, INTER, AuroraDark, Shimmer, GlareChip, ShipWhite, glassDark, ensureClash } from "../marketing/nextgen/kitv2";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SPRING = { damping: 14, mass: 1.05, stiffness: 130 }; // weighty, small punch
const GRAD = "linear-gradient(115deg,#7F1D3B,#A31234 40%,#FF2E4D 75%,#F59E0B 115%)";
const H: (s: number) => React.CSSProperties = (s) => ({ fontFamily: CLASH, fontWeight: 700, fontSize: s, lineHeight: 1.05, letterSpacing: "-0.02em", color: "#fff", textAlign: "center", margin: 0 });
const blurIn = (frame: number, fps: number, delay: number) => {
  const s = springIn(frame, fps, delay, SPRING);
  return { opacity: interpolate(s, [0, 1], [0, 1]), filter: `blur(${(1 - s) * 12}px)`, transform: `translateY(${(1 - s) * 34}px)` };
};

const CHANNELS = [
  { Icon: Music2, label: "TikTok Shop" },
  { Icon: Globe, label: "Dyqan Web" },
  { Icon: MessageCircle, label: "WhatsApp" },
  { Icon: ShoppingBag, label: "Google Shopping" },
];
const STACK = [
  { n: "01", t: "Dyqan web autonom", d: "Faqe e plotë e personalizuar, me domain-in tënd." },
  { n: "02", t: "Marketing automatik", d: "Ri-synon klientët që lanë shportën përgjysmë." },
  { n: "03", t: "Sinkronizim multi-kanal", d: "Stoku përditësohet kudo, automatikisht." },
];

export const LAUNCH_FUTURE_FRAMES = 12 * 30; // 360

export const LaunchFuture: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  ensureClash();

  const s1 = interpolate(frame, [0, 80, 94], [1, 1, 0], clamp);
  const s2 = interpolate(frame, [88, 104, 210, 224], [0, 1, 1, 0], clamp);
  const s3 = interpolate(frame, [218, 234, 278, 292], [0, 1, 1, 0], clamp);
  const s4 = interpolate(frame, [286, 304, 360], [0, 1, 1], clamp);

  // orbit
  const rot = frame * 0.3; // deg
  const R = 320;
  const nodeAppear = (i: number) => springIn(frame, fps, 14 + i * 8, SPRING);
  // promise graph draw
  const draw = interpolate(frame, [232, 280], [1, 0], clamp); // dashoffset 1→0 (fraction)
  const point = Math.abs(Math.sin((frame - 286) / 11)) * 14;

  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <AuroraDark frame={frame} />

      {/* ── Scene 1 · Beyond IG orbit ── */}
      <AbsoluteFill style={{ opacity: s1 }}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 250 }}>
          <div style={{ ...H(78), ...blurIn(frame, fps, 8), padding: "0 90px" }}>
            <Shimmer frame={frame}>E ardhmja</Shimmer><br />nuk është vetëm në DM.
          </div>
        </AbsoluteFill>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", marginTop: 220 }}>
          <div style={{ position: "relative", width: 760, height: 760 }}>
            {/* rings */}
            {[R, R * 0.62].map((r, i) => <div key={i} style={{ position: "absolute", left: "50%", top: "50%", width: r * 2, height: r * 2, marginLeft: -r, marginTop: -r, borderRadius: 999, border: "1.5px solid rgba(255,255,255,0.12)" }} />)}
            {/* center IG node */}
            <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: 150, height: 150, borderRadius: 36, background: GRAD, display: "grid", placeItems: "center", color: "#fff", boxShadow: `0 0 ${40 + pulse(frame, 22) * 30}px rgba(255,46,77,0.5)` }}><Instagram size={72} strokeWidth={1.7} /></div>
            {/* channel nodes on the rotating ring */}
            {CHANNELS.map(({ Icon, label }, i) => {
              const ang = (i / CHANNELS.length) * Math.PI * 2 + (rot * Math.PI) / 180;
              const x = Math.cos(ang) * R, y = Math.sin(ang) * R;
              const a = nodeAppear(i);
              return (
                <div key={label} style={{ position: "absolute", left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, transform: `translate(-50%,-50%) scale(${a})`, opacity: a, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 108, height: 108, borderRadius: 28, ...glassDark, border: "1px solid rgba(255,46,77,0.45)", display: "grid", placeItems: "center", color: "#fff", boxShadow: `inset 0 1.5px 0 rgba(255,255,255,0.22), 0 0 ${20 + pulse(frame + i * 10, 20) * 24}px rgba(255,46,77,0.4)` }}><Icon size={48} strokeWidth={1.7} /></span>
                  <span style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 26, color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap" }}>{label}</span>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      {/* ── Scene 2 · Future value stack ── */}
      <AbsoluteFill style={{ opacity: s2, alignItems: "center", justifyContent: "center", gap: 40, padding: "150px 70px" }}>
        <div style={{ ...H(72), ...blurIn(frame, fps, 96) }}>Vela rritet <Shimmer frame={frame}>me ty.</Shimmer></div>
        <div style={{ width: 900, display: "flex", flexDirection: "column", gap: 24 }}>
          {STACK.map(({ n, t, d }, i) => {
            const a = springIn(frame, fps, 108 + i * 9, SPRING);
            return (
              <div key={n} style={{ position: "relative", display: "flex", alignItems: "center", gap: 30, padding: "34px 40px", borderRadius: 28, overflow: "hidden", ...glassDark, opacity: a, transform: `translateY(${(1 - a) * 90}px) scale(${0.96 + 0.04 * Math.min(a, 1)})` }}>
                <span style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(120% 100% at 12% -20%, rgba(255,255,255,0.16), transparent 46%)" }} />
                <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 72, backgroundImage: "linear-gradient(100deg,#FACC15 5%,#F59E0B 30%,#FF2E4D 62%,#A31234 95%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", flexShrink: 0, zIndex: 1 }}>{n}</span>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 40, color: "#fff" }}>{t}</div>
                  <div style={{ fontFamily: INTER, fontSize: 28, color: "rgba(255,255,255,0.66)", marginTop: 6 }}>{d}</div>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* ── Scene 3 · Promise (growth) ── */}
      <AbsoluteFill style={{ opacity: s3, alignItems: "center", justifyContent: "center", gap: 60, padding: "0 90px" }}>
        <svg width="760" height="360" viewBox="0 0 760 360" style={{ overflow: "visible" }}>
          <defs><linearGradient id="gl" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#A31234" /><stop offset="0.6" stopColor="#FF2E4D" /><stop offset="1" stopColor="#FACC15" /></linearGradient></defs>
          <path d="M20 330 C 180 320, 300 250, 430 180 S 640 60, 740 30" fill="none" stroke="url(#gl)" strokeWidth="10" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={draw} />
          <circle cx="740" cy="30" r={interpolate(frame, [272, 288], [0, 16], clamp)} fill="#FACC15" />
        </svg>
        <div style={{ ...H(78) }}>Rritu pa <Shimmer frame={frame}>kufinj.</Shimmer><br /><span style={{ color: "rgba(255,255,255,0.6)", fontSize: 46 }}>Me platformën që zhvillohet me ty.</span></div>
      </AbsoluteFill>

      {/* ── Scene 4 · CTA ── */}
      <AbsoluteFill style={{ opacity: s4, alignItems: "center", justifyContent: "center", gap: 44, padding: "0 90px" }}>
        <ShipWhite size={200} style={{ transform: `translateY(${float(frame, 10, 26)}px)`, filter: "drop-shadow(0 30px 70px rgba(127,29,59,0.6))" }} />
        <div style={{ ...H(90) }}>Bëhu pjesë e <Shimmer frame={frame}>së ardhmes.</Shimmer></div>
        <GlareChip frame={frame} fontSize={46}>Nise falas sot →</GlareChip>
        <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 38, color: "rgba(255,255,255,0.85)", transform: `translateY(${-point}px)` }}>vela.al · Kthe Instagramin në dyqan</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
