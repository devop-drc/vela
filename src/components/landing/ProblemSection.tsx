import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { MessageCircle, CreditCard, PackageX, TrendingDown, SearchX, ChevronDown } from "lucide-react";
import { SectionHead } from "./kit";

gsap.registerPlugin(ScrollTrigger);

type Lang = "sq" | "en";
const t = (l: Lang, sq: string, en: string) => (l === "sq" ? sq : en);

/** S4 — the personified pain of selling on Instagram only. Theme tokens, GSAP. */
export default function ProblemSection({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);

  const pains = [
    { Icon: MessageCircle, title: t(lang, "Çdo shitje ngec në DM", "Every sale stuck in DMs"), body: t(lang, "Dhjetëra “sa kushton?” pa përgjigje. Ti je arka, magazina dhe suporti.", "Dozens of “how much?” unanswered. You're the checkout, warehouse and support."), metric: true },
    { Icon: CreditCard, title: t(lang, "Pa arkë, pa pagesa", "No checkout, no payments"), body: t(lang, "Çmimi, adresa dhe pagesa — të gjitha me dorë, në mesazhe.", "Price, address and payment — all by hand, in messages.") },
    { Icon: PackageX, title: t(lang, "Stoku me dorë", "Stock by hand"), body: t(lang, "E mban në kokë ose në fletore. Dhe e shet dy herë.", "Kept in your head or a notebook. And sold twice.") },
    { Icon: TrendingDown, title: t(lang, "Zero të dhëna", "Zero data"), body: t(lang, "Asnjë numër, asnjë klient i ruajtur. S'di çfarë shet vërtet.", "No numbers, no saved customers. You don't know what actually sells.") },
    { Icon: SearchX, wide: true, title: t(lang, "S'gjejnë dot çfarë kërkojnë", "They can't find what they want"), body: t(lang, "Pa kërkim, pa filtra, pa renditje — klientët lëvizin nëpër postime pa fund, nuk e gjejnë masën, ngjyrën apo çmimin, dhe dorëzohen. Vizitori që s'gjen shpejt çfarë do, ikën te dikush tjetër — dhe atë klient e humbe.", "No search, no filters, no sorting — customers scroll endless posts, can't find the size, color or price, and give up. A visitor who can't quickly find what they want leaves for someone else — and that customer is gone."), stat: t(lang, "76% duan të gjejnë shpejt çfarë kërkojnë — përndryshe ikin", "76% want to find what they want fast — or they leave") },
  ];

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduce) {
        gsap.set("[data-reveal], .pain-card, .pain-bridge", { opacity: 1, y: 0 });
        const c = root.current?.querySelector<HTMLElement>(".dm-count"); if (c) c.textContent = "47";
        return;
      }
      gsap.from("[data-reveal]", { y: 26, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: root.current, start: "top 72%" } });
      gsap.from(".pain-card", { y: 30, opacity: 0, duration: 0.7, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: ".pain-grid", start: "top 78%" } });
      const c = root.current?.querySelector<HTMLElement>(".dm-count");
      if (c) { const o = { v: 0 }; gsap.to(o, { v: 47, duration: 1.6, ease: "power2.out", scrollTrigger: { trigger: c, start: "top 88%" }, onUpdate: () => (c.textContent = String(Math.round(o.v))) }); }
      gsap.from(".pain-bridge", { y: 20, opacity: 0, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: ".pain-bridge", start: "top 90%" } });
      gsap.to(".pain-chev", { y: 6, duration: 1.1, ease: "sine.inOut", yoyo: true, repeat: -1 });
    }, root);
    return () => ctx.revert();
  }, [lang]);

  return (
    <section ref={root} className="relative px-5 py-24 sm:py-32">
      <SectionHead
        eyebrow={t(lang, "Problemi", "The problem")}
        title={<>{t(lang, "Instagrami sjell klientë. ", "Instagram brings customers. ")}<span className="text-muted-foreground/70">{t(lang, "Pastaj të lë vetëm.", "Then leaves you alone.")}</span></>}
        sub={t(lang, "Feed-i mbush DM-të. Por shitja, pagesa dhe logjistika mbeten mbi ty.", "The feed fills your DMs. But selling, payments and logistics stay on you.")}
      />

      <div className="pain-grid mx-auto mt-14 grid max-w-4xl gap-4 sm:grid-cols-2">
        {pains.map((p, i) => (
          <div key={i} className={`pain-card group relative overflow-hidden rounded-3xl border bg-card p-7 transition-shadow hover:shadow-[0_30px_70px_-30px_rgba(30,10,50,0.25)] ${p.wide ? "border-destructive/25 sm:col-span-2" : "border-border"}`}>
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-destructive/10 text-destructive"><p.Icon className="h-6 w-6" /></span>
              <div className="min-w-0">
                <h3 className="text-[18px] font-semibold text-foreground">{p.title}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{p.body}</p>
                {p.metric && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-destructive/5 px-3 py-1.5 text-[13px] font-semibold text-destructive">
                    <span className="dm-count tabular-nums">0</span> {t(lang, "DM të palexuara", "unread DMs")}
                  </div>
                )}
                {p.stat && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-destructive/5 px-3 py-1.5 text-[13px] font-semibold text-destructive">
                    <SearchX className="h-3.5 w-3.5" /> {p.stat}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* bridge into the solution — clean narrative + visual transition */}
      <div className="pain-bridge mx-auto mt-16 flex flex-col items-center text-center">
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
