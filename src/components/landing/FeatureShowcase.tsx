import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Sparkles, Palette, CreditCard, BarChart3, Check } from "lucide-react";
import { SectionHead, Eyebrow } from "./kit";

gsap.registerPlugin(ScrollTrigger);

type Lang = "sq" | "en";
const t = (l: Lang, sq: string, en: string) => (l === "sq" ? sq : en);

const Frame = ({ src, url, className }: { src: string; url: string; className?: string }) => (
  <div className={`overflow-hidden rounded-2xl border border-border bg-card shadow-[0_40px_90px_-30px_rgba(30,10,50,0.3)] ${className ?? ""}`}>
    <div className="flex h-8 items-center gap-1.5 border-b border-border bg-muted/60 px-3">
      <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      <span className="mx-auto rounded-full bg-background px-4 py-0.5 text-[10px] text-muted-foreground">{url}</span>
    </div>
    <div className="overflow-hidden"><img src={src} alt="" className="fs-img block aspect-[1440/900] w-full object-cover object-top" /></div>
  </div>
);

/** S7 — feature showcase: alternating text / real-UI rows with parallax. */
export default function FeatureShowcase({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);

  const feats = [
    { Icon: Sparkles, label: t(lang, "Analizë nga sistemi", "System analysis"), title: t(lang, "Çdo postim bëhet produkt", "Every post becomes a product"), body: t(lang, "Sistemi nxjerr emrin, çmimin, kategorinë dhe variantet — vetë.", "The system extracts name, price, category and variants — automatically."), bullets: [t(lang, "Emra & çmime nga postimet", "Names & prices from posts"), t(lang, "Kategori & variante", "Categories & variants"), t(lang, "Sinkronizim automatik", "Automatic sync")], img: "/hero/products.png", url: "dyqani.yt/products" },
    { Icon: Palette, label: "Storefront Studio", title: t(lang, "Dizajno vitrinën tënde", "Design your storefront"), body: t(lang, "Zgjidh një template dhe personalizo gjithçka, me pamje live.", "Pick a template, customize everything, preview it live."), bullets: [t(lang, "8+ template", "8+ templates"), t(lang, "Ngjyra, fonte, struktura", "Colors, fonts, layout"), t(lang, "Pamje live", "Live preview")], img: "/hero/studio.png", url: "dyqani.yt/studio", reverse: true },
    { Icon: CreditCard, label: t(lang, "Pagesa & Porosi", "Payments & orders"), title: t(lang, "Merr pagesa. Menaxho porosi.", "Take payments. Manage orders."), body: t(lang, "Kartë me RaiAccept ose para në dorë — porositë në një panel.", "Card via RaiAccept or cash on delivery — orders in one dashboard."), bullets: [t(lang, "Kartë (RaiAccept) ose cash", "Card (RaiAccept) or cash"), t(lang, "Statuse & përmbushje", "Statuses & fulfillment"), t(lang, "Njoftime në kohë reale", "Real-time notifications")], img: "/hero/orders.png", url: "dyqani.yt/orders" },
    { Icon: BarChart3, label: t(lang, "Analitikë", "Analytics"), title: t(lang, "Shiko çfarë shet", "See what sells"), body: t(lang, "Të ardhura, top produkte dhe klientë — të gjitha live.", "Revenue, top products and customers — all live."), bullets: [t(lang, "Të ardhura & shitje", "Revenue & sales"), t(lang, "Top produktet", "Top products"), t(lang, "Aktivitet live", "Live activity")], img: "/hero/dashboard.png", url: "dyqani.yt/dashboard", reverse: true },
  ];

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduce) { gsap.set("[data-reveal], .fs-anim", { opacity: 1, y: 0 }); return; }
      gsap.from("[data-reveal]", { y: 26, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: root.current, start: "top 74%" } });
      gsap.utils.toArray<HTMLElement>(".fs-row").forEach((row) => {
        gsap.from(row.querySelectorAll(".fs-anim"), { y: 30, opacity: 0, duration: 0.75, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: row, start: "top 78%" } });
        if (!reduce) {
          const img = row.querySelector(".fs-img");
          if (img) gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: row, start: "top bottom", end: "bottom top", scrub: true } });
        }
      });
    }, root);
    return () => ctx.revert();
  }, [lang]);

  return (
    <section ref={root} id="features" className="px-5 py-14 sm:py-24 lg:py-32">
      <SectionHead
        eyebrow={t(lang, "Veçoritë", "Features")}
        title={t(lang, "Gjithçka për të drejtuar dyqanin", "Everything to run your shop")}
        sub={t(lang, "Një mjet i vetëm zëvendëson Excel-in, mesazhet dhe hamendjet.", "One tool replaces the spreadsheet, the messages and the guesswork.")}
      />

      {/* Mobile: each feature is ONE card (screenshot on top, copy under it,
          bullets as chips) so the section reads as a cohesive rhythm.
          Desktop (lg+): the cards dissolve into the open alternating rows. */}
      <div className="mx-auto mt-8 max-w-6xl space-y-6 sm:mt-16 sm:space-y-8 lg:mt-20 lg:space-y-32">
        {feats.map((f, i) => (
          <div
            key={i}
            className={`fs-row grid items-center gap-5 rounded-3xl border border-border bg-card/60 p-4 sm:p-6 lg:grid-cols-2 lg:gap-16 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 ${f.reverse ? "[&>*:first-child]:lg:order-2" : ""}`}
          >
            <div className="order-last lg:order-none">
              <div className="fs-anim"><Eyebrow>{f.label}</Eyebrow></div>
              <h3 className="fs-anim mt-3 font-display-brand text-[clamp(1.45rem,3vw,2.5rem)] font-bold leading-[1.08] tracking-tight text-foreground lg:mt-4">{f.title}</h3>
              <p className="fs-anim mt-2.5 max-w-md text-[15px] leading-relaxed text-muted-foreground lg:mt-4 lg:text-[17px]">{f.body}</p>
              <div className="fs-anim mt-4 flex flex-wrap gap-2 lg:mt-6">
                {f.bullets.map((b) => (
                  <span key={b} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium text-foreground lg:text-[13.5px]">
                    <Check className="h-3.5 w-3.5 text-emerald-500" />{b}
                  </span>
                ))}
              </div>
            </div>
            <div className="fs-anim"><Frame src={f.img} url={f.url} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}
