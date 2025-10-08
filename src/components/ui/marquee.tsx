import { cn } from "@/lib/utils";
import React from "react";
import FastMarquee from "react-fast-marquee";

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
  return (
    <FastMarquee
      className={cn(
        "overflow-hidden",
        className
      )}
      direction={reverse ? "right" : "left"}
      pauseOnHover={pauseOnHover}
      gradient={false} // Disable gradient for cleaner look, can be re-enabled if needed
      speed={speed}
      delay={0}
      play={true}
      // Pass gap directly to FastMarquee, it handles internal spacing
      // Remove explicit flex styles as FastMarquee manages its own internal layout
      style={{ '--gap': gap } as React.CSSProperties} // Keep --gap for potential custom styling of children if needed
      {...props}
    >
      {children}
    </FastMarquee>
  );
};