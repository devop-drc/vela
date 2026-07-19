import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Check, X, Minus, Instagram, Store, Clock } from "lucide-react";
import { SectionHead } from "./kit";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

type Lang = "sq" | "en";
const t = (l: Lang, sq: string, en: string) => (l === "sq" ? sq : en);
const BRAND = "brand-gradient";

type State = true | false | "partial";

/**
 * "Pse Vela" v2 — three column-cards instead of a cramped matrix. Side by
 * side on desktop (Vela elevated), stacked on mobile with Vela as the
 * payoff. Each card carries the same feature list with its own ✓/✗/− states
 * and a time-to-live chip, so comparison stays honest at every width.
 */
export default function ComparisonTable({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);

  const features = [
    t(lang, "Pa website, pa kod", "No website, no code"),
    t(lang, "Postime → produkte vetë", "Posts → products on their own"),
    t(lang, "Vitrinë e personalizueshme", "Custom storefront"),
    t(lang, "Kartë në Lekë (RaiAccept)", "Card in Lek (RaiAccept)"),
    t(lang, "Para në dorë", "Cash on delivery"),
    t(lang, "Inventar & variante vetë", "Auto inventory & variants"),
    t(lang, "Porositë në një panel", "Orders in one dashboard"),
    t(lang, "Për tregun shqiptar", "Built for Albania"),
  ];

  const cols: {
    key: string; name: string; Icon: typeof Instagram; tag: string;
    states: State[]; live: string; hero?: boolean;
  }[] = [
    {
      key: "ig", name: t(lang, "Vetëm Instagram", "Instagram only"), Icon: Instagram,
      tag: t(lang, "Aty ku je sot", "Where you are today"),
      states: [false, false, false, false, "partial", false, false, false],
      live: "—",
    },
    {
      key: "shop", name: "Shopify & co.", Icon: Store,
      tag: t(lang, "Shumë punë, jo për këtu", "Heavy, not built for here"),
      states: [false, false, true, "partial", "partial", true, true, false],
      live: t(lang, "javë", "weeks"),
    },
    {
      key: "vela", name: "Vela", Icon: Store, hero: true,
      tag: t(lang, "Bërë për shitësit shqiptarë", "Made for Albanian sellers"),
      states: [true, true, true, true, true, true, true, true],
      live: t(lang, "minuta", "minutes"),
    },
  ];

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduce) { gsap.set("[data-reveal], .ct-card", { opacity: 1, y: 0 }); return; }
      gsap.from("[data-reveal]", { y: 26, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: root.current, start: "top 72%" } });
      gsap.from(".ct-card", { y: 34, opacity: 0, duration: 0.75, stagger: 0.14, ease: "power3.out", scrollTrigger: { trigger: ".ct-grid", start: "top 80%" } });
    }, root);
    return () => ctx.revert();
  }, [lang]);

  const state = (s: State, hero?: boolean) => {
    if (s === true) return <Check className={cn("h-[18px] w-[18px] shrink-0", hero ? "text-emerald-500" : "text-emerald-500/80")} />;
    if (s === "partial") return <Minus className="h-[18px] w-[18px] shrink-0 text-amber-400" />;
    return <X className="h-[18px] w-[18px] shrink-0 text-muted-foreground/35" />;
  };

  return (
    <section ref={root} id="compare" className="px-5 py-14 sm:py-24 lg:py-32">
      <SectionHead
        eyebrow={t(lang, "Pse Vela", "Why Vela")}
        title={t(lang, "Instagrami s'është dyqan. Shopify s'është për ty.", "Instagram isn't a shop. Shopify isn't for you.")}
        sub={t(lang, "Krahaso vetë.", "Compare for yourself.")}
      />

      <div className="ct-grid mx-auto mt-8 grid max-w-5xl gap-4 sm:mt-12 sm:gap-5 lg:grid-cols-3 lg:items-start">
        {cols.map((c) => (
          <div
            key={c.key}
            className={cn(
              "ct-card rounded-3xl border p-5 sm:p-6",
              c.hero
                ? "relative border-transparent bg-card shadow-[0_36px_90px_-36px_rgba(163,18,52,0.45)] ring-2 ring-red-500/50 lg:-mt-3"
                : "border-border bg-card/60"
            )}
          >
            {/* header */}
            <div className="flex items-center gap-3">
              {c.hero ? (
                <img src="/vela-icon.svg" alt="" className="h-10 w-10 rounded-xl shadow-md shadow-red-500/25" />
              ) : (
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <c.Icon className="h-5 w-5" />
                </span>
              )}
              <div className="min-w-0">
                <div className="font-display-brand text-[17px] font-semibold leading-tight text-foreground">{c.name}</div>
                <div className="truncate text-[12.5px] text-muted-foreground">{c.tag}</div>
              </div>
              {c.hero && (
                <span className={cn("ml-auto shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold text-white", BRAND)}>
                  {t(lang, "Zgjidhja", "The pick")}
                </span>
              )}
            </div>

            {/* features */}
            <ul className="mt-5 space-y-2.5">
              {features.map((f, i) => (
                <li key={i} className="flex items-center gap-2.5">
                  {state(c.states[i], c.hero)}
                  <span className={cn("text-[13.5px] leading-snug sm:text-[14px]", c.states[i] === false ? "text-muted-foreground/55" : "text-foreground")}>{f}</span>
                </li>
              ))}
            </ul>

            {/* time to live */}
            <div className={cn("mt-5 flex items-center justify-between rounded-2xl px-4 py-3", c.hero ? "bg-red-500/[0.07] ring-1 ring-inset ring-red-500/20" : "bg-muted/60")}>
              <span className="flex items-center gap-2 text-[12.5px] font-medium text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> {t(lang, "Kohë deri live", "Time to go live")}
              </span>
              <span className={cn("font-display-brand text-[15px] font-bold", c.hero ? "brand-text" : "text-foreground")}>{c.live}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
