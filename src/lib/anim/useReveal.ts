import { type DependencyList } from "react";
import { gsap } from "gsap";
import { useGsap } from "./useGsap";
import { DURATION, EASE, STAGGER, DISTANCE } from "./tokens";

interface RevealOptions {
  /** Elements to reveal within the container. Default `[data-reveal]`. */
  selector?: string;
  /** Rise distance in px. */
  y?: number;
  duration?: number;
  stagger?: number;
  delay?: number;
  ease?: string;
}

/**
 * Entrance reveal: fades + rises the container's `[data-reveal]` children (or a
 * custom selector) once on mount, with a gentle stagger. Reduced-motion safe.
 * If no matching children exist, the container itself is revealed.
 *
 *   const ref = useReveal({}, [rows.length]);
 *   return <div ref={ref}>{rows.map(r => <Card data-reveal key={r.id}/>)}</div>;
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(
  options: RevealOptions = {},
  deps: DependencyList = [],
) {
  const {
    selector = "[data-reveal]",
    y = DISTANCE.base,
    duration = DURATION.base,
    stagger = STAGGER.base,
    delay = 0,
    ease = EASE.soft,
  } = options;

  return useGsap<T>((root) => {
    const matched = selector
      ? Array.from(root.querySelectorAll<HTMLElement>(selector))
      : [];
    const targets = matched.length ? matched : [root];
    gsap.from(targets, {
      y,
      opacity: 0,
      duration,
      stagger,
      delay,
      ease,
      clearProps: "transform,opacity",
    });
  }, deps);
}
