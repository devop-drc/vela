/**
 * Marketing kit — shared pieces for the @vela.al Instagram content set
 * (branding/marketing/instagram). Motion graphics + typography only, on the
 * Vela design language: night canvas with drifting brand blobs + film grain,
 * CLASH DISPLAY for display type, SATOSHI for support copy (the brand's
 * marketing body font), the wine→neon→gold gradient as spice, springs with
 * weight, and blur-rise reveals.
 *
 * Every reel/post follows the same strategy: HOOK (first beat owns the
 * frame) → PROCESS (one idea, shown not told) → PAYOFF (one CTA).
 */
import React from "react";
import { AbsoluteFill, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND, CLASH, Blobs, ensureClash } from "../stories/storyKit";

ensureClash();

/* ── Satoshi (Fontshare) — loaded from public/fonts/satoshi ── */
export const SATOSHI = "Satoshi";
let satoshiLoading = false;
const ensureSatoshi = () => {
  if (satoshiLoading || typeof document === "undefined") return;
  satoshiLoading = true;
  const handle = delayRender("Satoshi");
  Promise.all(
    [
      ["Satoshi-500.woff2", "500"],
      ["Satoshi-700.woff2", "700"],
    ].map(([file, weight]) =>
      new FontFace(SATOSHI, `url('${staticFile(`fonts/satoshi/${file}`)}') format('woff2')`, { weight }).load(),
    ),
  )
    .then((loaded) => {
      loaded.forEach((f) => document.fonts.add(f));
      continueRender(handle);
    })
    .catch(() => continueRender(handle));
};
ensureSatoshi();

export { BRAND, CLASH, Blobs };

export const GRAD = "linear-gradient(115deg,#7F1D3B,#A31234 40%,#FF2E4D 75%,#F59E0B 115%)";
export const GRAD_TEXT = "linear-gradient(100deg,#FACC15 5%,#F59E0B 30%,#FF2E4D 62%,#A31234 95%)";

/** Weighted spring — arrives with weight, settles. */
export const springy = (frame: number, fps: number, delay = 0, cfg?: { damping?: number; stiffness?: number }) =>
  spring({ frame: frame - delay, fps, config: { damping: cfg?.damping ?? 16, stiffness: cfg?.stiffness ?? 170, mass: 1 } });

/** Blur-rise text reveal (the landing hero's signature entrance). */
export const rise = (s: number): React.CSSProperties => ({
  opacity: Math.min(1, s * 1.4),
  filter: `blur(${Math.max(0, 1 - s) * 10}px)`,
  transform: `translateY(${(1 - s) * 26}px)`,
});

/** Exit-up with motion blur, for beat hand-offs. */
export const exitUp = (t: number): React.CSSProperties => ({
  opacity: 1 - t,
  transform: `translateY(${-t * 90}px)`,
  filter: `blur(${t * 8}px)`,
});

/** Film-grain overlay. */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.05 }) => (
  <AbsoluteFill
    style={{
      opacity,
      mixBlendMode: "overlay",
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
    }}
  />
);

/** The tag-sails boat (no tile) with a gentle bob. */
export const Boat: React.FC<{ size?: number; bob?: boolean; style?: React.CSSProperties }> = ({ size = 300, bob, style }) => {
  const frame = useCurrentFrame();
  const rock = bob ? Math.sin((frame / 30) * Math.PI * 0.5) * 1.6 : 0;
  const lift = bob ? Math.sin((frame / 30) * Math.PI * 0.5 + 1) * 5 : 0;
  return (
    <img
      src={staticFile("brand/ship-nobg.svg")}
      style={{ width: size, transform: `translateY(${lift}px) rotate(${rock}deg)`, transformOrigin: "50% 80%", ...style }}
    />
  );
};

export const Wordmark: React.FC<{ width?: number; style?: React.CSSProperties }> = ({ width = 460, style }) => (
  <img src={staticFile("brand/wordmark-dark-bg.svg")} style={{ width, ...style }} />
);

/** Gradient CTA pill — the landing's primary button. */
export const Cta: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({ children, size = 44, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 18,
      padding: `${size * 0.62}px ${size * 1.45}px`,
      borderRadius: 999,
      backgroundImage: GRAD,
      color: "#fff",
      fontFamily: CLASH,
      fontWeight: 600,
      fontSize: size,
      letterSpacing: "-0.01em",
      boxShadow: "0 30px 80px -24px rgba(255,46,77,0.55)",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Night canvas: blobs + grain + handle / signature chrome. */
export const NightShell: React.FC<{
  children: React.ReactNode;
  reel?: boolean;
  chrome?: boolean;
  chromeFrom?: number;
}> = ({ children, reel, chrome = true, chromeFrom = 10 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const inA = chromeFrom;
  const inB = chromeFrom + 18;
  const outA = Math.max(inB + 1, durationInFrames - 14);
  const outB = Math.max(outA + 1, durationInFrames - 2);
  const chromeOpacity = interpolate(frame, [inA, inB, outA, outB], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: BRAND.dark, fontFamily: SATOSHI }}>
      <Blobs frame={frame} />
      <Grain />
      {chrome && (
        <>
          <div style={{ position: "absolute", top: reel ? 96 : 64, left: 0, right: 0, textAlign: "center", opacity: chromeOpacity, color: "rgba(255,255,255,0.55)", fontSize: reel ? 30 : 26, fontWeight: 500, zIndex: 6 }}>
            @vela.al
          </div>
          <div style={{ position: "absolute", bottom: reel ? 92 : 60, left: 0, right: 0, textAlign: "center", opacity: chromeOpacity * 0.85, color: "rgba(255,255,255,0.5)", fontSize: reel ? 24 : 22, fontWeight: 700, letterSpacing: "0.3em", zIndex: 6 }}>
            VELA — DYQANI YT ONLINE
          </div>
        </>
      )}
      <AbsoluteFill style={{ padding: reel ? "270px 84px 280px" : "150px 84px 150px", zIndex: 3 }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Warm paper canvas (the landing's cream). */
export const PaperShell: React.FC<{ children: React.ReactNode; reel?: boolean }> = ({ children, reel }) => (
  <AbsoluteFill style={{ background: "#FBF6F4", fontFamily: SATOSHI }}>
    <div style={{ position: "absolute", right: -220, top: -260, width: 900, height: 900, borderRadius: 999, background: "rgba(255,46,77,0.10)", filter: "blur(150px)" }} />
    <div style={{ position: "absolute", left: -260, bottom: -300, width: 950, height: 950, borderRadius: 999, background: "rgba(245,158,11,0.13)", filter: "blur(150px)" }} />
    <Grain opacity={0.035} />
    <AbsoluteFill style={{ padding: reel ? "270px 84px 280px" : "140px 84px 140px", zIndex: 3 }}>{children}</AbsoluteFill>
  </AbsoluteFill>
);

/** Eyebrow pill — landing section opener. */
export const Eyebrow: React.FC<{ children: React.ReactNode; dark?: boolean; style?: React.CSSProperties }> = ({ children, dark, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 14,
      padding: "16px 34px",
      borderRadius: 999,
      border: `2px solid ${dark ? "rgba(255,255,255,0.18)" : "#EDE4E1"}`,
      background: dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.8)",
      color: dark ? "rgba(255,255,255,0.75)" : BRAND.muted,
      fontFamily: SATOSHI,
      fontSize: 26,
      fontWeight: 700,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      ...style,
    }}
  >
    <span style={{ width: 14, height: 14, borderRadius: 99, backgroundImage: GRAD }} />
    {children}
  </div>
);

/* ══ UI-card primitives (typographic mockups — no screenshots) ══════════ */

/** Stylized Instagram-post card built purely from shapes + type. */
export const IgPostCard: React.FC<{ width?: number; style?: React.CSSProperties }> = ({ width = 620, style }) => (
  <div style={{ width, background: "#fff", borderRadius: 28, overflow: "hidden", boxShadow: "0 40px 100px -30px rgba(0,0,0,0.6)", fontFamily: SATOSHI, ...style }}>
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "20px 24px" }}>
      <div style={{ width: 52, height: 52, borderRadius: 999, backgroundImage: GRAD }} />
      <div>
        <div style={{ fontWeight: 700, fontSize: 26, color: "#111" }}>dyqani.yt</div>
        <div style={{ fontSize: 20, color: "#8a8a8a" }}>Tiranë</div>
      </div>
    </div>
    <div style={{ height: width * 0.62, background: "linear-gradient(135deg,#2A1D22,#7F1D3B 55%,#A31234)", display: "grid", placeItems: "center" }}>
      <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 34, color: "rgba(255,255,255,0.9)", letterSpacing: "0.02em" }}>📸 FOTO E PRODUKTIT</div>
    </div>
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 18, fontSize: 30 }}>❤️ 💬 ✈️</div>
      <div style={{ fontSize: 23, color: "#333", lineHeight: 1.45 }}>
        Atlete vrapi ✨ çmimi 4,500 L · masat 40–44 · DM për porosi 🙏
      </div>
    </div>
  </div>
);

/** Stylized product card (the storefront card, as motion-graphic). */
export const ProductCardMock: React.FC<{ width?: number; style?: React.CSSProperties }> = ({ width = 620, style }) => (
  <div style={{ width, background: "#fff", borderRadius: 28, overflow: "hidden", boxShadow: "0 40px 100px -30px rgba(163,18,52,0.5)", fontFamily: SATOSHI, ...style }}>
    <div style={{ height: width * 0.52, background: "linear-gradient(135deg,#2A1D22,#7F1D3B 55%,#A31234)", display: "grid", placeItems: "center", position: "relative" }}>
      <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 32, color: "rgba(255,255,255,0.9)" }}>📸 FOTO E PRODUKTIT</div>
      <div style={{ position: "absolute", top: 18, left: 18, background: "#239F50", color: "#fff", borderRadius: 99, padding: "8px 22px", fontSize: 22, fontWeight: 700 }}>Në stok</div>
    </div>
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ fontFamily: CLASH, fontWeight: 600, fontSize: 34, color: "#111" }}>Atlete Vrapi Air</div>
      <div style={{ display: "flex", gap: 10 }}>
        {["40", "41", "42", "43", "44"].map((m) => (
          <span key={m} style={{ border: "2px solid #e5dbd7", borderRadius: 12, padding: "6px 16px", fontSize: 22, fontWeight: 700, color: "#444" }}>{m}</span>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
        <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 40, color: BRAND.primary }}>4,500 L</div>
        <div style={{ backgroundImage: GRAD, color: "#fff", borderRadius: 999, padding: "12px 30px", fontSize: 24, fontWeight: 700 }}>Shto në shportë</div>
      </div>
    </div>
  </div>
);

/** Order-notification card (the "cha-ching" moment). */
export const OrderNotif: React.FC<{ amount: string; name: string; width?: number; style?: React.CSSProperties }> = ({ amount, name, width = 700, style }) => (
  <div style={{ width, display: "flex", alignItems: "center", gap: 22, background: "rgba(255,255,255,0.97)", borderRadius: 26, padding: "24px 30px", boxShadow: "0 30px 80px -25px rgba(0,0,0,0.6)", fontFamily: SATOSHI, ...style }}>
    <div style={{ width: 64, height: 64, borderRadius: 18, backgroundImage: GRAD, display: "grid", placeItems: "center", fontSize: 32, flexShrink: 0 }}>🛍️</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 700, fontSize: 28, color: "#111" }}>Porosi e re! 🎉</div>
      <div style={{ fontSize: 23, color: "#777" }}>{name} · pagesë me kartë</div>
    </div>
    <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 34, color: BRAND.primary, flexShrink: 0 }}>{amount}</div>
  </div>
);

/** Dashboard stat tile (the admin panel, as motion-graphic). */
export const StatTile: React.FC<{ label: string; value: string; accent?: boolean; sub?: string; style?: React.CSSProperties }> = ({ label, value, accent, sub, style }) => (
  <div style={{ background: "rgba(255,255,255,0.06)", border: "2px solid rgba(255,255,255,0.13)", borderRadius: 26, padding: "30px 34px", display: "flex", flexDirection: "column", gap: 8, fontFamily: SATOSHI, ...style }}>
    <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>{label}</div>
    <div style={{ fontFamily: CLASH, fontWeight: 700, fontSize: 66, lineHeight: 1, ...(accent ? { backgroundImage: GRAD_TEXT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" } : { color: "#fff" }) }}>{value}</div>
    {sub && <div style={{ fontSize: 22, color: "rgba(255,255,255,0.55)" }}>{sub}</div>}
  </div>
);
