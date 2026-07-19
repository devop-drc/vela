import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Instagram, ShoppingBag, Store, TrendingUp } from "lucide-react";
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

/** Animate a number toward its target so the payoff figure counts up instead of jumping. */
const useCountUp = (target: number) => {
  const [shown, setShown] = useState(target);
  const shownRef = useRef(target);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shownRef.current = target;
      setShown(target);
      return;
    }
    const from = shownRef.current;
    if (from === target) return;
    const t0 = performance.now();
    const dur = 650; // slower + springier so the payoff visibly rolls
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - (1 - p) ** 4; // quart-out — fast start, silky landing
      const value = Math.round(from + (target - from) * eased);
      shownRef.current = value;
      setShown(value);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return shown;
};

/** Re-triggers a pop animation whenever the displayed value settles on a new target. */
const Pop = ({ children, trigger, className }: { children: React.ReactNode; trigger: unknown; className?: string }) => (
  <span key={String(trigger)} className={`calc-pop inline-block ${className ?? ""}`}>{children}</span>
);

/** S11 — "how much could an e-shop have made you?" grounded in real conversion stats. */
export default function Calculator({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);
  const [visitors, setVisitors] = useState(300); // page/profile visitors per week
  const [price, setPrice] = useState(2500); // ALL

  const { igPct, shopPct, gainOrders, gainMoney, igBarPct } = useMemo(() => {
    const igRate = AVG_CONV / SEARCH_UPLIFT; // 1.3% — no search/filter/sort
    const gainPerWeek = visitors * (AVG_CONV - igRate);
    const gainOrders = Math.round(gainPerWeek * WEEKS_PER_MONTH);
    return {
      igPct: +(igRate * 100).toFixed(1), // 1.3
      shopPct: +(AVG_CONV * 100).toFixed(1), // 2.6
      gainOrders,
      gainMoney: gainOrders * price,
      igBarPct: Math.round((igRate / AVG_CONV) * 100), // 50 — Instagram-only vs e-shop
    };
  }, [visitors, price]);

  const shownMoney = useCountUp(gainMoney);
  const shownOrders = useCountUp(gainOrders);

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduce) { gsap.set("[data-reveal], .calc-card", { opacity: 1, y: 0 }); return; }
      gsap.from("[data-reveal]", { y: 26, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: root.current, start: "top 74%" } });
      gsap.from(".calc-card", { y: 34, opacity: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: ".calc-card", start: "top 82%" } });
    }, root);
    return () => ctx.revert();
  }, []);

  // Range input with a brand-gradient fill up to the current value; thumb styled
  // via arbitrary variants so no extra CSS file is needed.
  const track =
    "h-2.5 w-full cursor-pointer appearance-none rounded-full bg-muted " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 " +
    "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none " +
    "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white " +
    "[&::-webkit-slider-thumb]:bg-red-600 [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(220,38,38,0.45)] " +
    "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110 " +
    "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full " +
    "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-red-600";
  const fill = (value: number, min: number, max: number) => {
    const pct = ((value - min) / (max - min)) * 100;
    // Vela ramp: wine → neon red → gold up to the thumb, muted after it.
    return {
      background: `linear-gradient(to right, #A31234 0%, #FF2E4D ${pct * 0.6}%, #F59E0B ${pct}%, hsl(var(--muted)) ${pct}%)`,
    };
  };

  return (
    <section id="calculator" ref={root} className="px-5 py-14 sm:py-24 lg:py-32">
      <SectionHead
        eyebrow={t(lang, "Llogaritës", "Calculator")}
        title={t(lang, "Sa para mund të kishe fituar me një e-shop?", "How much money could you have made with an e-shop?")}
        sub={t(lang, "Të njëjtët vizitorë, të njëjtat produkte — vetëm me kërkim, filtra dhe arkë. Ja diferenca.", "Same visitors, same products — just with search, filters and checkout. Here's the difference.")}
      />

      <div className="calc-card mx-auto mt-8 grid max-w-4xl gap-6 rounded-[2rem] border border-border bg-card p-6 shadow-[0_40px_100px_-40px_rgba(30,10,50,0.28)] sm:mt-12 sm:gap-8 sm:p-10 lg:grid-cols-2 lg:items-center">
        {/* controls */}
        <div className="space-y-7 sm:space-y-9">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-[15px] font-medium text-foreground">{t(lang, "Vizitorë në javë", "Visitors per week")}</label>
              <span className="rounded-full bg-muted px-3 py-1 font-display-brand text-lg font-bold tabular-nums text-foreground">{visitors.toLocaleString("en-US")}</span>
            </div>
            <input type="range" min={50} max={2000} step={10} value={visitors} onChange={(e) => setVisitors(+e.target.value)} className={track} style={fill(visitors, 50, 2000)} aria-label={t(lang, "Vizitorë në javë", "Visitors per week")} />
            <p className="mt-2.5 text-[12px] text-muted-foreground">{t(lang, "Sa njerëz hapin profilin ose linkun tënd.", "How many open your profile or shop link.")}</p>
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between">
              <label className="text-[15px] font-medium text-foreground">{t(lang, "Çmim mesatar", "Average price")}</label>
              <span className="rounded-full bg-muted px-3 py-1 font-display-brand text-lg font-bold tabular-nums text-foreground">{price.toLocaleString("en-US")} L</span>
            </div>
            <input type="range" min={500} max={10000} step={100} value={price} onChange={(e) => setPrice(+e.target.value)} className={track} style={fill(price, 500, 10000)} aria-label={t(lang, "Çmim mesatar", "Average price")} />
            <p className="mt-2.5 text-[12px] text-muted-foreground">{t(lang, "Çmimi tipik i një produkti në dyqanin tënd.", "The typical price of a product in your shop.")}</p>
          </div>
        </div>

        {/* outputs — the upside is GOOD news, so it reads green */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-500/[0.08] to-transparent p-5 ring-1 ring-emerald-500/25 sm:p-7">
          {/* Instagram-only vs e-shop conversion, head to head */}
          <div className="text-[13px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t(lang, "Vizitorë që blejnë", "Visitors who buy")}</div>
          <div className="mt-3 space-y-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-1.5 text-muted-foreground"><Instagram className="h-3.5 w-3.5" /> {t(lang, "Vetëm me Instagram", "With just Instagram")}</span>
                <span className="font-display-brand text-[17px] font-bold tabular-nums text-foreground">{igPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-muted-foreground/40 transition-[width] duration-300 ease-out" style={{ width: `${igBarPct}%` }} />
              </div>
            </div>

            <div className="flex justify-end">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600">
                <TrendingUp className="h-3 w-3" /> {t(lang, "2× më shumë blerës", "2× more buyers")}
              </span>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-1.5 font-medium text-foreground"><Store className="h-3.5 w-3.5" /> {t(lang, "Me e-shop/website", "With e-shop/website")}</span>
                <span className="font-display-brand text-[17px] font-bold tabular-nums text-foreground">{shopPct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-full rounded-full brand-gradient" />
              </div>
            </div>
          </div>

          {/* the payoff */}
          <div className="mt-6 border-t border-border pt-5">
            <div className="text-[13px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t(lang, "Shtesë çdo muaj", "Extra every month")}</div>
            <div className="mt-4 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600"><ShoppingBag className="h-5 w-5" /></span>
              <div>
                <Pop trigger={gainOrders} className="font-display-brand text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-none tabular-nums text-emerald-600">
                  +{shownOrders}
                </Pop>
                <div className="text-[14px] text-muted-foreground">{t(lang, "porosi më shumë", "more orders")}</div>
              </div>
            </div>
            <div className="mt-5">
              <Pop
                trigger={gainMoney}
                className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-400 bg-clip-text font-display-brand text-[clamp(2.2rem,4.5vw,3.1rem)] font-bold leading-none tabular-nums text-transparent drop-shadow-[0_10px_30px_rgba(16,185,129,0.25)]"
              >
                +{shownMoney.toLocaleString("en-US")} L
              </Pop>
              <div className="mt-1 text-[14px] text-muted-foreground">{t(lang, "të ardhura më shumë, çdo muaj", "more revenue, every month")}</div>
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
