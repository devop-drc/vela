import { cn } from "@/lib/utils";
import React from "react";
import { motion } from "framer-motion";

interface MarqueeProps {
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  children?: React.ReactNode;
  vertical?: boolean;
  repeat?: number;
  duration?: string; // Tailwind duration class, e.g., 'duration-[30s]'
  gap?: string; // Tailwind gap class, e.g., 'gap-4'
}

export function Marquee({
  className,
  reverse,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  duration = 'duration-[30s]',
  gap = 'gap-4',
}: MarqueeProps) {
  return (
    <div
      className={cn(
        "flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]",
        vertical && "[mask-image:linear-gradient(to_bottom,transparent,white_20%,white_80%,transparent)]",
        className
      )}
    >
      <motion.div
        className={cn(
          "flex w-max items-center justify-center",
          gap,
          vertical && "flex-col h-max",
          reverse ? "animate-marquee-reverse" : "animate-marquee",
          pauseOnHover && "group-hover:paused",
          duration,
          vertical && (reverse ? "animate-marquee-vertical-reverse" : "animate-marquee-vertical")
        )}
        style={{ '--duration': duration.replace('duration-[', '').replace('s]', 's'), '--gap': gap.replace('gap-', '') }}
      >
        {Array(repeat)
          .fill(0)
          .map((_, i) => (
            <React.Fragment key={i}>{children}</React.Fragment>
          ))}
      </motion.div>
    </div>
  );
}