import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MessageCircle, CreditCard, PackageX, TrendingDown, SearchX, ChevronDown } from "lucide-react";
import { SectionHead } from "./kit";

gsap.registerPlugin(ScrollTrigger);

type Lang = "sq" | "en";
const t = (l: Lang, sq: string, en: string) => (l === "sq" ? sq : en);

/**
 * S4 v2 — the pains as ONE "diagnosis" card: five hairline-divided rows
 * instead of five separate boxes, so the section reads as a single scan on
 * every screen. Metric chips (47 unread, 76% leave) stay inline; the wide
 * "can't find products" row keeps its emphasis tint. Bridge line follows.
 */
export default function ProblemSection({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);

  const pains = [
    { Icon: MessageCircle, title: t(lang, "Mesazhe pa fund", "Endless messages"), body: t(lang, "Ti je arka, magazina dhe suporti — njëkohësisht.", "You're the checkout, warehouse and support — all at once."), metric: true },
    { Icon: CreditCard, title: t(lang, "Pa arkë, pa pagesa", "No checkout, no payments"), body: t(lang, "Çmim, adresë, pagesë — të gjitha me dorë.", "Price, address, payment — all by hand.") },
    { Icon: PackageX, title: t(lang, "Stoku në kokën tënde", "Stock lives in your head"), body: t(lang, "E mban në kokë — dhe e shet dy herë.", "Kept in your head — and sold twice.") },
    { Icon: TrendingDown, title: t(lang, "Zero të dhëna", "Zero data"), body: t(lang, "S'ke asnjë numër — s'di çfarë shet vërtet.", "No numbers — you don't know what sells.") },
    { Icon: SearchX, hot: true, title: t(lang, "Klientët s'gjejnë dot asgjë", "Customers can't find anything"), body: t(lang, "Pa kërkim as filtra, ikin te dikush tjetër.", "No search, no filters — they leave for someone else."), stat: t(lang, "76% ikin nëse s'gjejnë shpejt", "76% leave if they can't find it fast") },
  ];

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduce) {
        gsap.set("[data-reveal], .pain-row, .pain-bridge", { opacity: 1, y: 0, x: 0 });
        const c = root.current?.querySelector<HTMLElement>(".dm-count"); if (c) c.textContent = "47";
        return;
      }
      gsap.from("[data-reveal]", { y: 26, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: root.current, start: "top 72%" } });
      gsap.from(".pain-row", { x: -22, opacity: 0, duration: 0.6, stagger: 0.09, ease: "power3.out", scrollTrigger: { trigger: ".pain-card", start: "top 78%" } });
      const c = root.current?.querySelector<HTMLElement>(".dm-count");
      if (c) { const o = { v: 0 }; gsap.to(o, { v: 47, duration: 1.6, ease: "power2.out", scrollTrigger: { trigger: c, start: "top 88%" }, onUpdate: () => (c.textContent = String(Math.round(o.v))) }); }
      gsap.from(".pain-bridge", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: ".pain-bridge", start: "top 90%" } });
      gsap.to(".pain-chev", { y: 6, duration: 1.1, ease: "sine.inOut", yoyo: true, repeat: -1 });
    }, root);
    return () => ctx.revert();
  }, [lang]);

  return (
    <section ref={root} id="problem" className="relative px-5 py-14 sm:py-32">
      <SectionHead
        eyebrow={t(lang, "Problemi", "The problem")}
        title={<>{t(lang, "Instagrami sjell klientë. ", "Instagram brings customers. ")}<span className="text-muted-foreground/70">{t(lang, "Pastaj të lë vetëm.", "Then leaves you alone.")}</span></>}
        sub={t(lang, "Postimet i mbushin mesazhet. Shitja e pagesa mbeten mbi ty.", "Your posts fill your messages. Selling and payments stay on you.")}
      />

      {/* one diagnosis card — hairline rows, one scan */}
      <div className="pain-card mx-auto mt-8 max-w-2xl overflow-hidden rounded-3xl border border-border bg-card sm:mt-14">
        {pains.map((p, i) => (
          <div
            key={i}
            className={`pain-row flex items-start gap-4 px-5 py-4.5 sm:px-7 sm:py-5 ${i > 0 ? "border-t border-border" : ""} ${p.hot ? "bg-destructive/[0.04]" : ""}`}
            style={{ paddingTop: "1.1rem", paddingBottom: "1.1rem" }}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive sm:h-11 sm:w-11">
              <p.Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <h3 className="text-[15.5px] font-semibold leading-tight text-foreground sm:text-[16.5px]">{p.title}</h3>
                {p.metric && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/[0.07] px-2 py-0.5 text-[11.5px] font-semibold text-destructive">
                    <span className="dm-count tabular-nums">0</span> {t(lang, "të palexuara", "unread")}
                  </span>
                )}
                {p.stat && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/[0.07] px-2 py-0.5 text-[11.5px] font-semibold text-destructive">
                    {p.stat}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground sm:text-[14.5px]">{p.body}</p>
            </div>
          </div>
        ))}
      </div>

      {/* bridge into the solution */}
      <div className="pain-bridge mx-auto mt-10 flex flex-col items-center text-center sm:mt-16">
        <p className="font-display-brand text-[clamp(1.4rem,2.6vw,2rem)] font-semibold tracking-tight text-foreground">
          {t(lang, "Ke nevojë për një dyqan të vërtetë.", "You need a real shop.")}
        </p>
        <span className="pain-chev mt-6 grid h-11 w-11 place-items-center rounded-full border border-border bg-card/70 text-muted-foreground backdrop-blur">
          <ChevronDown className="h-5 w-5" />
        </span>
      </div>
    </section>
  );
}
