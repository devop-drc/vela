/**
 * Canonical stat card for the admin app (replaces the 3 divergent StatCards).
 *
 * - Token-based tones (dark-mode safe) via a semantic `tone`, with legacy
 *   `color` names accepted for drop-in migration.
 * - Optional animated count-up for numeric values (reduced-motion safe).
 * - Premium hover elevation; whole-card link when `to` is set.
 *
 * Lives in ui-app/ (not ui/) per the "never modify shadcn ui/" rule.
 */
import * as React from "react";
import { Link } from "react-router-dom";
import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { type StatusTone } from "@/lib/status";
import { useCountUp } from "@/lib/anim";

type Tone = StatusTone | "brand";

/** Legacy color names → semantic tones (keeps old call sites working). */
const LEGACY_COLOR: Record<string, Tone> = {
  blue: "info",
  emerald: "success",
  green: "success",
  violet: "brand",
  purple: "brand",
  amber: "warning",
  red: "danger",
};

const TILE: Record<Tone, string> = {
  success: "bg-success/10 text-success ring-success/20",
  warning: "bg-warning/10 text-warning ring-warning/20",
  info: "bg-info/10 text-info ring-info/20",
  danger: "bg-destructive/10 text-destructive ring-destructive/20",
  neutral: "bg-muted text-muted-foreground ring-border",
  brand: "bg-primary/10 text-primary ring-primary/20",
};

export interface StatCardProps {
  title: string;
  /** String (rendered as-is) or number (animated count-up via `formatValue`). */
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  tone?: Tone;
  /** @deprecated use `tone` — kept for migration. */
  color?: "blue" | "emerald" | "green" | "violet" | "purple" | "amber" | "red";
  /** Format a numeric `value` for display (currency, thousands, …). */
  formatValue?: (n: number) => string;
  /** When set, the whole card becomes a link to this route. */
  to?: string;
  /** When set, the whole card becomes a button (e.g. a filter toggle). */
  onClick?: () => void;
  /** Active/selected affordance for `onClick` cards (adds a primary ring). */
  active?: boolean;
}

export const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  trendLabel,
  tone,
  color,
  formatValue,
  to,
  onClick,
  active,
}: StatCardProps) => {
  const resolvedTone: Tone = tone ?? (color ? LEGACY_COLOR[color] ?? "info" : "brand");
  const t = TILE[resolvedTone];

  const isNumeric = typeof value === "number";
  const fmt = formatValue ?? ((n: number) => Math.round(n).toLocaleString());
  const countRef = useCountUp(isNumeric ? (value as number) : 0, { format: fmt });

  const inner = (
    <>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <div className={cn("grid place-items-center rounded-lg p-2 ring-1 ring-inset", t)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold leading-tight tabular-nums text-foreground">
        {isNumeric ? (
          <span ref={countRef}>{fmt(value as number)}</span>
        ) : (
          value
        )}
      </p>
      {description && (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      )}
      {trend && trend !== "neutral" && trendLabel && (
        <span
          className={cn(
            "mt-1 inline-flex items-center gap-1 text-[10px] font-medium",
            trend === "up" ? "text-success" : "text-destructive",
          )}
        >
          {trend === "up" ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {trendLabel}
        </span>
      )}
    </>
  );

  const base = "block rounded-lg border bg-card px-4 py-3.5 shadow-sm transition-all duration-200";

  if (to) {
    return (
      <Link
        to={to}
        className={cn(
          base,
          "cursor-pointer outline-none hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring",
        )}
        aria-label={`${title}: ${isNumeric ? fmt(value as number) : value}`}
      >
        {inner}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          base,
          "w-full cursor-pointer text-left outline-none hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring",
          active && "ring-2 ring-primary",
        )}
      >
        {inner}
      </button>
    );
  }

  return <div className={base}>{inner}</div>;
};

export default StatCard;
