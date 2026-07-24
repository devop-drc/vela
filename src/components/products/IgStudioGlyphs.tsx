import { cn } from "@/lib/utils";

/**
 * Mini illustrations of what each Instagram Studio option does — the same
 * "show, don't tell" pattern as the Storefront Studio's Glyph system.
 * Each glyph draws a tiny abstraction of the effect inside a phone-ish frame.
 */

const Frame = ({ children, className }: { children?: React.ReactNode; className?: string }) => (
  <div className={cn("relative aspect-[4/3] w-full overflow-hidden rounded-md border bg-muted/40", className)}>{children}</div>
);
const Bar = ({ className }: { className?: string }) => <div className={cn("rounded-full bg-foreground/25", className)} />;
const Tag = ({ className }: { className?: string }) => <div className={cn("rounded-full bg-primary/70", className)} />;

export function IgGlyph({ kind, value }: { kind: string; value: string }) {
  switch (kind) {
    /* caption structure */
    case "structure":
      return (
        <Frame>
          {value === "descriptive" && (
            <div className="absolute inset-x-2 top-2 space-y-1">
              <Bar className="h-1 w-3/5 bg-primary/70" />
              <Bar className="h-1 w-full" /><Bar className="h-1 w-11/12" /><Bar className="h-1 w-4/5" />
            </div>
          )}
          {value === "paragraph" && (
            <div className="absolute inset-2 space-y-1">
              <Bar className="h-1 w-full" /><Bar className="h-1 w-full" /><Bar className="h-1 w-full" /><Bar className="h-1 w-2/3" />
            </div>
          )}
          {value === "structured" && (
            <div className="absolute inset-x-2 top-2 space-y-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-primary" /><Bar className="h-1 w-3/4" />
                </div>
              ))}
            </div>
          )}
          {value === "minimal" && (
            <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 space-y-1">
              <Bar className="h-1 w-1/2 bg-primary/70" /><Bar className="h-1 w-3/4" />
            </div>
          )}
        </Frame>
      );

    /* tone */
    case "tone":
      return (
        <Frame className="grid place-items-center">
          <span className="text-lg leading-none">
            {value === "friendly" ? "😊" : value === "professional" ? "👔" : value === "luxury" ? "✨" : "🎉"}
          </span>
        </Frame>
      );

    /* emoji density */
    case "emojis":
      return (
        <Frame className="grid place-items-center">
          <span className="text-sm tracking-tight">
            {value === "none" ? <span className="text-muted-foreground">Aa</span> : value === "light" ? "Aa ✨" : "🔥Aa✨🛍️"}
          </span>
        </Frame>
      );

    /* caption language */
    case "language":
      return (
        <Frame className="grid place-items-center">
          <span className="text-xs font-bold text-foreground/70">{value === "sq" ? "SQ" : "EN"}</span>
        </Frame>
      );

    /* image fit */
    case "fit":
      return (
        <Frame>
          {value === "cover"
            ? <div className="absolute inset-0 bg-primary/40" />
            : <div className="absolute inset-[18%] rounded-[2px] bg-primary/40" />}
        </Frame>
      );

    /* video format */
    case "vidfmt":
      return (
        <Frame className="grid place-items-center bg-transparent">
          <div className={cn(
            "rounded-[3px] border-2 border-primary bg-primary/15",
            value === "post" ? "h-6 w-7" : "h-7 w-4"
          )} />
        </Frame>
      );

    default:
      return <Frame />;
  }
}

/** Illustrated option grid — each choice shows its IgGlyph + a label. */
export function IgChoices<T extends string>({ label, kind, options, value, onChange, cols = 4 }: {
  label?: string;
  kind: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  cols?: number;
}) {
  return (
    <div className="space-y-1.5">
      {label && <p className="text-xs font-medium text-muted-foreground">{label}</p>}
      {/* 2-up on phones (full `cols` on >=sm) so labels stop truncating to
          "Structure…" / "Professio…" at 4-across on a 375px screen. */}
      <div
        className="grid grid-cols-2 gap-1.5 sm:[grid-template-columns:repeat(var(--ig-choices-cols),minmax(0,1fr))]"
        style={{ ['--ig-choices-cols' as any]: cols }}
      >
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "flex flex-col gap-1 rounded-lg border p-1.5 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
              value === o.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
            )}
          >
            <IgGlyph kind={kind} value={o.value} />
            <span className={cn("truncate text-[10px] font-medium", value === o.value ? "text-primary" : "text-muted-foreground")}>
              {o.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
