import * as React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Vela's signature gradient CTA — the animated `.brand-gradient` fill in white.
 * A thin wrapper over the shadcn Button (which we don't modify), so it keeps all
 * Button props (size, asChild, etc.). Reserve for hero / upgrade moments, not
 * every primary action.
 */
export const BrandButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => (
    <Button
      ref={ref}
      className={cn("brand-gradient border-0 text-white shadow-sm transition-opacity hover:opacity-90", className)}
      {...props}
    />
  ),
);
BrandButton.displayName = "BrandButton";
