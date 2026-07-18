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
    { Icon: MessageCircle, title: t(lang, "DM pa fund", "Endless DM's"), body: t(lang, "Ti je arka, magazina dhe suporti — njëkohësisht.", "You're the checkout, warehouse and support — all at once."), metric: true },
    { Icon: CreditCard, title: t(lang, "Pa arkë, pa pagesa", "No checkout, no payments"), body: t(lang, "Çmim, adresë, pagesë — të gjitha me dorë.", "Price, address, payment — all by hand.") },
    { Icon: PackageX, title: t(lang, "Menaxhim stoku me dorë", "Manually managing stock"), body: t(lang, "E mban në kokë — dhe e shet dy herë.", "Kept in your head — and sold twice.") },
    { Icon: TrendingDown, title: t(lang, "Zero të dhëna", "Zero data"), body: t(lang, "S'ke asnjë numër — s'di çfarë shet vërtet.", "No numbers at all — you don't know what sells.") },
    { Icon: SearchX, wide: true, title: t(lang, "Klientët e tu s'gjejnë dot çfarë kërkojnë", "Your clients can't find what they want"), body: t(lang, "Pa kërkim as filtra, klientët dorëzohen — dhe ikin te dikush tjetër.", "No search, no filters — customers give up and leave for someone else."), stat: t(lang, "76% ikin nëse s'gjejnë shpejt", "76% leave if they can't find it fast") },
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
    <section ref={root} id="problem" className="relative px-5 py-14 sm:py-32">
      <SectionHead
        eyebrow={t(lang, "Problemi", "The problem")}
        title={<>{t(lang, "Instagrami sjell klientë. ", "Instagram brings customers. ")}<span className="text-muted-foreground/70">{t(lang, "Pastaj të lë vetëm.", "Then leaves you alone.")}</span></>}
        sub={t(lang, "Feed-i mbush DM-të. Shitja e pagesa mbeten mbi ty.", "The feed fills your DMs. Selling and payments stay on you.")}
      />

      <div className="pain-grid mx-auto mt-8 grid max-w-4xl gap-4 sm:mt-14 sm:grid-cols-2">
        {pains.map((p, i) => (
          <div key={i} className={`pain-card group relative overflow-hidden rounded-3xl border bg-card p-5 transition-shadow hover:shadow-[0_30px_70px_-30px_rgba(30,10,50,0.25)] sm:p-7 ${p.wide ? "border-destructive/25 sm:col-span-2" : "border-border"}`}>
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
