/**
 * HeroFilm v3 — the landing hero video.
 * • Content area matches the 1440×900 screenshots exactly (no zoom/crop).
 * • Transition variety: push / lift / scale-through / iris (circle reveal) /
 *   tilt (perspective swing) + a brand-gradient sweep band on every cut.
 * • Simulated cursor CLICKS the real UI (connect, add-to-cart, checkout).
 * • Kinetic-typography interstitials — text-only beats on a translucent glass
 *   panel (readable over any page background), no screenshots behind them.
 * • `transparent` prop: render with alpha for the WebM used on the site
 *   (backdrop shows the live page, like the navbar glass); the MP4 fallback
 *   keeps the warm baked background.
 *
 * Render:
 *   npx remotion render src/remotion.ts HeroFilm public/hero/hero-film.mp4 --codec=h264 --crf=22
 *   npx remotion render src/remotion.ts HeroFilm public/hero/hero-film.webm --codec=vp9 --image-format=png --pixel-format=yuva420p --props="{\"transparent\":true}"
 */
import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, Easing } from "remotion";
import { z } from "zod";

export const heroFilmSchema = z.object({ lang: z.enum(["sq", "en"]), transparent: z.boolean() });
export const heroFilmDefaults: z.infer<typeof heroFilmSchema> = { lang: "sq", transparent: false };

const FPS = 30;
const W = 1600;
const H = 1000;
export const HERO_FILM = { width: W, height: H, fps: FPS, durationInFrames: 915 };

const WIN = { top: 60, x: 137.5, chrome: 52 };
const CONTENT = { x: WIN.x, y: WIN.top + WIN.chrome, w: W - 2 * WIN.x, h: H - 2 * WIN.top - WIN.chrome };

const BRAND = { wine: "#A31234", deep: "#7F1D3B", neon: "#FF2E4D", amber: "#F59E0B", gold: "#FACC15", ink: "#2A1D22", muted: "#796770" };
const GRAD = "linear-gradient(115deg,#7F1D3B,#A31234 40%,#FF2E4D 75%,#F59E0B 115%)";

const t = (l: "sq" | "en", sq: string, en: string) => (l === "sq" ? sq : en);
const sp = (frame: number, delay = 0, damping = 13) => spring({ frame: frame - delay, fps: FPS, config: { damping, stiffness: 140, mass: 0.8 } });
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const IMGS = [
  "1592750475338-74b7b21085ab", "1595777457583-95e059d581b8", "1542291026-7eec264c27ff",
  "1553062407-98eeb64c6a62", "1605100804763-247f67b3557e", "1505740420928-5e560c06d30e",
  "1551028719-00167b16eac5", "1600185365926-3a2ce3cdb9eb", "1599643478518-a784e5dc4c8f",
];
const U = (id: string, w = 400) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

/* ── persistent browser window (fades away under type interstitials) ── */
const Window: React.FC<{ url: string; children: React.ReactNode; frame: number; presence: number }> = ({ url, children, frame, presence }) => (
  <div
    style={{
      position: "absolute", top: WIN.top, bottom: WIN.top, left: WIN.x, right: WIN.x,
      borderRadius: 26, background: "#fff",
      boxShadow: "0 60px 140px -40px rgba(42,29,34,0.45), 0 0 0 1px rgba(42,29,34,0.07)",
      overflow: "hidden",
      opacity: presence,
      transform: `translateY(${Math.sin(frame / 55) * 5}px) scale(${0.92 + presence * 0.08})`,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 8, height: WIN.chrome, borderBottom: "1px solid #EDE6E9", background: "#FBF8F9", padding: "0 20px" }}>
      <span style={{ width: 13, height: 13, borderRadius: 99, background: "#ff5f57" }} />
      <span style={{ width: 13, height: 13, borderRadius: 99, background: "#febc2e" }} />
      <span style={{ width: 13, height: 13, borderRadius: 99, background: "#28c840" }} />
      <div style={{ margin: "0 auto", background: "#fff", border: "1px solid #EDE6E9", borderRadius: 99, padding: "6px 26px", fontSize: 17, color: BRAND.muted, fontFamily: "Inter, sans-serif" }}>
        {url}
      </div>
      <span style={{ width: 60 }} />
    </div>
    <div style={{ position: "absolute", inset: `${WIN.chrome}px 0 0 0`, overflow: "hidden" }}>{children}</div>
  </div>
);

const Sweep: React.FC<{ local: number }> = ({ local }) => {
  if (local < 0 || local > 18) return null;
  const x = interpolate(local, [0, 18], [-30, 105], { easing: Easing.inOut(Easing.cubic) });
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 40, overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -40, bottom: -40, left: `${x}%`, width: "26%", transform: "skewX(-12deg)", background: GRAD, opacity: 0.85, filter: "blur(2px)", boxShadow: "0 0 80px 20px rgba(255,46,77,0.35)" }} />
    </div>
  );
};

const Caption: React.FC<{ text: string; local: number; dur: number }> = ({ text, local, dur }) => {
  const s = sp(local, 10, 14);
  const out = clamp01((local - (dur - 12)) / 10);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 16, display: "flex", justifyContent: "center", opacity: s * (1 - out) }}>
      <div style={{ transform: `translateY(${(1 - s) * 18}px)`, display: "flex", alignItems: "center", gap: 12, background: "rgba(42,29,34,0.92)", color: "#fff", borderRadius: 999, padding: "12px 28px", fontSize: 21, fontWeight: 600, fontFamily: "Inter, sans-serif", boxShadow: "0 18px 50px -18px rgba(0,0,0,0.5)" }}>
        <span style={{ width: 9, height: 9, borderRadius: 99, background: GRAD }} />
        {text}
      </div>
    </div>
  );
};

const Shot: React.FC<{ src: string }> = ({ src }) => (
  <Img src={staticFile(src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
);

type Waypoint = { f: number; x: number; y: number };
const CursorSim: React.FC<{ local: number; points: Waypoint[]; clickAt?: number }> = ({ local, points, clickAt }) => {
  if (local < points[0].f - 4) return null;
  const fs = points.map((p) => p.f);
  const x = interpolate(local, fs, points.map((p) => p.x), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  const y = interpolate(local, fs, points.map((p) => p.y), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  const appear = sp(local, points[0].f - 4, 14);
  const click = clickAt != null ? sp(local, clickAt, 11) : 0;
  const press = clickAt != null ? interpolate(local, [clickAt - 3, clickAt, clickAt + 4], [1, 0.86, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  return (
    <div style={{ position: "absolute", left: x, top: y, zIndex: 50, opacity: appear }}>
      {clickAt != null && local >= clickAt && click < 0.98 && (
        <>
          <span style={{ position: "absolute", left: -30, top: -30, width: 60, height: 60, borderRadius: 99, border: `3px solid ${BRAND.neon}`, opacity: 1 - click, transform: `scale(${0.3 + click * 1.6})` }} />
          <span style={{ position: "absolute", left: -30, top: -30, width: 60, height: 60, borderRadius: 99, background: BRAND.neon, opacity: 0.35 * (1 - click), transform: `scale(${0.2 + click * 1.2})` }} />
        </>
      )}
      <svg width="32" height="32" viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 3px 7px rgba(0,0,0,.4))", transform: `scale(${press})` }}>
        <path d="M5 3l14 8-6 1.5L9.5 19 5 3z" fill="#fff" stroke="#111" strokeWidth="1.4" />
      </svg>
    </div>
  );
};

const at = (fx: number, fy: number) => ({ x: CONTENT.x + fx * CONTENT.w, y: CONTENT.y + fy * CONTENT.h });

/* ── kinetic-typography interstitial: words slam in on a glass panel ── */
const TypeBeat: React.FC<{ local: number; dur: number; lines: { text: string; grad?: boolean }[][] }> = ({ local, dur, lines }) => {
  const out = clamp01((local - (dur - 12)) / 12);
  const panel = sp(local, 0, 13);
  let wordIndex = 0;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - out, fontFamily: "'Clash Display', Inter, sans-serif" }}>
      {/* soft glow pulse behind the panel */}
      <div style={{ position: "absolute", width: 900, height: 500, borderRadius: 999, background: GRAD, opacity: 0.16 * panel, filter: "blur(120px)" }} />
      <div
        style={{
          opacity: panel,
          transform: `scale(${0.94 + panel * 0.06}) translateY(${(1 - panel) * 30}px)`,
          background: "rgba(26,14,18,0.62)",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 44,
          padding: "64px 96px",
          textAlign: "center",
          boxShadow: "0 60px 160px -50px rgba(20,10,14,0.7), inset 0 1px 0 rgba(255,255,255,0.1)",
        }}
      >
        {lines.map((words, li) => (
          <div key={li} style={{ display: "flex", justifyContent: "center", gap: "0.28em", flexWrap: "wrap", lineHeight: 1.06 }}>
            {words.map((w, wi) => {
              const s = sp(local, 6 + wordIndex++ * 4, 11);
              return (
                <span
                  key={wi}
                  style={{
                    display: "inline-block",
                    fontSize: 96, fontWeight: 700, letterSpacing: "-0.02em",
                    color: w.grad ? "transparent" : "#fff",
                    background: w.grad ? "linear-gradient(100deg,#FACC15 5%,#F59E0B 30%,#FF2E4D 70%,#FF5A73 95%)" : undefined,
                    WebkitBackgroundClip: w.grad ? "text" : undefined,
                    opacity: s,
                    transform: `translateY(${(1 - s) * 80}px) rotate(${(1 - s) * (wi % 2 ? 3 : -3)}deg)`,
                    filter: `blur(${(1 - s) * 8}px)`,
                  }}
                >
                  {w.text}
                </span>
              );
            })}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/* ── beat 0 · the Instagram grind ── */
const B0: React.FC<{ local: number; lang: "sq" | "en" }> = ({ local, lang }) => {
  const dms = [t(lang, "Sa kushton? 🙏", "How much? 🙏"), t(lang, "A ka masë M?", "Size M?"), t(lang, "Si porosis? 🥺", "How to order? 🥺"), t(lang, "Çmimi ju lutem", "Price please")];
  return (
    <div style={{ position: "absolute", inset: 0, background: "#fff", fontFamily: "Inter, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "20px 30px" }}>
        <div style={{ width: 60, height: 60, borderRadius: 99, padding: 3, background: GRAD }}>
          <Img src={U(IMGS[1], 200)} style={{ width: "100%", height: "100%", borderRadius: 99, border: "3px solid #fff", objectFit: "cover" }} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 22, color: BRAND.ink }}>dyqani.yt</div>
          <div style={{ fontSize: 16, color: BRAND.muted }}>{t(lang, "1.240 postime · 8.900 ndjekës", "1,240 posts · 8,900 followers")}</div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, padding: "0 6px" }}>
        {IMGS.map((id, i) => {
          const s = sp(local, 4 + i * 3, 15);
          return (
            <div key={id} style={{ aspectRatio: "1.42", overflow: "hidden", borderRadius: 4, opacity: s, transform: `scale(${0.94 + s * 0.06})` }}>
              <Img src={U(id)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", right: 26, top: 104, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
        {dms.map((d, i) => {
          const s = sp(local, 26 + i * 13, 11);
          return (
            <div key={i} style={{ opacity: s, transform: `translateY(${(1 - s) * 16}px) scale(${0.9 + s * 0.1})`, background: "#1E1014", color: "#fff", borderRadius: 18, borderTopRightRadius: 5, padding: "12px 20px", fontSize: 19, fontWeight: 500, boxShadow: "0 16px 40px -14px rgba(0,0,0,0.45)" }}>
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ── beat 1 · connect (real Vela mark) + the system builds the shop ── */
const B1: React.FC<{ local: number; lang: "sq" | "en" }> = ({ local, lang }) => {
  const card = sp(local, 2, 12);
  const clicked = local > 46;
  const prog = interpolate(local, [52, 96], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#FBF8F9", fontFamily: "Inter, sans-serif" }}>
      <div style={{ width: 560, borderRadius: 28, background: "#fff", border: "1px solid #EDE6E9", boxShadow: "0 40px 110px -40px rgba(42,29,34,0.35)", padding: 40, opacity: card, transform: `translateY(${(1 - card) * 40}px) scale(${0.94 + card * 0.06})` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Img src={staticFile("vela-icon.svg")} style={{ width: 66, height: 66, borderRadius: 18, boxShadow: "0 10px 26px -10px rgba(42,29,34,0.35)" }} />
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: BRAND.ink }}>{t(lang, "Lidh Instagram-in", "Connect Instagram")}</div>
            <div style={{ fontSize: 17, color: BRAND.muted }}>@dyqani.yt · 14 {t(lang, "postime produkte", "product posts")}</div>
          </div>
        </div>
        {!clicked ? (
          <div style={{ marginTop: 30, borderRadius: 16, padding: "17px 0", textAlign: "center", color: "#fff", fontWeight: 700, fontSize: 20, background: GRAD }}>
            {t(lang, "Lidhu me një klik", "Connect in one click")}
          </div>
        ) : (
          <div style={{ marginTop: 30 }}>
            <div style={{ height: 12, borderRadius: 99, background: "#F2EBEE", overflow: "hidden" }}>
              <div style={{ width: `${prog * 100}%`, height: "100%", borderRadius: 99, background: GRAD }} />
            </div>
            <div style={{ marginTop: 12, fontSize: 17, color: BRAND.muted }}>
              {prog < 1 ? t(lang, `Sistemi po ndërton produktet… ${Math.round(prog * 14)}/14`, `The system is building products… ${Math.round(prog * 14)}/14`) : t(lang, "Gati! Dyqani u krijua ✓", "Done! Your shop is ready ✓")}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginTop: 18 }}>
              {IMGS.slice(0, 7).map((id, i) => {
                const on = prog * 7 > i;
                return (
                  <div key={id} style={{ aspectRatio: "1", borderRadius: 10, overflow: "hidden", opacity: on ? 1 : 0.12, transform: `scale(${on ? 1 : 0.85})` }}>
                    <Img src={U(id, 160)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── timeline ── */
type Variant = "push" | "lift" | "scale" | "iris" | "tilt";
type Beat = {
  from: number; dur: number; kind: "ui" | "type";
  url?: string; cap?: string; variant?: Variant;
  body?: (l: number) => React.ReactNode;
  lines?: { text: string; grad?: boolean }[][];
  cursor?: { points: Waypoint[]; clickAt: number };
};

const BEATS = (lang: "sq" | "en"): Beat[] => [
  { from: 0, dur: 85, kind: "ui", url: "instagram.com/dyqani.yt", variant: "scale", cap: t(lang, "Sot: çdo shitje ngec në mesazhe", "Today: every sale is stuck in messages"), body: (l) => <B0 local={l} lang={lang} /> },
  {
    from: 85, dur: 105, kind: "ui", url: "vela.al", variant: "push", cap: t(lang, "Lidh Instagramin — sistemi ndërton gjithçka", "Connect Instagram — the system builds everything"),
    body: (l) => <B1 local={l} lang={lang} />,
    cursor: { points: [{ f: 14, x: 1120, y: 830 }, { f: 40, x: 800, y: 596 }, { f: 66, x: 800, y: 596 }], clickAt: 44 },
  },
  { from: 190, dur: 55, kind: "type", lines: [[{ text: t(lang, "Pa", "No") }, { text: t(lang, "kod.", "code."), grad: true }], [{ text: t(lang, "Pa", "No") }, { text: t(lang, "stres.", "stress."), grad: true }]] },
  { from: 245, dur: 80, kind: "ui", url: "vela.al/products", variant: "iris", cap: t(lang, "14 produkte — emra, çmime, kategori, vetë", "14 products — names, prices, categories, automatically"), body: () => <Shot src="hero/products.png" /> },
  { from: 325, dur: 80, kind: "ui", url: "vela.al/dyqani-yt", variant: "tilt", cap: t(lang, "Vitrina jote, live", "Your storefront, live"), body: () => <Shot src="hero/storefront-custom.png" /> },
  {
    from: 405, dur: 105, kind: "ui", url: "vela.al/dyqani-yt", variant: "push", cap: t(lang, "Klientët blejnë vetë — pa mesazhe", "Customers buy on their own — no messages"),
    body: () => <Shot src="hero/storefront-product.png" />,
    cursor: { points: [{ f: 10, x: at(0.5, 0.8).x, y: at(0.5, 0.8).y }, { f: 40, x: at(0.735, 0.4).x, y: at(0.735, 0.4).y }, { f: 70, x: at(0.735, 0.4).x, y: at(0.735, 0.4).y }], clickAt: 46 },
  },
  { from: 510, dur: 55, kind: "type", lines: [[{ text: t(lang, "Pagesa", "Payments") }, { text: t(lang, "në", "in") }, { text: t(lang, "Lekë.", "Lek."), grad: true }]] },
  {
    from: 565, dur: 85, kind: "ui", url: "vela.al/checkout", variant: "iris", cap: t(lang, "Arkë e vërtetë — kartë ose para në dorë", "A real checkout — card or cash"),
    body: () => <Shot src="hero/storefront-checkout.png" />,
    cursor: { points: [{ f: 14, x: at(0.5, 0.72).x, y: at(0.5, 0.72).y }, { f: 42, x: at(0.794, 0.431).x, y: at(0.794, 0.431).y }, { f: 68, x: at(0.794, 0.431).x, y: at(0.794, 0.431).y }], clickAt: 48 },
  },
  { from: 650, dur: 80, kind: "ui", url: "vela.al/orders", variant: "lift", cap: t(lang, "Porositë mbërrijnë në panel, live", "Orders land in your panel, live"), body: () => <Shot src="hero/orders.png" /> },
  { from: 730, dur: 55, kind: "type", lines: [[{ text: t(lang, "Ti", "You") }, { text: t(lang, "fle.", "sleep.") }], [{ text: t(lang, "Dyqani", "The shop") }, { text: t(lang, "shet.", "sells."), grad: true }]] },
  { from: 785, dur: 75, kind: "ui", url: "vela.al/dashboard", variant: "scale", cap: t(lang, "Të ardhurat rriten — vetë", "Revenue grows — on its own"), body: () => <Shot src="hero/dashboard.png" /> },
];

const BeatShell: React.FC<{ local: number; dur: number; variant: Variant; children: React.ReactNode }> = ({ local, dur, variant, children }) => {
  const inT = clamp01(local / 14);
  const outT = clamp01((local - (dur - 14)) / 14);
  const eIn = interpolate(inT, [0, 1], [0, 1], { easing: Easing.out(Easing.cubic) });
  const eOut = interpolate(outT, [0, 1], [0, 1], { easing: Easing.in(Easing.cubic) });
  let transform = "none";
  let blur = 0;
  let clipPath: string | undefined;
  if (variant === "push") {
    transform = `translateX(${(1 - eIn) * 9 - eOut * 9}%)`;
    blur = (1 - eIn) * 4 + eOut * 4;
  } else if (variant === "lift") {
    transform = `translateY(${(1 - eIn) * 7 - eOut * 7}%) scale(${0.985 + eIn * 0.015})`;
    blur = (1 - eIn) * 5 + eOut * 5;
  } else if (variant === "iris") {
    clipPath = `circle(${eIn * 125}% at 50% 46%)`;
    transform = `scale(${1.04 - eIn * 0.04 + eOut * 0.03})`;
    blur = eOut * 5;
  } else if (variant === "tilt") {
    transform = `perspective(1400px) rotateX(${(1 - eIn) * 16}deg) rotateY(${-(1 - eIn) * 8 + eOut * 6}deg) scale(${0.96 + eIn * 0.04})`;
    blur = (1 - eIn) * 3 + eOut * 5;
  } else {
    transform = `scale(${1.08 - eIn * 0.08 + eOut * 0.06})`;
    blur = (1 - eIn) * 6 + eOut * 5;
  }
  return (
    <div style={{ position: "absolute", inset: 0, opacity: eIn * (1 - eOut), transform, transformOrigin: "50% 60%", clipPath, filter: blur > 0.4 ? `blur(${blur}px)` : undefined }}>
      {children}
    </div>
  );
};

export const HeroFilm: React.FC<z.infer<typeof heroFilmSchema>> = ({ lang, transparent }) => {
  const frame = useCurrentFrame();
  const beats = BEATS(lang);
  const endFrom = 860;
  const endS = sp(frame, endFrom + 4, 12);
  const loopOut = clamp01((frame - (HERO_FILM.durationInFrames - 14)) / 14);

  const active = beats.find((b) => frame >= b.from && frame < b.from + b.dur);
  const activeUi = active?.kind === "ui" ? active : undefined;
  // window presence: eases out under type interstitials and the end card
  const typePresence = beats
    .filter((b) => b.kind === "type")
    .reduce((acc, b) => {
      const l = frame - b.from;
      if (l < -10 || l > b.dur + 10) return acc;
      const inside = clamp01(interpolate(l, [-10, 2, b.dur - 4, b.dur + 10], [0, 1, 1, 0]));
      return Math.max(acc, inside);
    }, 0);
  const endPresence = frame >= endFrom - 10 ? clamp01((frame - (endFrom - 10)) / 12) : 0;
  const windowPresence = (1 - Math.max(typePresence, endPresence));

  return (
    <AbsoluteFill style={{ background: transparent ? undefined : `radial-gradient(120% 130% at 50% 0%, #FDF4F0 0%, #F7E7E4 45%, #F3D9D6 100%)` }}>
      {!transparent && (
        <>
          <div style={{ position: "absolute", width: 700, height: 700, borderRadius: 999, left: -180, top: -260, background: BRAND.deep, opacity: 0.14, filter: "blur(140px)", transform: `translateY(${Math.sin(frame / 70) * 26}px)` }} />
          <div style={{ position: "absolute", width: 620, height: 620, borderRadius: 999, right: -160, bottom: -240, background: BRAND.amber, opacity: 0.16, filter: "blur(140px)", transform: `translateY(${Math.cos(frame / 80) * 24}px)` }} />
        </>
      )}

      <div style={{ opacity: 1 - loopOut }}>
        {windowPresence > 0.01 && (
          <Window url={activeUi?.url ?? "vela.al"} frame={frame} presence={windowPresence}>
            {beats.filter((b) => b.kind === "ui").map((b, i) => {
              const l = frame - b.from;
              if (l < -14 || l >= b.dur + 2) return null;
              return (
                <BeatShell key={i} local={l} dur={b.dur} variant={b.variant!}>
                  {b.body!(Math.max(0, l))}
                </BeatShell>
              );
            })}
            {beats.filter((b) => b.kind === "ui").slice(1).map((b, i) => <Sweep key={i} local={frame - b.from + 8} />)}
          </Window>
        )}

        {beats.filter((b) => b.kind === "type").map((b, i) => {
          const l = frame - b.from;
          if (l < 0 || l >= b.dur) return null;
          return <TypeBeat key={`ty${i}`} local={l} dur={b.dur} lines={b.lines!} />;
        })}

        {beats.map((b, i) => {
          const l = frame - b.from;
          if (b.kind !== "ui" || !b.cursor || l < 0 || l >= b.dur) return null;
          return <CursorSim key={`c${i}`} local={l} points={b.cursor.points} clickAt={b.cursor.clickAt} />;
        })}

        {beats.map((b, i) => {
          const l = frame - b.from;
          if (b.kind !== "ui" || !b.cap || l < 0 || l >= b.dur) return null;
          return <Caption key={`t${i}`} text={b.cap} local={l} dur={b.dur} />;
        })}

        {/* end card — glass panel so it reads over any page background */}
        {frame >= endFrom && (
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: "'Clash Display', Inter, sans-serif" }}>
            <div
              style={{
                opacity: endS,
                transform: `translateY(${(1 - endS) * 40}px) scale(${0.92 + endS * 0.08})`,
                textAlign: "center",
                background: "rgba(26,14,18,0.62)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 44,
                padding: "56px 110px",
                boxShadow: "0 60px 160px -50px rgba(20,10,14,0.7), inset 0 1px 0 rgba(255,255,255,0.1)",
              }}
            >
              <Img src={staticFile("vela-icon.svg")} style={{ width: 108, height: 108, margin: "0 auto", borderRadius: 28, boxShadow: "0 30px 80px -25px rgba(255,46,77,0.5)" }} />
              <div style={{ marginTop: 26, fontSize: 72, fontWeight: 700, letterSpacing: "-0.02em", color: "#fff" }}>
                Dyqani yt. <span style={{ background: "linear-gradient(100deg,#FACC15 5%,#F59E0B 30%,#FF2E4D 70%,#FF5A73 95%)", WebkitBackgroundClip: "text", color: "transparent" }}>Online.</span>
              </div>
              <div style={{ marginTop: 10, fontSize: 25, color: "rgba(255,255,255,0.72)", fontFamily: "Inter, sans-serif" }}>
                {t(lang, "Provo falas 7 ditë · pa kartë", "Try free for 7 days · no card")}
              </div>
            </div>
          </AbsoluteFill>
        )}
      </div>
    </AbsoluteFill>
  );
};

export default HeroFilm;
