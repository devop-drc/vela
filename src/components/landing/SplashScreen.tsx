import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Brand splash v5 — rebuilt from scratch as a seamless extension of the
 * landing page's own design language instead of a separate dark intro:
 * the page's warm token background with aurora blobs and a soft lava disc,
 * the Vela mark docking into a Clash Display lockup (flexbox-driven, exact
 * on every screen), a hero-style eyebrow pill, and the scroll-progress
 * gradient bar as the loader. Because the canvas matches the page, the
 * exit is a clean lift — no seam when the hero appears. Theme-token
 * colors, so it follows light/dark automatically.
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
        gsap.set([".sv-fx", ".sv-mark", ".sv-letter", ".sv-tag"], { opacity: 1, x: 0, y: 0, scale: 1 });
        gsap.set(".sv-letters", { width: "auto", paddingLeft: "0.22em" });
        gsap.set(".sv-prog", { scaleX: 1 });
        gsap.to(root.current, { opacity: 0, duration: 0.3, delay: 0.5, onComplete: done });
        return;
      }
      const tl = gsap.timeline({ onComplete: done });
      tlRef.current = tl;
      tl
        // the page's ambience fades up first — blobs breathe in
        .from(".sv-fx", { opacity: 0, scale: 1.06, duration: 0.8, ease: "power2.out" }, 0)
        // scroll-progress motif: the gradient bar loads across the top
        .fromTo(".sv-prog", { scaleX: 0 }, { scaleX: 1, duration: 2.0, ease: "power2.inOut" }, 0.1)
        // the mark drops in and settles, its lava halo blooming behind it
        .from(".sv-halo", { opacity: 0, scale: 0.5, duration: 0.9, ease: "power2.out" }, 0.15)
        .from(".sv-mark", { y: -120, opacity: 0, rotate: -12, duration: 0.85, ease: "elastic.out(1, 0.55)" }, 0.2)
        // the lockup opens: letters box grows 0 → auto so flexbox recenters
        // continuously (exact centering on every screen, no pixel offsets)
        .to(".sv-letters", { width: "auto", paddingLeft: "0.22em", duration: 0.55, ease: "power3.inOut" }, 1.0)
        .from(".sv-letter", { yPercent: 120, stagger: 0.05, duration: 0.5, ease: "power4.out" }, 1.1)
        // hero-style eyebrow pill rises beneath the lockup
        .from(".sv-tag", { y: 14, opacity: 0, duration: 0.45, ease: "power3.out" }, 1.35)
        // exit: content lifts, the whole canvas fades into the identical page bg
        .to(".sv-stage", { y: -18, opacity: 0, duration: 0.32, ease: "power2.in" }, 2.25)
        .to(root.current, { opacity: 0, duration: 0.4, ease: "power1.inOut" }, 2.4)
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
      className="fixed inset-0 z-[120] overflow-hidden bg-background"
      aria-label="Vela"
    >
      {/* the landing's own ambience: lava disc + aurora blobs (token-friendly) */}
      <div className="sv-fx pointer-events-none absolute inset-0">
        <div className="brand-gradient absolute left-1/2 top-1/2 h-[70vmax] w-[70vmax] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.13] blur-[100px]" />
        <div
          className="absolute -left-[16vmax] -top-[18vmax] h-[52vmax] w-[52vmax] rounded-full blur-[70px]"
          style={{ background: "radial-gradient(closest-side, rgba(245,158,11,0.16), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-[20vmax] -right-[14vmax] h-[56vmax] w-[56vmax] rounded-full blur-[70px]"
          style={{ background: "radial-gradient(closest-side, rgba(163,18,52,0.15), transparent 70%)" }}
        />
      </div>

      {/* scroll-progress motif as the loader */}
      <div className="sv-prog brand-gradient absolute inset-x-0 top-0 h-[2.5px] origin-left" style={{ transform: "scaleX(0)" }} />

      {/* composition */}
      <div
        className="sv-stage relative flex h-full w-full flex-col items-center justify-center px-6"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="sv-lockup relative flex items-center justify-center">
          <div className="sv-mark relative z-10">
            {/* lava halo behind the mark */}
            <div className="sv-halo brand-gradient absolute -inset-8 rounded-full opacity-30 blur-2xl" />
            <img
              src="/vela-icon.svg"
              alt=""
              className="relative rounded-[24%] shadow-[0_24px_70px_-18px_rgba(255,46,77,0.45)]"
              style={{ width: "clamp(72px, 17vw, 104px)", height: "clamp(72px, 17vw, 104px)" }}
            />
          </div>

          {/* wordmark — starts at width 0 so the mark is exactly screen-
              centered, then the box grows and flexbox re-centers the lockup */}
          <div
            className="sv-letters flex overflow-hidden"
            style={{ fontFamily: "'Clash Display','Satoshi',sans-serif", width: 0, paddingLeft: 0, fontSize: "clamp(50px, 12.5vw, 80px)" }}
          >
            {"Vela".split("").map((c, i) => (
              <span key={i} className="sv-letter inline-block font-semibold leading-none tracking-tight text-foreground">
                {c}
              </span>
            ))}
          </div>
        </div>

        {/* hero-style eyebrow pill */}
        <div className="sv-tag mt-[clamp(20px,4.5vw,30px)] inline-flex max-w-[90vw] items-center gap-2.5 rounded-full border border-border bg-card/80 px-4 py-1.5 backdrop-blur">
          <span className="brand-gradient h-2 w-2 shrink-0 rounded-full" />
          <span
            className="text-center font-semibold uppercase tracking-[0.18em] text-muted-foreground"
            style={{ fontSize: "clamp(10.5px, 2.6vw, 12px)" }}
          >
            Kthe Instagramin në dyqan online
          </span>
        </div>
      </div>
    </div>
  );
}
