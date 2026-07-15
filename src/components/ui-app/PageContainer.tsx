/**
 * Canonical page shell for admin routes — consistent max-width, horizontal
 * padding, and vertical rhythm, plus an optional page header (title +
 * description + actions). Keeps every page's outer spacing identical.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageContainerProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Right-aligned header actions (buttons, etc.). */
  actions?: React.ReactNode;
  /** Cap content width. Default "xl" (7xl). "full" removes the cap. */
  width?: "md" | "lg" | "xl" | "full";
  className?: string;
  headerClassName?: string;
  children: React.ReactNode;
}

const WIDTHS: Record<NonNullable<PageContainerProps["width"]>, string> = {
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-7xl",
  full: "max-w-none",
};

export const PageContainer = ({
  title,
  description,
  actions,
  width = "xl",
  className,
  headerClassName,
  children,
}: PageContainerProps) => {
  return (
    <div className={cn("mx-auto w-full space-y-5 px-4 py-5 sm:px-6", WIDTHS[width], className)}>
      {(title || actions) && (
        <div className={cn("flex flex-wrap items-start justify-between gap-3", headerClassName)}>
          <div className="space-y-1">
            {title && (
              <h1 className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

export default PageContainer;
