import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Bell, CreditCard, Sparkles, PackageCheck, TrendingUp } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

type Lang = "sq" | "en";
const t = (l: Lang, sq: string, en: string) => (l === "sq" ? sq : en);
const BRAND = "brand-gradient";

/**
 * The dark "momentum band" — the emotional peak of the page (ploy.ai‑inspired):
 * while the seller sleeps, Vela keeps selling. A night‑time activity timeline
 * reveals on scroll and the headline stats count up. Fully GSAP‑animated.
 */
export default function MomentumBand({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);

  const events = [
    { time: "23:14", Icon: Bell, tone: "text-fuchsia-400", title: t(lang, "Porosi e re", "New order"), sub: t(lang, "Ana K. · Fustan liri", "Ana K. · Linen dress"), amt: "+3.500 L" },
    { time: "01:02", Icon: CreditCard, tone: "text-emerald-400", title: t(lang, "Pagesë me kartë", "Card payment"), sub: "RaiAccept · Sara D.", amt: "+2.800 L" },
    { time: "03:47", Icon: Sparkles, tone: "text-violet-400", title: t(lang, "AI sinkronizoi një postim", "AI synced a new post"), sub: t(lang, "Vathë ari → produkt", "Gold earrings → product"), amt: "" },
    { time: "06:20", Icon: PackageCheck, tone: "text-amber-400", title: t(lang, "Stoku u rezervua vetë", "Stock auto‑reserved"), sub: t(lang, "Pa mbishitje", "Nothing oversold"), amt: "" },
    { time: "08:05", Icon: Bell, tone: "text-fuchsia-400", title: t(lang, "Porosi e re", "New order"), sub: t(lang, "Bledi M. · Sandale", "Bledi M. · Sandals"), amt: "+4.200 L" },
  ];

  const stats = [
    { value: 47800, prefix: "", suffix: " L", label: t(lang, "Të ardhura natën", "Overnight revenue") },
    { value: 14, prefix: "", suffix: "", label: t(lang, "Porosi ndërsa flije", "Orders while you slept") },
    { value: 9, prefix: "", suffix: "", label: t(lang, "Klientë të rinj", "New customers") },
  ];

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduce) {
        gsap.set(".mb-reveal, .mb-event, .mb-stat", { opacity: 1, y: 0 });
        root.current?.querySelectorAll<HTMLElement>(".mb-num").forEach((el) => (el.textContent = el.dataset.val || ""));
        return;
      }
      // headline + intro
      gsap.from(".mb-reveal", {
        y: 30, opacity: 0, duration: 0.9, stagger: 0.12, ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 70%" },
      });
      // timeline line draws + events slide in
      gsap.from(".mb-line", {
        scaleY: 0, transformOrigin: "top", duration: 1.1, ease: "power2.out",
        scrollTrigger: { trigger: ".mb-timeline", start: "top 75%" },
      });
      gsap.from(".mb-event", {
        x: -26, opacity: 0, duration: 0.7, stagger: 0.16, ease: "power3.out",
        scrollTrigger: { trigger: ".mb-timeline", start: "top 72%" },
      });
      // stats count up
      root.current?.querySelectorAll<HTMLElement>(".mb-num").forEach((el) => {
        const target = Number(el.dataset.target || "0");
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target, duration: 1.6, ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
          onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString("en-US"); },
        });
      });
      gsap.from(".mb-stat", {
        y: 24, opacity: 0, duration: 0.8, stagger: 0.12, ease: "power3.out",
        scrollTrigger: { trigger: ".mb-stats", start: "top 82%" },
      });
    }, root);
    return () => ctx.revert();
  }, [lang]);

  return (
    <section id="momentum" ref={root} className="relative overflow-hidden bg-[#0b0a0e] px-5 py-14 text-white sm:py-36">
      {/* ambient gradient glow */}
      <div className={`pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[820px] -translate-x-1/2 rounded-full opacity-25 blur-[130px] ${BRAND}`} />
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-reveal mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/70 backdrop-blur">
          <span className={`h-2 w-2 rounded-full ${BRAND}`} /> {t(lang, "Pa ndalim", "Never off")}
        </div>
        <h2 className="mb-reveal max-w-3xl font-display-brand text-[clamp(2.4rem,5vw,4.2rem)] font-bold leading-[1.02] tracking-tight">
          {t(lang, "Ti fle. ", "You sleep. ")}
          <span className="bg-gradient-to-r from-fuchsia-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">{t(lang, "Vela shet.", "Vela sells.")}</span>
        </h2>
        <p className="mb-reveal mt-5 max-w-xl text-lg text-white/60">
          {t(lang, "Porosi, pagesa dhe sinkronizim produktesh — gjithë natën, pa ty.", "Orders, payments and product sync — all night, without you.")}
        </p>

        <div className="mt-10 grid gap-8 sm:mt-14 sm:gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          {/* activity timeline */}
          <div className="mb-timeline relative pl-8">
            <span className="mb-line absolute left-[9px] top-2 h-[calc(100%-1rem)] w-[2px] bg-gradient-to-b from-fuchsia-500/70 via-white/20 to-transparent" />
            <div className="space-y-4">
              {events.map((e, i) => (
                <div key={i} className="mb-event relative flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                  <span className="absolute -left-[27px] grid h-[18px] w-[18px] place-items-center rounded-full border-2 border-[#0b0a0e] bg-white/80" />
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/[0.06] ${e.tone}`}><e.Icon className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-[13px] text-white/40"><span className="font-mono">{e.time}</span></div>
                    <div className="text-[15px] font-semibold text-white">{e.title}</div>
                    <div className="truncate text-[13px] text-white/50">{e.sub}</div>
                  </div>
                  {e.amt && <span className="shrink-0 text-[15px] font-bold text-emerald-400">{e.amt}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* count‑up stats */}
          <div className="mb-stats grid gap-4">
            {stats.map((s, i) => (
              <div key={i} className="mb-stat rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur sm:p-7">
                <div className="flex items-baseline gap-1 font-display-brand text-[clamp(2.2rem,4vw,3.4rem)] font-bold leading-none tracking-tight">
                  <span className="mb-num tabular-nums" data-target={s.value} data-val={s.value.toLocaleString("en-US")}>0</span>
                  <span className="text-white/70">{s.suffix}</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[14px] text-white/55"><TrendingUp className="h-4 w-4 text-emerald-400" /> {s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
