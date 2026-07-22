/**
 * Vela — FinalLaunch reels. Albanian meme-native format (relatable shopping-culture
 * jokes, POV/chat skits, Vela = the punchline-fix) but with CLEAN, SERIOUS brand
 * typography (Clash Display — no outlined "TikTok" font) and mixed light↔dark scenes:
 * a dark chaos/pain hook → hard cut → a clean light Vela payoff.
 *
 *   FinalLaunch01DmPrice  "Çmimi në DM 🙏"  → the price sits on the product
 */
import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { springIn, float } from "../../lib/motion";
import { BRAND, CLASH, INTER, INK, AuroraDark, CreamBase, Shimmer, GlareChip, glassLight, KineticWords, ensureClash } from "../marketing/nextgen/kitv2";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const SPRING = { damping: 14, mass: 1.0, stiffness: 140 }; // snappy, a little punch

/** Clean chat bubble — relatable, but on-brand (no meme outline). */
const Bubble: React.FC<{ text: string; who: "buyer" | "seller"; s: number }> = ({ text, who, s }) => (
  <div style={{ display: "flex", justifyContent: who === "buyer" ? "flex-start" : "flex-end", opacity: Math.min(1, s * 1.4), transform: `translateY(${(1 - s) * 44}px) scale(${0.9 + s * 0.1})` }}>
    <div style={{
      maxWidth: "82%", padding: "24px 34px", fontFamily: INTER, fontWeight: 600, fontSize: 42, lineHeight: 1.3,
      borderRadius: who === "buyer" ? "32px 32px 32px 10px" : "32px 32px 10px 32px",
      ...(who === "buyer"
        ? { background: "rgba(255,255,255,0.96)", color: "#1a1216" }
        : { backgroundImage: "linear-gradient(115deg,#A31234,#FF2E4D)", color: "#fff" }),
      boxShadow: "0 26px 64px -24px rgba(0,0,0,0.6)",
    }}>{text}</div>
  </div>
);

const POV: React.FC<{ children: React.ReactNode; frame: number; fps: number; delay?: number }> = ({ children, frame, fps, delay = 2 }) => {
  const s = springIn(frame, fps, delay, SPRING);
  return (
    <div style={{ opacity: interpolate(s, [0, 1], [0, 1]), transform: `translateY(${(1 - s) * 30}px)` }}>
      <span style={{ display: "inline-block", padding: "12px 26px", borderRadius: 14, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", color: "rgba(255,255,255,0.85)", fontFamily: CLASH, fontWeight: 600, fontSize: 34, letterSpacing: ".02em" }}>{children}</span>
    </div>
  );
};

export const FINAL_DM_FRAMES = 11 * 30; // 330
const CUT = 186;

export const FinalLaunch01DmPrice: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  ensureClash();

  const aOut = interpolate(frame, [CUT - 8, CUT], [1, 0], clamp); // hard-ish cut
  const bIn = frame >= CUT ? 1 : 0;
  const b = (d: number) => springIn(frame, fps, CUT + d, SPRING);
  const point = Math.abs(Math.sin((frame - CUT - 90) / 11)) * 12;

  return (
    <AbsoluteFill style={{ fontFamily: INTER }}>
      {/* ── DARK hook: the DM joke ── */}
      {frame < CUT + 2 && (
        <AbsoluteFill style={{ opacity: aOut }}>
          <AuroraDark frame={frame} />
          <AbsoluteFill style={{ padding: "150px 70px 200px", display: "flex", flexDirection: "column", gap: 30 }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <POV frame={frame} fps={fps}>POV: pyet një dyqan shqiptar për çmimin</POV>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 30 }}>
              <Bubble who="buyer" text="Sa kushton fustani? 😍" s={springIn(frame, fps, 34, SPRING)} />
              <Bubble who="seller" text="Çmimi në DM 🙏" s={springIn(frame, fps, 72, SPRING)} />
              <Bubble who="buyer" text="…po jemi në DM 💀" s={springIn(frame, fps, 120, SPRING)} />
            </div>
            <div style={{ marginTop: "auto", opacity: interpolate(springIn(frame, fps, 150, SPRING), [0, 1], [0, 1]) }}>
              <KineticWords text="Klasika shqiptare." frame={frame} fps={fps} delay={150} highlight="shqiptare" style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 70, color: "#fff", letterSpacing: "-0.02em" }} />
            </div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}

      {/* ── LIGHT payoff: Vela shows the price ── */}
      {bIn === 1 && (
        <AbsoluteFill>
          <CreamBase frame={frame} />
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 50, padding: "150px 70px" }}>
            <KineticWords text="Me Vela, çmimi rri te produkti." frame={frame} fps={fps} delay={CUT + 4} highlight="produkti" style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 68, color: INK, textAlign: "center", letterSpacing: "-0.02em", maxWidth: 900 }} />
            {/* clean light product card */}
            <div style={{ width: 560, borderRadius: 32, overflow: "hidden", ...glassLight, opacity: b(24), transform: `translateY(${(1 - b(24)) * 60 + float(frame, 6, 40)}px)` }}>
              <Img src={staticFile("campaign/sneaker.jpg")} style={{ width: "100%", height: 380, objectFit: "cover", display: "block" }} />
              <div style={{ position: "relative", padding: "28px 34px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 40, color: INK }}>Atlete Vrapi Air</div>
                <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 44, color: BRAND.wine }}>4,760 L</div>
              </div>
            </div>
            <div style={{ opacity: b(44), transform: `translateY(${(1 - b(44)) * 30}px)` }}>
              <GlareChip frame={frame} fontSize={44}>Dyqani yt falas → vela.al</GlareChip>
            </div>
            <div style={{ opacity: b(58), fontFamily: CLASH, fontWeight: 600, fontSize: 34, color: BRAND.muted, transform: `translateY(${-point}px)` }}>Pa "çmimi në DM". Kurrë më.</div>
          </AbsoluteFill>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

/* ══════════════════════ shared: hard-cut dark→light stage ══════════════════════ */
const Stage: React.FC<{ frame: number; cut: number; dark: React.ReactNode; light: React.ReactNode }> = ({ frame, cut, dark, light }) => (
  <AbsoluteFill style={{ fontFamily: INTER }}>
    {frame < cut + 2 && (
      <AbsoluteFill style={{ opacity: interpolate(frame, [cut - 8, cut], [1, 0], clamp) }}>
        <AuroraDark frame={frame} />{dark}
      </AbsoluteFill>
    )}
    {frame >= cut && <AbsoluteFill><CreamBase frame={frame} />{light}</AbsoluteFill>}
  </AbsoluteFill>
);
const H2 = (size: number, color = INK): React.CSSProperties => ({ fontFamily: CLASH, fontWeight: 700, fontSize: size, letterSpacing: "-0.02em", color, textAlign: "center" });
const PayCTA: React.FC<{ frame: number; fps: number; cut: number; cta: string; sub?: string }> = ({ frame, fps, cut, cta, sub }) => {
  const b = (d: number) => springIn(frame, fps, cut + d, SPRING);
  const pt = Math.abs(Math.sin((frame - cut - 90) / 11)) * 12;
  return (
    <>
      <div style={{ opacity: b(40), transform: `translateY(${(1 - b(40)) * 30}px)` }}><GlareChip frame={frame} fontSize={42}>{cta}</GlareChip></div>
      {sub && <div style={{ opacity: b(54), fontFamily: CLASH, fontWeight: 600, fontSize: 32, color: BRAND.muted, transform: `translateY(${-pt}px)` }}>{sub}</div>}
    </>
  );
};
/** Small light product card (image + name + price). */
const MiniCard: React.FC<{ img: string; name: string; price: string; width?: number; style?: React.CSSProperties }> = ({ img, name, price, width = 460, style }) => (
  <div style={{ width, borderRadius: 28, overflow: "hidden", ...glassLight, ...style }}>
    <Img src={staticFile(`campaign/${img}`)} style={{ width: "100%", height: 300, objectFit: "cover", display: "block" }} />
    <div style={{ position: "relative", padding: "22px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 32, color: INK }}>{name}</span>
      <span style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 36, color: BRAND.wine }}>{price}</span>
    </div>
  </div>
);

/* ══════════════════════ 02 · "Sa e le?" (pazari) ══════════════════════ */
export const FINAL_HAGGLE_FRAMES = 11 * 30;
export const FinalLaunch02Haggle: React.FC = () => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); ensureClash();
  const cut = 192; const b = (d: number) => springIn(frame, fps, cut + d, SPRING);
  const dark = (
    <AbsoluteFill style={{ padding: "150px 70px 200px", display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", justifyContent: "center" }}><POV frame={frame} fps={fps}>Pazari shqiptar, edicioni online</POV></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 24 }}>
        <Bubble who="buyer" text="Sa kushton?" s={springIn(frame, fps, 30, SPRING)} />
        <Bubble who="seller" text="4,500 lekë" s={springIn(frame, fps, 54, SPRING)} />
        <Bubble who="buyer" text="Sa e le? 🤔" s={springIn(frame, fps, 82, SPRING)} />
        <Bubble who="seller" text="4,500." s={springIn(frame, fps, 108, SPRING)} />
        <Bubble who="buyer" text="3,000 e lëmë, hajde 🤝" s={springIn(frame, fps, 134, SPRING)} />
      </div>
      <div style={{ marginTop: "auto", opacity: interpolate(springIn(frame, fps, 160, SPRING), [0, 1], [0, 1]) }}>
        <KineticWords text="Dyqani s'bën pazar." frame={frame} fps={fps} delay={160} highlight="pazar" style={{ ...H2(70, "#fff") }} />
      </div>
    </AbsoluteFill>
  );
  const light = (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 46, padding: "150px 70px" }}>
      <KineticWords text="Çmimi është çmim." frame={frame} fps={fps} delay={cut + 4} highlight="çmim" style={{ ...H2(70), maxWidth: 900 }} />
      <div style={{ width: 560, ...glassLight, borderRadius: 28, padding: "34px 40px", display: "flex", flexDirection: "column", gap: 20, opacity: b(24), transform: `translateY(${(1 - b(24)) * 60}px)` }}>
        <div style={{ position: "relative", display: "flex", justifyContent: "space-between", fontFamily: CLASH, fontWeight: 600, fontSize: 34, color: INK }}><span>Fustan liri</span><span>4,500 L</span></div>
        <div style={{ position: "relative", background: "linear-gradient(115deg,#A31234,#FF2E4D)", color: "#fff", borderRadius: 16, textAlign: "center", padding: "20px 0", fontFamily: CLASH, fontWeight: 600, fontSize: 34 }}>Paguaj 4,500 L</div>
        <div style={{ position: "relative", textAlign: "center", color: "#10893E", fontWeight: 800, fontFamily: CLASH, fontSize: 30 }}>Porosia u krye ✓</div>
      </div>
      <PayCTA frame={frame} fps={fps} cut={cut} cta="Shit pa pazar → vela.al" sub="Karta nuk bën pazar." />
    </AbsoluteFill>
  );
  return <Stage frame={frame} cut={cut} dark={dark} light={light} />;
};

/* ══════════════════════ 03 · POV: shet pa dyqan ══════════════════════ */
const POV_DMS = ["Sa kushton? 🙏", "A ka masë M?", "Çmimi ju lutem", "E keni në të zezë?", "Dërgesa në fshat?", "Sa kushton??", "??"];
export const FINAL_POV_FRAMES = 11 * 30;
export const FinalLaunch03PovNoShop: React.FC = () => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); ensureClash();
  const cut = 192; const b = (d: number) => springIn(frame, fps, cut + d, SPRING);
  const dmCount = Math.min(147, Math.round(interpolate(frame, [40, 180], [3, 147], clamp)));
  const dark = (
    <AbsoluteFill style={{ padding: "150px 70px 200px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "center" }}><POV frame={frame} fps={fps}>POV: shet në Instagram pa dyqan</POV></div>
      <div style={{ position: "relative", flex: 1, marginTop: 20 }}>
        {POV_DMS.map((t, i) => {
          const s = springIn(frame, fps, 34 + i * 18, SPRING); if (s <= 0.01) return null;
          return <div key={i} style={{ position: "absolute", left: `${[4, 42, 8, 46, 2, 40, 24][i]}%`, top: `${[0, 12, 26, 40, 54, 66, 80][i]}%`, opacity: Math.min(1, s * 1.4), transform: `rotate(${[-5, 4, -2, 5, -4, 2, -3][i]}deg) translateY(${(1 - s) * 50}px)` }}>
            <div style={{ background: "rgba(255,255,255,0.96)", color: "#1a1216", borderRadius: 24, borderBottomLeftRadius: 8, padding: "16px 26px", fontSize: 32, fontWeight: 700, fontFamily: INTER, boxShadow: "0 22px 56px -18px rgba(0,0,0,0.6)" }}>{t}</div>
          </div>;
        })}
      </div>
      {frame >= 58 && <div style={{ textAlign: "center", marginBottom: 30 }}><span style={{ background: "#E5484D", color: "#fff", borderRadius: 999, padding: "16px 34px", fontSize: 36, fontWeight: 800, fontFamily: CLASH, boxShadow: "0 20px 60px -16px rgba(229,72,77,0.7)" }}>{dmCount} DM pa përgjigje</span></div>}
    </AbsoluteFill>
  );
  const light = (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40, padding: "150px 70px" }}>
      <KineticWords text="Vela i kthen postimet në dyqan." frame={frame} fps={fps} delay={cut + 4} highlight="dyqan" style={{ ...H2(64), maxWidth: 900 }} />
      {[["Ana nga Tirana", "3,500 L"], ["Sara nga Vlora", "6,900 L"]].map(([n, a], i) => (
        <div key={i} style={{ width: 620, ...glassLight, borderRadius: 24, padding: "24px 30px", display: "flex", alignItems: "center", gap: 20, opacity: b(20 + i * 14), transform: `translateY(${(1 - b(20 + i * 14)) * 50}px)` }}>
          <span style={{ position: "relative", width: 56, height: 56, borderRadius: 999, display: "grid", placeItems: "center", background: "rgba(16,185,129,0.16)", fontSize: 28 }}>🎉</span>
          <div style={{ position: "relative", flex: 1 }}><div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 30, color: INK }}>Porosi e re · {n}</div><div style={{ fontFamily: INTER, fontSize: 24, color: BRAND.muted }}>+{a} · me kartë</div></div>
        </div>
      ))}
      <div style={{ opacity: b(52), fontFamily: CLASH, fontWeight: 700, fontSize: 40, color: INK }}>Ti fle. <Shimmer frame={frame}>Dyqani shet.</Shimmer> 😴</div>
      <PayCTA frame={frame} fps={fps} cut={cut} cta="Provo falas → vela.al" />
    </AbsoluteFill>
  );
  return <Stage frame={frame} cut={cut} dark={dark} light={light} />;
};

/* ══════════════════════ 04 · Lekë të vjetra apo të reja? ══════════════════════ */
export const FINAL_LEK_FRAMES = 11 * 30;
export const FinalLaunch04OldLek: React.FC = () => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); ensureClash();
  const cut = 186; const flip = Math.floor(frame / 16) % 2 === 0;
  const dark = (
    <AbsoluteFill style={{ padding: "150px 70px 200px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 34 }}>
      <div style={{ opacity: interpolate(springIn(frame, fps, 4, SPRING), [0, 1], [0, 1]) }}><POV frame={frame} fps={fps}>Shitësi: "kushton 1 milion lekë"</POV></div>
      <div style={{ ...H2(120, "#fff"), opacity: interpolate(springIn(frame, fps, 34, SPRING), [0, 1], [0, 1]), transform: `scale(${0.9 + 0.1 * Math.min(springIn(frame, fps, 34, SPRING), 1)})` }}>1 MILION?!</div>
      {frame >= 70 && <div style={{ ...H2(60, "#FACC15") }}>të vjetra apo të reja??</div>}
      {frame >= 104 && <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 92, color: "#fff" }}>{flip ? "10,000 L" : "1,000 L"} <span style={{ fontSize: 48, color: "rgba(255,255,255,0.55)" }}>???</span></div>}
      {frame >= 150 && <div style={{ opacity: interpolate(springIn(frame, fps, 150, SPRING), [0, 1], [0, 1]) }}><KineticWords text="Çdo blerje = provim matematike 💀" frame={frame} fps={fps} delay={150} style={{ ...H2(46, "rgba(255,255,255,0.85)") }} /></div>}
    </AbsoluteFill>
  );
  const b = (d: number) => springIn(frame, fps, cut + d, SPRING);
  const light = (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 44, padding: "150px 70px" }}>
      <KineticWords text="Çmimi i qartë. Në çdo monedhë." frame={frame} fps={fps} delay={cut + 4} highlight="qartë" style={{ ...H2(62), maxWidth: 900 }} />
      <div style={{ ...glassLight, borderRadius: 30, padding: "40px 60px", opacity: b(24), transform: `translateY(${(1 - b(24)) * 60}px)` }}>
        <div style={{ position: "relative", fontFamily: CLASH, fontWeight: 700, fontSize: 96, color: BRAND.wine, textAlign: "center" }}>4,760 L</div>
        <div style={{ position: "relative", fontFamily: INTER, fontSize: 30, color: BRAND.muted, textAlign: "center", marginTop: 6 }}>ose 46 € · ose 50 $</div>
      </div>
      <PayCTA frame={frame} fps={fps} cut={cut} cta="Pa kalkulator → vela.al" sub="Lekë, Euro, Dollarë." />
    </AbsoluteFill>
  );
  return <Stage frame={frame} cut={cut} dark={dark} light={light} />;
};

/* ══════════════════════ 05 · Client POV: scroll pafund vs filtro ══════════════════════ */
const ScrollGrid: React.FC<{ frame: number }> = ({ frame }) => {
  const imgs = ["sneaker.jpg", "dress.jpg", "bag.jpg", "dress.jpg", "sneaker.jpg", "bag.jpg", "sneaker.jpg", "dress.jpg", "bag.jpg", "dress.jpg"];
  const y = -((frame * 16) % 720);
  return (
    <div style={{ width: 460, height: 700, borderRadius: 54, overflow: "hidden", background: "#0B0710", border: "2px solid rgba(255,255,255,0.14)", padding: 12, boxShadow: "0 60px 130px -50px rgba(0,0,0,0.8)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, transform: `translateY(${y}px)` }}>
        {imgs.concat(imgs).map((n, i) => <Img key={i} src={staticFile(`campaign/${n}`)} style={{ width: "100%", height: 210, objectFit: "cover", borderRadius: 12 }} />)}
      </div>
    </div>
  );
};
export const FINAL_SCROLL_FRAMES = 11 * 30;
export const FinalLaunch05ClientScroll: React.FC = () => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); ensureClash();
  const cut = 192; const b = (d: number) => springIn(frame, fps, cut + d, SPRING);
  const dark = (
    <AbsoluteFill style={{ padding: "150px 70px 200px", display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
      <POV frame={frame} fps={fps}>Klientët e tu, çdo mbrëmje:</POV>
      <div style={{ position: "relative", marginTop: 10, opacity: interpolate(springIn(frame, fps, 20, SPRING), [0, 1], [0, 1]) }}>
        <ScrollGrid frame={frame} />
        <div style={{ position: "absolute", right: -46, bottom: 54, width: 380, transform: "rotate(3deg)" }}><Bubble who="buyer" text="ku ishte ai fustani i kuq?? 😩" s={springIn(frame, fps, 70, SPRING)} /></div>
      </div>
      <div style={{ marginTop: "auto", opacity: interpolate(springIn(frame, fps, 150, SPRING), [0, 1], [0, 1]) }}>
        <KineticWords text="45 min scroll. 0 blerje." frame={frame} fps={fps} delay={150} highlight="0" style={{ ...H2(64, "#fff") }} />
      </div>
    </AbsoluteFill>
  );
  const light = (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40, padding: "150px 70px" }}>
      <KineticWords text="Kërko. Filtro. Gjej." frame={frame} fps={fps} delay={cut + 4} highlight="Gjej" style={{ ...H2(76), maxWidth: 900 }} />
      <div style={{ width: 720, display: "flex", flexDirection: "column", gap: 18, opacity: b(22), transform: `translateY(${(1 - b(22)) * 50}px)` }}>
        <div style={{ ...glassLight, borderRadius: 999, padding: "24px 34px", display: "flex", alignItems: "center", gap: 16 }}><span style={{ position: "relative", fontSize: 32 }}>🔎</span><span style={{ position: "relative", fontFamily: INTER, fontSize: 34, color: INK, fontWeight: 600 }}>fustan i kuq, masa M</span></div>
        <div style={{ display: "flex", gap: 12 }}>{["Fustane", "Kuqe", "Masa M"].map((c, i) => <span key={c} style={{ padding: "14px 28px", borderRadius: 999, fontFamily: CLASH, fontWeight: 600, fontSize: 26, ...(i === 1 ? { background: "linear-gradient(115deg,#A31234,#FF2E4D)", color: "#fff" } : { ...glassLight, color: INK }) }}>{c}</span>)}</div>
      </div>
      <MiniCard img="dress.jpg" name="Fustan i kuq" price="3,500 L" width={440} style={{ opacity: b(40), transform: `translateY(${(1 - b(40)) * 50}px)` } as any} />
      <PayCTA frame={frame} fps={fps} cut={cut} cta="Klientët blejnë vetë → vela.al" sub="E gjejnë në 3 sekonda." />
    </AbsoluteFill>
  );
  return <Stage frame={frame} cut={cut} dark={dark} light={light} />;
};

/* ══════════════════════ 06 · Client POV: DM barazim vs 1 klik ══════════════════════ */
export const FINAL_CLIENTDM_FRAMES = 11 * 30;
export const FinalLaunch06ClientDm: React.FC = () => {
  const frame = useCurrentFrame(); const { fps } = useVideoConfig(); ensureClash();
  const cut = 198; const b = (d: number) => springIn(frame, fps, cut + d, SPRING);
  const dark = (
    <AbsoluteFill style={{ padding: "150px 70px 200px", display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", justifyContent: "center" }}><POV frame={frame} fps={fps}>Klienti yt, për të blerë 1 gjë:</POV></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 22 }}>
        <Bubble who="buyer" text="Sa kushton?" s={springIn(frame, fps, 30, SPRING)} />
        <Bubble who="buyer" text="Ku ndodheni?" s={springIn(frame, fps, 54, SPRING)} />
        <Bubble who="buyer" text="Si e ka emrin?" s={springIn(frame, fps, 78, SPRING)} />
        <Bubble who="buyer" text="Si paguaj — kartë a cash?" s={springIn(frame, fps, 102, SPRING)} />
        <Bubble who="buyer" text="A bëni dërgesa?" s={springIn(frame, fps, 126, SPRING)} />
      </div>
      <div style={{ marginTop: "auto", opacity: interpolate(springIn(frame, fps, 152, SPRING), [0, 1], [0, 1]) }}>
        <KineticWords text="5 pyetje për 1 blerje. 😮‍💨" frame={frame} fps={fps} delay={152} highlight="5" style={{ ...H2(60, "#fff") }} />
      </div>
    </AbsoluteFill>
  );
  const light = (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 36, padding: "150px 70px" }}>
      <KineticWords text="1 klik. Zero DM." frame={frame} fps={fps} delay={cut + 4} highlight="Zero" style={{ ...H2(80), maxWidth: 900 }} />
      <div style={{ width: 700, ...glassLight, borderRadius: 28, padding: "32px 38px", display: "flex", flexDirection: "column", gap: 16, opacity: b(22), transform: `translateY(${(1 - b(22)) * 50}px)` }}>
        {[["💳", "Kartë ose cash"], ["🚚", "Dërgesa automatike, çdo qytet"], ["📦", "Stoku përditësohet vetë"]].map(([ic, t]) => (
          <div key={t} style={{ position: "relative", display: "flex", alignItems: "center", gap: 18 }}>
            <span style={{ width: 52, height: 52, borderRadius: 14, display: "grid", placeItems: "center", background: "rgba(163,18,52,0.08)", fontSize: 26 }}>{ic}</span>
            <span style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 34, color: INK }}>{t}</span>
            <span style={{ marginLeft: "auto", color: "#10893E", fontSize: 32, fontWeight: 800 }}>✓</span>
          </div>
        ))}
      </div>
      <PayCTA frame={frame} fps={fps} cut={cut} cta="Blerje pa DM → vela.al" sub="Klienti klikon. Ti paketon." />
    </AbsoluteFill>
  );
  return <Stage frame={frame} cut={cut} dark={dark} light={light} />;
};
