import { useLayoutEffect, useRef, type DependencyList } from "react";
import { gsap } from "gsap";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Scoped GSAP hook. Runs `factory(root)` inside a `gsap.context` bound to the
 * returned ref, so any selector strings used inside auto-scope to the element
 * and everything is reverted on unmount / dep-change (no leaked tweens).
 *
 * Reduced-motion aware: when the user prefers reduced motion the factory never
 * runs, so elements stay at their natural (final) state. IMPORTANT: never
 * pre-hide reveal targets via CSS — use `gsap.from(...)` inside the factory so
 * that skipping the animation leaves them visible.
 *
 *   const ref = useGsap((root) => {
 *     gsap.from(root.querySelectorAll("[data-reveal]"), { y: 16, opacity: 0, stagger: 0.06 });
 *   }, [items.length]);
 *   return <div ref={ref}>…</div>;
 */
export function useGsap<T extends HTMLElement = HTMLDivElement>(
  factory: (root: T) => void,
  deps: DependencyList = [],
) {
  const ref = useRef<T>(null);
  const reduced = usePrefersReducedMotion();

  useLayoutEffect(() => {
    if (reduced || !ref.current) return;
    const root = ref.current;
    const ctx = gsap.context(() => factory(root), root);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, ...deps]);

  return ref;
}
