import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Instagram, Sparkles, Store } from "lucide-react";
import { SectionHead } from "./kit";

gsap.registerPlugin(ScrollTrigger);

type Lang = "sq" | "en";
const t = (l: Lang, sq: string, en: string) => (l === "sq" ? sq : en);

const Frame = ({ src, url }: { src: string; url: string }) => (
  <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_44px_100px_-32px_rgba(163,18,52,0.28)] ring-1 ring-black/[0.03]">
    <div className="flex h-8 items-center gap-1.5 border-b border-border bg-muted/60 px-3">
      <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
      <span className="mx-auto rounded-full bg-background px-4 py-0.5 text-[10px] text-muted-foreground">{url}</span>
    </div>
    <img src={src} alt="" className="block aspect-[1440/900] w-full object-cover object-top" />
  </div>
);

/**
 * S6 — how it works (the pinned original, restyled). The two-column block PINS
 * dead-centre in the viewport; scrolling advances the active step and
 * crossfades the visual. GSAP ScrollTrigger pin handles spacing exactly.
 * v2 style: gradient progress rail with a glow, gradient step numbers, url
 * chips on the copy, and a soft lava halo behind the visual column.
 */
export default function HowItWorks({ lang }: { lang: Lang }) {
  const root = useRef<HTMLDivElement>(null);

  const steps = [
    { Icon: Instagram, url: "instagram.com/mediadesk_albania", img: "/hero/storefront-ig.png", title: t(lang, "Lidh Instagram-in", "Connect Instagram"), body: t(lang, "Një prekje për të lidhur Instagram Business — pa kod.", "One tap to connect Instagram Business — no code.") },
    { Icon: Sparkles, url: "vela.al/products", img: "/hero/products.png", title: t(lang, "Sistemi ndërton produktet", "The system builds your products"), body: t(lang, "Sistemi i kthen postimet në produkte — çmim, kategori, variante.", "The system turns your posts into products — price, category, variants.") },
    { Icon: Store, url: "vela.al/dyqani-yt", img: "/hero/storefront-custom.png", title: t(lang, "Ndaj linkun & shit", "Share the link & sell"), body: t(lang, "Publiko dyqanin dhe merr porosi e pagesa po atë ditë.", "Publish your store and take orders and payments the same day.") },
  ];

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) { gsap.set("[data-reveal]", { opacity: 1, y: 0 }); return; }
      gsap.from("[data-reveal]", { y: 26, opacity: 0, duration: 0.8, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: root.current, start: "top 76%" } });

      const setActive = (n: number) => {
        gsap.to(".hiw-visual", { autoAlpha: 0, scale: 0.97, duration: 0.5, ease: "power2.out", overwrite: "auto" });
        gsap.to(`.hiw-visual-${n}`, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "power2.out", overwrite: "auto" });
        // Dim only the copy — the badge stays fully opaque so it always occludes the progress line.
        gsap.utils.toArray<HTMLElement>(".hiw-copy").forEach((el, i) =>
          gsap.to(el, { opacity: i === n ? 1 : 0.32, duration: 0.4, overwrite: "auto" }),
        );
        gsap.utils.toArray<HTMLElement>(".hiw-badge").forEach((el, i) =>
          gsap.to(el, { scale: i === n ? 1 : 0.88, duration: 0.4, ease: "power2.out", overwrite: "auto" }),
        );
        gsap.utils.toArray<HTMLElement>(".hiw-num").forEach((el, i) =>
          gsap.to(el, { opacity: i === n ? 1 : 0.35, duration: 0.4, overwrite: "auto" }),
        );
      };

      const mm = gsap.matchMedia();
      // Desktop: pin the block centre-screen and advance on scroll.
      mm.add("(min-width: 1024px)", () => {
        setActive(0);
        let cur = -1;
        const st = ScrollTrigger.create({
          trigger: ".hiw-pin",
          start: "center center",
          end: `+=${steps.length * 62}%`,
          pin: true,
          pinSpacing: true,
          scrub: 0.4,
          onUpdate: (self) => {
            const n = Math.max(0, Math.min(steps.length - 1, Math.floor(self.progress * steps.length - 1e-4)));
            if (n !== cur) { cur = n; setActive(n); }
            gsap.set(".hiw-progress-fill", { scaleY: self.progress });
          },
        });
        return () => st.kill();
      });
      // Mobile: no pin — steps stack, each shows its own visual; nothing dimmed.
    }, root);
    return () => ctx.revert();
  }, [lang]);

  return (
    <section ref={root} id="how" className="px-5 py-14 sm:py-28">
      <SectionHead
        eyebrow={t(lang, "Si funksionon", "How it works")}
        title={t(lang, "Nga postimi te dyqani — në tre hapa.", "From post to shop — in three steps.")}
        sub={t(lang, "Asnjë dyqan për të ndërtuar, asnjë temë për të luftuar. Lidhu dhe vazhdo.", "No store to build, no theme to fight. Connect and go.")}
      />

      <div className="hiw-pin mx-auto mt-10 max-w-6xl sm:mt-14">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* steps */}
          <div className="relative">
            <span className="absolute left-[23px] top-2 hidden h-[calc(100%-1rem)] w-[3px] rounded-full bg-border lg:block" />
            <span
              className="hiw-progress-fill absolute left-[23px] top-2 hidden h-[calc(100%-1rem)] w-[3px] origin-top rounded-full brand-gradient shadow-[0_0_18px_rgba(255,46,77,0.55)] lg:block"
              style={{ transform: "scaleY(0)" }}
            />
            <div className="space-y-8 lg:space-y-10">
              {steps.map((s, i) => (
                <div key={i} className="hiw-step relative pl-16">
                  <span className="hiw-badge absolute left-0 top-0 grid h-12 w-12 origin-center place-items-center rounded-2xl text-white shadow-lg shadow-red-500/30 ring-2 ring-background brand-gradient">
                    <s.Icon className="h-5 w-5" />
                  </span>
                  <div className="hiw-copy">
                    <div className="flex items-baseline gap-2.5">
                      <span className="hiw-num font-display-brand text-[22px] font-bold leading-none brand-text">{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{t(lang, "Hapi", "Step")} {i + 1} / {steps.length}</span>
                    </div>
                    <h3 className="mt-1.5 font-display-brand text-[25px] font-bold tracking-tight text-foreground">{s.title}</h3>
                    <p className="mt-2 max-w-md text-[15px] leading-relaxed text-muted-foreground">{s.body}</p>
                    <span className="mt-3 hidden w-fit items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground lg:inline-flex">
                      <span className="h-1.5 w-1.5 rounded-full brand-gradient" /> {s.url}
                    </span>
                    <div className="mt-5 lg:hidden"><Frame src={s.img} url={s.url} /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* visual (desktop) — crossfades between steps, centred by the pin */}
          <div className="relative hidden aspect-[1440/900] lg:block">
            {/* soft lava halo behind the frames */}
            <div className="brand-gradient absolute -inset-8 -z-10 rounded-[3rem] opacity-[0.13] blur-3xl" aria-hidden />
            {steps.map((s, i) => (
              <div key={i} className={`hiw-visual hiw-visual-${i} absolute inset-0`} style={{ opacity: i === 0 ? 1 : 0 }}>
                <Frame src={s.img} url={s.url} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
