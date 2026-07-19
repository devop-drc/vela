import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Instagram, ShoppingBag, Store } from "lucide-react";
import { SectionHead } from "./kit";

gsap.registerPlugin(ScrollTrigger);

type Lang = "sq" | "en";
const t = (l: Lang, sq: string, en: string) => (l === "sq" ? sq : en);

// Industry-average anchors (kept transparent in the footnote):
//  • ~2.6% = average online-store conversion rate
//  • ~2×   = visitors who use on-site search/filters convert about twice as
//    often (Forrester) → Instagram-only captures roughly half of the buyers.
const AVG_CONV = 0.026;
const SEARCH_UPLIFT = 2;
const WEEKS_PER_MONTH = 4.33;

/** Animate a number toward its target so the payoff counts up instead of jumping. */
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
    const dur = 650;
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - (1 - p) ** 4; // quart-out
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

/** Re-triggers a pop animation whenever the value settles on a new target. */
const Pop = ({ children, trigger, className }: { children: React.ReactNode; trigger: unknown; className?: string }) => (
  <span key={String(trigger)} className={`calc-pop inline-block ${className ?? ""}`}>{children}</span>
);

/**
 * "Llogaritës" v2 — one calm vertical flow: two sliders, a single combined
 * conversion bar (Instagram-only vs e-shop), and the payoff as the star.
 */
export default function Calculator({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);
  const [visitors, setVisitors] = useState(300);
  const [price, setPrice] = useState(2500);

  const { igPct, shopPct, gainOrders, gainMoney } = useMemo(() => {
    const igRate = AVG_CONV / SEARCH_UPLIFT; // 1.3%
    const gainOrders = Math.round(visitors * (AVG_CONV - igRate) * WEEKS_PER_MONTH);
    return {
      igPct: +(igRate * 100).toFixed(1),
      shopPct: +(AVG_CONV * 100).toFixed(1),
      gainOrders,
      gainMoney: gainOrders * price,
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
    return {
      background: `linear-gradient(to right, #A31234 0%, #FF2E4D ${pct * 0.6}%, #F59E0B ${pct}%, hsl(var(--muted)) ${pct}%)`,
    };
  };

  return (
    <section id="calculator" ref={root} className="px-5 py-14 sm:py-24 lg:py-32">
      <SectionHead
        eyebrow={t(lang, "Llogaritës", "Calculator")}
        title={t(lang, "Sa para po lë në tavolinë?", "How much money are you leaving on the table?")}
        sub={t(lang, "Të njëjtët vizitorë, me kërkim, filtra dhe arkë.", "Same visitors — with search, filters and checkout.")}
      />

      <div className="calc-card mx-auto mt-8 max-w-2xl rounded-[2rem] border border-border bg-card p-5 shadow-[0_40px_100px_-40px_rgba(30,10,50,0.28)] sm:mt-12 sm:p-10">
        {/* sliders */}
        <div className="grid gap-7 sm:grid-cols-2 sm:gap-8">
          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <label className="text-[13.5px] font-medium text-foreground sm:text-[14px]">{t(lang, "Vizitorë në javë", "Visitors per week")}</label>
              <span className="rounded-full bg-muted px-3 py-0.5 font-display-brand text-[16px] font-bold tabular-nums text-foreground sm:text-lg">{visitors.toLocaleString("en-US")}</span>
            </div>
            <input type="range" min={50} max={2000} step={10} value={visitors} onChange={(e) => setVisitors(+e.target.value)} className={track} style={fill(visitors, 50, 2000)} aria-label={t(lang, "Vizitorë në javë", "Visitors per week")} />
          </div>
          <div>
            <div className="mb-3 flex items-center justify-between gap-2">
              <label className="text-[13.5px] font-medium text-foreground sm:text-[14px]">{t(lang, "Çmim mesatar", "Average price")}</label>
              <span className="rounded-full bg-muted px-3 py-0.5 font-display-brand text-[16px] font-bold tabular-nums text-foreground sm:text-lg">{price.toLocaleString("en-US")} L</span>
            </div>
            <input type="range" min={500} max={10000} step={100} value={price} onChange={(e) => setPrice(+e.target.value)} className={track} style={fill(price, 500, 10000)} aria-label={t(lang, "Çmim mesatar", "Average price")} />
          </div>
        </div>

        {/* one combined conversion bar: gray = Instagram-only, brand = e-shop */}
        <div className="mt-8 sm:mt-10">
          <div className="grid grid-cols-2 gap-2 text-[12px] text-muted-foreground sm:text-[13.5px]">
            <span className="flex items-center gap-1.5"><Instagram className="h-3.5 w-3.5 shrink-0" /> Instagram <b className="text-foreground">{igPct}%</b></span>
            <span className="flex items-center justify-end gap-1.5 text-right"><Store className="h-3.5 w-3.5 shrink-0" /> E-shop <b className="text-foreground">{shopPct}%</b></span>
          </div>
          <div className="relative mt-2.5 h-3 overflow-hidden rounded-full bg-muted">
            <div className="brand-gradient absolute inset-y-0 left-0 w-full rounded-full" />
            <div className="absolute inset-y-0 left-0 w-1/2 rounded-l-full bg-muted-foreground/25 backdrop-saturate-0" />
            <span className="absolute inset-y-0 left-1/2 w-px bg-background/80" />
          </div>
          <div className="mt-2 text-center text-[12px] font-semibold text-emerald-600">
            {t(lang, "2× më shumë blerës me kërkim, filtra dhe arkë", "2× more buyers with search, filters and checkout")}
          </div>
        </div>

        {/* the payoff — the amount is a BLOCK so the orders chip always sits
            beneath it (inline siblings used to share a line on desktop) */}
        <div className="mt-9 border-t border-border pt-8 text-center">
          <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t(lang, "Shtesë çdo muaj", "Extra every month")}</div>
          <div className="mt-3">
            <Pop
              trigger={gainMoney}
              className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-400 bg-clip-text font-display-brand text-[clamp(2.6rem,7vw,3.6rem)] font-bold leading-none tabular-nums text-transparent drop-shadow-[0_10px_30px_rgba(16,185,129,0.25)]"
            >
              +{shownMoney.toLocaleString("en-US")} L
            </Pop>
          </div>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[13px] font-semibold text-emerald-600">
            <ShoppingBag className="h-3.5 w-3.5" />
            <Pop trigger={gainOrders} className="tabular-nums">+{shownOrders}</Pop>
            {t(lang, "porosi më shumë në muaj", "more orders a month")}
          </div>
          <p className="mt-6 text-[11.5px] leading-relaxed text-muted-foreground">
            {t(lang, "Mesatare industrie: ~2.6% konvertim online; kërkimi e filtrat konvertojnë ~2× (Forrester).", "Industry averages: ~2.6% online conversion; search and filters convert ~2× (Forrester).")}
          </p>
        </div>
      </div>
    </section>
  );
}
