/**
 * Vela — FinalLaunch wave 2. New angles beyond the meme reels:
 *   10 HowItWorks  · reel  · clean animated explainer (Vela në 3 hapa)
 *   11 Manifesto   · post  · bold typographic statement
 * Same brand system (Clash, 115° gradient, aurora/cream, hard cut) as the set.
 */
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { Instagram, Tag, ShoppingBag } from "lucide-react";
import { springIn, float } from "../../lib/motion";
import { BRAND, CLASH, INTER, INK, AuroraDark, CreamBase, Shimmer, GlareChip, ShipColored, ShipWhite, glassLight, KineticWords, ensureClash } from "../marketing/nextgen/kitv2";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const SPRING = { damping: 14, mass: 1.0, stiffness: 140 };
const GRAD = "linear-gradient(115deg,#A31234,#FF2E4D)";
const H = (s: number, c: string): React.CSSProperties => ({ fontFamily: CLASH, fontWeight: 700, fontSize: s, letterSpacing: "-0.02em", color: c, textAlign: "center" });
const eyebrowDark: React.CSSProperties = { display: "inline-block", padding: "12px 28px", borderRadius: 999, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.85)", fontFamily: CLASH, fontWeight: 700, fontSize: 26, letterSpacing: ".14em", textTransform: "uppercase" };

/* ══════════════════ 10 · How it works — Vela në 3 hapa (reel) ══════════════════ */
const STEPS = [
  { n: "01", Icon: Instagram, t: "Lidh Instagramin", d: "Një klik. Pa kod, pa mundim." },
  { n: "02", Icon: Tag, t: "Postimet bëhen produkte", d: "Me çmim, madhësi dhe stok." },
  { n: "03", Icon: ShoppingBag, t: "Klientët blejnë vetë", d: "Kartë ose cash. Zero DM." },
];
export const WAVE2_HIW_FRAMES = 11 * 30; // 330
const CUT = 96;
export const FinalLaunch10HowItWorks: React.FC = () => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); ensureClash();
  const b = (d: number) => springIn(frame, fps, CUT + d, SPRING);
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      {/* dark hook */}
      {frame < CUT && (
        <AbsoluteFill>
          <AuroraDark frame={frame} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34, padding: "0 80px" }}>
            <span style={eyebrowDark}>3 hapa · zero DM</span>
            <KineticWords text="Kthe Instagramin në dyqan." frame={frame} fps={fps} delay={6} highlight="dyqan" style={{ ...H(78, "#fff"), maxWidth: 900 }} />
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {/* light explainer */}
      {frame >= CUT && (
        <AbsoluteFill>
          <CreamBase frame={frame} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 12, background: "linear-gradient(90deg,#A31234,#FF2E4D,#F59E0B)" }} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 46, padding: "120px 70px" }}>
            <KineticWords text="Vela, në 3 hapa." frame={frame} fps={fps} delay={CUT - 4} highlight="3" style={{ ...H(72, INK), maxWidth: 900 }} />
            <div style={{ width: 880, display: "flex", flexDirection: "column", gap: 22 }}>
              {STEPS.map(({ n, Icon, t, d }, i) => {
                const a = b(16 + i * 18);
                return (
                  <div key={n} style={{ display: "flex", alignItems: "center", gap: 28, padding: "30px 38px", borderRadius: 28, ...glassLight, opacity: a, transform: `translateY(${(1 - a) * 70}px)` }}>
                    <span style={{ position: "relative", width: 88, height: 88, borderRadius: 24, background: GRAD, display: "grid", placeItems: "center", color: "#fff", flexShrink: 0, boxShadow: "0 18px 40px -14px rgba(163,18,52,0.55)" }}><Icon size={42} strokeWidth={2} /></span>
                    <div style={{ position: "relative", flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                        <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 34, backgroundImage: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>{n}</span>
                        <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 42, color: INK }}>{t}</span>
                      </div>
                      <div style={{ fontFamily: INTER, fontSize: 28, color: BRAND.muted, marginTop: 4 }}>{d}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ opacity: b(74), transform: `translateY(${(1 - b(74)) * 30}px)` }}><GlareChip frame={frame} fontSize={44}>Fillo falas → vela.al</GlareChip></div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/* ══════════════════ 11 · Manifesto (post 1080×1350) ══════════════════ */
export const STILL_FRAMES = 1;
export const FinalLaunch11Manifesto: React.FC = () => {
  const frame = useCurrentFrame(); ensureClash();
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      <AuroraDark frame={frame} />
      <AbsoluteFill style={{ alignItems: "flex-start", justifyContent: "center", padding: "0 90px", paddingBottom: 240, gap: 8 }}>
        <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 56, color: "rgba(255,255,255,0.58)", lineHeight: 1.08 }}>Ti nuk je qendër<br />mesazhesh.</div>
        <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 168, letterSpacing: "-0.03em", lineHeight: 0.98, color: "#fff", marginTop: 14 }}>Ti je <span style={{ backgroundImage: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>biznes.</span></div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, bottom: 0, width: 1080, background: "#F5F0E6", padding: "48px 90px", display: "flex", alignItems: "center", gap: 26 }}>
        <ShipColored size={88} />
        <div>
          <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 46, color: INK, lineHeight: 1.05 }}>Vela e kthen Instagramin në dyqan.</div>
          <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 32, color: BRAND.wine, marginTop: 6 }}>Shitje pa DM · vela.al</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ══════════════════ 12 · Pse "Vela"? (name + purpose · reel) ══════════════════ */
export const WAVE2_WHY_FRAMES = 12 * 30; // 360
const WHY_CUT = 200;
export const FinalLaunch12WhyVela: React.FC = () => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); ensureClash();
  const b = (d: number) => springIn(frame, fps, WHY_CUT + d, SPRING);
  const l1 = interpolate(frame, [0, 14, 92, 104], [0, 1, 1, 0], clamp);
  const l2 = interpolate(frame, [106, 120], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      {frame < WHY_CUT && (
        <AbsoluteFill>
          <AuroraDark frame={frame} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 46, padding: "0 80px" }}>
            <span style={eyebrowDark}>Emri ynë</span>
            <ShipWhite size={230} style={{ transform: `translateY(${float(frame, 9, 20)}px)`, filter: "drop-shadow(0 34px 74px rgba(127,29,59,0.55))" }} />
            <div style={{ position: "relative", height: 200, width: 920 }}>
              <div style={{ position: "absolute", inset: 0, opacity: l1, display: "grid", placeItems: "center" }}><div style={H(90, "#fff")}>Pse "Vela"?</div></div>
              <div style={{ position: "absolute", inset: 0, opacity: l2, display: "grid", placeItems: "center" }}>
                <div><div style={H(60, "rgba(255,255,255,0.9)")}>Vela = velat e anijes</div><div style={{ ...H(44, "#FACC15"), marginTop: 12 }}>që e shtyjnë anijen përpara</div></div>
              </div>
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {frame >= WHY_CUT && (
        <AbsoluteFill>
          <CreamBase frame={frame} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 28, padding: "90px 76px" }}>
            <KineticWords text="Anija është biznesi yt." frame={frame} fps={fps} delay={WHY_CUT - 4} highlight="biznesi" style={{ ...H(60, INK), maxWidth: 940 }} />
            <div style={{ fontFamily: INTER, fontSize: 38, lineHeight: 1.4, color: BRAND.muted, textAlign: "center", maxWidth: 880, opacity: b(18), transform: `translateY(${(1 - b(18)) * 40}px)` }}>Vela është mjeti që të shtyn më tutje — me <b style={{ color: INK }}>konfidencë</b>, drejt <b style={{ color: INK }}>detit të internetit</b>.</div>
            <div style={{ fontFamily: INTER, fontSize: 30, lineHeight: 1.4, color: "rgba(31,17,23,0.5)", textAlign: "center", maxWidth: 860, opacity: b(34) }}>Prezenca online po kërkohet më shumë se kurrë; bizneset shqiptare po digjitalizohen.</div>
            <div style={{ opacity: b(48), fontFamily: CLASH, fontWeight: 700, fontSize: 56, color: INK, textAlign: "center" }}>Mos rri në vend. <span style={{ backgroundImage: GRAD, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>Ngri velat!</span> ⛵</div>
            <div style={{ opacity: b(62), transform: `translateY(${(1 - b(62)) * 30}px)` }}><GlareChip frame={frame} fontSize={42}>Provoje tani · linku në bio</GlareChip></div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/* ══════════════════ 13 · Ndërtohet me ju (we listen · reel) ══════════════════ */
const ReqBubble: React.FC<{ text: string; s: number }> = ({ text, s }) => (
  <div style={{ display: "flex", justifyContent: "flex-start", opacity: Math.min(1, s * 1.4), transform: `translateY(${(1 - s) * 42}px) scale(${0.92 + s * 0.08})` }}>
    <div style={{ maxWidth: "86%", padding: "22px 32px", fontFamily: INTER, fontWeight: 600, fontSize: 38, lineHeight: 1.3, borderRadius: "30px 30px 30px 8px", background: "rgba(255,255,255,0.96)", color: "#1a1216", boxShadow: "0 24px 60px -22px rgba(0,0,0,0.6)" }}>{text}</div>
  </div>
);
export const WAVE2_LISTEN_FRAMES = 11 * 30; // 330
const LISTEN_CUT = 186;
export const FinalLaunch13WeListen: React.FC = () => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); ensureClash();
  const b = (d: number) => springIn(frame, fps, LISTEN_CUT + d, SPRING);
  const rows = ["Idetë tuaja janë të mirëpritura", "Zgjidhim problemet tuaja", "Përmirësohemi çdo ditë — bashkë"];
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      {frame < LISTEN_CUT && (
        <AbsoluteFill>
          <AuroraDark frame={frame} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30, padding: "0 70px" }}>
            <span style={eyebrowDark}>Ndërtohet me ju</span>
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
              <ReqBubble text="A mund të shtoni pagesa me këste? 🙌" s={springIn(frame, fps, 28, SPRING)} />
              <ReqBubble text="Do doja raporte më të detajuara" s={springIn(frame, fps, 56, SPRING)} />
              <ReqBubble text="Po sikur të lidhej me TikTok?" s={springIn(frame, fps, 84, SPRING)} />
              <ReqBubble text="Më duhet dërgesa jashtë vendit" s={springIn(frame, fps, 112, SPRING)} />
            </div>
            <div style={{ marginTop: 40, opacity: interpolate(springIn(frame, fps, 148, SPRING), [0, 1], [0, 1]) }}>
              <KineticWords text="Ne dëgjojmë. Gjithmonë." frame={frame} fps={fps} delay={148} highlight="dëgjojmë" style={{ ...H(66, "#fff") }} />
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {frame >= LISTEN_CUT && (
        <AbsoluteFill>
          <CreamBase frame={frame} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40, padding: "120px 70px" }}>
            <KineticWords text="Kërkesat tuaja → veçoritë tona." frame={frame} fps={fps} delay={LISTEN_CUT - 4} highlight="veçoritë" style={{ ...H(60, INK), maxWidth: 920 }} />
            <div style={{ width: 780, ...glassLight, borderRadius: 28, padding: "34px 40px", display: "flex", flexDirection: "column", gap: 22, opacity: b(22), transform: `translateY(${(1 - b(22)) * 50}px)` }}>
              {rows.map((t) => (
                <div key={t} style={{ position: "relative", display: "flex", alignItems: "center", gap: 20 }}>
                  <span style={{ width: 46, height: 46, borderRadius: 999, background: "rgba(16,185,129,0.16)", display: "grid", placeItems: "center", color: "#10893E", fontSize: 26, fontWeight: 900 }}>✓</span>
                  <span style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 36, color: INK }}>{t}</span>
                </div>
              ))}
            </div>
            <div style={{ opacity: b(46), fontFamily: CLASH, fontWeight: 700, fontSize: 38, color: INK }}>Synojmë <Shimmer frame={frame}>më të mirën</Shimmer> — për ju.</div>
            <div style={{ opacity: b(60), transform: `translateY(${(1 - b(60)) * 30}px)` }}><GlareChip frame={frame} fontSize={42}>Na trego çfarë të duhet → vela.al</GlareChip></div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/* ══════════════════ 14 · Sipas statistikave (online presence · reel) ══════════════════ */
export const WAVE2_STATS_FRAMES = 11 * 30; // 330
const STATS_CUT = 200;
export const FinalLaunch14Stats: React.FC = () => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); ensureClash();
  const b = (d: number) => springIn(frame, fps, STATS_CUT + d, SPRING);
  const big = Math.round(interpolate(frame, [40, 84], [0, 8], clamp));
  const s1 = interpolate(frame, [30, 44, 120, 134], [0, 1, 1, 0], clamp);
  const s2 = interpolate(frame, [136, 150], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      {frame < STATS_CUT && (
        <AbsoluteFill>
          <AuroraDark frame={frame} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 30, padding: "0 80px" }}>
            <span style={eyebrowDark}>Sipas statistikave</span>
            <div style={{ position: "relative", width: 940, height: 620 }}>
              <div style={{ position: "absolute", inset: 0, opacity: s1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 300, lineHeight: 0.9, color: "#fff" }}>{big}<span style={{ fontSize: 120, color: "rgba(255,255,255,0.55)" }}> nga 10</span></div>
                <div style={{ ...H(48, "rgba(255,255,255,0.85)"), maxWidth: 820 }}>klientë të kërkojnë online para se të blejnë.</div>
              </div>
              <div style={{ position: "absolute", inset: 0, opacity: s2, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
                <div style={H(96, "#fff")}>Pa dyqan online,</div>
                <div style={{ ...H(104, "#FF4D63") }}>je i padukshëm.</div>
                <div style={{ ...H(40, "rgba(255,255,255,0.6)"), marginTop: 10 }}>Klientët të kërkojnë — dhe nuk të gjejnë.</div>
              </div>
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {frame >= STATS_CUT && (
        <AbsoluteFill>
          <CreamBase frame={frame} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34, padding: "120px 76px" }}>
            <KineticWords text="Prania online = më shumë klientë." frame={frame} fps={fps} delay={STATS_CUT - 4} highlight="klientë" style={{ ...H(60, INK), maxWidth: 920 }} />
            <div style={{ width: 820, display: "flex", flexDirection: "column", gap: 16, opacity: b(22), transform: `translateY(${(1 - b(22)) * 50}px)` }}>
              {[["🔎", "Të gjejnë kur të kërkojnë"], ["🛒", "Blejnë kurdo — 24/7"], ["⭐", "Të besojnë më shumë"]].map(([ic, t]) => (
                <div key={t} style={{ position: "relative", display: "flex", alignItems: "center", gap: 18, ...glassLight, borderRadius: 22, padding: "24px 30px" }}>
                  <span style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(163,18,52,0.08)", display: "grid", placeItems: "center", fontSize: 26 }}>{ic}</span>
                  <span style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 34, color: INK }}>{t}</span>
                </div>
              ))}
            </div>
            <div style={{ opacity: b(50), transform: `translateY(${(1 - b(50)) * 30}px)` }}><GlareChip frame={frame} fontSize={44}>Bëhu i dukshëm → vela.al</GlareChip></div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/* ══════════════════ 15 · Sa kushton koha jote? (time calculator · reel) ══════════════════ */
export const WAVE2_TIME_FRAMES = 11 * 30; // 330
const TIME_CUT = 200;
export const FinalLaunch15TimeCalc: React.FC = () => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); ensureClash();
  const b = (d: number) => springIn(frame, fps, TIME_CUT + d, SPRING);
  const hours = Math.round(interpolate(frame, [120, 170], [0, 50], clamp));
  const lines = [
    { t: "20 DM / ditë", d: 40 },
    { t: "× 5 minuta secila", d: 64 },
    { t: "= 100 minuta / ditë", d: 90 },
  ];
  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      {frame < TIME_CUT && (
        <AbsoluteFill>
          <AuroraDark frame={frame} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 22, padding: "0 80px" }}>
            <div style={{ opacity: interpolate(springIn(frame, fps, 4, SPRING), [0, 1], [0, 1]) }}><span style={eyebrowDark}>Llogari e shpejtë</span></div>
            <KineticWords text="Sa kushton koha jote?" frame={frame} fps={fps} delay={12} highlight="koha" style={{ ...H(72, "#fff"), maxWidth: 900 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
              {lines.map(({ t, d }) => {
                const a = springIn(frame, fps, d, SPRING);
                return <div key={t} style={{ opacity: a, transform: `translateY(${(1 - a) * 30}px)`, fontFamily: CLASH, fontWeight: 600, fontSize: 52, color: "rgba(255,255,255,0.8)", textAlign: "center" }}>{t}</div>;
              })}
            </div>
            {frame >= 118 && (
              <div style={{ marginTop: 24, display: "flex", flexDirection: "column", alignItems: "center", opacity: interpolate(springIn(frame, fps, 118, SPRING), [0, 1], [0, 1]) }}>
                <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 190, lineHeight: 0.9, color: "#FF4D63" }}>{hours}h</div>
                <div style={{ ...H(44, "rgba(255,255,255,0.85)") }}>në muaj, duke shkruar në DM.</div>
              </div>
            )}
          </AbsoluteFill>
        </AbsoluteFill>
      )}
      {frame >= TIME_CUT && (
        <AbsoluteFill>
          <CreamBase frame={frame} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40, padding: "120px 80px" }}>
            <KineticWords text="Vela ta kthen kohën." frame={frame} fps={fps} delay={TIME_CUT - 4} highlight="kohën" style={{ ...H(80, INK), maxWidth: 900 }} />
            <div style={{ fontFamily: INTER, fontSize: 42, lineHeight: 1.4, color: BRAND.muted, textAlign: "center", maxWidth: 820, opacity: b(22), transform: `translateY(${(1 - b(22)) * 40}px)` }}>Klientët shohin çmimin, blejnë vetë dhe paguajnë online. <b style={{ color: INK }}>Ti merresh me biznesin.</b></div>
            <div style={{ opacity: b(48), transform: `translateY(${(1 - b(48)) * 30}px)` }}><GlareChip frame={frame} fontSize={44}>Fito kohën → vela.al</GlareChip></div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
