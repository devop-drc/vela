/**
 * StatusBadge — the single canonical status chip for the admin app.
 *
 * Wraps a plain element (NOT shadcn ui/, per the "never modify ui/" rule) with
 * the token-based tone recipes from src/lib/status.ts, so every status pill is
 * dark-mode safe and visually consistent. Pass a `tone` directly, or use the
 * domain helpers (orderStatusTone, stockTone, …) to derive one.
 *
 *   <StatusBadge tone={orderStatusTone(order.status)}>{order.status}</StatusBadge>
 *   <StatusBadge tone="warning" variant="solid" dot>Low stock</StatusBadge>
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import {
  type StatusTone,
  toneTint,
  toneSolid,
  toneDotBg,
} from "@/lib/status";

type Variant = "tint" | "solid";
type Size = "sm" | "md";

const sizeClasses: Record<Size, string> = {
  sm: "h-5 px-2 text-[11px] gap-1",
  md: "h-6 px-2.5 text-xs gap-1.5",
};

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  tone: StatusTone;
  variant?: Variant;
  size?: Size;
  /** Render a leading status dot. */
  dot?: boolean;
  /** Optional leading icon (lucide element). Overrides `dot`. */
  icon?: React.ReactNode;
}

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  (
    { tone, variant = "tint", size = "md", dot, icon, className, children, ...props },
    ref,
  ) => {
    const recipe = variant === "solid" ? toneSolid : toneTint;
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center whitespace-nowrap rounded-full border font-medium leading-none",
          sizeClasses[size],
          recipe[tone],
          className,
        )}
        {...props}
      >
        {icon ? (
          <span className="shrink-0 [&_svg]:h-3 [&_svg]:w-3">{icon}</span>
        ) : dot ? (
          <span
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              variant === "solid" ? "bg-current opacity-80" : toneDotBg[tone],
            )}
          />
        ) : null}
        {children}
      </span>
    );
  },
);
StatusBadge.displayName = "StatusBadge";

/** Bare status dot (indicator) — same tone system, no label. */
export const StatusDot = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & { tone: StatusTone; pulse?: boolean }
>(({ tone, pulse, className, ...props }, ref) => (
  <span
    ref={ref}
    className={cn("relative inline-flex h-2 w-2 shrink-0", className)}
    {...props}
  >
    {pulse && (
      <span
        className={cn(
          "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
          toneDotBg[tone],
        )}
      />
    )}
    <span
      className={cn(
        "relative inline-flex h-2 w-2 rounded-full",
        toneDotBg[tone],
      )}
    />
  </span>
));
StatusDot.displayName = "StatusDot";

export default StatusBadge;
