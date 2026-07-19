import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Marquee from "react-fast-marquee";

gsap.registerPlugin(ScrollTrigger);

type Lang = "sq" | "en";
const t = (l: Lang, sq: string, en: string) => (l === "sq" ? sq : en);

/** S3 — quiet trust band under the hero: the original slow category marquee,
 *  with a FlowingMenu-style hover on every pill (a wine gradient panel slides
 *  up through the pill and the label flips white). */
export default function TrustStrip({ lang, cats }: { lang: Lang; cats: string[] }) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduce) { gsap.set(".ts-reveal", { opacity: 1, y: 0 }); return; }
      gsap.from(".ts-reveal", { y: 16, opacity: 0, duration: 0.7, stagger: 0.12, ease: "power3.out", scrollTrigger: { trigger: root.current, start: "top 90%" } });
    }, root);
    return () => ctx.revert();
  }, [lang]);

  return (
    <section id="trust" ref={root} className="border-y border-border/60 bg-card/30 px-5 py-7 sm:py-9">
      <div className="mx-auto max-w-6xl">
        <p className="ts-reveal mb-5 sm:mb-6 text-center text-[13px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t(lang, "I ndërtuar për çdo dyqan në Instagram", "Built for every kind of Instagram shop")}
        </p>
        <div className="ts-reveal [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <Marquee gradient={false} speed={38} autoFill pauseOnHover>
            {cats.map((c) => (
              <span key={c} className="ts-pill mx-1.5 sm:mx-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm sm:px-5 sm:py-2.5 sm:text-[15px] font-medium text-foreground">
                <span className="relative z-10 h-1.5 w-1.5 rounded-full brand-gradient" />
                <span className="relative z-10">{c}</span>
              </span>
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}
