import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Clean, quick brand splash. The sail mark blooms in with a soft gradient glow,
 * "Vela" rises letter‑by‑letter, a short hold, then the whole panel lifts away
 * like a curtain to reveal the page. Honors reduced‑motion. ~2.4s total.
 */
export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  // keep the latest onDone in a ref so the timeline is built ONCE — otherwise a
  // parent re-render (new onDone identity) would restart the splash on a loop.
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useLayoutEffect(() => {
    const done = () => doneRef.current();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduce) {
        gsap.set([".sp-mark", ".sp-letter", ".sp-glow", ".sp-tag"], { opacity: 1, y: 0, scale: 1 });
        gsap.to(root.current, { opacity: 0, duration: 0.3, delay: 0.35, onComplete: done });
        return;
      }
      // ~2s: bloom in, a gentle float hold, then curtain away
      const tl = gsap.timeline({ onComplete: done });
      tl.from(".sp-glow", { scale: 0.5, opacity: 0, duration: 0.6, ease: "power2.out" }, 0)
        .to(".sp-glow", { rotate: 24, duration: 2.0, ease: "none" }, 0)
        .from(".sp-mark", { scale: 0.6, opacity: 0, y: 18, duration: 0.6, ease: "back.out(1.7)" }, 0)
        .from(".sp-letter", { yPercent: 110, opacity: 0, stagger: 0.05, duration: 0.5, ease: "power4.out" }, 0.2)
        .from(".sp-tag", { opacity: 0, y: 8, duration: 0.4, ease: "power2.out" }, 0.45)
        .to(".sp-mark", { y: -7, duration: 0.7, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0.75)
        .to(".sp-content", { y: -22, opacity: 0, duration: 0.32, ease: "power3.in" }, 1.5)
        .to(root.current, { yPercent: -100, duration: 0.42, ease: "power4.inOut" }, 1.55);
    }, root);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={root} className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden" style={{ background: "#FBF8F4" }}>
      <div
        className="sp-glow pointer-events-none absolute h-[560px] w-[560px] rounded-full"
        style={{ filter: "blur(80px)", opacity: 0.5, background: "conic-gradient(from 90deg, #FEDA75, #D62976, #962FBF, #4F5BD5, #FEDA75)" }}
      />
      <div className="sp-content relative flex flex-col items-center">
        <img src="/vela-icon.svg" alt="Vela" className="sp-mark h-28 w-28 rounded-[26px] shadow-[0_30px_70px_-20px_rgba(40,15,60,0.35)]" />
        <div className="mt-6 flex overflow-hidden" style={{ fontFamily: "'Clash Display','Satoshi',sans-serif" }}>
          {"Vela".split("").map((c, i) => (
            <span key={i} className="sp-letter inline-block text-[62px] font-bold leading-none text-zinc-900">{c}</span>
          ))}
        </div>
        <div className="sp-tag mt-3.5 text-[16px] font-semibold tracking-wide text-zinc-700">Nga Instagram në e‑commerce, brenda minutash.</div>
      </div>
    </div>
  );
}
