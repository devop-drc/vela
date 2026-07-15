import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import { DURATION, EASE } from "./tokens";

interface CountUpOptions {
  duration?: number;
  /** Format the tweened number for display (e.g. currency, thousands). */
  format?: (n: number) => string;
}

/**
 * Tweens a numeric value from its previous value to the new one, writing the
 * formatted result into the returned ref's element. Reduced-motion safe (jumps
 * straight to the final value).
 *
 *   const ref = useCountUp(revenue, { format: (n) => formatCurrency(n) });
 *   return <span ref={ref}>{format(revenue)}</span>; // initial SSR/first paint
 */
export function useCountUp<T extends HTMLElement = HTMLSpanElement>(
  value: number,
  options: CountUpOptions = {},
) {
  const ref = useRef<T>(null);
  const reduced = usePrefersReducedMotion();
  const prev = useRef(0);
  const format = options.format ?? ((n: number) => Math.round(n).toLocaleString());

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const to = Number.isFinite(value) ? value : 0;

    if (reduced) {
      el.textContent = format(to);
      prev.current = to;
      return;
    }

    const obj = { n: prev.current };
    const tween = gsap.to(obj, {
      n: to,
      duration: options.duration ?? DURATION.slow,
      ease: EASE.out,
      onUpdate: () => {
        el.textContent = format(obj.n);
      },
    });
    prev.current = to;
    return () => tween.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced]);

  return ref;
}
