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

type Cell = true | false | "partial" | string;

// column template shared by the header and every row so the grid always aligns
const COLS = "grid-cols-[1.25fr_0.62fr_0.62fr_0.78fr] sm:grid-cols-[1.6fr_1fr_1fr_1fr]";

/**
 * "Pse Vela" v3 — a proper comparison table: aligned grid columns, hairline
 * rows, a continuous highlighted Vela column (tint + ring drawn top→down on
 * scroll), icon column headers, and a distinct time-to-live footer row.
 * Compact-but-readable on phones, roomy on desktop.
 */
export default function ComparisonTable({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);

  const rows: { label: string; ig: Cell; shop: Cell; vela: Cell }[] = [
    { label: t(lang, "Pa website, pa kod", "No website, no code"), ig: false, shop: false, vela: true },
    { label: t(lang, "Postime → produkte vetë", "Posts → products on their own"), ig: false, shop: false, vela: true },
    { label: t(lang, "Vitrinë e personalizueshme", "Custom storefront"), ig: false, shop: true, vela: true },
    { label: t(lang, "Kartë në Lekë (RaiAccept)", "Card in Lek (RaiAccept)"), ig: false, shop: "partial", vela: true },
    { label: t(lang, "Para në dorë", "Cash on delivery"), ig: "partial", shop: "partial", vela: true },
    { label: t(lang, "Inventar & variante vetë", "Auto inventory & variants"), ig: false, shop: true, vela: true },
    { label: t(lang, "Porositë në një panel", "Orders in one dashboard"), ig: false, shop: true, vela: true },
    { label: t(lang, "Për tregun shqiptar", "Built for Albania"), ig: false, shop: false, vela: true },
  ];

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduce) {
        gsap.set("[data-reveal], .ct-row", { opacity: 1, y: 0 });
        gsap.set(".ct-vela", { clipPath: "inset(0 0 0% 0 round 18px)" });
        return;
      }
      gsap.from("[data-reveal]", { y: 26, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: root.current, start: "top 72%" } });
      gsap.from(".ct-row", { y: 16, opacity: 0, duration: 0.5, stagger: 0.06, ease: "power2.out", scrollTrigger: { trigger: ".ct-table", start: "top 80%" } });
      gsap.fromTo(
        ".ct-vela",
        { clipPath: "inset(0 0 100% 0 round 18px)" },
        { clipPath: "inset(0 0 0% 0 round 18px)", duration: 1.1, ease: "power3.inOut", scrollTrigger: { trigger: ".ct-table", start: "top 76%" } },
      );
    }, root);
    return () => ctx.revert();
  }, [lang]);

  const cell = (v: Cell, vela?: boolean) => {
    if (v === true) return <Check className={cn("mx-auto h-[18px] w-[18px] sm:h-5 sm:w-5", vela ? "text-emerald-500" : "text-emerald-500/70")} />;
    if (v === false) return <X className="mx-auto h-[18px] w-[18px] text-muted-foreground/30 sm:h-5 sm:w-5" />;
    if (v === "partial") return <Minus className="mx-auto h-[18px] w-[18px] text-amber-400 sm:h-5 sm:w-5" />;
    return <span className={cn("text-[12px] font-bold sm:text-[14px]", vela ? "brand-text" : "text-foreground")}>{v}</span>;
  };

  return (
    <section ref={root} id="compare" className="px-5 py-14 sm:py-24 lg:py-32">
      <SectionHead
        eyebrow={t(lang, "Pse Vela", "Why Vela")}
        title={t(lang, "Instagrami s'është dyqan. Shopify s'është për ty.", "Instagram isn't a shop. Shopify isn't for you.")}
        sub={t(lang, "Krahaso vetë.", "Compare for yourself.")}
      />

      <div className="ct-table relative mx-auto mt-8 max-w-4xl sm:mt-12">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_36px_90px_-40px_rgba(30,10,50,0.3)]">
          {/* the continuous Vela column highlight — drawn top→down on scroll */}
          {/* width mirrors the grid math: (100% − x-padding − gaps) × last-col share */}
          <div
            className="ct-vela pointer-events-none absolute bottom-1.5 right-3 top-1.5 z-0 w-[calc((100%-36px)*0.2385)] rounded-[16px] bg-gradient-to-b from-red-500/[0.1] via-red-500/[0.05] to-amber-400/[0.07] ring-1 ring-inset ring-red-400/30 sm:right-5 sm:w-[calc((100%-64px)*0.217)]"
            aria-hidden
          />

          {/* header */}
          <div className={cn("relative z-10 grid items-center gap-1 border-b border-border px-3 py-3.5 sm:gap-2 sm:px-5 sm:py-4", COLS)}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">{t(lang, "Veçoria", "Feature")}</div>
            <div className="flex flex-col items-center gap-1 text-center">
              <Instagram className="h-4 w-4 text-muted-foreground/70" />
              <span className="text-[10.5px] font-semibold leading-tight text-muted-foreground sm:text-[12.5px]">{t(lang, "Vetëm IG", "IG only")}</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <Store className="h-4 w-4 text-muted-foreground/70" />
              <span className="text-[10.5px] font-semibold leading-tight text-muted-foreground sm:text-[12.5px]">Shopify</span>
            </div>
            <div className="flex flex-col items-center gap-1 text-center">
              <img src="/vela-icon.svg" alt="" className="h-6 w-6 rounded-[7px] shadow-sm shadow-red-500/30 sm:h-7 sm:w-7" />
              <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-bold text-white sm:text-[12px]", BRAND)}>Vela</span>
            </div>
          </div>

          {/* feature rows */}
          {rows.map((r, i) => (
            <div key={i} className={cn("ct-row relative z-10 grid items-center gap-1 px-3 py-3 sm:gap-2 sm:px-5 sm:py-3.5", COLS, i > 0 && "border-t border-border/70")}>
              <div className="pr-1 text-[12.5px] font-medium leading-snug text-foreground sm:text-[15px]">{r.label}</div>
              <div className="text-center">{cell(r.ig)}</div>
              <div className="text-center">{cell(r.shop)}</div>
              <div className="text-center">{cell(r.vela, true)}</div>
            </div>
          ))}

          {/* time-to-live footer row */}
          <div className={cn("ct-row relative z-10 grid items-center gap-1 border-t border-border bg-muted/40 px-3 py-3.5 sm:gap-2 sm:px-5 sm:py-4", COLS)}>
            <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground sm:text-[15px]">
              <Clock className="h-3.5 w-3.5 text-muted-foreground sm:h-4 sm:w-4" /> {t(lang, "Kohë deri live", "Time to go live")}
            </div>
            <div className="text-center text-[12px] font-semibold text-muted-foreground/60 sm:text-[14px]">—</div>
            <div className="text-center text-[12px] font-semibold text-muted-foreground sm:text-[14px]">{t(lang, "javë", "weeks")}</div>
            <div className="text-center">{cell(t(lang, "minuta", "minutes"), true)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
