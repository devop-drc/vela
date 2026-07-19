import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Brand splash v4 — rebuilt from scratch around the real (recolored) Vela mark.
 * A dark wine canvas with a lava glow blooming from below; the mark drops in
 * with an elastic settle while a gradient ring draws itself around it; the
 * wordmark letters rise and the mark DOCKS beside them into the lockup; a thin
 * gradient loader fills; then a circular mask blows open to reveal the page.
 *
 * Honors reduced motion; tap fast-forwards; `?holdsplash` freezes for QA.
 */
export default function SplashScreen({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  // keep the latest onDone in a ref so the timeline is built ONCE — otherwise a
  // parent re-render (new onDone identity) would restart the splash on a loop.
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useLayoutEffect(() => {
    const done = () => doneRef.current();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      if (reduce) {
        gsap.set([".sv-mark", ".sv-letter", ".sv-glow", ".sv-loader", ".sv-lockup"], { opacity: 1, x: 0, y: 0, scale: 1 });
        gsap.set(".sv-ring-path", { strokeDashoffset: 0 });
        gsap.to(root.current, { opacity: 0, duration: 0.3, delay: 0.5, onComplete: done });
        return;
      }
      const tl = gsap.timeline({ onComplete: done });
      tlRef.current = tl;
      tl
        // lava glow blooms from the deep
        .from(".sv-glow", { yPercent: 45, opacity: 0, scale: 0.7, duration: 0.9, ease: "power2.out" }, 0)
        // the mark drops in and settles
        .from(".sv-mark", { y: -160, opacity: 0, rotate: -14, duration: 0.85, ease: "elastic.out(1, 0.5)" }, 0.12)
        // gradient ring draws itself around the mark
        .to(".sv-ring-path", { strokeDashoffset: 0, duration: 0.7, ease: "power2.inOut" }, 0.28)
        // ring releases outward as a pulse and fades
        .to(".sv-ring", { scale: 1.5, opacity: 0, duration: 0.55, ease: "power2.out" }, 1.0)
        // the mark docks left while the wordmark letters rise beside it
        .to(".sv-mark", { x: -86, duration: 0.6, ease: "power3.inOut" }, 1.08)
        .to(".sv-letters", { width: "auto", duration: 0 }, 1.08)
        .from(".sv-letter", { yPercent: 120, opacity: 0, stagger: 0.055, duration: 0.5, ease: "power4.out" }, 1.18)
        // loader line fills under the lockup
        .fromTo(".sv-loader-fill", { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: "power2.inOut" }, 1.3)
        .from(".sv-tag", { opacity: 0, y: 10, duration: 0.4, ease: "power2.out" }, 1.45)
        // exit: lockup sinks slightly, then a circular mask blows the screen open
        .to(".sv-lockup, .sv-tag, .sv-loader", { scale: 0.96, opacity: 0, duration: 0.28, ease: "power2.in" }, 2.25)
        .to(root.current, { clipPath: "circle(0% at 50% 50%)", duration: 0.55, ease: "power4.inOut" }, 2.4)
        .set(root.current, { pointerEvents: "none" }, 2.4);

      if (new URLSearchParams(window.location.search).has("holdsplash")) tl.pause(1.9);
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
    <div
      ref={root}
      onPointerDown={skip}
      className="fixed inset-0 z-[120] overflow-hidden"
      style={{ background: "#140A0E", clipPath: "circle(150% at 50% 50%)" }}
      aria-label="Vela"
    >
      {/* lava glow rising from the bottom edge */}
      <div
        className="sv-glow pointer-events-none absolute left-1/2 top-[62%] h-[130vmax] w-[130vmax] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(255,46,77,0.5), rgba(163,18,52,0.35) 34%, rgba(127,29,59,0.18) 55%, transparent 72%)",
          filter: "blur(30px)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(90% 70% at 50% 38%, transparent 30%, rgba(20,10,14,0.55) 100%)" }}
      />

      {/* composition */}
      <div className="relative flex h-full w-full flex-col items-center justify-center px-6" style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="sv-lockup relative flex items-center justify-center">
          {/* the real Vela mark */}
          <div className="sv-mark relative z-10">
            <img
              src="/vela-icon.svg"
              alt=""
              className="rounded-[24%] shadow-[0_30px_80px_-20px_rgba(255,46,77,0.45)]"
              style={{ width: "clamp(76px, 18vw, 112px)", height: "clamp(76px, 18vw, 112px)" }}
            />
            {/* self-drawing gradient ring */}
            <svg className="sv-ring pointer-events-none absolute -inset-5" viewBox="0 0 100 100" style={{ transformOrigin: "50% 50%" }}>
              <defs>
                <linearGradient id="svg-ring-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#FACC15" />
                  <stop offset="0.5" stopColor="#FF2E4D" />
                  <stop offset="1" stopColor="#7F1D3B" />
                </linearGradient>
              </defs>
              <circle
                className="sv-ring-path"
                cx="50" cy="50" r="46"
                fill="none" stroke="url(#svg-ring-grad)" strokeWidth="2.5" strokeLinecap="round"
                strokeDasharray="289" strokeDashoffset="289"
                transform="rotate(-90 50 50)"
              />
            </svg>
          </div>

          {/* wordmark — revealed as the mark docks left */}
          <div
            className="sv-letters flex overflow-hidden pl-5"
            style={{ fontFamily: "'Clash Display','Satoshi',sans-serif" }}
          >
            {"Vela".split("").map((c, i) => (
              <span
                key={i}
                className="sv-letter inline-block font-bold leading-none text-white"
                style={{ fontSize: "clamp(52px, 13vw, 84px)", letterSpacing: "-0.02em" }}
              >{c}</span>
            ))}
          </div>
        </div>

        {/* gradient loader line */}
        <div className="sv-loader mt-[clamp(22px,5vw,34px)] h-[3px] w-[min(56vw,260px)] overflow-hidden rounded-full bg-white/10">
          <div
            className="sv-loader-fill h-full w-full origin-left rounded-full"
            style={{ background: "linear-gradient(90deg,#FACC15,#F59E0B 30%,#FF2E4D 65%,#A31234)", transform: "scaleX(0)" }}
          />
        </div>

        <p
          className="sv-tag mt-[clamp(14px,3vw,20px)] max-w-[88vw] text-center font-semibold uppercase text-white/70"
          style={{ fontSize: "clamp(11px, 2.8vw, 13px)", fontFamily: "'Satoshi','Inter',sans-serif", letterSpacing: "0.24em" }}
        >
          Kthe Instagramin në dyqan online
        </p>
      </div>
    </div>
  );
}
