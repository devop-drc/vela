/**
 * TIKTOK SET — meme-format ads built on Albanian shopping culture, in
 * TikTok's native grammar: hook text inside 1 second, POV/chat skits,
 * punch-zooms, screen shakes, big outlined captions, hard cuts, CTA at the
 * end. All type sits inside TikTok's safe zone (120px top/bottom are
 * reserved by the platform UI). Rendered silent — attach a trending sound
 * from TikTok's Commercial Music Library in-app (see the README).
 *
 *  TkPriceInDm   ~14s  the "Çmimi në DM 🙏" meme → Vela shows the price on the product
 *  TkOldLek      ~13s  "1 milion lekë?! të vjetra apo të reja??" → clear pricing
 *  TkPovSeller   ~14s  POV: selling on IG without a shop — DM chaos → calm panel
 *  TkHaggle      ~13s  "Sa e le?" haggling → checkout doesn't negotiate
 */
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND, CLASH, SATOSHI, GRAD, GRAD_TEXT, Blobs, Grain, Cta, springy, rise, exitUp, CurrencyRoll } from "./mkKit";
import { LNotif, LProductCard, LStat } from "./Light";

const clamp = (f: number, a: [number, number], b: [number, number], ease?: (t: number) => number) =>
  interpolate(f, a, b, { extrapolateLeft: "clamp", extrapolateRight: "clamp", ...(ease ? { easing: ease } : {}) });

/* ── TikTok-native shell: brand night canvas + safe-zone padding ──────── */
const SAFE_TOP = 150;   // >120px TikTok top UI
const SAFE_BOTTOM = 240; // >120px + engagement rail breathing room

const TkShell: React.FC<{ children: React.ReactNode; shake?: number }> = ({ children, shake = 0 }) => {
  const frame = useCurrentFrame();
  const dx = shake > 0 ? Math.sin(frame * 2.7) * 9 * shake : 0;
  const dy = shake > 0 ? Math.cos(frame * 3.3) * 7 * shake : 0;
  return (
    <AbsoluteFill style={{ background: BRAND.dark, fontFamily: SATOSHI }}>
      <Blobs frame={frame} />
      <Grain />
      <AbsoluteFill style={{ padding: `${SAFE_TOP}px 64px ${SAFE_BOTTOM}px`, zIndex: 3, transform: `translate(${dx}px, ${dy}px)` }}>
        {children}
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 150, textAlign: "center", color: "rgba(255,255,255,0.45)", fontSize: 26, fontWeight: 800, letterSpacing: "0.24em", zIndex: 6 }}>
        VELA.AL
      </div>
    </AbsoluteFill>
  );
};

/** Big TikTok caption: heavy white type with a thick dark outline. */
const OUTLINE = [
  "-3px -3px 0 #10070B", "3px -3px 0 #10070B", "-3px 3px 0 #10070B", "3px 3px 0 #10070B",
  "0 -4px 0 #10070B", "0 4px 0 #10070B", "-4px 0 0 #10070B", "4px 0 0 #10070B",
  "0 14px 40px rgba(0,0,0,0.55)",
].join(", ");
const TkBig: React.FC<{ children: React.ReactNode; size?: number; color?: string; style?: React.CSSProperties }> = ({ children, size = 84, color = "#fff", style }) => (
  <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: size, lineHeight: 1.14, color, textAlign: "center", textShadow: OUTLINE, letterSpacing: "-0.01em", ...style }}>
    {children}
  </div>
);

/** Native-style caption chip (white pill, dark text) — the "spoken line". */
const TkChip: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({ children, size = 40, style }) => (
  <div style={{ display: "inline-block", background: "#fff", color: "#141414", borderRadius: 14, padding: `${size * 0.3}px ${size * 0.55}px`, fontFamily: SATOSHI, fontWeight: 800, fontSize: size, textAlign: "center", boxShadow: "0 16px 44px -14px rgba(0,0,0,0.65)", ...style }}>
    {children}
  </div>
);

/** Chat bubble pair for the skits. */
const Chat: React.FC<{ text: string; who: "buyer" | "seller"; s: number }> = ({ text, who, s }) => (
  <div style={{ display: "flex", justifyContent: who === "buyer" ? "flex-start" : "flex-end", opacity: Math.min(1, s * 1.5), transform: `translateY(${(1 - s) * 40}px) scale(${0.92 + s * 0.08})` }}>
    <div style={{
      maxWidth: "78%", padding: "22px 30px", fontSize: 36, fontWeight: 700, lineHeight: 1.3,
      borderRadius: 28, fontFamily: SATOSHI,
      ...(who === "buyer"
        ? { background: "rgba(255,255,255,0.96)", color: "#1b1b1b", borderBottomLeftRadius: 8 }
        : { backgroundImage: GRAD, color: "#fff", borderBottomRightRadius: 8 }),
      boxShadow: "0 22px 60px -20px rgba(0,0,0,0.6)",
    }}>
      {text}
    </div>
  </div>
);

/** Punch-in zoom wrapper (the TikTok cut). */
const Punch: React.FC<{ children: React.ReactNode; at: number; amount?: number }> = ({ children, at, amount = 0.08 }) => {
  const frame = useCurrentFrame();
  const z = 1 + clamp(frame, [at, at + 5], [0, amount], Easing.out(Easing.cubic));
  return <div style={{ transform: `scale(${z})`, transformOrigin: "50% 45%", height: "100%" }}>{children}</div>;
};

/* ══ TK1 — "Çmimi në DM 🙏" ═════════════════════════════════════════════ */
export const TkPriceInDm: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rage = clamp(frame, [150, 165], [0, 1]) - clamp(frame, [205, 215], [0, 1]);
  const actOut = clamp(frame, [222, 232], [0, 1], Easing.in(Easing.cubic));
  return (
    <TkShell shake={rage}>
      {/* HOOK — first second */}
      {frame < 236 && (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 30, ...exitUp(actOut) }}>
          <div style={{ ...rise(springy(frame, fps, 2, { damping: 11, stiffness: 240 })) }}>
            <TkBig size={68}>POV: pyet një dyqan<br />shqiptar për çmimin</TkBig>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 24 }}>
            <Chat who="buyer" text="Sa kushton fustani? 😍" s={springy(frame, fps, 38, { damping: 12, stiffness: 220 })} />
            <Chat who="seller" text="Çmimi në DM 🙏" s={springy(frame, fps, 78, { damping: 12, stiffness: 220 })} />
            <Chat who="buyer" text="…JEMI NË DM." s={springy(frame, fps, 130, { damping: 10, stiffness: 260 })} />
          </div>
          {frame >= 158 && (
            <div style={{ marginTop: 26, textAlign: "center" }}>
              <TkChip size={38}>Shqipëria e tërë në një foto 💀</TkChip>
            </div>
          )}
        </div>
      )}
      {/* PAYOFF — the fix */}
      {frame >= 228 && (
        <AbsoluteFill style={{ padding: `${SAFE_TOP}px 64px ${SAFE_BOTTOM}px`, alignItems: "center", justifyContent: "center", gap: 34 }}>
          <div style={{ ...rise(springy(frame, fps, 232, { damping: 11, stiffness: 240 })) }}>
            <TkBig size={64}>Me Velën çmimi rri<br /><span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", textShadow: "none" }}>te produkti.</span></TkBig>
          </div>
          <div style={{ ...rise(springy(frame, fps, 250)), transform: "scale(0.92)" }}>
            <LProductCard width={560} />
          </div>
          <div style={{ ...rise(springy(frame, fps, 286)) }}>
            <Cta size={34}>Dyqani yt falas → vela.al</Cta>
          </div>
        </AbsoluteFill>
      )}
    </TkShell>
  );
};
export const TK_DM_FRAMES = 420;

/* ══ TK2 — "Lekë të vjetra apo të reja?" ════════════════════════════════ */
export const TkOldLek: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const panic = clamp(frame, [64, 76], [0, 1]) - clamp(frame, [176, 188], [0, 1]);
  const flip = Math.floor(frame / 16) % 2 === 0; // the mental 10,000 ↔ 1,000 loop
  const actOut = clamp(frame, [196, 208], [0, 1], Easing.in(Easing.cubic));
  return (
    <TkShell shake={panic * 0.7}>
      {frame < 210 && (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 36, ...exitUp(actOut) }}>
          <div style={{ ...rise(springy(frame, fps, 2, { damping: 11, stiffness: 240 })) }}>
            <TkChip size={40}>Shitësi: "Kushton 1 milion lekë"</TkChip>
          </div>
          <div style={{ ...rise(springy(frame, fps, 40, { damping: 10, stiffness: 250 })) }}>
            <TkBig size={110}>1 MILION?!</TkBig>
          </div>
          {frame >= 76 && (
            <TkBig size={62} color="#FACC15">të vjetra apo të reja??</TkBig>
          )}
          {frame >= 108 && (
            <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 96, color: "#fff", textShadow: OUTLINE }}>
              {flip ? "10,000 L" : "1,000 L"} <span style={{ fontSize: 54, color: "rgba(255,255,255,0.6)" }}>???</span>
            </div>
          )}
          {frame >= 150 && (
            <TkChip size={36}>çdo blerje = provim matematike 💀</TkChip>
          )}
        </div>
      )}
      {frame >= 204 && (
        <AbsoluteFill style={{ padding: `${SAFE_TOP}px 64px ${SAFE_BOTTOM}px`, alignItems: "center", justifyContent: "center", gap: 34 }}>
          <div style={{ ...rise(springy(frame, fps, 208, { damping: 11, stiffness: 240 })) }}>
            <TkBig size={62}>Në dyqanin tënd Vela:<br /><span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", textShadow: "none" }}>çmimi i qartë.</span></TkBig>
          </div>
          <div style={{ ...rise(springy(frame, fps, 226)) }}>
            <LStat width={640} />
          </div>
          <div style={{ ...rise(springy(frame, fps, 244)), display: "flex", alignItems: "center", fontFamily: CLASH, fontWeight: 700, fontSize: 44, color: "#fff" }}>
            Shitje edhe në&nbsp;<CurrencyRoll size={44} gradient width={200} />
          </div>
          <div style={{ ...rise(springy(frame, fps, 262)) }}>
            <Cta size={34}>Pa kalkulator → vela.al</Cta>
          </div>
        </AbsoluteFill>
      )}
    </TkShell>
  );
};
export const TK_LEK_FRAMES = 390;

/* ══ TK3 — POV: shet në Instagram pa dyqan ══════════════════════════════ */
const POV_DMS = ["Sa kushton? 🙏", "A ka masë M?", "Çmimi ju lutem", "E keni në të zezë?", "A bëni dërgesa në fshat?", "Sa kushton??", "??"];
export const TkPovSeller: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chaos = clamp(frame, [40, 60], [0, 1]) - clamp(frame, [196, 208], [0, 1]);
  const actOut = clamp(frame, [212, 224], [0, 1], Easing.in(Easing.cubic));
  const dmCount = Math.min(147, Math.round(clamp(frame, [46, 200], [3, 147])));
  return (
    <TkShell shake={chaos * 0.8}>
      {frame < 226 && (
        <Punch at={46} amount={0.04}>
          <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 22, ...exitUp(actOut) }}>
            <div style={{ ...rise(springy(frame, fps, 2, { damping: 11, stiffness: 240 })) }}>
              <TkBig size={66}>POV: shet në Instagram<br />pa dyqan online</TkBig>
            </div>
            <div style={{ position: "relative", flex: 1 }}>
              {POV_DMS.map((t, i) => {
                const s = springy(frame, fps, 40 + i * 20, { damping: 12, stiffness: 230 });
                if (s <= 0.01) return null;
                return (
                  <div key={t + i} style={{
                    position: "absolute",
                    left: `${[4, 40, 10, 44, 2, 38, 22][i]}%`,
                    top: `${[2, 12, 26, 38, 52, 64, 78][i]}%`,
                    opacity: Math.min(1, s * 1.5),
                    transform: `rotate(${[-5, 4, -2, 5, -4, 2, -3][i]}deg) translateY(${(1 - s) * 60}px)`,
                  }}>
                    <div style={{ background: "rgba(255,255,255,0.96)", color: "#1b1b1b", borderRadius: 24, borderBottomLeftRadius: 8, padding: "16px 24px", fontSize: 30, fontWeight: 700, boxShadow: "0 20px 55px -18px rgba(0,0,0,0.65)" }}>{t}</div>
                  </div>
                );
              })}
            </div>
            {frame >= 60 && (
              <div style={{ textAlign: "center", marginBottom: 46 }}>
                <span style={{ background: "#E5484D", color: "#fff", borderRadius: 999, padding: "14px 32px", fontSize: 34, fontWeight: 800, boxShadow: "0 20px 60px -16px rgba(229,72,77,0.8)" }}>
                  {dmCount} DM pa përgjigje
                </span>
              </div>
            )}
          </div>
        </Punch>
      )}
      {frame >= 220 && (
        <AbsoluteFill style={{ padding: `${SAFE_TOP}px 64px ${SAFE_BOTTOM}px`, alignItems: "center", justifyContent: "center", gap: 30 }}>
          <div style={{ ...rise(springy(frame, fps, 224, { damping: 11, stiffness: 240 })) }}>
            <TkBig size={62}>Vela i kthen postimet<br />në <span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", textShadow: "none" }}>dyqan online.</span></TkBig>
          </div>
          <div style={{ ...rise(springy(frame, fps, 244)) }}><LNotif width={620} /></div>
          <div style={{ ...rise(springy(frame, fps, 258)) }}><LNotif width={620} name="Sara nga Vlora" amount="6,900 L" /></div>
          <div style={{ ...rise(springy(frame, fps, 274)) }}>
            <TkChip size={34}>Ti fle. Dyqani shet. 😴💸</TkChip>
          </div>
          <div style={{ ...rise(springy(frame, fps, 292)) }}>
            <Cta size={34}>Provo falas → vela.al</Cta>
          </div>
        </AbsoluteFill>
      )}
    </TkShell>
  );
};
export const TK_POV_FRAMES = 420;

/* ══ TK4 — "Sa e le?" (haggling vs checkout) ════════════════════════════ */
export const TkHaggle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const buzz = frame >= 168 && frame < 186;
  const actOut = clamp(frame, [206, 218], [0, 1], Easing.in(Easing.cubic));
  return (
    <TkShell shake={buzz ? 1 : 0}>
      {buzz && <AbsoluteFill style={{ background: "rgba(229,72,77,0.28)", zIndex: 5 }} />}
      {frame < 220 && (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 22, ...exitUp(actOut) }}>
          <div style={{ ...rise(springy(frame, fps, 2, { damping: 11, stiffness: 240 })) }}>
            <TkBig size={70}>Pazari shqiptar,<br />edicioni online:</TkBig>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 12 }}>
            <Chat who="buyer" text="Sa kushton?" s={springy(frame, fps, 34, { damping: 12, stiffness: 230 })} />
            <Chat who="seller" text="4,500 lekë" s={springy(frame, fps, 62, { damping: 12, stiffness: 230 })} />
            <Chat who="buyer" text="Sa e le? 🤔" s={springy(frame, fps, 92, { damping: 12, stiffness: 230 })} />
            <Chat who="seller" text="4,500." s={springy(frame, fps, 118, { damping: 12, stiffness: 230 })} />
            <Chat who="buyer" text="3,000 i jap, hajde se rregullohemi 🤝" s={springy(frame, fps, 142, { damping: 12, stiffness: 230 })} />
          </div>
          {frame >= 170 && (
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <TkBig size={84} color="#FF6B6B">❌ DYQANI S'BËN PAZAR</TkBig>
            </div>
          )}
        </div>
      )}
      {frame >= 214 && (
        <AbsoluteFill style={{ padding: `${SAFE_TOP}px 64px ${SAFE_BOTTOM}px`, alignItems: "center", justifyContent: "center", gap: 32 }}>
          <div style={{ ...rise(springy(frame, fps, 218, { damping: 11, stiffness: 240 })) }}>
            <TkBig size={62}>Çmimi është çmim.<br /><span style={{ backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", textShadow: "none" }}>Karta është kartë.</span></TkBig>
          </div>
          <div style={{ ...rise(springy(frame, fps, 238)), width: 620, background: "#fff", borderRadius: 26, padding: "30px 36px", display: "flex", flexDirection: "column", gap: 18, boxShadow: "0 30px 80px -25px rgba(0,0,0,0.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: SATOSHI, fontWeight: 700, fontSize: 30, color: "#141414" }}>
              <span>Fustan liri 'Vera'</span><span>4,500 L</span>
            </div>
            <div style={{ background: "#141414", color: "#FBF6F4", borderRadius: 16, textAlign: "center", padding: "18px 0", fontFamily: CLASH, fontWeight: 600, fontSize: 30 }}>
              Paguaj 4,500 L
            </div>
            <div style={{ textAlign: "center", color: "#1E7C3F", fontWeight: 800, fontSize: 28 }}>Porosia u krye ✓</div>
          </div>
          <div style={{ ...rise(springy(frame, fps, 268)) }}>
            <Cta size={34}>Shit pa pazar → vela.al</Cta>
          </div>
        </AbsoluteFill>
      )}
    </TkShell>
  );
};
export const TK_HAGGLE_FRAMES = 400;
