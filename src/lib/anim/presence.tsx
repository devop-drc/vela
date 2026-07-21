/**
 * GSAP replacements for the framer-motion patterns the app used:
 *
 *  <Reveal>            — entrance on mount (fade/rise/scale, springy eases)
 *  usePresence(open)   — mount/unmount with a real exit animation
 *  <Collapse open>     — height auto expand/collapse
 *
 * All reduced-motion aware. Import from `@/lib/anim`.
 */
import {
  createElement, forwardRef, useEffect, useLayoutEffect, useRef, useState,
  type CSSProperties, type ElementType, type ReactNode,
} from "react";
import gsap from "gsap";

const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export type RevealFrom = "fade" | "up" | "down" | "left" | "right" | "scale";

const FROM_VARS: Record<RevealFrom, gsap.TweenVars> = {
  fade: {},
  up: { y: 18 },
  down: { y: -18 },
  left: { x: 18 },
  right: { x: -18 },
  scale: { scale: 0.94 },
};

/** Entrance animation on mount. Drop-in for `motion.div initial/animate`. */
export const Reveal = forwardRef<HTMLElement, {
  as?: ElementType;
  from?: RevealFrom;
  delay?: number;
  duration?: number;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  /** Re-play the entrance when this key changes (route transitions etc.). */
  playKey?: string | number;
  [key: string]: unknown;
}>(({ as = "div", from = "up", delay = 0, duration = 0.45, playKey, children, ...rest }, fwdRef) => {
  const localRef = useRef<HTMLElement | null>(null);
  const setRef = (node: HTMLElement | null) => {
    localRef.current = node;
    if (typeof fwdRef === "function") fwdRef(node);
    else if (fwdRef) (fwdRef as React.MutableRefObject<HTMLElement | null>).current = node;
  };
  useLayoutEffect(() => {
    const el = localRef.current;
    if (!el) return;
    if (prefersReduced()) { gsap.set(el, { opacity: 1, x: 0, y: 0, scale: 1 }); return; }
    const tween = gsap.fromTo(
      el,
      { opacity: 0, ...FROM_VARS[from] },
      { opacity: 1, x: 0, y: 0, scale: 1, duration, delay, ease: from === "scale" ? "back.out(1.6)" : "power3.out", clearProps: "transform" },
    );
    return () => { tween.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playKey]);
  return createElement(as, { ref: setRef, ...rest }, children);
});
Reveal.displayName = "Reveal";

/**
 * Exit-aware conditional rendering — the AnimatePresence replacement.
 *
 *   const p = usePresence(open);
 *   if (!p.mounted) return null;
 *   return <div ref={p.ref} ... />           // entrance plays automatically
 */
export function usePresence(open: boolean, opts?: {
  from?: RevealFrom;
  duration?: number;
  exit?: gsap.TweenVars;
}) {
  const [mounted, setMounted] = useState(open);
  const ref = useRef<HTMLElement | null>(null);
  const from = opts?.from ?? "up";
  const duration = opts?.duration ?? 0.35;

  useEffect(() => {
    const el = ref.current;
    if (open) {
      setMounted(true);
      return;
    }
    if (!mounted) return;
    if (!el || prefersReduced()) { setMounted(false); return; }
    const tween = gsap.to(el, {
      opacity: 0,
      ...(opts?.exit ?? FROM_VARS[from]),
      duration: duration * 0.8,
      ease: "power2.in",
      onComplete: () => setMounted(false),
    });
    return () => { tween.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // entrance when (re)mounted while open
  useLayoutEffect(() => {
    const el = ref.current;
    if (!mounted || !open || !el) return;
    if (prefersReduced()) { gsap.set(el, { opacity: 1, x: 0, y: 0, scale: 1 }); return; }
    gsap.fromTo(el, { opacity: 0, ...FROM_VARS[from] }, { opacity: 1, x: 0, y: 0, scale: 1, duration, ease: "power3.out" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  return { mounted, ref: ref as React.MutableRefObject<any> };
}

/** Height-auto expand/collapse (framer's animate={{height}} pattern). */
export const Collapse = ({ open, children, className }: { open: boolean; children: ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (first.current) {
      first.current = false;
      gsap.set(el, { height: open ? "auto" : 0, opacity: open ? 1 : 0, overflow: "hidden" });
      return;
    }
    if (prefersReduced()) { gsap.set(el, { height: open ? "auto" : 0, opacity: open ? 1 : 0 }); return; }
    gsap.to(el, open
      ? { height: "auto", opacity: 1, duration: 0.4, ease: "power3.out" }
      : { height: 0, opacity: 0, duration: 0.32, ease: "power2.in" });
  }, [open]);
  return <div ref={ref} className={className} style={{ overflow: "hidden" }}>{children}</div>;
};
