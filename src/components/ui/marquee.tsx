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
      style={{
        '--gap': gap,
        display: 'flex', // Ensure flex context for children
        flexDirection: vertical ? 'column' : 'row',
        alignItems: 'center', // Center items vertically
        justifyContent: 'center', // Center items horizontally
      } as React.CSSProperties}
      {...props}
    >
      {children}
    </FastMarquee>
  );
};