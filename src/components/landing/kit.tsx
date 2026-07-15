import React from "react";

/**
 * Shared landing primitives so every section shares one visual language and
 * transitions cleanly into the next. All use theme tokens (so light/dark and the
 * exact palette stay consistent) — never hardcoded greys.
 */

const BRAND = "brand-gradient";

/** Uppercase micro-label with a gradient dot. `tone="light"` for dark sections. */
export const Eyebrow: React.FC<{ children: React.ReactNode; tone?: "default" | "light"; className?: string }> = ({
  children,
  tone = "default",
  className,
}) => (
  <span
    className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12px] font-semibold uppercase tracking-[0.18em] backdrop-blur ${
      tone === "light" ? "border-white/15 bg-white/5 text-white/70" : "border-border bg-card/70 text-muted-foreground"
    } ${className ?? ""}`}
  >
    <span className={`h-2 w-2 rounded-full ${BRAND}`} />
    {children}
  </span>
);

/** Consistent section header: eyebrow + display headline + optional subhead. */
export const SectionHead: React.FC<{
  eyebrow?: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  center?: boolean;
  tone?: "default" | "light";
  className?: string;
}> = ({ eyebrow, title, sub, center = true, tone = "default", className }) => (
  <div className={`${center ? "mx-auto text-center" : ""} max-w-3xl ${className ?? ""}`}>
    {eyebrow && (
      <div data-reveal className={`mb-4 ${center ? "flex justify-center" : ""}`}>
        <Eyebrow tone={tone}>{eyebrow}</Eyebrow>
      </div>
    )}
    <h2
      data-reveal
      className={`font-display-brand text-[clamp(2rem,4.2vw,3.4rem)] font-bold leading-[1.05] tracking-tight ${
        tone === "light" ? "text-white" : "text-foreground"
      }`}
    >
      {title}
    </h2>
    {sub && (
      <p data-reveal className={`mt-4 text-lg ${tone === "light" ? "text-white/60" : "text-muted-foreground"} ${center ? "mx-auto" : ""} max-w-xl`}>
        {sub}
      </p>
    )}
  </div>
);
