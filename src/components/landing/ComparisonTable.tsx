import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Check, X, Minus } from "lucide-react";
import { SectionHead } from "./kit";

gsap.registerPlugin(ScrollTrigger);

type Lang = "sq" | "en";
const t = (l: Lang, sq: string, en: string) => (l === "sq" ? sq : en);
const BRAND = "brand-gradient";

type Cell = true | false | "partial" | string;
const cell = (v: Cell) => {
  if (v === true) return <Check className="mx-auto h-5 w-5 text-emerald-500" />;
  if (v === false) return <X className="mx-auto h-5 w-5 text-muted-foreground/40" />;
  if (v === "partial") return <Minus className="mx-auto h-5 w-5 text-amber-400" />;
  return <span className="text-[12px] font-semibold text-foreground sm:text-[14px]">{v}</span>;
};

/** S10 — Instagram only / Shopify & co. / Vela (highlighted). Theme tokens, GSAP. */
export default function ComparisonTable({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);

  const rows: { label: string; ig: Cell; shop: Cell; vela: Cell }[] = [
    { label: t(lang, "Pa website, pa kod", "No website, no code"), ig: false, shop: false, vela: true },
    { label: t(lang, "Postime → produkte me sistemin", "Posts → products with the system"), ig: false, shop: false, vela: true },
    { label: t(lang, "Vitrinë e personalizueshme", "Custom storefront"), ig: false, shop: true, vela: true },
    { label: t(lang, "Kartë në Lekë (RaiAccept)", "Card in Lek (RaiAccept)"), ig: false, shop: "partial", vela: true },
    { label: t(lang, "Para në dorë", "Cash on delivery"), ig: "partial", shop: "partial", vela: true },
    { label: t(lang, "Inventar & variante automatike", "Auto inventory & variants"), ig: false, shop: true, vela: true },
    { label: t(lang, "Porositë në një panel", "Orders in one dashboard"), ig: false, shop: true, vela: true },
    { label: t(lang, "Ndërtuar për tregun shqiptar", "Built for Albanian market"), ig: false, shop: false, vela: true },
    { label: t(lang, "Kohë deri live", "Time to go live"), ig: "—", shop: t(lang, "javë", "weeks"), vela: t(lang, "minuta", "minutes") },
  ];

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduce) { gsap.set("[data-reveal], .ct-row", { opacity: 1, y: 0 }); return; }
      gsap.from("[data-reveal]", { y: 26, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: root.current, start: "top 72%" } });
      gsap.from(".ct-row", { y: 18, opacity: 0, duration: 0.55, stagger: 0.07, ease: "power2.out", scrollTrigger: { trigger: ".ct-table", start: "top 78%" } });
      gsap.fromTo(".ct-vela", { clipPath: "inset(0 0 100% 0 round 24px)" }, { clipPath: "inset(0 0 0% 0 round 24px)", duration: 1.0, ease: "power3.out", scrollTrigger: { trigger: ".ct-table", start: "top 80%" } });
    }, root);
    return () => ctx.revert();
  }, [lang]);

  return (
    <section ref={root} id="compare" className="px-5 py-14 sm:py-24 lg:py-32">
      <SectionHead
        eyebrow={t(lang, "Pse Vela", "Why Vela")}
        title={t(lang, "Instagrami s'është dyqan. Shopify s'është për ty.", "Instagram isn't a shop. Shopify isn't for you.")}
        sub={t(lang, "Krahaso vetë pse Vela është bërë për shitësit shqiptarë.", "See why Vela is built for Albanian sellers.")}
      />

      <div className="ct-table relative mx-auto mt-8 max-w-4xl overflow-x-auto overflow-y-hidden sm:mt-12">
        <div className="relative min-w-0 sm:min-w-[640px]">
          <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr] items-end gap-1.5 px-1.5 pb-3 sm:grid-cols-[1.6fr_1fr_1fr_1fr] sm:gap-2 sm:px-2">
            <div />
            <div className="ct-row text-center text-[11px] font-semibold leading-tight text-muted-foreground sm:text-[13px]">{t(lang, "Vetëm Instagram", "Instagram only")}</div>
            <div className="ct-row text-center text-[11px] font-semibold leading-tight text-muted-foreground sm:text-[13px]">Shopify & co.</div>
            <div className="ct-row pt-2 text-center">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-bold text-white sm:px-3 sm:text-[13px] ${BRAND}`}>Vela</span>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card/70 backdrop-blur">
            {/* Vela column highlight — contained to the table body (no runaway height). */}
            <div className="ct-vela pointer-events-none absolute inset-y-0 right-0 z-0 w-[calc(25%-0.375rem)] bg-gradient-to-b from-red-500/[0.14] to-red-500/[0.03] ring-1 ring-inset ring-red-400/25 sm:w-[calc(25%-0.5rem)]" aria-hidden />
            {rows.map((r, i) => (
              <div key={i} className={`ct-row relative z-10 grid grid-cols-[1.4fr_1fr_1fr_1fr] items-center gap-1.5 px-2.5 py-3.5 sm:grid-cols-[1.6fr_1fr_1fr_1fr] sm:gap-2 sm:px-4 ${i < rows.length - 1 ? "border-b border-border" : ""}`}>
                <div className="text-[12.5px] font-medium leading-snug text-foreground sm:text-[15px]">{r.label}</div>
                <div className="text-center">{cell(r.ig)}</div>
                <div className="text-center">{cell(r.shop)}</div>
                <div className="rounded-xl bg-red-500/[0.06] py-1 text-center">{cell(r.vela)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
