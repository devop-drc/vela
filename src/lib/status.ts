/**
 * Central status → semantic-tone mapping for the whole admin app.
 *
 * Before this file, ~40 places hardcoded `bg-emerald-100 text-emerald-800`-style
 * chips that break in dark mode and drift from each other. Everything status-
 * coloured now routes through here + the semantic tokens (`--success`,
 * `--warning`, `--info`, `--destructive`, muted) which have proper light/dark
 * variants, so a single change re-themes every badge/dot/pill in both modes.
 *
 * Render tones with <StatusBadge> / <StatusDot> (src/components/ui-app/StatusBadge)
 * or, for ad-hoc cases, `toneTint(tone)` / `toneSolid(tone)` below.
 */

export type StatusTone = "success" | "warning" | "info" | "danger" | "neutral";

/* -- Tailwind class recipes per tone (all token-based → dark-mode safe) -- */

/** Soft tinted chip: pale bg + coloured text + hairline border. The house style. */
export const toneTint: Record<StatusTone, string> = {
  success: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/25 bg-warning/10 text-warning",
  info: "border-info/25 bg-info/10 text-info",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  neutral: "border-border bg-muted text-muted-foreground",
};

/** Solid fill: saturated bg + on-colour foreground. For emphasis (rare). */
export const toneSolid: Record<StatusTone, string> = {
  success: "bg-success text-success-foreground border-transparent",
  warning: "bg-warning text-warning-foreground border-transparent",
  info: "bg-info text-info-foreground border-transparent",
  danger: "bg-destructive text-destructive-foreground border-transparent",
  neutral: "bg-secondary text-secondary-foreground border-transparent",
};

/** Just the dot/foreground colour (for indicators, icon tints, spinners). */
export const toneText: Record<StatusTone, string> = {
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
  danger: "text-destructive",
  neutral: "text-muted-foreground",
};

export const toneDotBg: Record<StatusTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-info",
  danger: "bg-destructive",
  neutral: "bg-muted-foreground",
};

/* ----------------------------- Orders ----------------------------- */

/**
 * Canonical order-lifecycle → tone. Mirrors the old switch in Orders.tsx.
 * Unknown statuses fall back to neutral.
 */
export const ORDER_STATUS_TONE: Record<string, StatusTone> = {
  Fulfilled: "success",
  "Given to Courier": "info",
  "Order Packaged": "info",
  "Order Seen": "warning",
  Pending: "warning",
  Problematic: "danger",
  Cancelled: "neutral",
};

/** Aggregate buckets used by the Orders stat pills / tabs. */
export const ORDER_BUCKET_TONE = {
  Pending: "warning",
  "In Progress": "info",
  Fulfilled: "success",
} as const satisfies Record<string, StatusTone>;

export function orderStatusTone(status?: string | null): StatusTone {
  if (!status) return "neutral";
  return ORDER_STATUS_TONE[status] ?? "neutral";
}

/* -------------------------- Stock / inventory -------------------------- */

/** Shared low-stock threshold — the single source used by badges AND filters. */
export const LOW_STOCK_THRESHOLD = 10;

export type StockLevel = "in-stock" | "low-stock" | "out-of-stock";

export function stockLevel(qty?: number | null): StockLevel {
  const n = Number(qty ?? 0);
  if (n <= 0) return "out-of-stock";
  if (n <= LOW_STOCK_THRESHOLD) return "low-stock";
  return "in-stock";
}

export const STOCK_LEVEL_TONE: Record<StockLevel, StatusTone> = {
  "in-stock": "success",
  "low-stock": "warning",
  "out-of-stock": "danger",
};

export function stockTone(qty?: number | null): StatusTone {
  return STOCK_LEVEL_TONE[stockLevel(qty)];
}

/* ---------------------------- Products ---------------------------- */

/** Product publish/availability status → tone (case-insensitive). */
export function productStatusTone(status?: string | null): StatusTone {
  switch ((status ?? "").toLowerCase()) {
    case "active":
    case "published":
    case "in stock":
      return "success";
    case "out of stock":
    case "out-of-stock":
    case "sold out":
      return "danger";
    case "draft":
    case "hidden":
    case "archived":
      return "neutral";
    case "low stock":
      return "warning";
    default:
      return "neutral";
  }
}

/* --------------------------- Promotions --------------------------- */

export function promotionStatusTone(status?: string | null): StatusTone {
  switch ((status ?? "").toLowerCase()) {
    case "active":
    case "live":
      return "success";
    case "scheduled":
    case "upcoming":
      return "info";
    case "expired":
    case "ended":
      return "neutral";
    case "paused":
    case "inactive":
    case "disabled":
      return "warning";
    default:
      return "neutral";
  }
}

/* ----------------------------- Payments ----------------------------- */

export function paymentStatusTone(status?: string | null): StatusTone {
  switch ((status ?? "").toLowerCase()) {
    case "paid":
    case "succeeded":
    case "active":
      return "success";
    case "pending":
    case "trialing":
      return "warning";
    case "processing":
      return "info";
    case "failed":
    case "past_due":
    case "canceled":
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
}
