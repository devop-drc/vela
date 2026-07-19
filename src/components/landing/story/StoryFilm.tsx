import React from "react";
import { AbsoluteFill, interpolate, spring, Img, useCurrentFrame, Easing } from "remotion";
import { Instagram, Check, Heart, MessageCircle, Send, Bookmark, ShoppingBag, X, ArrowRight, CreditCard } from "lucide-react";
import { asset, t, type Lang } from "./storyPrimitives";
import type { LandingCopy } from "../copy";

export const STORY_FPS = 30;
export const STORY_W = 1600;
// Extra vertical room (vs the 16:9 of the content) so the window's drop-shadow
// and the caption have space and never get clipped by the composition bounds.
export const STORY_H = 1010;
const FPS = 30;

const IG = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=520&q=75`;
const DRESS = "1595777457583-95e059d581b8";

const eio = (f: number, inp: number[], out: number[]) =>
  interpolate(f, inp, out, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
const pop = (f: number, delay: number, d = 18) => spring({ frame: f - delay, fps: FPS, config: { damping: d, stiffness: 140, mass: 0.7 } });

/* ══════════════ SURFACES (each fills its morph layer 100%) ══════════════ */
const Card: React.FC<{ children: React.ReactNode; pad?: string }> = ({ children, pad = "p-8" }) => (
  <div className={`absolute inset-0 overflow-hidden rounded-[28px] border border-black/5 bg-white ${pad}`}>{children}</div>
);
const Browser: React.FC<{ src: string; f: number; zoom?: [number, number] }> = ({ src, f, zoom = [1.0, 1.05] }) => {
  // slow, eased Ken-Burns — decelerates smoothly instead of a linear creep
  const s = interpolate(f, [0, 175], zoom, { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[20px] border border-black/5 bg-white">
      <div className="flex h-[34px] items-center gap-2 border-b border-zinc-200/80 bg-zinc-50 px-4">
        <span className="h-[11px] w-[11px] rounded-full bg-[#ff5f57]" /><span className="h-[11px] w-[11px] rounded-full bg-[#febc2e]" /><span className="h-[11px] w-[11px] rounded-full bg-[#28c840]" />
      </div>
      <div className="relative h-[calc(100%-34px)] overflow-hidden">
        <Img src={src} className="absolute inset-0 h-full w-full object-cover object-top" style={{ transform: `scale(${s})`, transformOrigin: "50% 12%" }} />
      </div>
    </div>
  );
};
const Bare: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
);

/* Instagram-era gradients (commented for reference):
   ring:    linear-gradient(45deg,#feda75,#fd1d1d,#d62976,#4f5bd5)
   IG tile: linear-gradient(135deg,#feda75,#fd1d1d 30%,#d62976 52%,#962fbf 76%,#4f5bd5)
   connect: linear-gradient(90deg,#d62976,#f0554d,#f59e6b)
   spark:   #feda75 / #f0554d / #c77dff */
/* spark mark (brand) for loading states */
const Spark: React.FC<{ f: number; size?: number }> = ({ f, size = 30 }) => {
  const rot = interpolate(f, [0, 90], [0, 180]);
  return (
    <span style={{ display: "inline-block", transform: `rotate(${rot}deg)`, width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size} height={size}><path d="M12 1v22M1 12h22M4.2 4.2l15.6 15.6M19.8 4.2L4.2 19.8" stroke="url(#g)" strokeWidth="2.4" strokeLinecap="round" /><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#facc15" /><stop offset="0.5" stopColor="#ff2e4d" /><stop offset="1" stopColor="#a31234" /></linearGradient></defs></svg>
    </span>
  );
};

/* ══════════════ CONTENT (clean, one idea per beat) ══════════════ */

/* 1 · Instagram-only: a post, and the DMs pile up */
const C_IgPost: React.FC<{ f: number; lang: Lang }> = ({ f, lang }) => {
  const dms = [t(lang, "Sa kushton? 🙏", "How much? 🙏"), t(lang, "Si porosis?", "How order?"), t(lang, "Masa M? 🥺", "Size M? 🥺")];
  return (
    <Card pad="p-0">
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <span className="grid h-9 w-9 place-items-center rounded-full p-[2px]" style={{ background: "linear-gradient(45deg,#facc15,#f59e0b,#ff2e4d,#7f1d3b)" }}><Img src={IG(DRESS)} className="h-full w-full rounded-full border-2 border-white object-cover" /></span>
        <div className="flex-1 leading-tight"><div className="text-[15px] font-semibold text-zinc-900">dyqani.yt</div><div className="text-[11px] text-zinc-400">Tiranë</div></div>
      </div>
      <Img src={IG(DRESS)} className="aspect-square w-full object-cover" />
      <div className="flex items-center gap-4 px-4 py-3 text-zinc-900"><Heart className="h-6 w-6" /><MessageCircle className="h-6 w-6" /><Send className="h-6 w-6" /><Bookmark className="ml-auto h-6 w-6" /></div>
      <div className="px-4 text-[14px] text-zinc-800"><span className="font-semibold">dyqani.yt</span> {t(lang, "Fustan liri i ri ✨", "New linen dress ✨")}</div>
      {/* DM toasts pile up */}
      <div className="absolute right-3 top-16 flex w-[62%] flex-col items-end gap-2">
        {dms.map((d, i) => { const s = pop(f, 20 + i * 16); return (
          <div key={i} className="flex items-center gap-2 rounded-2xl rounded-tr-sm bg-zinc-900 px-3.5 py-2 text-[14px] font-medium text-white shadow-lg" style={{ opacity: s, transform: `translateY(${(1 - s) * 12}px) scale(${0.9 + s * 0.1})` }}>{d}</div>
        ); })}
      </div>
    </Card>
  );
};

/* 2 · no checkout — a DM haggle, cash only */
const C_Dm: React.FC<{ f: number; lang: Lang }> = ({ f, lang }) => {
  const msgs: [("in" | "out"), string][] = [
    ["in", t(lang, "Sa kushton? 😍", "How much? 😍")], ["out", "3.500 L"],
    ["in", t(lang, "Si paguaj?", "How to pay?")], ["out", t(lang, "Cash në dorëzim 📦", "Cash on delivery 📦")],
    ["in", t(lang, "Adresa? Numri?", "Address? Phone?")],
  ];
  return (
    <Card pad="p-5">
      <div className="mb-3 flex items-center gap-2 border-b border-zinc-100 pb-3"><span className="grid h-8 w-8 place-items-center rounded-full p-[2px]" style={{ background: "linear-gradient(45deg,#facc15,#f59e0b,#ff2e4d,#7f1d3b)" }}><Img src={IG(DRESS)} className="h-full w-full rounded-full border-2 border-white object-cover" /></span><span className="text-[14px] font-semibold text-zinc-900">dyqani.yt</span></div>
      <div className="flex flex-col gap-2.5">
        {msgs.map(([side, m], i) => { const s = pop(f, 10 + i * 18); return (
          <div key={i} className={`max-w-[78%] rounded-[20px] px-4 py-2.5 text-[15px] ${side === "out" ? "self-end rounded-br-md bg-zinc-900 text-white" : "self-start rounded-bl-md bg-zinc-100 text-zinc-800"}`} style={{ opacity: s, transform: `translateY(${(1 - s) * 10}px)` }}>{m}</div>
        ); })}
      </div>
    </Card>
  );
};

/* 3 · connect Instagram — the fix begins */
const C_Connect: React.FC<{ f: number; lang: Lang; done: boolean }> = ({ f, lang, done }) => (
  <Card pad="p-9">
    <div className="flex items-center gap-4">
      <span className="grid h-16 w-16 place-items-center rounded-2xl text-white shadow-lg" style={{ background: "linear-gradient(135deg,#facc15,#f59e0b 30%,#ff2e4d 52%,#a31234 76%,#7f1d3b)" }}><Instagram className="h-8 w-8" /></span>
      <div><div className="text-[24px] font-bold text-zinc-900">{t(lang, "Lidh Instagram-in", "Connect Instagram")}</div><div className="text-[15px] text-zinc-400">@dyqani.yt · 12 {t(lang, "postime", "posts")}</div></div>
    </div>
    <div className="mt-6 space-y-2.5">
      {[t(lang, "Postimet → produkte me sistemin", "Posts → products with the system"), t(lang, "Çmime & variante vetë", "Prices & variants, auto"), t(lang, "Pagesa me kartë në Lekë", "Card payments in Lek")].map((s) => (
        <div key={s} className="flex items-center gap-2.5 text-[16px] text-zinc-700"><span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/15 text-emerald-600"><Check className="h-3.5 w-3.5" /></span>{s}</div>
      ))}
    </div>
    <div className="btn-connect relative mt-7 h-[54px]">
      <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-2xl text-[18px] font-bold text-white" style={{ background: "linear-gradient(90deg,#a31234,#ff2e4d,#f59e0b)", opacity: done ? 0 : 1 }}><Instagram className="h-5 w-5" /> {t(lang, "Lidhu", "Connect")}</div>
      <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-[18px] font-bold text-white" style={{ opacity: done ? 1 : 0, transform: `scale(${done ? 1 : 0.9})` }}><Check className="h-5 w-5" /> {t(lang, "U lidh", "Connected")}</div>
    </div>
  </Card>
);

/* on-stage text sits on the transparent film → must adapt to the page theme */
const stageText = (dark: boolean) => (dark ? "#f4f4f5" : "#18181b");
const stageMuted = (dark: boolean) => (dark ? "rgba(255,255,255,0.62)" : "#71717a");

/* loading / status beats (bare on the transparent stage) */
const C_Loading: React.FC<{ f: number; text: string; dark?: boolean }> = ({ f, text, dark = false }) => (
  <Bare>
    <div className="flex items-center gap-3">
      <Spark f={f} size={30} />
      <span className="text-[30px] font-medium italic" style={{ fontFamily: "'Clash Display','Satoshi',sans-serif", color: stageText(dark) }}>{text}</span>
    </div>
  </Bare>
);

/* end card */
const C_End: React.FC<{ f: number; lang: Lang; dark?: boolean }> = ({ f, lang, dark = false }) => {
  const s = pop(f, 6);
  return (
    <Bare>
      <img src={asset("vela-icon.svg")} alt="" className="mb-6 h-20 w-20 rounded-[22px]" style={{ opacity: s, transform: `scale(${0.6 + s * 0.4})` }} />
      <div className="text-[46px] font-bold leading-tight" style={{ fontFamily: "'Clash Display',sans-serif", color: stageText(dark), opacity: eio(f, [10, 28], [0, 1]) }}>Vela</div>
      <div className="mt-2 text-[20px]" style={{ color: stageMuted(dark), opacity: eio(f, [20, 38], [0, 1]) }}>{t(lang, "Nga Instagram në e-commerce.", "From Instagram to e-commerce.")}</div>
    </Bare>
  );
};

/* ══════════════ BEATS (the journey; each morphs the window) ══════════════ */
type Beat = {
  dur: number; w: number; h: number;
  content: (f: number, lang: Lang, dark: boolean) => React.ReactNode;
  label?: (lang: Lang) => string;
  cursor?: { t: number; fx: number; fy: number; click?: boolean }[]; // window-fraction keyframes
};

const WIN_CY = STORY_H / 2 - 60; // window centre (nudged up to leave room for shadow + caption)
const P = { w: 466, h: 700 }; // portrait card
const L = { w: 1210, h: 742 }; // landscape browser (≈1440:900 + chrome)
const BARE = { w: 760, h: 200 };
const CAP_TOP = WIN_CY + L.h / 2 + 34; // caption sits just below the (tallest) window, follows it

const BEATS: Beat[] = [
  { dur: 108, ...P, content: (f, l) => <C_IgPost f={f} lang={l} />, label: (l) => t(l, "Vetëm në Instagram: çdo shitje ngec në mesazhe", "Instagram only: every sale stuck in messages") },
  { dur: 108, ...P, content: (f, l) => <C_Dm f={f} lang={l} />, label: (l) => t(l, "Pa arkë. Pa pagesa online.", "No checkout. No online payments.") },
  { dur: 60, ...BARE, content: (f, l, d) => <C_Loading f={f} dark={d} text={t(l, "Ka një mënyrë më të mirë…", "There's a better way…")} /> },
  { dur: 114, w: 468, h: 470, content: (f, l) => <C_Connect f={f} lang={l} done={f > 52} />, label: (l) => t(l, "Lidh Instagram-in — një klik", "Connect Instagram — one click"), cursor: [{ t: 12, fx: 0.52, fy: 0.24 }, { t: 44, fx: 0.5, fy: 0.585 }, { t: 50, fx: 0.5, fy: 0.585, click: true }] },
  { dur: 66, ...BARE, content: (f, l, d) => <C_Loading f={f} dark={d} text={t(l, "Sistemi po ndërton dyqanin…", "The system is building your shop…")} /> },
  { dur: 108, ...L, content: (f) => <Browser src={asset("hero/products.png")} f={f} />, label: (l) => t(l, "12 produkte — të gatshme vetë", "12 products — ready, automatically") },
  { dur: 108, ...L, content: (f) => <Browser src={asset("hero/storefront-custom.png")} f={f} zoom={[1.04, 1.12]} />, label: (l) => t(l, "Dyqani yt online", "Your shop, online") },
  { dur: 114, ...L, content: (f) => <Browser src={asset("hero/storefront-product.png")} f={f} />, label: (l) => t(l, "Klientët blejnë vetë — pa mesazhe", "Customers buy on their own"), cursor: [{ t: 14, fx: 0.72, fy: 0.28 }, { t: 46, fx: 0.77, fy: 0.4 }, { t: 52, fx: 0.77, fy: 0.4, click: true }] },
  { dur: 102, ...L, content: (f) => <Browser src={asset("hero/storefront-checkout.png")} f={f} />, label: (l) => t(l, "Arkë e vërtetë — kartë ose cash", "Real checkout — card or cash") },
  { dur: 102, ...L, content: (f) => <Browser src={asset("hero/orders.png")} f={f} />, label: (l) => t(l, "Porositë në një panel — pa kaos", "Orders in one panel — no chaos") },
  { dur: 114, ...L, content: (f) => <Browser src={asset("hero/dashboard.png")} f={f} zoom={[1.08, 1.0]} />, label: (l) => t(l, "Të ardhurat rriten", "Revenue grows") },
  { dur: 90, ...BARE, content: (f, l, d) => <C_End f={f} lang={l} dark={d} /> },
];

const STARTS = BEATS.reduce<number[]>((a, b, i) => { a.push(i === 0 ? 0 : a[i - 1] + BEATS[i - 1].dur); return a; }, []);
export const STORY_FRAMES = STARTS[STARTS.length - 1] + BEATS[BEATS.length - 1].dur;
const TRANS = 22;

/* cursor pointer (arrow) with a soft click ripple, driven in composition px */
const Pointer: React.FC<{ x: number; y: number; press: number; ripple: number }> = ({ x, y, press, ripple }) => (
  <div style={{ position: "absolute", left: x, top: y, zIndex: 60, transform: `scale(${1 - press * 0.16})`, transformOrigin: "6px 4px" }}>
    {ripple > 0 && ripple < 1 && (
      <span style={{ position: "absolute", left: -15, top: -13, width: 34, height: 34, borderRadius: 9999, border: "2.5px solid rgba(255,46,77,0.9)", opacity: 1 - ripple, transform: `scale(${0.3 + ripple * 1.6})` }} />
    )}
    <svg width="30" height="30" viewBox="0 0 24 24" style={{ filter: "drop-shadow(0 3px 7px rgba(0,0,0,.35))" }}><path d="M5 3l14 8-6 1.5L9.5 19 5 3z" fill="#fff" stroke="#111" strokeWidth="1.4" strokeLinejoin="round" /></svg>
  </div>
);

export const StoryFilm: React.FC<{ copy?: LandingCopy; lang?: Lang; dark?: boolean }> = ({ lang = "sq", dark = false }) => {
  const frame = useCurrentFrame();
  let ai = 0;
  for (let i = 0; i < BEATS.length; i++) if (frame >= STARTS[i]) ai = i;
  const cur = BEATS[ai];
  const local = frame - STARTS[ai];
  const prev = ai > 0 ? BEATS[ai - 1] : null;
  const inT = prev && local < TRANS;
  const p = inT ? eio(local, [0, TRANS], [0, 1]) : 1; // morph progress 0..1

  // window size morphs from prev → cur over the transition
  const w = inT ? interpolate(p, [0, 1], [prev!.w, cur.w]) : cur.w;
  const h = inT ? interpolate(p, [0, 1], [prev!.h, cur.h]) : cur.h;

  // cursor
  let cursor: { x: number; y: number; press: number; ripple: number } | null = null;
  if (cur.cursor) {
    const kf = cur.cursor;
    const fx = interpolate(local, kf.map((k) => k.t), kf.map((k) => k.fx), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
    const fy = interpolate(local, kf.map((k) => k.t), kf.map((k) => k.fy), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
    let press = 0, ripple = 0;
    kf.filter((k) => k.click).forEach((k) => {
      press = Math.max(press, interpolate(local, [k.t - 3, k.t, k.t + 8], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
      if (local >= k.t && local < k.t + 18) ripple = Math.max(ripple, interpolate(local, [k.t, k.t + 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    });
    cursor = { x: STORY_W / 2 + (fx - 0.5) * cur.w, y: WIN_CY + (fy - 0.5) * cur.h, press, ripple };
  }

  const label = cur.label?.(lang);

  const winShadow = interpolate(inT ? p : 1, [0, 1], [0.35, 0.55]); // shadow lifts a touch through the morph
  return (
    <AbsoluteFill className="landing">
      {/* soft brand glow behind the card — gives depth on the light page */}
      <div className="pointer-events-none absolute" style={{ left: STORY_W / 2 - 480, top: WIN_CY - 360, width: 960, height: 720, opacity: 0.16, filter: "blur(96px)", background: "radial-gradient(closest-side, rgba(168,85,247,0.55), rgba(236,72,153,0.28), transparent 72%)" }} />

      {/* the single morphing window (zoom-crossfade between beats) */}
      <div style={{ position: "absolute", left: STORY_W / 2 - w / 2, top: WIN_CY - h / 2, width: w, height: h, filter: `drop-shadow(0 40px 90px rgba(30,10,50,${winShadow}))` }}>
        {inT && prev && (
          <div style={{ position: "absolute", inset: 0, opacity: 1 - p, transform: `scale(${1 + p * 0.06})`, transformOrigin: "50% 45%" }}>
            {prev.content(prev.dur - 1, lang, dark)}
          </div>
        )}
        <div style={{ position: "absolute", inset: 0, opacity: inT ? p : 1, transform: inT ? `scale(${0.94 + p * 0.06})` : undefined, transformOrigin: "50% 45%" }}>
          {cur.content(local, lang, dark)}
        </div>
      </div>

      {cursor && <Pointer x={cursor.x} y={cursor.y} press={cursor.press} ripple={cursor.ripple} />}

      {/* one clean caption line under the window */}
      {label && (
        <div style={{ position: "absolute", left: 0, right: 0, top: CAP_TOP, textAlign: "center", opacity: inT ? p : eio(local, [0, 14, cur.dur - 12, cur.dur], [0, 1, 1, 0]), transform: `translateY(${inT ? (1 - p) * 10 : 0}px)` }}>
          <span className="text-[26px] font-semibold" style={{ fontFamily: "'Satoshi','Inter',sans-serif", color: stageText(dark) }}>{label}</span>
        </div>
      )}
    </AbsoluteFill>
  );
};
