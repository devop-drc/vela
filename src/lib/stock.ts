import { supabase } from "@/integrations/supabase/client";

// ── Centralized stock thresholds ────────────────────────────────────────────
// Single source of truth for stock status decisions across the admin UI.
//   out      = 0
//   critical = 1–4
//   low      = 5–10
//   in       = >10
export type StockStatus = "out" | "critical" | "low" | "in";

export function getStockStatus(qty: number | null | undefined): StockStatus {
  const n = qty ?? 0;
  if (n <= 0) return "out";
  if (n < 5) return "critical";
  if (n <= 10) return "low";
  return "in";
}

// ── Shared variant → option_values / product base sync ──────────────────────
// After variant inventory changes, the per-option-value inventory (treated as a
// derived sum across variants) and the product's base inventory/status must be
// recomputed so option chips, the products list, and the storefront agree.

export type VariantStockRow = {
  id?: string;
  // Either a parsed option_values map or a combination_key like "Size=M|Color=Red".
  option_values?: Record<string, string> | null;
  combination_key?: string | null;
  inventory?: number | null;
};

/** Parse a variant's option values, falling back to combination_key. */
export const parseVariantOptionValues = (v: VariantStockRow): Record<string, string> => {
  const opts: Record<string, string> = { ...(v.option_values || {}) };
  if (Object.keys(opts).length === 0 && v.combination_key) {
    v.combination_key.split("|").forEach((part) => {
      // combination_key uses either "k=v" (legacy) or "k:v" (normalizeKey) — handle both.
      const sep = part.includes("=") ? "=" : ":";
      const [k, val] = part.split(sep);
      if (k && val) opts[k.trim()] = val.trim();
    });
  }
  return opts;
};

/**
 * Recompute and persist option_values.inventory (sum of variants using each
 * value) and the product's base inventory + status from the given variant rows.
 *
 * `variants` should reflect the post-edit inventory values.
 */
export async function syncDerivedStockFromVariants(
  productId: string,
  variants: VariantStockRow[],
): Promise<void> {
  // 1. Load this product's options + values so we can map names → value rows.
  const { data: optRows, error: optErr } = await supabase
    .from("product_options")
    .select("id, name, option_values(id, value)")
    .eq("product_id", productId);
  if (optErr) throw optErr;

  // 2. Derive each option value's stock = sum of variants that use that value.
  const valueUpdates: Array<{ id: string; inventory: number }> = [];
  (optRows || []).forEach((opt: any) => {
    (opt.option_values || []).forEach((val: any) => {
      const derived = variants.reduce((sum, v) => {
        const opts = parseVariantOptionValues(v);
        return opts[opt.name] === val.value ? sum + (v.inventory || 0) : sum;
      }, 0);
      valueUpdates.push({ id: val.id, inventory: derived });
    });
  });

  if (valueUpdates.length) {
    const { error } = await supabase
      .from("option_values")
      .upsert(valueUpdates, { onConflict: "id" });
    if (error) throw error;
  }

  // 3. Sync product base inventory + status from variant totals.
  const totalInventory = variants.reduce((sum, v) => sum + (v.inventory || 0), 0);
  const { data: prod } = await supabase
    .from("products")
    .select("status, pricing_type")
    .eq("id", productId)
    .single();
  const productUpdate: { inventory: number; status?: string } = { inventory: totalInventory };
  if (prod?.pricing_type !== "subscription" && prod?.status !== "Draft") {
    productUpdate.status = totalInventory > 0 ? "Active" : "Out of Stock";
  }
  const { error: prodErr } = await supabase
    .from("products")
    .update(productUpdate)
    .eq("id", productId);
  if (prodErr) throw prodErr;
}
