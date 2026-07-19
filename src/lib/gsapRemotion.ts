/**
 * GSAP ↔ Remotion bridge. Build a PAUSED gsap timeline once, then seek it to
 * the current Remotion frame every render — deterministic, so renders are
 * frame-exact while animations are authored with gsap's timeline API.
 */
import gsap from "gsap";
import { useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";

export const useGsapTimeline = <T extends HTMLElement = HTMLDivElement>(
  build: (scope: T) => gsap.core.Timeline,
) => {
  const scopeRef = useRef<T>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const [handle] = useState(() => delayRender("gsap timeline"));
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  useLayoutEffect(() => {
    if (!scopeRef.current) return;
    const ctx = gsap.context(() => {
      tlRef.current = build(scopeRef.current as T).pause();
    }, scopeRef);
    continueRender(handle);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Seek AFTER the build effect (declared later → runs later on mount).
  useLayoutEffect(() => {
    tlRef.current?.seek(frame / fps, false);
  }, [frame, fps]);

  return scopeRef;
};
