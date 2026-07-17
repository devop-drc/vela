import { useLayoutEffect, useMemo, useRef } from "react";
import gsap from "gsap";

/**
 * Brand splash, rebuilt mobile-first. A horizon line draws across the screen,
 * the sail mark rises from behind it (gently rocking, like a boat coming over
 * the horizon), the wordmark climbs out letter by letter — then the screen
 * splits along the horizon and both halves slide away to reveal the page.
 *
 * All sizes are fluid (clamp/vw) so it composes on a 320px phone and a 4k
 * display alike; honors reduced motion; a tap fast-forwards it. ~2.3s total.
 */
export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  // keep the latest onDone in a ref so the timeline is built ONCE — otherwise a
  // parent re-render (new onDone identity) would restart the splash on a loop.
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  // The splash shows before the page paints, so it matches the visitor's saved
  // landing theme instead of flashing cream at a dark-mode user.
  const dark = useMemo(() => {
    try { return localStorage.getItem("landing-theme") === "dark"; } catch { return false; }
  }, []);
  const bg = dark ? "#100D16" : "#FBF8F4";
  const ink = dark ? "text-zinc-50" : "text-zinc-900";
  const sub = dark ? "text-zinc-400" : "text-zinc-600";

  useLayoutEffect(() => {
    const done = () => doneRef.current();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduce) {
        gsap.set([".sp-mark", ".sp-letter", ".sp-glow", ".sp-tag", ".sp-line"], { opacity: 1, y: 0, scale: 1, scaleX: 1, rotate: 0 });
        gsap.to(root.current, { opacity: 0, duration: 0.3, delay: 0.4, onComplete: done });
        return;
      }
      const tl = gsap.timeline({ onComplete: done });
      tlRef.current = tl;
      tl
        // Backdrop glow blooms
        .from(".sp-glow", { scale: 0.4, opacity: 0, duration: 0.7, ease: "power2.out" }, 0)
        // Horizon draws from the center outward
        .fromTo(".sp-line", { scaleX: 0 }, { scaleX: 1, duration: 0.55, ease: "power3.inOut" }, 0.05)
        // The boat rises over the horizon, rocking slightly as it settles
        .from(".sp-mark", { yPercent: 118, duration: 0.75, ease: "power3.out" }, 0.38)
        .fromTo(".sp-mark", { rotate: -6 }, { rotate: 0, duration: 1.0, ease: "elastic.out(1, 0.45)" }, 0.5)
        // Wordmark climbs out of the horizon
        .from(".sp-letter", { yPercent: 115, stagger: 0.055, duration: 0.55, ease: "power4.out" }, 0.62)
        .from(".sp-tag", { opacity: 0, y: 8, duration: 0.4, ease: "power2.out" }, 1.0)
        // Idle bob — the boat floats while the panel holds
        .to(".sp-mark", { y: -5, duration: 0.6, ease: "sine.inOut", yoyo: true, repeat: 1 }, 1.1)
        // Exit: content sinks back behind the horizon, the line flares, then
        // the screen splits along it — halves slide apart like a curtain.
        .to([".sp-mark", ".sp-letters", ".sp-tag"], { yPercent: 20, opacity: 0, duration: 0.28, ease: "power2.in" }, 1.75)
        .to(".sp-line", { opacity: 0, duration: 0.3 }, 1.95)
        .to(".sp-half-top", { yPercent: -100, duration: 0.5, ease: "power4.inOut" }, 1.9)
        .to(".sp-half-bottom", { yPercent: 100, duration: 0.5, ease: "power4.inOut" }, 1.9)
        .set(root.current, { pointerEvents: "none" }, 1.9);
      // Design QA: /?holdsplash freezes the fully-composed frame.
      if (new URLSearchParams(window.location.search).has("holdsplash")) tl.pause(1.4);
    }, root);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A tap fast-forwards the splash instead of making the visitor sit through it.
  const skip = () => {
    const tl = tlRef.current;
    if (tl && tl.progress() < 1) tl.timeScale(4);
  };

  return (
    <div ref={root} onPointerDown={skip} className="fixed inset-0 z-[120] overflow-hidden" aria-label="Vela">
      {/* Split-curtain halves — the visible background. */}
      <div className="sp-half-top absolute inset-x-0 top-0 h-1/2" style={{ background: bg }} />
      <div className="sp-half-bottom absolute inset-x-0 bottom-0 h-1/2" style={{ background: bg }} />

      {/* Soft brand glow, proportional to the viewport. */}
      <div
        className="sp-glow pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: "min(140vw, 560px)",
          height: "min(140vw, 560px)",
          filter: "blur(80px)",
          opacity: dark ? 0.35 : 0.5,
          background: "conic-gradient(from 90deg, #FEDA75, #D62976, #962FBF, #4F5BD5, #FEDA75)",
        }}
      />

      {/* Composition — anchored to the visual center, safe-area aware. */}
      <div className="relative flex h-full w-full flex-col items-center justify-center px-6" style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {/* The mark rises out of an overflow mask that ends at the horizon. */}
        <div className="overflow-hidden pb-[clamp(10px,3vw,16px)]">
          <img
            src="/vela-icon.svg"
            alt=""
            className="sp-mark rounded-[22%] shadow-[0_30px_70px_-20px_rgba(40,15,60,0.35)]"
            style={{ width: "clamp(68px, 20vw, 104px)", height: "clamp(68px, 20vw, 104px)" }}
          />
        </div>

        {/* Horizon line. */}
        <div
          className="sp-line h-px w-[min(72vw,320px)] origin-center"
          style={{ background: "linear-gradient(90deg, transparent, #D62976 20%, #962FBF 50%, #4F5BD5 80%, transparent)" }}
        />

        {/* Wordmark climbs out from under the line. */}
        <div className="sp-letters mt-[clamp(12px,3.5vw,18px)] flex overflow-hidden" style={{ fontFamily: "'Clash Display','Satoshi',sans-serif" }}>
          {"Vela".split("").map((c, i) => (
            <span
              key={i}
              className={`sp-letter inline-block font-bold leading-none ${ink}`}
              style={{ fontSize: "clamp(42px, 13vw, 60px)" }}
            >{c}</span>
          ))}
        </div>

        <p className={`sp-tag mt-[clamp(10px,3vw,14px)] max-w-[85vw] text-center font-semibold tracking-wide ${sub}`} style={{ fontSize: "clamp(13px, 3.6vw, 16px)" }}>
          Nga Instagram në e‑commerce, brenda minutash.
        </p>
      </div>
    </div>
  );
}
