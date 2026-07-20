/**
 * HeroFilm v6 — rebuilt from scratch for expressiveness, on the landing's
 * design language (Clash Display, glass, eyebrow pills, lava blobs).
 *
 * Rules kept from every previous round:
 * • Content area matches the 1440×900 screenshots EXACTLY (no zoom/crop).
 * • Margins leave room for the window shadow (no clipping over alpha).
 * • One unique transition per screen — no repeated shimmer anywhere; the
 *   only shine lives on the end-card CTA pill.
 * • Typography beats are clean line-mask rises; screens hold ≥2.8s.
 * • `transparent` prop renders the alpha WebM (page shows through); the
 *   MP4 fallback keeps the warm baked backdrop.
 *
 * New in v6 (the expressive layer):
 * • The window is ALIVE — gentle sway + per-beat pose shifts, and it drops
 *   in with an elastic settle on the cold open.
 * • Transitions carry momentum (overshoot, skew-while-moving, 3D swing),
 *   and the checkout beat irises open FROM the previous click point.
 * • Clicks give feedback: ripple + a rising chip (+1 shportë, ✓ pagesa) —
 *   and a sparkle burst fires when the system finishes building products.
 * • An order-notification chip slides into the orders beat, tying the
 *   story together (someone just bought while you watched).
 *
 * Render:
 *   npx remotion render src/remotion.ts HeroFilm public/hero/hero-film.mp4 --codec=h264 --crf=22
 *   npx remotion render src/remotion.ts HeroFilm public/hero/hero-film.webm --codec=vp9 --image-format=png --pixel-format=yuva420p --props=scripts/.herofilm-props.json
 */
import React from "react";
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, Easing } from "remotion";
import { z } from "zod";

export const heroFilmSchema = z.object({ lang: z.enum(["sq", "en"]), transparent: z.boolean() });
export const heroFilmDefaults: z.infer<typeof heroFilmSchema> = { lang: "sq", transparent: false };

const FPS = 30;
const W = 1600;
const H = 1000;
export const HERO_FILM = { width: W, height: H, fps: FPS, durationInFrames: 1020 };

// Shadow-safe margins; the content box keeps the exact 1440:900 ratio.
const WIN = { top: 80, x: 170, chrome: 52 };
const CONTENT = { x: WIN.x, y: WIN.top + WIN.chrome, w: W - 2 * WIN.x, h: H - 2 * WIN.top - WIN.chrome };

const BRAND = { wine: "#A31234", deep: "#7F1D3B", neon: "#FF2E4D", amber: "#F59E0B", gold: "#FACC15", ink: "#2A1D22", muted: "#796770" };
const GRAD = "linear-gradient(115deg,#7F1D3B,#A31234 40%,#FF2E4D 75%,#F59E0B 115%)";
const TEXT_GRAD = "linear-gradient(100deg,#FACC15 5%,#F59E0B 30%,#FF2E4D 70%,#FF5A73 95%)";

const t = (l: "sq" | "en", sq: string, en: string) => (l === "sq" ? sq : en);
const sp = (frame: number, delay = 0, damping = 13) => spring({ frame: frame - delay, fps: FPS, config: { damping, stiffness: 140, mass: 0.8 } });
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const at = (fx: number, fy: number) => ({ x: CONTENT.x + fx * CONTENT.w, y: CONTENT.y + fy * CONTENT.h });

const IMGS = [
  "1592750475338-74b7b21085ab", "1595777457583-95e059d581b8", "1542291026-7eec264c27ff",
  "1553062407-98eeb64c6a62", "1605100804763-247f67b3557e", "1505740420928-5e560c06d30e",
  "1551028719-00167b16eac5", "1600185365926-3a2ce3cdb9eb", "1599643478518-a784e5dc4c8f",
];
const U = (id: string, w = 400) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;

/* ─── the living window: elastic drop-in, gentle sway, beat-progress line ─── */
const Window: React.FC<{ url: string; children: React.ReactNode; frame: number; presence: number; progress: number }> = ({ url, children, frame, presence, progress }) => {
  const drop = sp(frame, 4, 11); // cold-open elastic settle
  const sway = Math.sin(frame / 62) * 0.45; // deg — alive, never still
  const bob = Math.sin(frame / 55) * 5;
  return (
    <div
      style={{
        position: "absolute", top: WIN.top, bottom: WIN.top, left: WIN.x, right: WIN.x,
        borderRadius: 26, background: "#fff",
        boxShadow: "0 30px 70px -28px rgba(42,29,34,0.5), 0 0 0 1px rgba(42,29,34,0.07)",
        overflow: "hidden",
        opacity: presence * Math.min(1, drop * 1.4),
        transform: `translateY(${bob + (1 - drop) * -90}px) rotate(${sway * presence}deg) scale(${(0.92 + presence * 0.08) * (0.96 + drop * 0.04)})`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, height: WIN.chrome, borderBottom: "1px solid #EDE6E9", background: "#FBF8F9", padding: "0 20px" }}>
        <span style={{ width: 13, height: 13, borderRadius: 99, background: "#ff5f57" }} />
        <span style={{ width: 13, height: 13, borderRadius: 99, background: "#febc2e" }} />
        <span style={{ width: 13, height: 13, borderRadius: 99, background: "#28c840" }} />
        <div style={{ margin: "0 auto", display: "flex", alignItems: "center", gap: 9, background: "#fff", border: "1px solid #EDE6E9", borderRadius: 99, padding: "6px 26px", fontSize: 17, color: BRAND.muted, fontFamily: "Inter, sans-serif" }}>
          <span style={{ width: 9, height: 9, borderRadius: 99, background: GRAD }} />
          {url}
        </div>
        <span style={{ width: 60 }} />
      </div>
      {/* landing scroll-progress motif: beat progress under the chrome */}
      <div style={{ position: "absolute", top: WIN.chrome - 2, left: 0, height: 2.5, width: `${clamp01(progress) * 100}%`, background: GRAD, zIndex: 5 }} />
      <div style={{ position: "absolute", inset: `${WIN.chrome}px 0 0 0`, overflow: "hidden" }}>{children}</div>
    </div>
  );
};

/* ─── glass caption pill (Clash Display) ─── */
const Caption: React.FC<{ text: string; local: number; dur: number }> = ({ text, local, dur }) => {
  const s = sp(local, 10, 14);
  const out = clamp01((local - (dur - 12)) / 10);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 22, display: "flex", justifyContent: "center", opacity: s * (1 - out) }}>
      <div style={{ transform: `translateY(${(1 - s) * 18}px)`, display: "flex", alignItems: "center", gap: 12, background: "rgba(26,14,18,0.66)", color: "#fff", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 999, padding: "12px 28px", fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em", fontFamily: "'Clash Display', Inter, sans-serif", boxShadow: "0 18px 50px -18px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" }}>
        <span style={{ width: 9, height: 9, borderRadius: 99, background: GRAD, boxShadow: "0 0 12px rgba(255,46,77,0.8)" }} />
        {text}
      </div>
    </div>
  );
};

const Shot: React.FC<{ src: string }> = ({ src }) => (
  <Img src={staticFile(src)} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
);

/* ─── cursor with arced waypoints, press squash, ripple ─── */
type Waypoint = { f: number; x: number; y: number };
const CursorSim: React.FC<{ local: number; points: Waypoint[]; clickAt?: number }> = ({ local, points, clickAt }) => {
  if (local < points[0].f - 4) return null;
  const fs = points.map((p) => p.f);
  const x = interpolate(local, fs, points.map((p) => p.x), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const y = interpolate(local, fs, points.map((p) => p.y), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const appear = sp(local, points[0].f - 4, 14);
  const click = clickAt != null ? sp(local, clickAt, 11) : 0;
  const press = clickAt != null ? interpolate(local, [clickAt - 3, clickAt, clickAt + 4], [1, 0.8, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;
  return (
    <div style={{ position: "absolute", left: x, top: y, zIndex: 50, opacity: appear }}>
      {clickAt != null && local >= clickAt && click < 0.98 && (
        <>
          <span style={{ position: "absolute", left: -30, top: -30, width: 60, height: 60, borderRadius: 99, border: `3px solid ${BRAND.neon}`, opacity: 1 - click, transform: `scale(${0.3 + click * 1.7})` }} />
          <span style={{ position: "absolute", left: -30, top: -30, width: 60, height: 60, borderRadius: 99, background: BRAND.neon, opacity: 0.35 * (1 - click), transform: `scale(${0.2 + click * 1.25})` }} />
        </>
      )}
      <svg width="32" height="32" viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 3px 7px rgba(0,0,0,.4))", transform: `scale(${press})` }}>
        <path d="M5 3l14 8-6 1.5L9.5 19 5 3z" fill="#fff" stroke="#111" strokeWidth="1.4" />
      </svg>
    </div>
  );
};

/* ─── click feedback: a chip that pops out of the click point and rises ─── */
const ClickChip: React.FC<{ local: number; from: number; x: number; y: number; text: string }> = ({ local, from, x, y, text }) => {
  const l = local - from;
  if (l < 0 || l > 46) return null;
  const s = sp(l, 0, 10);
  const fade = clamp01((l - 32) / 12);
  return (
    <div
      style={{
        position: "absolute", left: x, top: y, zIndex: 55,
        transform: `translate(-50%, ${-46 - l * 1.15}px) scale(${0.6 + s * 0.4})`,
        opacity: s * (1 - fade),
        display: "flex", alignItems: "center", gap: 8,
        background: "rgba(26,14,18,0.8)", color: "#6EE7A0",
        border: "1px solid rgba(255,255,255,0.16)", borderRadius: 999, padding: "8px 18px",
        fontSize: 19, fontWeight: 700, fontFamily: "'Clash Display', Inter, sans-serif",
        boxShadow: "0 16px 40px -12px rgba(0,0,0,0.5)",
      }}
    >
      {text}
    </div>
  );
};

/* ─── sparkle burst (products finished building) ─── */
const Burst: React.FC<{ local: number; from: number; x: number; y: number }> = ({ local, from, x, y }) => {
  const l = local - from;
  if (l < 0 || l > 34) return null;
  const p = clamp01(l / 30);
  const e = 1 - (1 - p) ** 3;
  return (
    <div style={{ position: "absolute", left: x, top: y, zIndex: 54 }}>
      {Array.from({ length: 10 }, (_, i) => {
        const ang = (i / 10) * Math.PI * 2 + 0.4;
        const dist = 26 + e * 96;
        const size = 7 + (i % 3) * 3;
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: Math.cos(ang) * dist, top: Math.sin(ang) * dist * 0.8,
              width: size, height: size, borderRadius: 99,
              background: i % 3 === 0 ? BRAND.gold : i % 3 === 1 ? BRAND.neon : BRAND.amber,
              opacity: (1 - p) * 0.95,
              transform: `scale(${1 - p * 0.4})`,
              boxShadow: "0 0 12px rgba(255,46,77,0.5)",
            }}
          />
        );
      })}
    </div>
  );
};

/* ─── order-notification chip sliding into the orders beat ─── */
const OrderPing: React.FC<{ local: number; from: number; lang: "sq" | "en" }> = ({ local, from, lang }) => {
  const l = local - from;
  if (l < 0) return null;
  const s = sp(l, 0, 12);
  return (
    <div
      style={{
        position: "absolute", top: WIN.top + WIN.chrome + 18, right: WIN.x + 18, zIndex: 52,
        transform: `translateX(${(1 - s) * 140}px)`, opacity: s,
        display: "flex", alignItems: "center", gap: 12,
        background: "rgba(26,14,18,0.82)", border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 18, padding: "13px 20px", fontFamily: "Inter, sans-serif",
        boxShadow: "0 22px 60px -18px rgba(0,0,0,0.55)",
      }}
    >
      <span style={{ position: "relative", display: "grid", placeItems: "center", width: 38, height: 38, borderRadius: 12, background: "rgba(255,46,77,0.16)" }}>
        <span style={{ position: "absolute", inset: 0, borderRadius: 12, border: `1.5px solid ${BRAND.neon}`, opacity: Math.max(0, 1 - (l % 40) / 28), transform: `scale(${1 + ((l % 40) / 40) * 0.5})` }} />
        <span style={{ fontSize: 18 }}>🔔</span>
      </span>
      <div>
        <div style={{ color: "#fff", fontSize: 16.5, fontWeight: 700 }}>{t(lang, "Porosi e re", "New order")}</div>
        <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13.5 }}>Atlete Vrapi Air · <b style={{ color: "#6EE7A0" }}>+11.900 L</b></div>
      </div>
    </div>
  );
};

/* ─── kinetic type interstitial v2: full-bleed glass RIBBONS. Each line is
      an edge-to-edge band that wipes in from alternating sides while its
      oversized text slides in with counter-motion and an overshoot settle.
      Poster-style, reads huge, and stays legible over any page background. ── */
const TypeBeat: React.FC<{ local: number; dur: number; lines: { text: string; grad?: boolean }[][]; eyebrow?: string }> = ({ local, dur, lines, eyebrow }) => {
  const out = clamp01((local - (dur - 12)) / 12);
  const ambient = sp(local, 0, 13);
  const eb = sp(local, 3, 14);
  const wordCount = lines.reduce((n, ws) => n + ws.length, 0);
  const rule = sp(local, 12 + wordCount * 3 + 12, 13);
  const size = lines.length > 1 ? 128 : 150;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: 1 - out, fontFamily: "'Clash Display', Inter, sans-serif" }}>
      {/* lava-lamp wash — stronger now that there's no panel */}
      <div style={{ position: "absolute", width: 680, height: 520, borderRadius: 999, background: BRAND.wine, opacity: 0.26 * ambient, filter: "blur(110px)", transform: `translate(${-220 + Math.sin(local / 26) * 46}px, ${Math.cos(local / 31) * 34}px)` }} />
      <div style={{ position: "absolute", width: 560, height: 460, borderRadius: 999, background: BRAND.amber, opacity: 0.2 * ambient, filter: "blur(110px)", transform: `translate(${250 + Math.cos(local / 29) * 40}px, ${Math.sin(local / 24) * 38}px)` }} />
      <div style={{ position: "absolute", width: 460, height: 400, borderRadius: 999, background: BRAND.neon, opacity: 0.14 * ambient, filter: "blur(100px)", transform: `translate(${Math.sin(local / 21) * 60}px, ${160 + Math.cos(local / 27) * 30}px)` }} />

      <div style={{ position: "relative", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
        {eyebrow && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 24px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.18)", background: "rgba(26,14,18,0.72)", opacity: eb, transform: `translateY(${(1 - eb) * 14}px)`, boxShadow: "0 14px 40px -14px rgba(0,0,0,0.5)" }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: GRAD, boxShadow: "0 0 10px rgba(255,46,77,0.9)" }} />
            <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.78)", fontFamily: "Inter, sans-serif" }}>{eyebrow}</span>
          </div>
        )}

        {lines.map((words, li) => {
          const dir = li % 2 === 0 ? 1 : -1; // alternate wipe directions
          const bandIn = sp(local, 7 + li * 7, 13);
          const textIn = sp(local, 12 + li * 7, 11);
          // enter clips one side; the exit wipes off toward the other
          const enterClip = (1 - bandIn) * 100;
          const exitClip = out * 100;
          const clipL = dir > 0 ? 0 + exitClip : enterClip;
          const clipR = dir > 0 ? enterClip : exitClip;
          return (
            <div
              key={li}
              style={{
                position: "relative",
                width: "100%",
                clipPath: `inset(0 ${clipR}% 0 ${clipL}%)`,
                background: "rgba(26,14,18,0.72)",
                borderTop: "1px solid rgba(255,255,255,0.13)",
                borderBottom: "1px solid rgba(255,255,255,0.13)",
                boxShadow: "0 30px 80px -30px rgba(20,10,14,0.6)",
                padding: "26px 0 34px",
              }}
            >
              {/* faint gradient edge running along the band */}
              <div style={{ position: "absolute", inset: 0, background: `linear-gradient(${dir > 0 ? "90deg" : "270deg"}, rgba(255,46,77,0.14), transparent 30%)` }} />
              <div
                style={{
                  // gap must be px-scaled to the TYPE size — an em gap here
                  // resolves against the row's 16px font and glues the words
                  display: "flex", justifyContent: "center", gap: size * 0.24, lineHeight: 1,
                  transform: `translateX(${dir * (1 - textIn) * 160}px)`,
                  opacity: Math.min(1, textIn * 1.5),
                }}
              >
                {words.map((w, wi) => (
                  <span
                    key={wi}
                    style={{
                      display: "inline-block",
                      fontSize: size, fontWeight: 700, letterSpacing: "-0.025em",
                      color: w.grad ? "transparent" : "#fff",
                      background: w.grad ? TEXT_GRAD : undefined,
                      WebkitBackgroundClip: w.grad ? "text" : undefined,
                      textShadow: w.grad ? undefined : "0 6px 30px rgba(0,0,0,0.35)",
                    }}
                  >
                    {w.text}
                  </span>
                ))}
              </div>
            </div>
          );
        })}

        <div style={{ height: 5, width: 170 * rule, borderRadius: 99, background: GRAD, boxShadow: "0 0 20px rgba(255,46,77,0.6)", opacity: rule }} />
      </div>
    </AbsoluteFill>
  );
};

/* ─── beat 0 · the Instagram grind (DMs pile up, counter ticks) ─── */
const B0: React.FC<{ local: number; lang: "sq" | "en" }> = ({ local, lang }) => {
  const dms = [t(lang, "Sa kushton? 🙏", "How much? 🙏"), t(lang, "A ka masë M?", "Size M?"), t(lang, "Si porosis? 🥺", "How to order? 🥺"), t(lang, "Çmimi ju lutem", "Price please")];
  const count = Math.round(interpolate(local, [30, 78], [3, 47], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) }));
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
        {/* unread counter ticking up — the pain, quantified */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.25)", borderRadius: 999, padding: "8px 18px", opacity: sp(local, 26, 13) }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: "#DC2626" }} />
          <span style={{ fontSize: 17, fontWeight: 700, color: "#DC2626", fontVariantNumeric: "tabular-nums" }}>{count} {t(lang, "mesazhe", "messages")}</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, padding: "0 6px" }}>
        {IMGS.map((id, i) => {
          const s = sp(local, 4 + i * 3, 13);
          return (
            <div key={id} style={{ aspectRatio: "1.42", overflow: "hidden", borderRadius: 4, opacity: s, transform: `translateY(${(1 - s) * 26}px) scale(${0.92 + s * 0.08})` }}>
              <Img src={U(id)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", right: 26, top: 108, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 12 }}>
        {dms.map((d, i) => {
          const s = sp(local, 26 + i * 12, 10);
          return (
            <div key={i} style={{ opacity: s, transform: `translateX(${(1 - s) * 60}px) scale(${0.9 + s * 0.1})`, background: "#1E1014", color: "#fff", borderRadius: 18, borderTopRightRadius: 5, padding: "12px 20px", fontSize: 19, fontWeight: 500, boxShadow: "0 16px 40px -14px rgba(0,0,0,0.45)" }}>
              {d}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── beat 1 · connect + the system builds the shop ─── */
const B1: React.FC<{ local: number; lang: "sq" | "en" }> = ({ local, lang }) => {
  const card = sp(local, 2, 12);
  const clicked = local > 46;
  const prog = interpolate(local, [52, 92], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#FBF8F9", fontFamily: "Inter, sans-serif" }}>
      <div style={{ width: 560, borderRadius: 28, background: "#fff", border: "1px solid #EDE6E9", boxShadow: "0 40px 110px -40px rgba(42,29,34,0.35)", padding: 40, opacity: card, transform: `translateY(${(1 - card) * 46}px) scale(${0.93 + card * 0.07}) rotate(${(1 - card) * -1.5}deg)` }}>
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
                const pop = on ? sp(local, 52 + i * 5.5, 10) : 0;
                return (
                  <div key={id} style={{ aspectRatio: "1", borderRadius: 10, overflow: "hidden", opacity: on ? 1 : 0.12, transform: `scale(${on ? 0.7 + pop * 0.3 : 0.85}) rotate(${on ? (1 - pop) * 8 : 0}deg)` }}>
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

/* ─── timeline ─── */
type Variant = "open" | "iris" | "swing" | "push" | "irisClick" | "lift" | "rise" | "punch";
type Beat = {
  from: number; dur: number; kind: "ui" | "type";
  url?: string; cap?: string; variant?: Variant;
  body?: (l: number) => React.ReactNode;
  lines?: { text: string; grad?: boolean }[][];
  eyebrow?: string;
  cursor?: { points: Waypoint[]; clickAt: number };
};

const CART = at(0.772, 0.428); // Add to Cart center (measured on the shot)
const PAY = at(0.794, 0.431); // Continue to Payment center

const BEATS = (lang: "sq" | "en"): Beat[] => [
  { from: 0, dur: 85, kind: "ui", url: "instagram.com/dyqani.yt", variant: "open", cap: t(lang, "Sot: çdo shitje ngec në mesazhe", "Today: every sale is stuck in messages"), body: (l) => <B0 local={l} lang={lang} /> },
  {
    from: 85, dur: 100, kind: "ui", url: "vela.al", variant: "punch", cap: t(lang, "Lidh Instagramin — sistemi ndërton gjithçka", "Connect Instagram — the system builds everything"),
    body: (l) => <B1 local={l} lang={lang} />,
    cursor: { points: [{ f: 14, x: 1150, y: 850 }, { f: 30, x: 960, y: 700 }, { f: 40, x: 800, y: 592 }, { f: 66, x: 800, y: 592 }], clickAt: 44 },
  },
  { from: 185, dur: 70, kind: "type", eyebrow: t(lang, "Nga Instagrami në dyqan", "From Instagram to a shop"), lines: [[{ text: t(lang, "Pa", "No") }, { text: t(lang, "kod.", "code."), grad: true }], [{ text: t(lang, "Pa", "No") }, { text: t(lang, "stres.", "stress."), grad: true }]] },
  { from: 255, dur: 85, kind: "ui", url: "vela.al/products", variant: "iris", cap: t(lang, "14 produkte — emra, çmime, kategori, vetë", "14 products — names, prices, categories, automatically"), body: () => <Shot src="hero/products.png" /> },
  { from: 340, dur: 85, kind: "ui", url: "vela.al/dyqani-yt", variant: "swing", cap: t(lang, "Vitrina jote, live", "Your storefront, live"), body: () => <Shot src="hero/storefront-custom.png" /> },
  {
    from: 425, dur: 100, kind: "ui", url: "vela.al/dyqani-yt", variant: "push", cap: t(lang, "Klientët blejnë vetë — pa mesazhe", "Customers buy on their own — no messages"),
    body: () => <Shot src="hero/storefront-product.png" />,
    cursor: { points: [{ f: 10, x: at(0.42, 0.85).x, y: at(0.42, 0.85).y }, { f: 28, x: at(0.6, 0.62).x, y: at(0.6, 0.62).y }, { f: 40, x: CART.x, y: CART.y }, { f: 70, x: CART.x, y: CART.y }], clickAt: 46 },
  },
  { from: 525, dur: 70, kind: "type", eyebrow: t(lang, "Arkë e vërtetë", "A real checkout"), lines: [[{ text: t(lang, "Pagesa", "Payments") }, { text: t(lang, "në", "in") }, { text: t(lang, "Lekë.", "Lek."), grad: true }]] },
  {
    from: 595, dur: 90, kind: "ui", url: "vela.al/checkout", variant: "irisClick", cap: t(lang, "Arkë e vërtetë — kartë ose para në dorë", "A real checkout — card or cash"),
    body: () => <Shot src="hero/storefront-checkout.png" />,
    cursor: { points: [{ f: 14, x: at(0.55, 0.7).x, y: at(0.55, 0.7).y }, { f: 32, x: at(0.7, 0.52).x, y: at(0.7, 0.52).y }, { f: 42, x: PAY.x, y: PAY.y }, { f: 68, x: PAY.x, y: PAY.y }], clickAt: 48 },
  },
  { from: 685, dur: 85, kind: "ui", url: "vela.al/orders", variant: "lift", cap: t(lang, "Porositë mbërrijnë në panel, live", "Orders land in your panel, live"), body: () => <Shot src="hero/orders.png" /> },
  { from: 770, dur: 70, kind: "type", eyebrow: t(lang, "Pa ndalim", "Never off"), lines: [[{ text: t(lang, "Ti", "You") }, { text: t(lang, "fle.", "sleep.") }], [{ text: t(lang, "Dyqani", "The shop") }, { text: t(lang, "shet.", "sells."), grad: true }]] },
  { from: 840, dur: 85, kind: "ui", url: "vela.al/dashboard", variant: "rise", cap: t(lang, "Të ardhurat rriten — vetë", "Revenue grows — on its own"), body: () => <Shot src="hero/dashboard.png" /> },
];

/* transitions with momentum — every variant used exactly once */
const BeatShell: React.FC<{ local: number; dur: number; variant: Variant; children: React.ReactNode }> = ({ local, dur, variant, children }) => {
  const inT = clamp01(local / 16);
  const outT = clamp01((local - (dur - 14)) / 14);
  const eIn = interpolate(inT, [0, 1], [0, 1], { easing: Easing.out(Easing.cubic) });
  const eInBack = sp(local, 0, 12); // overshooting entrance for punch/lift
  const eOut = interpolate(outT, [0, 1], [0, 1], { easing: Easing.in(Easing.cubic) });
  let transform = "none";
  let blur = 0;
  let clipPath: string | undefined;
  let origin = "50% 60%";
  if (variant === "open") {
    transform = `scale(${1.1 - eIn * 0.1 + eOut * 0.06})`;
    blur = (1 - eIn) * 6 + eOut * 5;
  } else if (variant === "punch") {
    // slams in from the right with a skew that straightens on landing
    transform = `translateX(${(1 - eInBack) * 13 - eOut * 10}%) skewX(${(1 - eInBack) * -5 + eOut * 3}deg)`;
    blur = (1 - eIn) * 3 + eOut * 4;
  } else if (variant === "iris") {
    clipPath = `circle(${eIn * 128}% at 50% 42%)`;
    transform = `scale(${1.05 - eIn * 0.05 + eOut * 0.03})`;
    blur = eOut * 5;
  } else if (variant === "swing") {
    // 3D door-swing from the left edge
    origin = "6% 50%";
    transform = `perspective(1500px) rotateY(${(1 - eIn) * -26 + eOut * 18}deg) scale(${0.95 + eIn * 0.05})`;
    blur = (1 - eIn) * 3 + eOut * 4;
  } else if (variant === "push") {
    transform = `translateX(${(1 - eInBack) * -12 + eOut * 9}%) skewX(${(1 - eInBack) * 4 - eOut * 3}deg)`;
    blur = (1 - eIn) * 3 + eOut * 4;
  } else if (variant === "irisClick") {
    // opens FROM the previous beat's click point (Add to Cart)
    clipPath = `circle(${eIn * 150}% at 77% 43%)`;
    transform = `scale(${1.04 - eIn * 0.04 + eOut * 0.03})`;
    blur = eOut * 4;
  } else if (variant === "lift") {
    transform = `translateY(${(1 - eInBack) * 9 - eOut * 8}%) rotate(${(1 - eInBack) * -1.6}deg)`;
    blur = (1 - eIn) * 4 + eOut * 4;
  } else {
    // rise: content grows out of a bottom mask
    clipPath = `inset(${(1 - eIn) * 100}% 0 0 0)`;
    transform = `translateY(${(1 - eIn) * 7 - eOut * 6}%)`;
    blur = eOut * 4;
  }
  return (
    <div style={{ position: "absolute", inset: 0, opacity: eIn * (1 - eOut), transform, transformOrigin: origin, clipPath, filter: blur > 0.4 ? `blur(${blur}px)` : undefined }}>
      {children}
    </div>
  );
};

export const HeroFilm: React.FC<z.infer<typeof heroFilmSchema>> = ({ lang, transparent }) => {
  const frame = useCurrentFrame();
  const beats = BEATS(lang);
  const endFrom = 925;
  const endS = sp(frame, endFrom + 4, 12);
  const loopOut = clamp01((frame - (HERO_FILM.durationInFrames - 14)) / 14);

  const active = beats.find((b) => frame >= b.from && frame < b.from + b.dur);
  const activeUi = active?.kind === "ui" ? active : undefined;
  const typePresence = beats
    .filter((b) => b.kind === "type")
    .reduce((acc, b) => {
      const l = frame - b.from;
      if (l < -10 || l > b.dur + 10) return acc;
      const inside = clamp01(interpolate(l, [-10, 2, b.dur - 4, b.dur + 10], [0, 1, 1, 0]));
      return Math.max(acc, inside);
    }, 0);
  const endPresence = frame >= endFrom - 10 ? clamp01((frame - (endFrom - 10)) / 12) : 0;
  const windowPresence = 1 - Math.max(typePresence, endPresence);

  // beat-local frames for the interaction beats (chips, burst, ping)
  const connect = frame - 85;
  const productBeat = frame - 425;
  const checkoutBeat = frame - 595;
  const ordersBeat = frame - 685;

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
          <Window
            url={activeUi?.url ?? "vela.al"}
            frame={frame}
            presence={windowPresence}
            progress={activeUi ? (frame - activeUi.from) / activeUi.dur : 0}
          >
            {beats.filter((b) => b.kind === "ui").map((b, i) => {
              const l = frame - b.from;
              if (l < -16 || l >= b.dur + 2) return null;
              return (
                <BeatShell key={i} local={l} dur={b.dur} variant={b.variant!}>
                  {b.body!(Math.max(0, l))}
                </BeatShell>
              );
            })}
          </Window>
        )}

        {beats.filter((b) => b.kind === "type").map((b, i) => {
          const l = frame - b.from;
          if (l < 0 || l >= b.dur) return null;
          return <TypeBeat key={`ty${i}`} local={l} dur={b.dur} lines={b.lines!} eyebrow={b.eyebrow} />;
        })}

        {beats.map((b, i) => {
          const l = frame - b.from;
          if (b.kind !== "ui" || !b.cursor || l < 0 || l >= b.dur) return null;
          return <CursorSim key={`c${i}`} local={l} points={b.cursor.points} clickAt={b.cursor.clickAt} />;
        })}

        {/* expressive feedback layer */}
        {connect >= 0 && connect < 100 && <Burst local={connect} from={94} x={800} y={560} />}
        {productBeat >= 0 && productBeat < 100 && <ClickChip local={productBeat} from={48} x={CART.x} y={CART.y} text={t(lang, "+1 në shportë", "+1 in cart")} />}
        {checkoutBeat >= 0 && checkoutBeat < 90 && <ClickChip local={checkoutBeat} from={50} x={PAY.x} y={PAY.y} text={t(lang, "✓ Drejt pagesës", "✓ To payment")} />}
        {ordersBeat >= 0 && ordersBeat < 85 && windowPresence > 0.5 && <OrderPing local={ordersBeat} from={26} lang={lang} />}

        {beats.map((b, i) => {
          const l = frame - b.from;
          if (b.kind !== "ui" || !b.cap || l < 0 || l >= b.dur) return null;
          return <Caption key={`t${i}`} text={b.cap} local={l} dur={b.dur} />;
        })}

        {/* end card — ring pulses + landing-style gradient CTA with shine */}
        {frame >= endFrom && (
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: "'Clash Display', Inter, sans-serif" }}>
            <div
              style={{
                position: "relative",
                overflow: "hidden",
                opacity: endS,
                transform: `translateY(${(1 - endS) * 40}px) scale(${0.92 + endS * 0.08})`,
                textAlign: "center",
                background: "rgba(26,14,18,0.62)",
                border: "1px solid rgba(255,255,255,0.14)",
                borderRadius: 44,
                padding: "50px 110px 54px",
                boxShadow: "0 60px 160px -50px rgba(20,10,14,0.7), inset 0 1px 0 rgba(255,255,255,0.1)",
              }}
            >
              <div style={{ position: "relative", width: 108, height: 108, margin: "0 auto" }}>
                {[0, 1].map((r) => {
                  const p = ((frame - endFrom) / 40 + r * 0.5) % 1;
                  return (
                    <span key={r} style={{ position: "absolute", inset: 0, borderRadius: 32, border: `2px solid ${r ? BRAND.gold : BRAND.neon}`, opacity: (1 - p) * 0.55, transform: `scale(${1 + p * 0.85})` }} />
                  );
                })}
                <Img src={staticFile("vela-icon.svg")} style={{ width: 108, height: 108, borderRadius: 28, boxShadow: "0 30px 80px -25px rgba(255,46,77,0.5)" }} />
              </div>
              <div style={{ marginTop: 24, fontSize: 72, fontWeight: 700, letterSpacing: "-0.02em", color: "#fff" }}>
                Dyqani yt. <span style={{ background: TEXT_GRAD, WebkitBackgroundClip: "text", color: "transparent" }}>Online.</span>
              </div>
              {(() => {
                const cta = sp(frame, endFrom + 16, 12);
                const shine = interpolate(frame, [endFrom + 30, endFrom + 48], [-40, 140], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
                return (
                  <div
                    style={{
                      position: "relative", overflow: "hidden", display: "inline-flex", alignItems: "center", gap: 12,
                      marginTop: 24, padding: "16px 44px", borderRadius: 999, background: GRAD, color: "#fff",
                      fontSize: 26, fontWeight: 700, letterSpacing: "-0.01em",
                      boxShadow: "0 24px 60px -18px rgba(255,46,77,0.55)",
                      opacity: cta, transform: `translateY(${(1 - cta) * 22}px) scale(${0.94 + cta * 0.06})`,
                    }}
                  >
                    <span style={{ position: "absolute", top: -10, bottom: -10, left: `${shine}%`, width: "26%", transform: "skewX(-14deg)", background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.55) 50%, transparent)" }} />
                    {t(lang, "Fillo falas", "Start free")} <span style={{ fontFamily: "Inter, sans-serif" }}>→</span>
                  </div>
                );
              })()}
              <div style={{ marginTop: 14, fontSize: 22, color: "rgba(255,255,255,0.72)", fontFamily: "Inter, sans-serif" }}>
                {t(lang, "7 ditë falas · pa kartë krediti", "7 days free · no credit card")}
              </div>
            </div>
          </AbsoluteFill>
        )}
      </div>
    </AbsoluteFill>
  );
};

export default HeroFilm;
