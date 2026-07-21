import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Scroll-velocity marquee (GSAP rewrite of the React Bits component).
 * Rows drift at a base speed — alternating direction per row — and fast
 * scrolling momentarily accelerates the drift, decaying back smoothly.
 */
interface ScrollVelocityProps {
  texts: React.ReactNode[];
  velocity?: number;
  numCopies?: number;
  className?: string;
  [key: string]: unknown;
}

const Row = ({ children, baseVelocity, numCopies, className }: {
  children: React.ReactNode;
  baseVelocity: number;
  numCopies: number;
  className?: string;
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const track = trackRef.current;
    const copy = copyRef.current;
    if (!track || !copy) return;

    let x = 0;
    let lastScroll = window.scrollY;
    let boost = 0;
    const dir = baseVelocity >= 0 ? 1 : -1;
    const speed = Math.abs(baseVelocity);

    const tick = (_t: number, deltaMs: number) => {
      const dt = Math.min(deltaMs, 64) / 1000; // clamp tab-switch spikes
      const scroll = window.scrollY;
      // decaying boost fed by scroll velocity (px/frame → gentle multiplier)
      boost = gsap.utils.clamp(-5, 5, boost * 0.92 + (scroll - lastScroll) * 0.015);
      lastScroll = scroll;
      x += dir * speed * (1 + Math.abs(boost)) * dt;
      const w = copy.offsetWidth || 1;
      const wrapped = ((x % w) + w) % w;
      gsap.set(track, { x: -wrapped });
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, [baseVelocity]);

  return (
    <div className="overflow-hidden whitespace-nowrap">
      <div ref={trackRef} className="inline-flex will-change-transform">
        {Array.from({ length: numCopies }, (_, i) => (
          <span key={i} ref={i === 0 ? copyRef : undefined} className={`shrink-0 ${className ?? ""}`}>
            {children}
          </span>
        ))}
      </div>
    </div>
  );
};

export default function ScrollVelocity({ texts, velocity = 100, numCopies = 6, className }: ScrollVelocityProps) {
  return (
    <section>
      {texts.map((text, i) => (
        <Row key={i} baseVelocity={i % 2 === 0 ? velocity : -velocity} numCopies={numCopies} className={className}>
          {text}
        </Row>
      ))}
    </section>
  );
}
