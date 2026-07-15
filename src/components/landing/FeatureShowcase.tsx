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
    { Icon: Sparkles, label: t(lang, "AI Analizë", "AI analysis"), title: t(lang, "Çdo postim bëhet produkt", "Every post becomes a product"), body: t(lang, "AI lexon foton dhe përshkrimin dhe nxjerr emrin, çmimin, kategorinë e variantet — automatikisht.", "AI reads the photo and caption and extracts the name, price, category and variants — automatically."), bullets: [t(lang, "Emra & çmime nga postimet", "Names & prices from posts"), t(lang, "Kategori & variante", "Categories & variants"), t(lang, "Sinkronizim automatik", "Automatic sync")], img: "/hero/products.png", url: "dyqani.yt/products" },
    { Icon: Palette, label: "Storefront Studio", title: t(lang, "Dizajno vitrinën tënde", "Design your storefront"), body: t(lang, "Zgjidh nga shabllone të bukura dhe personalizo gjithçka — me pamje live, desktop dhe mobile.", "Pick from beautiful templates and customize everything — with live preview, desktop and mobile."), bullets: [t(lang, "8+ shabllone", "8+ templates"), t(lang, "Ngjyra, fonte, struktura", "Colors, fonts, layout"), t(lang, "Pamje live", "Live preview")], img: "/hero/studio.png", url: "dyqani.yt/studio", reverse: true },
    { Icon: CreditCard, label: t(lang, "Pagesa & Porosi", "Payments & orders"), title: t(lang, "Merr pagesa. Menaxho porosi.", "Take payments. Manage orders."), body: t(lang, "Pagesa me kartë në Lekë me RaiAccept ose para në dorë. Të gjitha porositë në një panel.", "Card payments in Lek via RaiAccept, or cash on delivery. Every order in one dashboard."), bullets: [t(lang, "Kartë (RaiAccept) ose cash", "Card (RaiAccept) or cash"), t(lang, "Statuse & përmbushje", "Statuses & fulfillment"), t(lang, "Njoftime në kohë reale", "Real-time notifications")], img: "/hero/orders.png", url: "dyqani.yt/orders" },
    { Icon: BarChart3, label: t(lang, "Analitikë", "Analytics"), title: t(lang, "Shiko çfarë shet", "See what sells"), body: t(lang, "Të ardhurat, top produktet dhe klientët — të gjitha live, në një panel të vetëm.", "Revenue, top products and customers — all live, in one dashboard."), bullets: [t(lang, "Të ardhura & shitje", "Revenue & sales"), t(lang, "Top produktet", "Top products"), t(lang, "Aktivitet live", "Live activity")], img: "/hero/dashboard.png", url: "dyqani.yt/dashboard", reverse: true },
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
    <section ref={root} id="features" className="px-5 py-24 sm:py-32">
      <SectionHead
        eyebrow={t(lang, "Veçoritë", "Features")}
        title={t(lang, "Gjithçka për të drejtuar dyqanin", "Everything to run your shop")}
        sub={t(lang, "Një mjet i vetëm zëvendëson Excel-in, DM-të dhe hamendjet.", "One tool replaces the spreadsheet, the DMs and the guesswork.")}
      />

      <div className="mx-auto mt-20 max-w-6xl space-y-24 sm:space-y-32">
        {feats.map((f, i) => (
          <div key={i} className={`fs-row grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${f.reverse ? "[&>*:first-child]:lg:order-2" : ""}`}>
            <div>
              <div className="fs-anim"><Eyebrow>{f.label}</Eyebrow></div>
              <h3 className="fs-anim mt-4 font-display-brand text-[clamp(1.7rem,3vw,2.5rem)] font-bold leading-[1.08] tracking-tight text-foreground">{f.title}</h3>
              <p className="fs-anim mt-4 max-w-md text-[17px] leading-relaxed text-muted-foreground">{f.body}</p>
              <ul className="fs-anim mt-6 space-y-2.5">
                {f.bullets.map((b) => (
                  <li key={b} className="flex items-center gap-2.5 text-[15px] text-foreground"><span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/15 text-emerald-600"><Check className="h-3.5 w-3.5" /></span>{b}</li>
                ))}
              </ul>
            </div>
            <div className="fs-anim"><Frame src={f.img} url={f.url} /></div>
          </div>
        ))}
      </div>
    </section>
  );
}
