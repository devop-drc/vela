import { cn } from "@/lib/utils";
import React, { useEffect, useRef, useState } from "react";

interface MarqueeProps {
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  children?: React.ReactNode;
  vertical?: boolean;
  speed?: number; // pixels per second
  gap?: string; // CSS gap value
}

export const Marquee = ({
  className,
  reverse,
  pauseOnHover = false,
  children,
  vertical = false,
  speed = 50, // default speed in pixels per second
  gap = "1rem",
  ...props
}: MarqueeProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null); // Ref for the *single* instance of content to measure
  const [duration, setDuration] = useState("0s");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (contentRef.current && containerRef.current && isMounted) {
      const contentElement = contentRef.current;
      
      // Measure the actual size of the *single* instance of the content
      const originalContentSize = vertical ? contentElement.scrollHeight : contentElement.scrollWidth;
      
      // Calculate the total distance for one full loop of the original content + gap
      const gapInPx = parseFloat(gap.replace('rem', '')) * 16; // Convert rem to px
      const scrollDistance = originalContentSize + gapInPx;

      // Duration = Distance / Speed
      const calculatedDuration = scrollDistance / speed;
      setDuration(`${calculatedDuration}s`);
    }
  }, [children, vertical, speed, gap, isMounted]);

  const childrenArray = React.Children.toArray(children);

  // The animated element will contain two copies of the children, separated by a gap.
  // The animation moves by 50% of its total width (which is one copy + half gap).
  // This ensures a seamless loop.
  const contentToAnimate = (
    <>
      {childrenArray.map((child, i) => (
        <React.Fragment key={`original-${i}`}>{child}</React.Fragment>
      ))}
      {/* The gap is now part of the animated content, so it's included in the 50% calculation */}
      {childrenArray.length > 0 && <div style={{ [vertical ? 'height' : 'width']: gap, flexShrink: 0 }} />}
      {childrenArray.map((child, i) => (
        <React.Fragment key={`clone-${i}`}>{child}</React.Fragment>
      ))}
    </>
  );

  return (
    <div
      ref={containerRef}
      {...props}
      className={cn(
        "flex overflow-hidden [--gap:1rem]", // Default gap
        vertical ? "flex-col" : "flex-row",
        className
      )}
      style={{ "--gap": gap } as React.CSSProperties}
    >
      {/* Hidden div to measure the actual width of one set of children */}
      <div
        ref={contentRef}
        className={cn(
          "flex shrink-0 justify-around",
          vertical ? "flex-col" : "flex-row",
          "absolute invisible" // Make it invisible and out of flow for measurement
        )}
        aria-hidden="true"
      >
        {childrenArray.map((child, i) => (
          <React.Fragment key={`measure-${i}`}>{child}</React.Fragment>
        ))}
      </div>

      {/* The actual animated marquee content */}
      <div
        className={cn(
          "flex shrink-0 justify-around [--duration:var(--duration)]",
          vertical ? "flex-col animate-marquee-vertical" : "flex-row animate-marquee",
          pauseOnHover && "group-hover:[animation-play-state:paused]",
          reverse && "direction-reverse" // Custom class for reverse direction
        )}
        style={{ "--duration": duration, "--gap": gap } as React.CSSProperties}
      >
        {contentToAnimate}
      </div>
    </div>
  );
};