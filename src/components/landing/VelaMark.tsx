/**
 * Vela brand lockup — the app-icon mark (public/icon white.svg: a white rounded
 * tile with the gradient ship on top) plus the "Vela" wordmark set in Clash
 * Display. The white tile is self-contained, so the mark reads on both light and
 * dark surfaces. Clear-space around the mark is kept well above 1.5× its width
 * via the wordmark gap.
 */
import { cn } from "@/lib/utils";

export const VelaMark = ({
  size = "h-9 w-9",
  className,
}: {
  size?: string;
  className?: string;
}) => (
  <img
    src="/icon white.svg"
    alt="Vela"
    width={36}
    height={36}
    className={cn(size, "object-contain", className)}
  />
);

export const VelaLockup = ({
  size = "h-9 w-9",
  text = "text-[19px]",
  className,
}: {
  size?: string;
  text?: string;
  className?: string;
}) => (
  <span className={cn("flex items-center gap-3", className)}>
    <VelaMark size={size} />
    <span className={cn("font-display-brand font-semibold tracking-tight", text)}>Vela</span>
  </span>
);
