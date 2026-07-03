import { useEffect, RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Scroll-reveal for the landing page. Any element with the `.reveal` class
 * inside `scopeRef` fades + rises into view once. Respects reduced-motion.
 * All triggers are scoped to `scopeRef` via gsap.context and reverted on unmount.
 */
export function useReveal(scopeRef: RefObject<HTMLElement>) {
  useEffect(() => {
    const el = scopeRef.current;
    if (!el) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>(".reveal");
      if (!items.length) return;

      if (prefersReduced) {
        gsap.set(items, { opacity: 1, y: 0 });
        return;
      }

      gsap.set(items, { opacity: 0, y: 32 });
      ScrollTrigger.batch(items, {
        start: "top 88%",
        once: true,
        onEnter: (batch) =>
          gsap.to(batch, {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.08,
          }),
      });

      // Recompute positions once fonts/images settle.
      ScrollTrigger.refresh();
    }, el);

    return () => ctx.revert();
  }, [scopeRef]);
}
