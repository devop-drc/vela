import { SupabaseClient } from "@supabase/supabase-js";

export type OptionMap = Record<string, string[]>;
export type Details = Record<string, unknown>;

// Convert snake_case to Title Case for option names
const toTitleCase = (str: string) => str.replace(/_/g, " ").replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

// Extract options from details: any array-valued field with 2+ items becomes an option
export function extractOptionsFromDetails(details: Details | null | undefined): OptionMap {
  if (!details || typeof details !== "object") return {};
  const reserved = new Set(["type", "options", "options_v2", "variants"]);
  const out: OptionMap = {};
  for (const [key, value] of Object.entries(details)) {
    if (reserved.has(key)) continue;
    if (Array.isArray(value) && value.length >= 2) {
      const vals = value.map((v) => String(v).trim()).filter(Boolean);
      if (vals.length >= 2) out[key] = Array.from(new Set(vals)); // de-duplicate
    }
  }
  return out;
}

async function upsertProductOption(supabase: SupabaseClient, productId: string, name: string, position: number): Promise<string> {
  const normalized = toTitleCase(name);
  const { data: existing, error: selErr } = await supabase
    .from("product_options")
    .select("id")
    .eq("product_id", productId)
    .eq("name", normalized)
    .maybeSingle();
  if (selErr && selErr.code !== "PGRST116") throw selErr;
  if (existing?.id) return existing.id as string;
  const { data: inserted, error: insErr } = await supabase
    .from("product_options")
    .insert({ product_id: productId, name: normalized, position, display_order: position })
    .select("id")
    .single();
  if (insErr) throw insErr;
  return (inserted as { id: string }).id;
}

async function upsertOptionValue(supabase: SupabaseClient, optionId: string, value: string): Promise<string> {
  const val = String(value).trim();
  const { data: existing, error: selErr } = await supabase
    .from("option_values")
    .select("id")
    .eq("option_id", optionId)
    .eq("value", val)
    .maybeSingle();
  if (selErr && selErr.code !== "PGRST116") throw selErr;
  if (existing?.id) return existing.id as string;
  const { data: inserted, error: insErr } = await supabase
    .from("option_values")
    .insert({ option_id: optionId, value: val, is_active: true })
    .select("id")
    .single();
  if (insErr) throw insErr;
  return (inserted as { id: string }).id;
}

function combinations<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [];
  return arrays.reduce<T[][]>((acc, curr) => {
    if (acc.length === 0) return curr.map((v) => [v]);
    const next: T[][] = [];
    for (const prev of acc) {
      for (const v of curr) next.push([...prev, v]);
    }
    return next;
  }, []);
}

function buildVariantKey(orderedOptionNames: string[], valueLabels: string[]) {
  const parts = orderedOptionNames.map((name, idx) => `${toTitleCase(name)}=${valueLabels[idx]}`);
  return parts.join("|");
}

// Create product_options, option_values, and product_variants from an OptionMap
export async function upsertOptionsAndVariantsFromOptionMap(
  supabase: SupabaseClient,
  productId: string,
  options: OptionMap
): Promise<{ optionCount: number; variantCount: number }> {
  const entries = Object.entries(options).filter(([_, vals]) => Array.isArray(vals) && vals.length >= 1);
  if (entries.length === 0) return { optionCount: 0, variantCount: 0 };

  const orderedNames = entries.map(([name]) => name);
  const optionIds: string[] = [];
  for (let i = 0; i < orderedNames.length; i++) {
    const optionId = await upsertProductOption(supabase, productId, orderedNames[i], i);
    optionIds.push(optionId);
  }

  const valueLabelMatrix: string[][] = [];
  for (let i = 0; i < entries.length; i++) {
    const [, values] = entries[i];
    const labels: string[] = [];
    for (const raw of values) {
      const val = String(raw).trim();
      await upsertOptionValue(supabase, optionIds[i], val);
      labels.push(val);
    }
    valueLabelMatrix.push(labels);
  }

  const combosLabels = combinations(valueLabelMatrix);
  const { data: existingVariants } = await supabase
    .from("product_variants")
    .select("combination_key")
    .eq("product_id", productId);
  const existing = new Set((existingVariants || []).map((v: { combination_key: string }) => v.combination_key));

  const toInsert: { product_id: string; combination_key: string; is_active: boolean }[] = [];
  for (let i = 0; i < combosLabels.length; i++) {
    const key = buildVariantKey(orderedNames, combosLabels[i]);
    if (existing.has(key)) continue;
    toInsert.push({ product_id: productId, combination_key: key, is_active: true });
  }
  if (toInsert.length > 0) {
    const { error } = await supabase.from("product_variants").insert(toInsert);
    if (error) throw error;
  }

  return { optionCount: orderedNames.length, variantCount: combosLabels.length };
}

// Convenience: derive from details and create everything
export async function generateOptionsAndVariantsFromDetails(
  supabase: SupabaseClient,
  productId: string,
  details: Details | null | undefined
): Promise<{ optionCount: number; variantCount: number }> {
  const optionMap = extractOptionsFromDetails(details);
  return upsertOptionsAndVariantsFromOptionMap(supabase, productId, optionMap);
}
