import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Img, staticFile, Easing } from "remotion";

/* ── design tokens ─────────────────────────────────────────────────────── */
export const FPS = 30;
export const BRAND = "brand-gradient"; // gradient utility from globals.css
export const BG = "radial-gradient(130% 100% at 50% 0%, #f3eefb 0%, #e9ebf5 55%, #eef0f8 100%)";

export type Lang = "sq" | "en";
export const t = (lang: Lang, sq: string, en: string) => (lang === "sq" ? sq : en);

/** Asset URL that works in both the Vite player and the Remotion renderer. */
export const asset = (name: string) => {
  try {
    return staticFile(name);
  } catch {
    return `/${name}`;
  }
};

/* ── scene wrapper: soft cross-fade + gentle rise at the cut ────────────── */
export const Scene: React.FC<{ dur: number; children: React.ReactNode; className?: string }> = ({
  dur,
  children,
  className,
}) => {
  const f = useCurrentFrame();
  const fade = 15;
  const eio = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const, easing: Easing.inOut(Easing.cubic) };
  const opacity = interpolate(f, [0, fade, dur - fade, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // clean crossfade with a very subtle scale settle — NO blur (kept the content crisp).
  const scale = interpolate(f, [0, fade, dur - fade, dur], [1.02, 1, 1, 0.99], eio);
  const y = interpolate(f, [0, fade], [16, 0], eio);
  return (
    <AbsoluteFill className={`items-center justify-center ${className ?? ""}`} style={{ opacity }}>
      {/* soft brand glow — floats behind the scene for depth (bg is transparent) */}
      <div className={`pointer-events-none absolute left-1/2 top-[42%] h-[560px] w-[780px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.12] blur-3xl ${BRAND}`} />
      <div className="relative flex h-full w-full items-center justify-center" style={{ transform: `translateY(${y}px) scale(${scale})` }}>
        {children}
      </div>
    </AbsoluteFill>
  );
};

/* ── spotlight: dims everything except a glowing rounded region (explainer
   highlight). Cheap — uses a giant spread box-shadow, no blur filter. Position
   in composition px; drive .spotlight opacity/scale from the scene timeline. ── */
export const Spotlight: React.FC<{
  x: number; y: number; w: number; h: number; radius?: number; tone?: "brand" | "emerald"; className?: string;
}> = ({ x, y, w, h, radius = 16, tone = "brand", className }) => {
  const ring = tone === "emerald" ? "16,185,129" : "217,70,239";
  return (
    <div
      className={`spotlight pointer-events-none absolute z-30 ${className ?? ""}`}
      style={{
        left: x, top: y, width: w, height: h, borderRadius: radius,
        boxShadow: `0 0 0 3px rgba(${ring},0.95), 0 0 26px 5px rgba(${ring},0.5), 0 0 0 2200px rgba(18,10,32,0.52)`,
      }}
    />
  );
};

/* ── little animated label/callout that points at something (for highlights) ── */
export const Callout: React.FC<{ x: number; y: number; text: string; className?: string }> = ({ x, y, text, className }) => (
  <div className={`callout pointer-events-none absolute z-40 ${className ?? ""}`} style={{ left: x, top: y }}>
    <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-[17px] font-bold text-white shadow-xl ${BRAND}`}>{text}</span>
  </div>
);

/* ── caption block (kicker + headline), Clash Display ──────────────────── */
export const Caption: React.FC<{
  kicker?: string;
  title: React.ReactNode;
  place?: "top" | "bottom";
  tone?: "dark" | "brand";
  className?: string;
}> = ({ kicker, title, place = "bottom", tone = "dark", className }) => (
  <div
    className={`caption absolute left-1/2 z-20 -translate-x-1/2 text-center ${
      place === "top" ? "top-[54px]" : "bottom-[60px]"
    } ${className ?? ""}`}
    style={{ width: "min(1100px, 86%)" }}
  >
    {kicker && (
      <div
        className={`cap-kicker mb-3 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[16px] font-semibold ${
          tone === "brand"
            ? "border-red-300/60 bg-red-500/10 text-red-700"
            : "border-black/10 bg-white/70 text-zinc-600"
        } backdrop-blur`}
      >
        <span className={`h-2 w-2 rounded-full ${BRAND}`} />
        {kicker}
      </div>
    )}
    <div className="cap-title font-sans-brand text-[42px] font-bold leading-[1.05] tracking-tight text-zinc-900">
      {title}
    </div>
  </div>
);

/* ── macOS-style browser frame with a Ken-Burns screenshot inside ──────── */
export const BrowserFrame: React.FC<{
  src: string;
  url: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ src, url, className, style }) => (
  <div
    className={`browser overflow-hidden rounded-[18px] border border-black/10 bg-white shadow-[0_50px_120px_-30px_rgba(35,12,55,0.55)] ${className ?? ""}`}
    style={style}
  >
    <div className="flex h-[38px] items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-4">
      <span className="h-[13px] w-[13px] rounded-full bg-[#ff5f57]" />
      <span className="h-[13px] w-[13px] rounded-full bg-[#febc2e]" />
      <span className="h-[13px] w-[13px] rounded-full bg-[#28c840]" />
      <div className="mx-auto flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-6 py-[5px] text-[13px] text-zinc-400">
        <span className="text-[11px]">🔒</span>
        {url}
      </div>
    </div>
    <div className="relative overflow-hidden bg-white" style={{ aspectRatio: "1440 / 900" }}>
      <Img src={src} className="ken absolute inset-0 h-full w-full object-cover object-top" />
    </div>
  </div>
);

/* ── pointer cursor (position/click driven by the scene's GSAP timeline) ── */
export const Cursor: React.FC<{ className?: string }> = ({ className }) => (
  <div className={`cursor pointer-events-none absolute left-0 top-0 z-40 ${className ?? ""}`}>
    <span className="click-ring absolute -left-6 -top-6 h-12 w-12 rounded-full border-2 border-red-500 opacity-0" />
    <span className="click-fill absolute -left-6 -top-6 h-12 w-12 rounded-full bg-red-500/25 opacity-0" />
    <svg width="34" height="34" viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 3px 6px rgba(0,0,0,.4))" }}>
      <path d="M5 3l14 8-6 1.5L9.5 19 5 3z" fill="#fff" stroke="#111" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  </div>
);
