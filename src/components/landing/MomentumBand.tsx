import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Bell, CreditCard, Sparkles, PackageCheck, Moon } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

type Lang = "sq" | "en";
const t = (l: Lang, sq: string, en: string) => (l === "sq" ? sq : en);

/**
 * "Pa ndalim" v4 — minimal. Centered headline, ONE notification card that
 * quietly swaps through the night's events, and three bare stats with
 * count-ups. No panels-in-panels, no rails — a calm dark interlude.
 * The swap loop pauses offscreen; reduced motion gets a still.
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
    { value: 47800, suffix: " L", label: t(lang, "të ardhura natën", "overnight revenue") },
    { value: 14, suffix: "", label: t(lang, "porosi ndërsa flije", "orders while you slept") },
    { value: 9, suffix: "", label: t(lang, "klientë të rinj", "new customers") },
  ];

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduce) {
        gsap.set(".mb-reveal", { opacity: 1, y: 0 });
        gsap.set(".mb-card", { autoAlpha: 0 });
        gsap.set(".mb-card-0", { autoAlpha: 1 });
        root.current?.querySelectorAll<HTMLElement>(".mb-num").forEach((el) => (el.textContent = el.dataset.val || ""));
        return;
      }

      gsap.from(".mb-reveal", {
        y: 26, opacity: 0, duration: 0.85, stagger: 0.12, ease: "power3.out",
        scrollTrigger: { trigger: root.current, start: "top 72%" },
      });

      root.current?.querySelectorAll<HTMLElement>(".mb-num").forEach((el) => {
        const target = Number(el.dataset.target || "0");
        const obj = { v: 0 };
        gsap.to(obj, {
          v: target, duration: 1.7, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
          onUpdate: () => { el.textContent = Math.round(obj.v).toLocaleString("en-US"); },
        });
      });

      /* one card, swapping quietly through the night — cards settle with a
         soft spring and hand off with a slight scale so the swap breathes */
      const HOLD = 2.6;
      gsap.set(".mb-card", { autoAlpha: 0, y: 18, scale: 0.985 });
      const loop = gsap.timeline({ repeat: -1, paused: true });
      events.forEach((_, k) => {
        const at = k * HOLD;
        loop
          .to(`.mb-card-${k}`, { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(1.4)" }, at)
          .to(`.mb-card-${k} .mb-dot`, { scale: 1.5, opacity: 0, duration: 0.9, ease: "power2.out" }, at + 0.15)
          .set(`.mb-card-${k} .mb-dot`, { scale: 1, opacity: 0.7 }, at + HOLD - 0.42)
          .to(`.mb-card-${k}`, { autoAlpha: 0, y: -14, scale: 0.985, duration: 0.4, ease: "power2.in" }, at + HOLD - 0.4);
      });
      /* the big glow breathes with the night */
      gsap.to(".mb-glow", { opacity: 0.24, scale: 1.06, duration: 5.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.to(".mb-glow2", { opacity: 0.16, duration: 7, ease: "sine.inOut", yoyo: true, repeat: -1 });
      ScrollTrigger.create({
        trigger: root.current,
        start: "top 80%",
        end: "bottom top",
        onEnter: () => loop.play(),
        onEnterBack: () => loop.play(),
        onLeave: () => loop.pause(),
        onLeaveBack: () => loop.pause(),
      });
    }, root);
    return () => ctx.revert();
  }, [lang]);

  return (
    <section id="momentum" ref={root} className="relative overflow-hidden bg-[#0E0710] px-5 py-24 text-white sm:py-36">
      {/* quiet ambience: two breathing glows (no horizon line) */}
      <div className="mb-glow brand-gradient pointer-events-none absolute -top-56 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full opacity-[0.16] blur-[140px]" />
      <div className="mb-glow2 pointer-events-none absolute -bottom-48 -left-32 h-[420px] w-[520px] rounded-full opacity-[0.1] blur-[120px]" style={{ background: "#F59E0B" }} />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="mb-reveal mb-5 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-white/60">
          <Moon className="h-3.5 w-3.5 text-amber-300" /> {t(lang, "Pa ndalim", "Never off")}
        </div>
        <h2 className="mb-reveal font-display-brand text-[clamp(2.4rem,5vw,4rem)] font-bold leading-[1.02] tracking-tight">
          {t(lang, "Ti fle. ", "You sleep. ")}
          <span className="bg-gradient-to-r from-amber-300 via-orange-400 to-red-400 bg-clip-text text-transparent">{t(lang, "Vela shet.", "Vela sells.")}</span>
        </h2>
        <p className="mb-reveal mt-4 max-w-md text-lg text-white/55">
          {t(lang, "Porosi, pagesa, sinkronizim — gjithë natën, pa ty.", "Orders, payments, sync — all night, without you.")}
        </p>

        {/* the single swapping notification */}
        <div className="mb-reveal relative mt-12 h-[76px] w-full max-w-md">
          {events.map((e, k) => (
            <div
              key={k}
              className={`mb-card mb-card-${k} absolute inset-0 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.05] px-5 backdrop-blur`}
            >
              <span className={`relative grid h-11 w-11 shrink-0 place-items-center rounded-xl ${e.tone}`}>
                {/* ping ring released as each notification lands */}
                <span className="mb-dot absolute inset-0 rounded-xl border border-current opacity-70" />
                <e.Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1 text-left">
                <div className="truncate text-[15px] font-semibold text-white">{e.title}</div>
                <div className="truncate text-[13px] text-white/50">{e.sub}</div>
              </div>
              {e.amt ? (
                <span className="shrink-0 text-[15px] font-bold text-emerald-400">{e.amt}</span>
              ) : (
                <span className="shrink-0 font-mono text-[11px] text-white/40">{e.time}</span>
              )}
            </div>
          ))}
        </div>

        {/* bare stats — numbers, labels, thin dividers */}
        <div className="mb-reveal mt-14 flex w-full max-w-2xl items-start justify-center">
          {stats.map((s, i) => (
            <div key={i} className={`flex-1 px-3 sm:px-6 ${i > 0 ? "border-l border-white/10" : ""}`}>
              <div className="flex items-baseline justify-center font-display-brand text-[clamp(1.6rem,4vw,2.6rem)] font-bold leading-none tracking-tight">
                <span className="mb-num bg-gradient-to-r from-amber-300 via-orange-400 to-red-400 bg-clip-text tabular-nums text-transparent" data-target={s.value} data-val={s.value.toLocaleString("en-US")}>0</span>
                <span className="text-white/50">{s.suffix}</span>
              </div>
              <div className="mt-2 text-[12px] leading-snug text-white/45 sm:text-[13.5px]">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
