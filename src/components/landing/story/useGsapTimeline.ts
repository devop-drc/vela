import { useLayoutEffect, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import gsap from "gsap";

/**
 * Drives a *paused* GSAP timeline deterministically from Remotion's frame clock.
 *
 * GSAP is time-based and imperative; Remotion is frame-based and declarative.
 * We reconcile them by building the timeline once (paused) and, on every frame,
 * seeking it to `frame / fps`. Because we seek in useLayoutEffect (synchronous,
 * pre-paint) the inline styles GSAP writes are in place before Remotion's Player
 * — or the headless renderer — reads the DOM. This gives us GSAP's eases while
 * staying fully deterministic and scrub-safe.
 *
 * Build your timeline with selectors scoped to the returned ref (via
 * gsap.context), e.g. `tl.from(".title", { y: 40, opacity: 0, duration: 0.8 })`.
 */
export function useGsapTimeline(
  build: (tl: gsap.core.Timeline, root: HTMLDivElement) => void,
  deps: React.DependencyList = [],
) {
  const root = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  useLayoutEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context(() => {
      const timeline = gsap.timeline({ paused: true });
      build(timeline, root.current!);
      tl.current = timeline;
    }, root);
    return () => {
      ctx.revert();
      tl.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useLayoutEffect(() => {
    // suppressEvents = false so onUpdate callbacks (e.g. number counters that
    // write to the DOM) fire on every scrub, not just during live playback.
    tl.current?.seek(frame / fps, false);
  });

  return root;
}
