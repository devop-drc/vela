/**
 * Vela — FinalLaunch 25 · App feature-demo reel. Quick cinematic cuts through the
 * real app UI (screenshots in device frames) with kinetic labels. Dark throughout.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, staticFile } from "remotion";
import { springIn, float } from "../../lib/motion";
import { CLASH, INTER, AuroraDark, FloatShot, shot, GlareChip, ShipWhite, KineticWords, ensureClash } from "../marketing/nextgen/kitv2";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SPRING = { damping: 14, mass: 1.0, stiffness: 140 };
const H = (s: number, c: string): React.CSSProperties => ({ fontFamily: CLASH, fontWeight: 700, fontSize: s, letterSpacing: "-0.02em", color: c, textAlign: "center" });
const eyebrowDark: React.CSSProperties = { display: "inline-block", padding: "12px 28px", borderRadius: 999, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.85)", fontFamily: CLASH, fontWeight: 700, fontSize: 26, letterSpacing: ".16em", textTransform: "uppercase" };

const SCENES = [
  { in: 70, src: "07-storefront-mobile.png", kind: "phone", w: 440, label: "Dyqani yt, gati për të shitur.", url: "vela.al/dyqani" },
  { in: 142, src: "02-products.png", kind: "browser", w: 900, label: "Menaxho produktet me lehtësi.", url: "vela.al/produktet" },
  { in: 212, src: "05-orders.png", kind: "browser", w: 900, label: "Porositë — në kohë reale.", url: "vela.al/porosite" },
  { in: 282, src: "01-dashboard.png", kind: "browser", w: 900, label: "Gjithçka, në një panel.", url: "vela.al/paneli" },
];

export const DEMO_FRAMES = 12 * 30; // 360
export const FinalLaunch25AppDemo: React.FC = () => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); ensureClash();
  const hook = interpolate(frame, [0, 10, 58, 70], [0, 1, 1, 0], clamp);
  const cta = interpolate(frame, [332, 344, 360], [0, 1, 1], clamp);
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <AuroraDark frame={frame} />
      {/* hook */}
      {hook > 0.01 && (
        <AbsoluteFill style={{ opacity: hook, alignItems: "center", justifyContent: "center", gap: 30, padding: "0 80px" }}>
          <span style={eyebrowDark}>Vela nga brenda</span>
          <KineticWords text="Kjo është Vela." frame={frame} fps={fps} delay={6} highlight="Vela" style={{ ...H(98, "#fff") }} />
        </AbsoluteFill>
      )}
      {/* feature scenes */}
      {SCENES.map((s, i) => {
        const op = interpolate(frame, [s.in, s.in + 12, s.in + 60, s.in + 72], [0, 1, 1, 0], clamp);
        if (op <= 0.01) return null;
        const lab = springIn(frame, fps, s.in + 6, SPRING);
        return (
          <AbsoluteFill key={i} style={{ opacity: op, alignItems: "center", justifyContent: "center", gap: 54, padding: "0 70px" }}>
            <div style={{ opacity: lab, transform: `translateY(${(1 - lab) * 30}px)`, ...H(58, "#fff"), maxWidth: 900 }}>{s.label}</div>
            <FloatShot src={shot(s.src)} frame={frame} width={s.w} kind={s.kind as "browser" | "phone"} url={s.url} />
          </AbsoluteFill>
        );
      })}
      {/* CTA */}
      {cta > 0.01 && (
        <AbsoluteFill style={{ opacity: cta, alignItems: "center", justifyContent: "center", gap: 40, padding: "0 80px" }}>
          <ShipWhite size={180} style={{ transform: `translateY(${float(frame, 10, 22)}px)`, filter: "drop-shadow(0 30px 70px rgba(127,29,59,0.55))" }} />
          <KineticWords text="Kthe Instagramin në dyqan." frame={frame} fps={fps} delay={336} highlight="dyqan" style={{ ...H(72, "#fff"), maxWidth: 900 }} />
          <GlareChip frame={frame} fontSize={46}>Provo falas → vela.al</GlareChip>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/* ══════════════════ 29 · Një dyqan, dy tema (themes: IG vs custom) ══════════════════ */
const THEME_SCENES = [
  { in: 80, kind: "phone", src: "campaign/ig-storefront.png", w: 424, label: "Tema Instagram", sub: "e njohur — si feed-i yt", url: "vela.al/dyqani" },
  { in: 180, kind: "browser", src: "campaign/custom-storefront.png", w: 940, label: "Dizajn i personalizuar", sub: "faqja jote, stili yt", url: "vela.al/dyqani" },
];
export const THEMES_FRAMES = 12 * 30; // 360
export const FinalLaunch29Themes: React.FC = () => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); ensureClash();
  const hook = interpolate(frame, [0, 12, 66, 80], [0, 1, 1, 0], clamp);
  const cta = interpolate(frame, [284, 298, 360], [0, 1, 1], clamp);
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <AuroraDark frame={frame} />
      {hook > 0.01 && (
        <AbsoluteFill style={{ opacity: hook, alignItems: "center", justifyContent: "center", gap: 30, padding: "0 80px" }}>
          <span style={eyebrowDark}>Zgjidh stilin tënd</span>
          <KineticWords text="Një dyqan. Dy tema." frame={frame} fps={fps} delay={6} highlight="Dy tema." style={{ ...H(88, "#fff") }} />
        </AbsoluteFill>
      )}
      {THEME_SCENES.map((s, i) => {
        const op = interpolate(frame, [s.in, s.in + 14, s.in + 86, s.in + 100], [0, 1, 1, 0], clamp);
        if (op <= 0.01) return null;
        const lab = springIn(frame, fps, s.in + 8, SPRING);
        return (
          <AbsoluteFill key={i} style={{ opacity: op, alignItems: "center", justifyContent: "center", gap: 44, padding: "0 60px" }}>
            <div style={{ opacity: lab, transform: `translateY(${(1 - lab) * 30}px)`, textAlign: "center" }}>
              <div style={H(58, "#fff")}>{s.label}</div>
              <div style={{ fontFamily: INTER, fontSize: 34, color: "rgba(255,255,255,0.6)", marginTop: 6 }}>{s.sub}</div>
            </div>
            <FloatShot src={staticFile(s.src)} frame={frame} width={s.w} kind={s.kind as "browser" | "phone"} url={s.url} />
          </AbsoluteFill>
        );
      })}
      {cta > 0.01 && (
        <AbsoluteFill style={{ opacity: cta, alignItems: "center", justifyContent: "center", gap: 36, padding: "0 80px" }}>
          <ShipWhite size={150} style={{ transform: `translateY(${float(frame, 10, 20)}px)`, filter: "drop-shadow(0 30px 70px rgba(127,29,59,0.55))" }} />
          <KineticWords text="Vela të jep të dyja." frame={frame} fps={fps} delay={290} highlight="të dyja." style={{ ...H(74, "#fff"), maxWidth: 900 }} />
          <div style={{ fontFamily: INTER, fontSize: 36, color: "rgba(255,255,255,0.65)", textAlign: "center" }}>Zgjidh — ose ndërro kurdo.</div>
          <GlareChip frame={frame} fontSize={46}>Krijoje tëndin → vela.al</GlareChip>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
