import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Bell, CreditCard, Sparkles, PackageCheck, TrendingUp, Moon, Sunrise } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

type Lang = "sq" | "en";
const t = (l: Lang, sq: string, en: string) => (l === "sq" ? sq : en);

/**
 * "Pa ndalim" v3 — a LIVE night. Left: the promise ("Ti fle. Vela shet.")
 * with three count-up stats. Right: a glass feed where the night's
 * notifications cycle continuously (seamless vertical ticker over a
 * duplicated list) under a moon → sunrise rail whose glow dot travels one
 * full night per loop. The loop pauses offscreen; reduced motion gets the
 * final still. Star-field + aurora ambience, horizon line at the bottom.
 */
export default function MomentumBand({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);

  const events = [
    { time: "23:14", Icon: Bell, tone: "text-red-400 bg-red-500/10", title: t(lang, "Porosi e re", "New order"), sub: t(lang, "Ana K. · Fustan liri", "Ana K. · Linen dress"), amt: "+3.500 L" },
    { time: "01:02", Icon: CreditCard, tone: "text-emerald-400 bg-emerald-500/10", title: t(lang, "Pagesë me kartë", "Card payment"), sub: "RaiAccept · Sara D.", amt: "+2.800 L" },
    { time: "03:47", Icon: Sparkles, tone: "text-amber-400 bg-amber-500/10", title: t(lang, "Postim i ri → produkt", "New post → product"), sub: t(lang, "Vathë ari · sinkronizuar", "Gold earrings · synced"), amt: "" },
    { time: "06:20", Icon: PackageCheck, tone: "text-amber-400 bg-amber-500/10", title: t(lang, "Stoku u rezervua vetë", "Stock auto-reserved"), sub: t(lang, "Pa mbishitje", "Nothing oversold"), amt: "" },
    { time: "08:05", Icon: Bell, tone: "text-red-400 bg-red-500/10", title: t(lang, "Porosi e re", "New order"), sub: t(lang, "Bledi M. · Sandale", "Bledi M. · Sandals"), amt: "+4.200 L" },
  ];

  const stats = [
    { value: 47800, suffix: " L", label: t(lang, "Të ardhura natën", "Overnight revenue"), delta: "+38%" },
    { value: 14, suffix: "", label: t(lang, "Porosi ndërsa flije", "Orders while you slept"), delta: "+5" },
    { value: 9, suffix: "", label: t(lang, "Klientë të rinj", "New customers"), delta: "+9" },
  ];

  const STEP = 86; // card height (74) + gap (12) — keep in sync with the JSX
  const HOLD = 1.7; // seconds each notification stays before the next one

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduce) {
        gsap.set(".mb-reveal, .mb-stat, .mb-panel", { opacity: 1, y: 0 });
        gsap.set(".mb-rail-fill", { scaleX: 1 });
        gsap.set(".mb-orb", { left: "100%" });
        root.current?.querySelectorAll<HTMLElement>(".mb-num").forEach((el) => (el.textContent = el.dataset.val || ""));
        return;
      }

      /* entrance */
      gsap.from(".mb-reveal", {
        y: 28, opacity: 0, duration: 0.85, stagger: 0.11, ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 72%" },
      });
      gsap.from(".mb-panel", {
        y: 40, opacity: 0, scale: 0.97, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: ".mb-panel", start: "top 80%" },
      });
      gsap.from(".mb-stat", {
        y: 22, opacity: 0, duration: 0.7, stagger: 0.12, ease: "power3.out",
        scrollTrigger: { trigger: ".mb-stats", start: "top 85%" },
      });

      /* count-ups */
      root.current?.querySelectorAll<HTMLElement>(".mb-num").forEach((el) => {
        const target = Number(el.dataset.target || "0");
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target, duration: 1.7, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
          onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString("en-US"); },
        });
      });

      /* the night loop: ticker steps one card up per HOLD; the rail's glow
         crosses moon → sunrise once per full cycle, then the night restarts */
      const cycle = events.length * HOLD;
      const loop = gsap.timeline({ repeat: -1, paused: true });
      events.forEach((_, k) => {
        loop.to(".mb-feed-inner", { y: -(k + 1) * STEP, duration: 0.55, ease: "back.out(1.1)" }, k * HOLD + (HOLD - 0.55));
      });
      loop.set(".mb-feed-inner", { y: 0 }); // duplicated list → seamless wrap
      loop.fromTo(".mb-rail-fill", { scaleX: 0 }, { scaleX: 1, duration: cycle, ease: "none" }, 0);
      loop.fromTo(".mb-orb", { left: "0%" }, { left: "100%", duration: cycle, ease: "none" }, 0);

      ScrollTrigger.create({
        trigger: root.current,
        start: "top 85%",
        end: "bottom top",
        onEnter: () => loop.play(),
        onEnterBack: () => loop.play(),
        onLeave: () => loop.pause(),
        onLeaveBack: () => loop.pause(),
      });
    }, root);
    return () => ctx.revert();
  }, [lang]);

  const Card = ({ e }: { e: (typeof events)[number] }) => (
    <div className="flex h-[74px] items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.05] px-4 backdrop-blur">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${e.tone}`}>
        <e.Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-[14.5px] font-semibold text-white">{e.title}</span>
          <span className="rounded-md border border-white/10 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-white/50">{e.time}</span>
        </div>
        <div className="truncate text-[12.5px] text-white/50">{e.sub}</div>
      </div>
      {e.amt && <span className="shrink-0 text-[14.5px] font-bold text-emerald-400">{e.amt}</span>}
    </div>
  );

  return (
    <section id="momentum" ref={root} className="relative overflow-hidden bg-[#0E0710] px-5 py-20 text-white sm:py-32">
      {/* ambience: aurora glows + star field + horizon line */}
      <div className="brand-gradient pointer-events-none absolute -top-48 left-1/2 h-[540px] w-[860px] -translate-x-1/2 rounded-full opacity-20 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-[420px] w-[420px] rounded-full opacity-[0.14] blur-[110px]" style={{ background: "#F59E0B" }} />
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(1.5px 1.5px at 12% 22%, rgba(255,255,255,0.5) 50%, transparent 51%)," +
            "radial-gradient(1px 1px at 34% 8%, rgba(255,255,255,0.35) 50%, transparent 51%)," +
            "radial-gradient(1.5px 1.5px at 58% 16%, rgba(255,255,255,0.4) 50%, transparent 51%)," +
            "radial-gradient(1px 1px at 78% 34%, rgba(255,255,255,0.3) 50%, transparent 51%)," +
            "radial-gradient(1.5px 1.5px at 90% 10%, rgba(255,255,255,0.45) 50%, transparent 51%)," +
            "radial-gradient(1px 1px at 22% 48%, rgba(255,255,255,0.25) 50%, transparent 51%)",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px]" style={{ background: "linear-gradient(90deg, transparent, #F59E0B 30%, #FF2E4D 55%, #A31234 80%, transparent)" }} />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        {/* ── the promise + the numbers ── */}
        <div>
          <div className="mb-reveal mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/70 backdrop-blur">
            <Moon className="h-3.5 w-3.5 text-amber-300" /> {t(lang, "Pa ndalim", "Never off")}
          </div>
          <h2 className="mb-reveal font-display-brand text-[clamp(2.4rem,5vw,4rem)] font-bold leading-[1.02] tracking-tight">
            {t(lang, "Ti fle. ", "You sleep. ")}
            <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-red-400 bg-clip-text text-transparent">{t(lang, "Vela shet.", "Vela sells.")}</span>
          </h2>
          <p className="mb-reveal mt-4 max-w-md text-lg text-white/60">
            {t(lang, "Porosi, pagesa, sinkronizim — gjithë natën, pa ty.", "Orders, payments, sync — all night, without you.")}
          </p>

          <div className="mb-stats mt-9 grid grid-cols-3 gap-3 sm:gap-5">
            {stats.map((s, i) => (
              <div key={i} className="mb-stat rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur sm:p-5">
                <div className="flex items-baseline font-display-brand text-[clamp(1.35rem,3.4vw,2.1rem)] font-bold leading-none tracking-tight">
                  <span className="mb-num bg-gradient-to-r from-amber-300 via-orange-400 to-red-400 bg-clip-text tabular-nums text-transparent" data-target={s.value} data-val={s.value.toLocaleString("en-US")}>0</span>
                  <span className="text-white/55">{s.suffix}</span>
                </div>
                <div className="mt-1.5 text-[11.5px] leading-snug text-white/55 sm:text-[13px]">{s.label}</div>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                  <TrendingUp className="h-3 w-3" /> {s.delta}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── the live night feed ── */}
        <div className="mb-panel relative rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 shadow-[0_50px_120px_-40px_rgba(0,0,0,0.8)] backdrop-blur sm:p-6">
          {/* header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-white/60">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              {t(lang, "Live · Nata në Vela", "Live · A night on Vela")}
            </div>
            <span className="font-mono text-[11px] text-white/40">23:00 → 08:00</span>
          </div>

          {/* moon → sunrise rail with the traveling glow */}
          <div className="mt-4 flex items-center gap-3">
            <Moon className="h-4 w-4 shrink-0 text-amber-200/80" />
            <div className="relative h-[3px] flex-1 rounded-full bg-white/10">
              <div className="mb-rail-fill absolute inset-0 origin-left rounded-full" style={{ transform: "scaleX(0)", background: "linear-gradient(90deg,#FACC15,#F59E0B 40%,#FF2E4D)" }} />
              <span className="mb-orb absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300 shadow-[0_0_16px_4px_rgba(250,204,21,0.55)]" style={{ left: "0%" }} />
            </div>
            <Sunrise className="h-4 w-4 shrink-0 text-amber-400" />
          </div>

          {/* ticker: shows 4 cards; the duplicated list makes the wrap seamless */}
          <div className="mb-feed mt-5 overflow-hidden" style={{ height: 4 * 86 - 12 }}>
            <div className="mb-feed-inner flex flex-col gap-3">
              {[...events, ...events].map((e, i) => (
                <Card key={i} e={e} />
              ))}
            </div>
          </div>

          <div className="mt-4 text-center text-[12px] text-white/40">
            {t(lang, "Çdo natë, pa asnjë veprim nga ti.", "Every night, with zero effort from you.")}
          </div>
        </div>
      </div>
    </section>
  );
}
