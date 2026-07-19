import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Bell, CreditCard, Sparkles, PackageCheck, TrendingUp, Moon, Sunrise } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

type Lang = "sq" | "en";
const t = (l: Lang, sq: string, en: string) => (l === "sq" ? sq : en);
const BRAND = "brand-gradient";

/**
 * The dark "momentum band" v2 — the emotional peak of the page: while the
 * seller sleeps, Vela keeps selling. A night timeline (moon → sunrise) with a
 * live-pulsing latest event, hour chips on the rail, and one consolidated
 * stats card with gradient numbers. Fully GSAP-animated; star-field ambience.
 */
export default function MomentumBand({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);

  const events = [
    { time: "23:14", Icon: Bell, tone: "text-red-400 bg-red-500/10", title: t(lang, "Porosi e re", "New order"), sub: t(lang, "Ana K. · Fustan liri", "Ana K. · Linen dress"), amt: "+3.500 L" },
    { time: "01:02", Icon: CreditCard, tone: "text-emerald-400 bg-emerald-500/10", title: t(lang, "Pagesë me kartë", "Card payment"), sub: "RaiAccept · Sara D.", amt: "+2.800 L" },
    { time: "03:47", Icon: Sparkles, tone: "text-amber-400 bg-amber-500/10", title: t(lang, "Sistemi sinkronizoi një postim", "The system synced a new post"), sub: t(lang, "Vathë ari → produkt", "Gold earrings → product"), amt: "" },
    { time: "06:20", Icon: PackageCheck, tone: "text-amber-400 bg-amber-500/10", title: t(lang, "Stoku u rezervua vetë", "Stock auto-reserved"), sub: t(lang, "Pa mbishitje", "Nothing oversold"), amt: "" },
    { time: "08:05", Icon: Bell, tone: "text-red-400 bg-red-500/10", title: t(lang, "Porosi e re", "New order"), sub: t(lang, "Bledi M. · Sandale", "Bledi M. · Sandals"), amt: "+4.200 L" },
  ];

  const stats = [
    { value: 47800, suffix: " L", label: t(lang, "Të ardhura natën", "Overnight revenue"), delta: "+38%" },
    { value: 14, suffix: "", label: t(lang, "Porosi ndërsa flije", "Orders while you slept"), delta: "+5" },
    { value: 9, suffix: "", label: t(lang, "Klientë të rinj", "New customers"), delta: "+9" },
  ];

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduce) {
        gsap.set(".mb-reveal, .mb-event, .mb-stat", { opacity: 1, y: 0, scale: 1 });
        root.current?.querySelectorAll<HTMLElement>(".mb-num").forEach((el) => (el.textContent = el.dataset.val || ""));
        return;
      }
      gsap.from(".mb-reveal", {
        y: 30, opacity: 0, duration: 0.9, stagger: 0.12, ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 70%" },
      });
      gsap.from(".mb-line", {
        scaleY: 0, transformOrigin: "top", duration: 1.2, ease: "power2.inOut",
        scrollTrigger: { trigger: ".mb-timeline", start: "top 75%" },
      });
      gsap.from(".mb-event", {
        x: -30, opacity: 0, scale: 0.97, duration: 0.65, stagger: 0.15, ease: "back.out(1.4)",
        scrollTrigger: { trigger: ".mb-timeline", start: "top 72%" },
      });
      root.current?.querySelectorAll<HTMLElement>(".mb-num").forEach((el) => {
        const target = Number(el.dataset.target || "0");
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target, duration: 1.8, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 85%" },
          onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString("en-US"); },
        });
      });
      gsap.from(".mb-stat", {
        y: 24, opacity: 0, duration: 0.8, stagger: 0.14, ease: "power3.out",
        scrollTrigger: { trigger: ".mb-stats", start: "top 82%" },
      });
    }, root);
    return () => ctx.revert();
  }, [lang]);

  return (
    <section id="momentum" ref={root} className="relative overflow-hidden bg-[#0F080B] px-5 py-14 text-white sm:py-36">
      {/* ambient: lava glow + faint star field + sunrise edge at the bottom */}
      <div className={`pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[820px] -translate-x-1/2 rounded-full opacity-25 blur-[130px] ${BRAND}`} />
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(1.5px 1.5px at 12% 22%, rgba(255,255,255,0.5) 50%, transparent 51%)," +
            "radial-gradient(1px 1px at 34% 8%, rgba(255,255,255,0.35) 50%, transparent 51%)," +
            "radial-gradient(1.5px 1.5px at 58% 16%, rgba(255,255,255,0.4) 50%, transparent 51%)," +
            "radial-gradient(1px 1px at 78% 30%, rgba(255,255,255,0.3) 50%, transparent 51%)," +
            "radial-gradient(1.5px 1.5px at 90% 12%, rgba(255,255,255,0.45) 50%, transparent 51%)," +
            "radial-gradient(1px 1px at 22% 44%, rgba(255,255,255,0.25) 50%, transparent 51%)",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px]" style={{ background: "linear-gradient(90deg, transparent, #F59E0B 30%, #FF2E4D 55%, #A31234 80%, transparent)" }} />

      <div className="relative mx-auto max-w-6xl">
        <div className="mb-reveal mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/70 backdrop-blur">
          <Moon className="h-3.5 w-3.5 text-amber-300" /> {t(lang, "Pa ndalim", "Never off")}
        </div>
        <h2 className="mb-reveal max-w-3xl font-display-brand text-[clamp(2.4rem,5vw,4.2rem)] font-bold leading-[1.02] tracking-tight">
          {t(lang, "Ti fle. ", "You sleep. ")}
          <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-red-400 bg-clip-text text-transparent">{t(lang, "Vela shet.", "Vela sells.")}</span>
        </h2>
        <p className="mb-reveal mt-5 max-w-xl text-lg text-white/60">
          {t(lang, "Porosi, pagesa dhe sinkronizim produktesh — gjithë natën, pa ty.", "Orders, payments and product sync — all night, without you.")}
        </p>

        <div className="mt-10 grid gap-8 sm:mt-14 sm:gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          {/* night timeline: moon at the top of the rail, sunrise at its end */}
          <div className="mb-timeline relative pl-12">
            <span className="absolute left-[13px] top-0 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full border border-white/15 bg-[#0F080B] text-amber-300"><Moon className="h-3.5 w-3.5" /></span>
            <span className="mb-line absolute left-[13px] top-8 h-[calc(100%-4.5rem)] w-[2px] bg-gradient-to-b from-amber-300/60 via-red-500/50 to-amber-500/70" />
            <span className="absolute bottom-0 left-[13px] grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full border border-white/15 bg-[#0F080B] text-amber-400"><Sunrise className="h-3.5 w-3.5" /></span>

            <div className="space-y-4 pb-10 pt-1">
              {events.map((e, i) => {
                const latest = i === events.length - 1;
                return (
                  <div key={i} className="mb-event group relative flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur transition-colors duration-300 hover:border-white/25 hover:bg-white/[0.07]">
                    <span className="absolute -left-[38px] top-1/2 -translate-y-1/2 rounded-md border border-white/10 bg-[#1A0F13] px-1.5 py-0.5 font-mono text-[10px] text-white/50">{e.time}</span>
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${e.tone}`}>
                      <e.Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[15px] font-semibold text-white">
                        {e.title}
                        {latest && (
                          <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[13px] text-white/50">{e.sub}</div>
                    </div>
                    {e.amt && <span className="shrink-0 text-[15px] font-bold text-emerald-400">{e.amt}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* consolidated stats card */}
          <div className="mb-stats rounded-[2rem] border border-white/10 bg-white/[0.04] p-2 backdrop-blur">
            {stats.map((s, i) => (
              <div key={i} className={`mb-stat rounded-3xl p-6 sm:p-7 ${i > 0 ? "border-t border-white/[0.07]" : ""}`}>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="flex items-baseline gap-1 font-display-brand text-[clamp(2.2rem,4vw,3.2rem)] font-bold leading-none tracking-tight">
                      <span className="mb-num bg-gradient-to-r from-amber-300 via-orange-400 to-red-400 bg-clip-text tabular-nums text-transparent" data-target={s.value} data-val={s.value.toLocaleString("en-US")}>0</span>
                      <span className="text-white/60">{s.suffix}</span>
                    </div>
                    <div className="mt-2 text-[14px] text-white/55">{s.label}</div>
                  </div>
                  <span className="mb-1 inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[12px] font-semibold text-emerald-400">
                    <TrendingUp className="h-3.5 w-3.5" /> {s.delta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
