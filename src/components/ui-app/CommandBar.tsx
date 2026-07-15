/**
 * Canonical command bar — the elevated toolbar card that sits atop list pages
 * (Products, Orders, Inventory…). A rounded, bordered, softly-shadowed surface
 * that houses search + primary actions on one row and, optionally, a secondary
 * row of view controls / filters.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface CommandBarProps {
  /** Main row content (search, primary actions). */
  children: React.ReactNode;
  /** Optional secondary row (view toggles, filters, sort). */
  secondary?: React.ReactNode;
  className?: string;
}

export const CommandBar = ({ children, secondary, className }: CommandBarProps) => {
  return (
    <div
      className={cn(
        "rounded-xl border bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2 p-2.5 sm:gap-3 sm:p-3">
        {children}
      </div>
      {secondary && (
        <div className="flex flex-wrap items-center gap-2 border-t px-3 py-2">
          {secondary}
        </div>
      )}
    </div>
  );
};

export default CommandBar;
