import React from "react";
import { AbsoluteFill, interpolate, spring, Img, useCurrentFrame, Easing } from "remotion";
import { Instagram, Check, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, CheckCheck } from "lucide-react";
import { asset, t, type Lang } from "./storyPrimitives";
import type { LandingCopy } from "../copy";

// 60fps → slow "Ken-Burns" zoom + idle hover read smoothly (30fps made them step).
export const STORY_FPS = 60;
export const STORY_W = 1600;
// Extra vertical room (vs the 16:9 of the content) so the window's drop-shadow
// and the caption have space and never get clipped by the composition bounds.
export const STORY_H = 1010;
const FPS = 60;

const IG = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=520&q=75`;
const DRESS = "1595777457583-95e059d581b8";

const eio = (f: number, inp: number[], out: number[]) =>
  interpolate(f, inp, out, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
const clampI = (f: number, inp: number[], out: number[], easing?: (t: number) => number) =>
  interpolate(f, inp, out, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
const pop = (f: number, delay: number, d = 18) => spring({ frame: f - delay, fps: FPS, config: { damping: d, stiffness: 140, mass: 0.7 } });
const wave = (frame: number, period: number, amp: number, phase = 0) => Math.sin((frame / period) + phase) * amp;

/* frosted-glass surfaces (FluidGlass-inspired) — translucent, sheened, soft-shadowed */
// Glass look from translucency + a top sheen + soft shadow (no backdrop-filter:
// ancestor transforms neutralise it here, and it's GPU-costly at 60fps).
const GLASS_IN: React.CSSProperties = { background: "linear-gradient(160deg, rgba(255,255,255,0.66), rgba(255,255,255,0.44))", border: "1px solid rgba(255,255,255,0.75)", boxShadow: "0 10px 30px rgba(30,10,50,0.16), inset 0 1px 0 rgba(255,255,255,0.95)", color: "#1b1b21" };
const GLASS_OUT: React.CSSProperties = { background: "linear-gradient(160deg, rgba(224,52,128,0.9), rgba(126,46,176,0.86))", border: "1px solid rgba(255,255,255,0.34)", boxShadow: "0 10px 30px rgba(120,20,90,0.3), inset 0 1px 0 rgba(255,255,255,0.5)", color: "#fff" };

/* ══════════════ SURFACES (each fills its morph layer 100%) ══════════════ */
const Card: React.FC<{ children: React.ReactNode; pad?: string }> = ({ children, pad = "p-8" }) => (
  <div className={`absolute inset-0 overflow-hidden rounded-[28px] border border-black/5 bg-white ${pad}`}>{children}</div>
);

const Browser: React.FC<{ src: string; f: number }> = ({ src, f }) => {
  // No Ken-Burns zoom — the slow per-frame scale on a large image caused judder.
  // The capture stays crisp/static; a one-time shine on entry gives it life, and
  // the beat transitions supply the motion.
  const shineX = clampI(f, [8, 96], [-45, 150], Easing.out(Easing.cubic));
  const shineOp = clampI(f, [8, 44, 100], [0, 0.5, 0]);
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[20px] border border-black/5 bg-white">
      <div className="flex h-[34px] items-center gap-2 border-b border-zinc-200/80 bg-zinc-50 px-4">
        <span className="h-[11px] w-[11px] rounded-full bg-[#ff5f57]" /><span className="h-[11px] w-[11px] rounded-full bg-[#febc2e]" /><span className="h-[11px] w-[11px] rounded-full bg-[#28c840]" />
      </div>
      <div className="relative h-[calc(100%-34px)] overflow-hidden">
        <Img src={src} className="absolute inset-0 h-full w-full object-cover object-top" />
        <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(105deg, transparent 42%, rgba(255,255,255,0.55) 50%, transparent 58%)", transform: `translateX(${shineX}%)`, opacity: shineOp, mixBlendMode: "overlay" }} />
      </div>
    </div>
  );
};

const Bare: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
);

/* spark mark (brand) for loading states */
const Spark: React.FC<{ f: number; size?: number }> = ({ f, size = 30 }) => {
  const rot = interpolate(f, [0, 180], [0, 180]);
  return (
    <span style={{ display: "inline-block", transform: `rotate(${rot}deg)`, width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size} height={size}><path d="M12 1v22M1 12h22M4.2 4.2l15.6 15.6M19.8 4.2L4.2 19.8" stroke="url(#g)" strokeWidth="2.4" strokeLinecap="round" /><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#feda75" /><stop offset="0.5" stopColor="#f76fae" /><stop offset="1" stopColor="#c77dff" /></linearGradient></defs></svg>
    </span>
  );
};

const GlassDots: React.FC<{ f: number }> = ({ f }) => (
  <div className="flex items-center gap-1.5 self-start rounded-[22px] rounded-bl-md px-4 py-3.5" style={GLASS_IN}>
    {[0, 1, 2].map((i) => (
      <span key={i} className="h-2.5 w-2.5 rounded-full bg-zinc-500" style={{ opacity: 0.3 + (Math.sin(f / 8 - i * 0.9) * 0.5 + 0.5) * 0.7, transform: `translateY(${Math.sin(f / 8 - i * 0.9) * -3}px)` }} />
    ))}
  </div>
);

/* ══════════════ CONTENT (clean, one idea per beat) ══════════════ */

/* 1 · Instagram-only: a post, the likes climb, and the DMs pile up */
const C_IgPost: React.FC<{ f: number; lang: Lang }> = ({ f, lang }) => {
  const dms = [t(lang, "Sa kushton? 🙏", "How much? 🙏"), t(lang, "Si porosis?", "How order?"), t(lang, "Masa M? 🥺", "Size M? 🥺")];
  const liked = f > 80;
  const burst = clampI(f, [76, 92, 124, 144], [0, 1, 1, 0]);           // big double-tap heart
  const burstScale = clampI(f, [76, 100], [0.4, 1.15], Easing.out(Easing.back(2)));
  const likes = Math.round(clampI(f, [88, 156], [1216, 1263]));
  return (
    <Card pad="p-0">
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <span className="grid h-9 w-9 place-items-center rounded-full p-[2px]" style={{ background: "linear-gradient(45deg,#feda75,#d62976,#4f5bd5)" }}><Img src={IG(DRESS)} className="h-full w-full rounded-full border-2 border-white object-cover" /></span>
        <div className="flex-1 leading-tight"><div className="text-[15px] font-semibold text-zinc-900">dyqani.yt</div><div className="text-[11px] text-zinc-400">Tiranë</div></div>
        <MoreHorizontal className="h-5 w-5 text-zinc-400" />
      </div>
      <div className="relative">
        <Img src={IG(DRESS)} className="aspect-square w-full object-cover" />
        {burst > 0 && (
          <div className="absolute inset-0 grid place-items-center" style={{ opacity: burst }}>
            <Heart className="h-24 w-24 text-white" style={{ fill: "white", transform: `scale(${burstScale})`, filter: "drop-shadow(0 6px 20px rgba(0,0,0,.35))" }} />
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 px-4 py-3 text-zinc-900">
        <Heart className="h-6 w-6" style={liked ? { fill: "#ef4444", color: "#ef4444" } : undefined} />
        <MessageCircle className="h-6 w-6" /><Send className="h-6 w-6" /><Bookmark className="ml-auto h-6 w-6" />
      </div>
      <div className="px-4 text-[13px] font-semibold text-zinc-900 tabular-nums">{likes.toLocaleString("en-US")} {t(lang, "pëlqime", "likes")}</div>
      <div className="px-4 pt-1 text-[14px] text-zinc-800"><span className="font-semibold">dyqani.yt</span> {t(lang, "Fustan liri i ri ✨", "New linen dress ✨")}</div>
      {/* DM toasts pile up (start after the like, so beats read one at a time) */}
      <div className="absolute right-3 top-16 flex w-[62%] flex-col items-end gap-2">
        {dms.map((d, i) => { const s = pop(f, 80 + i * 30); return (
          <div key={i} className="flex items-center gap-2 rounded-2xl rounded-tr-sm bg-zinc-900 px-3.5 py-2 text-[14px] font-medium text-white shadow-lg" style={{ opacity: s, transform: `translateY(${(1 - s) * 12}px) scale(${0.9 + s * 0.1})` }}>{d}</div>
        ); })}
      </div>
    </Card>
  );
};

/* 2 · no checkout — an endless, annoying DM haggle. Big glassmorphic bubbles that
   stream upward (older ones scroll off the top) while an unread counter climbs. */
const C_Dm: React.FC<{ f: number; lang: Lang; dark?: boolean }> = ({ f, lang, dark = false }) => {
  const msgs: [("in" | "out"), string, string][] = [
    ["in", t(lang, "Sa kushton? 😍", "How much? 😍"), "09:14"],
    ["out", "3.500 L", "09:14"],
    ["in", t(lang, "Po sa kushton?? 🙏", "But how much?? 🙏"), "09:31"],   // price is right there…
    ["in", t(lang, "A ka zbritje?", "Any discount?"), "09:33"],
    ["in", t(lang, "A e ke akoma? 🥺", "Still available? 🥺"), "09:40"],
    ["in", t(lang, "Masa M? Ngjyra?", "Size M? Color?"), "09:41"],
    ["in", t(lang, "Kur ma sjell?", "When can you bring it?"), "09:44"],
    ["in", t(lang, "Adresa? Numri?", "Address? Phone?"), "09:52"],
    ["in", t(lang, "Hallo?? 😤", "Hello?? 😤"), "10:03"],
  ];
  const stamp = dark ? "rgba(255,255,255,0.62)" : "rgba(30,20,45,0.5)";
  const CADENCE = 20, ROW = 104;
  // continuous upward scroll — newest sits near the bottom, older ones clip off the top
  const shownF = clampI(f, [10, 10 + msgs.length * CADENCE], [0, msgs.length]);
  const scrollY = 660 - shownF * ROW;
  const typing = pop(f, 10 + msgs.length * CADENCE + 8);
  // unread counter climbs slowly the whole time (they never stop asking)
  const unread = Math.round(clampI(f, [0, 240], [41, 57]));
  const bump = 1 + wave(f, 26, 0.045); // gentle breathing pulse
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-x-0 top-0 flex flex-col gap-4 px-4" style={{ transform: `translateY(${scrollY}px)` }}>
        {msgs.map(([side, m, time], i) => { const s = pop(f, 10 + i * CADENCE); return (
          <div key={i} className={`flex flex-col ${side === "out" ? "items-end" : "items-start"}`} style={{ opacity: s, transform: `translateY(${(1 - s) * 16}px)` }}>
            <div className="max-w-[82%] px-5 py-3 text-[25px] font-medium leading-tight" style={{ ...(side === "out" ? GLASS_OUT : GLASS_IN), borderRadius: 28, borderBottomRightRadius: side === "out" ? 9 : 28, borderBottomLeftRadius: side === "out" ? 28 : 9 }}>{m}</div>
            <span className="mt-1.5 flex items-center gap-1 px-1.5 text-[13px] font-medium" style={{ color: stamp }}>{time}{side === "out" && <CheckCheck className="h-3.5 w-3.5" style={{ color: "#38bdf8" }} />}</span>
          </div>
        ); })}
        <div style={{ opacity: typing }}><GlassDots f={f} /></div>
      </div>

      {/* climbing unread badge — white text, red circle, padding */}
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <MessageCircle className="h-7 w-7" style={{ color: stamp }} />
        <span className="grid min-w-[42px] place-items-center rounded-full bg-[#ef4444] px-3 py-1.5 text-[24px] font-bold leading-none text-white tabular-nums shadow-[0_6px_18px_rgba(239,68,68,0.5)]" style={{ transform: `scale(${bump})` }}>{unread}</span>
      </div>
    </div>
  );
};

/* 3 · connect Instagram — the fix begins */
const C_Connect: React.FC<{ f: number; lang: Lang; done: boolean }> = ({ f, lang, done }) => {
  const rows = [t(lang, "Postimet → produkte me AI", "Posts → products with AI"), t(lang, "Çmime & variante vetë", "Prices & variants, auto"), t(lang, "Pagesa me kartë në Lekë", "Card payments in Lek")];
  const shine = done ? 0 : clampI(f % 96, [0, 48, 96], [-60, 60, 180]); // sweep on the connect button while idle
  return (
    <Card pad="p-9">
      <div className="flex items-center gap-4">
        <span className="grid h-16 w-16 place-items-center rounded-2xl text-white shadow-lg" style={{ background: "linear-gradient(135deg,#feda75,#d62976 45%,#962fbf 75%,#4f5bd5)" }}><Instagram className="h-8 w-8" /></span>
        <div><div className="text-[24px] font-bold text-zinc-900">{t(lang, "Lidh Instagram-in", "Connect Instagram")}</div><div className="text-[15px] text-zinc-400">@dyqani.yt · 12 {t(lang, "postime", "posts")}</div></div>
      </div>
      <div className="mt-6 space-y-2.5">
        {rows.map((s, i) => { const a = pop(f, 16 + i * 14); return (
          <div key={s} className="flex items-center gap-2.5 text-[16px] text-zinc-700" style={{ opacity: a, transform: `translateX(${(1 - a) * -12}px)` }}><span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/15 text-emerald-600"><Check className="h-3.5 w-3.5" /></span>{s}</div>
        ); })}
      </div>
      <div className="btn-connect relative mt-7 h-[54px] overflow-hidden rounded-2xl">
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-[18px] font-bold text-white" style={{ background: "linear-gradient(90deg,#d62976,#f76fae,#f59e6b)", opacity: done ? 0 : 1 }}>
          <Instagram className="h-5 w-5" /> {t(lang, "Lidhu", "Connect")}
          {!done && <span className="pointer-events-none absolute inset-y-0 w-1/3" style={{ background: "linear-gradient(105deg, transparent, rgba(255,255,255,0.5), transparent)", transform: `translateX(${shine}%)` }} />}
        </div>
        <div className="absolute inset-0 flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-[18px] font-bold text-white" style={{ opacity: done ? 1 : 0, transform: `scale(${done ? 1 : 0.9})` }}><Check className="h-5 w-5" /> {t(lang, "U lidh", "Connected")}</div>
      </div>
    </Card>
  );
};

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
  const s = pop(f, 12);
  return (
    <Bare>
      <img src={asset("vela-icon.svg")} alt="" className="mb-6 h-20 w-20 rounded-[22px]" style={{ opacity: s, transform: `scale(${0.6 + s * 0.4})` }} />
      <div className="text-[46px] font-bold leading-tight" style={{ fontFamily: "'Clash Display',sans-serif", color: stageText(dark), opacity: eio(f, [20, 56], [0, 1]) }}>Vela</div>
      <div className="mt-2 text-[20px]" style={{ color: stageMuted(dark), opacity: eio(f, [40, 76], [0, 1]) }}>{t(lang, "Nga Instagram në e-commerce.", "From Instagram to e-commerce.")}</div>
    </Bare>
  );
};

/* ══════════════ BEATS (the journey; each morphs the window) ══════════════ */
type Beat = {
  dur: number; w: number; h: number;
  content: (f: number, lang: Lang, dark: boolean) => React.ReactNode;
  label?: (lang: Lang) => string;
  glass?: boolean; // no window surface/shadow — content brings its own (glass bubbles)
  cursor?: { t: number; fx: number; fy: number; click?: boolean }[]; // window-fraction keyframes
};

const WIN_CY = STORY_H / 2 - 60; // window centre (nudged up to leave room for shadow + caption)
const P = { w: 466, h: 700 }; // portrait card
const L = { w: 1210, h: 742 }; // landscape browser (≈1440:900 + chrome)
const BARE = { w: 760, h: 200 };
const CAP_TOP = WIN_CY + L.h / 2 + 34; // caption sits just below the (tallest) window, follows it

const BEATS: Beat[] = [
  { dur: 216, ...P, content: (f, l) => <C_IgPost f={f} lang={l} />, label: (l) => t(l, "Vetëm në Instagram: çdo shitje ngec në DM", "Instagram only: every sale stuck in DMs") },
  { dur: 264, w: 560, h: 740, glass: true, content: (f, l, d) => <C_Dm f={f} lang={l} dark={d} />, label: (l) => t(l, "Pa arkë. Pa pagesa online.", "No checkout. No online payments.") },
  { dur: 120, ...BARE, content: (f, l, d) => <C_Loading f={f} dark={d} text={t(l, "Ka një mënyrë më të mirë…", "There's a better way…")} /> },
  { dur: 228, w: 468, h: 470, content: (f, l) => <C_Connect f={f} lang={l} done={f > 104} />, label: (l) => t(l, "Lidh Instagram-in — një klik", "Connect Instagram — one click"), cursor: [{ t: 24, fx: 0.54, fy: 0.24 }, { t: 88, fx: 0.5, fy: 0.579 }, { t: 100, fx: 0.5, fy: 0.579, click: true }] },
  { dur: 132, ...BARE, content: (f, l, d) => <C_Loading f={f} dark={d} text={t(l, "AI po ndërton dyqanin…", "AI is building your shop…")} /> },
  { dur: 216, ...L, content: (f) => <Browser src={asset("hero/products.png")} f={f} />, label: (l) => t(l, "12 produkte — të gatshme vetë", "12 products — ready, automatically") },
  { dur: 216, ...L, content: (f) => <Browser src={asset("hero/storefront-custom.png")} f={f} />, label: (l) => t(l, "Dyqani yt online", "Your shop, online") },
  { dur: 228, ...L, content: (f) => <Browser src={asset("hero/storefront-product.png")} f={f} />, label: (l) => t(l, "Klientët blejnë vetë — pa DM", "Customers buy on their own"), cursor: [{ t: 28, fx: 0.66, fy: 0.3 }, { t: 92, fx: 0.766, fy: 0.45 }, { t: 104, fx: 0.766, fy: 0.45, click: true }] },
  { dur: 204, ...L, content: (f) => <Browser src={asset("hero/storefront-checkout.png")} f={f} />, label: (l) => t(l, "Arkë e vërtetë — kartë ose cash", "Real checkout — card or cash") },
  { dur: 204, ...L, content: (f) => <Browser src={asset("hero/orders.png")} f={f} />, label: (l) => t(l, "Porositë në një panel — pa kaos", "Orders in one panel — no chaos") },
  { dur: 228, ...L, content: (f) => <Browser src={asset("hero/dashboard.png")} f={f} />, label: (l) => t(l, "Të ardhurat rriten", "Revenue grows") },
  { dur: 180, ...BARE, content: (f, l, d) => <C_End f={f} lang={l} dark={d} /> },
];

const STARTS = BEATS.reduce<number[]>((a, b, i) => { a.push(i === 0 ? 0 : a[i - 1] + BEATS[i - 1].dur); return a; }, []);
export const STORY_FRAMES = STARTS[STARTS.length - 1] + BEATS[BEATS.length - 1].dur;
const TRANS = 44;

/* cursor pointer (arrow) with a soft click ripple, driven in composition px */
const Pointer: React.FC<{ x: number; y: number; press: number; ripple: number }> = ({ x, y, press, ripple }) => (
  <div style={{ position: "absolute", left: 0, top: 0, zIndex: 60, transform: `translate(${x}px, ${y}px) scale(${1 - press * 0.16})`, transformOrigin: "6px 4px" }}>
    {ripple > 0 && ripple < 1 && (
      <span style={{ position: "absolute", left: -15, top: -13, width: 34, height: 34, borderRadius: 9999, border: "2.5px solid rgba(217,70,239,0.9)", opacity: 1 - ripple, transform: `scale(${0.3 + ripple * 1.6})` }} />
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

  const cx = STORY_W / 2;

  // mood: the ambient glow shifts warm (Instagram pain) → cool (Vela solution)
  // across the story, and breathes gently.
  const hue = clampI(ai, [0, 2, 4, 8, 11], [344, 336, 300, 276, 258]);
  const sat = clampI(ai, [0, 4], [72, 84]);
  const glowOp = 0.15 + wave(frame, 80, 0.035);

  // cursor — window-fraction keyframes → composition px (idle float folded in).
  let cursor: { x: number; y: number; press: number; ripple: number } | null = null;
  if (cur.cursor && !inT) {
    const kf = cur.cursor;
    const fx = interpolate(local, kf.map((k) => k.t), kf.map((k) => k.fx), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
    const fy = interpolate(local, kf.map((k) => k.t), kf.map((k) => k.fy), { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
    let press = 0, ripple = 0;
    kf.filter((k) => k.click).forEach((k) => {
      press = Math.max(press, interpolate(local, [k.t - 6, k.t, k.t + 16], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
      if (local >= k.t && local < k.t + 36) ripple = Math.max(ripple, interpolate(local, [k.t, k.t + 36], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    });
    cursor = { x: cx + (fx - 0.5) * cur.w, y: WIN_CY + (fy - 0.5) * cur.h, press, ripple };
  }

  const label = cur.label?.(lang);
  const winShadow = interpolate(inT ? p : 1, [0, 1], [0.35, 0.55]); // shadow lifts a touch through the morph
  // glass beats bring their own per-bubble shadows → soften the window drop-shadow so it isn't heavy
  const shadow = cur.glass
    ? `drop-shadow(0 14px 30px rgba(30,10,50,${0.10 + (inT ? p : 1) * 0.05}))`
    : `drop-shadow(0 40px 90px rgba(30,10,50,${winShadow}))`;

  return (
    <AbsoluteFill className="landing" style={{ overflow: "visible" }}>
      {/* mood glow behind the card — shifts hue with the story, breathes gently */}
      <div className="pointer-events-none absolute" style={{ left: cx - 500, top: WIN_CY - 380, width: 1000, height: 760, opacity: glowOp, filter: "blur(100px)", background: `radial-gradient(closest-side, hsl(${hue} ${sat}% 62% / 0.6), hsl(${hue + 24} ${sat}% 58% / 0.28), transparent 72%)` }} />

      {/* clean cross-dissolve between beats — each layer stays at its NATIVE size (no
          non-uniform stretch → no distortion) with a gentle uniform zoom + motion-blur
          clear. GPU-composited; the window sits still (no idle float). */}
      {inT && prev && (
        <div style={{
          position: "absolute", left: cx, top: WIN_CY, width: prev.w, height: prev.h, transformOrigin: "center",
          transform: `translate(-50%, -50%) scale(${1 + p * 0.06})`,
          opacity: 1 - p, filter: `blur(${p * 5}px)`,
        }}>
          {prev.content(prev.dur - 1, lang, dark)}
        </div>
      )}
      <div style={{
        position: "absolute", left: cx, top: WIN_CY, width: cur.w, height: cur.h, transformOrigin: "center",
        transform: inT ? `translate(-50%, -50%) scale(${0.94 + p * 0.06})` : "translate(-50%, -50%)",
        opacity: inT ? p : 1,
        filter: inT ? `${shadow} blur(${(1 - p) * 5}px)` : shadow,
      }}>
        {cur.content(local, lang, dark)}
      </div>

      {cursor && <Pointer x={cursor.x} y={cursor.y} press={cursor.press} ripple={cursor.ripple} />}

      {/* one clean caption line under the window */}
      {label && (
        <div style={{ position: "absolute", left: 0, right: 0, top: CAP_TOP, textAlign: "center", opacity: inT ? p : eio(local, [0, 28, cur.dur - 24, cur.dur], [0, 1, 1, 0]), transform: `translateY(${inT ? (1 - p) * 8 : 0}px)` }}>
          <span className="text-[26px] font-semibold" style={{ fontFamily: "'Satoshi','Inter',sans-serif", color: stageText(dark) }}>{label}</span>
        </div>
      )}
    </AbsoluteFill>
  );
};
