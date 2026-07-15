/**
 * Canonical empty / zero-data state. Tinted icon, title, supporting copy, and
 * optional action(s). Use everywhere a list, table, or panel can be empty so
 * the "nothing here" moment feels intentional and on-brand.
 */
import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  /** Primary/secondary buttons or any node. */
  action?: React.ReactNode;
  className?: string;
  /** Compact variant for inline/panel usage. */
  compact?: boolean;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact,
}: EmptyStateProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "gap-2 py-8" : "gap-3 py-16",
        className,
      )}
    >
      {Icon && (
        <div
          className={cn(
            "grid place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15",
            compact ? "h-10 w-10" : "h-14 w-14",
          )}
        >
          <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} />
        </div>
      )}
      <div className="space-y-1">
        <h3 className={cn("font-heading font-medium tracking-tight", compact ? "text-sm" : "text-base")}>
          {title}
        </h3>
        {description && (
          <p className={cn("mx-auto max-w-sm text-muted-foreground", compact ? "text-xs" : "text-sm")}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1 flex flex-wrap items-center justify-center gap-2">{action}</div>}
    </div>
  );
};

export default EmptyState;
