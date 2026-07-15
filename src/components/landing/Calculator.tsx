import { useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ShoppingBag, Coins } from "lucide-react";
import { SectionHead } from "./kit";

gsap.registerPlugin(ScrollTrigger);

type Lang = "sq" | "en";
const t = (l: Lang, sq: string, en: string) => (l === "sq" ? sq : en);

// Industry-average anchors (kept transparent in the footnote):
//  • ~2.6% = average online-store conversion rate
//  • ~2×   = visitors who use on-site search/filters convert about twice as often
//            (Forrester / on-site-search studies) → without search/filter/sort you
//            capture roughly half of the buyers you otherwise would.
const AVG_CONV = 0.026;
const SEARCH_UPLIFT = 2;
const WEEKS_PER_MONTH = 4.33;

/** S11 — "how much are you leaving on the table?" grounded in real conversion stats. */
export default function Calculator({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);
  const [visitors, setVisitors] = useState(300); // page/profile visitors per week
  const [price, setPrice] = useState(2500); // ALL

  const { currentPct, velaPct, lostMonth, moneyMonth, currentBarPct } = useMemo(() => {
    const currentRate = AVG_CONV / SEARCH_UPLIFT; // 1.3% — no search/filter/sort
    const lostPerWeek = visitors * (AVG_CONV - currentRate);
    const lostMonth = Math.round(lostPerWeek * WEEKS_PER_MONTH);
    return {
      currentPct: +(currentRate * 100).toFixed(1), // 1.3
      velaPct: +(AVG_CONV * 100).toFixed(1), // 2.6
      lostMonth,
      moneyMonth: lostMonth * price,
      currentBarPct: Math.round((currentRate / AVG_CONV) * 100), // 50 — current vs potential
    };
  }, [visitors, price]);

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduce) { gsap.set("[data-reveal], .calc-card", { opacity: 1, y: 0 }); return; }
      gsap.from("[data-reveal]", { y: 26, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: root.current, start: "top 74%" } });
      gsap.from(".calc-card", { y: 34, opacity: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: ".calc-card", start: "top 82%" } });
    }, root);
    return () => ctx.revert();
  }, []);

  const track = "h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-fuchsia-600";

  return (
    <section id="calculator" ref={root} className="px-5 py-14 sm:py-24 lg:py-32">
      <SectionHead
        eyebrow={t(lang, "Llogaritës", "Calculator")}
        title={t(lang, "Sa po lë në tavolinë?", "How much are you leaving on the table?")}
        sub={t(lang, "Pa kërkim e filtra, vizitorët ikin pa blerë. Ja sa kushton.", "Without search or filters, visitors leave without buying. Here's the cost.")}
      />

      <div className="calc-card mx-auto mt-8 grid max-w-4xl gap-6 rounded-[2rem] border border-border bg-card p-6 shadow-[0_40px_100px_-40px_rgba(30,10,50,0.28)] sm:mt-12 sm:gap-8 sm:p-10 lg:grid-cols-2 lg:items-center">
        {/* controls */}
        <div className="space-y-6 sm:space-y-8">
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <label className="text-[15px] font-medium text-foreground">{t(lang, "Vizitorë në javë", "Visitors per week")}</label>
              <span className="font-display-brand text-2xl font-bold text-foreground">{visitors.toLocaleString("en-US")}</span>
            </div>
            <input type="range" min={50} max={2000} step={10} value={visitors} onChange={(e) => setVisitors(+e.target.value)} className={track} aria-label={t(lang, "Vizitorë në javë", "Visitors per week")} />
            <p className="mt-2 text-[12px] text-muted-foreground">{t(lang, "Sa njerëz hapin profilin ose linkun tënd.", "How many open your profile or shop link.")}</p>
          </div>
          <div>
            <div className="mb-3 flex items-baseline justify-between">
              <label className="text-[15px] font-medium text-foreground">{t(lang, "Çmim mesatar", "Average price")}</label>
              <span className="font-display-brand text-2xl font-bold text-foreground">{price.toLocaleString("en-US")} L</span>
            </div>
            <input type="range" min={500} max={10000} step={100} value={price} onChange={(e) => setPrice(+e.target.value)} className={track} aria-label={t(lang, "Çmim mesatar", "Average price")} />
          </div>
        </div>

        {/* outputs */}
        <div className="rounded-3xl bg-gradient-to-br from-fuchsia-500/[0.07] to-transparent p-5 ring-1 ring-fuchsia-400/20 sm:p-7">
          {/* conversion now vs with Vela */}
          <div className="text-[13px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t(lang, "Vizitorë që blejnë", "Visitors who buy")}</div>
          <div className="mt-3 space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-[13px]">
                <span className="text-muted-foreground">{t(lang, "Sot (pa kërkim/filtra)", "Today (no search/filters)")}</span>
                <span className="font-display-brand text-[17px] font-bold tabular-nums text-foreground">{currentPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-muted-foreground/40 transition-[width] duration-300 ease-out" style={{ width: `${currentBarPct}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-[13px]">
                <span className="font-medium text-foreground">{t(lang, "Me Vela", "With Vela")}</span>
                <span className="font-display-brand text-[17px] font-bold tabular-nums text-foreground">{velaPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-full rounded-full brand-gradient" />
              </div>
            </div>
          </div>

          {/* what it costs */}
          <div className="mt-6 border-t border-border pt-5">
            <div className="text-[13px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t(lang, "Humbet çdo muaj", "Lost every month")}</div>
            <div className="mt-4 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-fuchsia-500/10 text-fuchsia-600"><ShoppingBag className="h-5 w-5" /></span>
              <div>
                <div className="font-display-brand text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold leading-none tabular-nums text-foreground">{lostMonth}</div>
                <div className="text-[14px] text-muted-foreground">{t(lang, "porosi të humbura", "orders lost")}</div>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600"><Coins className="h-5 w-5" /></span>
              <div>
                <div className="font-display-brand text-[clamp(1.8rem,3.5vw,2.6rem)] font-bold leading-none tabular-nums text-foreground">{moneyMonth.toLocaleString("en-US")} L</div>
                <div className="text-[14px] text-muted-foreground">{t(lang, "të ardhura të humbura", "revenue lost")}</div>
              </div>
            </div>
          </div>

          <p className="mt-5 text-[12px] leading-relaxed text-muted-foreground">
            {t(lang, "Mesatare industrie: ~2.6% konvertim online; kërkimi e filtrat konvertojnë ~2× më shumë (Forrester).", "Industry averages: ~2.6% online conversion; search and filters convert ~2× more (Forrester).")}
          </p>
        </div>
      </div>
    </section>
  );
}
