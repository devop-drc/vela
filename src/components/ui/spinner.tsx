import * as React from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * shadcn/ui Spinner — the canonical loading indicator. Replaces the app's ad-hoc
 * `<Loader2 className="… animate-spin" />` usages with one primitive that has a
 * consistent default size and a built-in accessible `role="status"`.
 *
 * Size defaults to `size-4`; override via `className` (e.g. `className="size-6"`).
 */
function Spinner({ className, ...props }: React.ComponentProps<typeof Loader2>) {
  return (
    <Loader2
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
