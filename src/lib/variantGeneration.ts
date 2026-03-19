import { SupabaseClient } from "@supabase/supabase-js";

export interface EnrichedOptionValue {
  value: string;
  price_difference: number;
  inventory: number;
}

export type EnrichedOptionMap = Record<string, EnrichedOptionValue[]>;

export interface EnrichedVariant {
  option_values: Record<string, string>;
  price_difference: number;
  inventory: number;
  is_active: boolean;
}

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

async function upsertOptionValue(
  supabase: SupabaseClient, 
  optionId: string, 
  value: string,
  metadata?: { price_difference?: number; inventory?: number }
): Promise<string> {
  const val = String(value).trim();
  const { data: existing, error: selErr } = await supabase
    .from("option_values")
    .select("id")
    .eq("option_id", optionId)
    .eq("value", val)
    .maybeSingle();
  if (selErr && selErr.code !== "PGRST116") throw selErr;

  const payload = {
    option_id: optionId,
    value: val,
    is_active: true,
    price_difference: metadata?.price_difference ?? 0,
    inventory: metadata?.inventory ?? 0
  };

  if (existing?.id) {
    const { error: updErr } = await supabase
      .from("option_values")
      .update(payload)
      .eq("id", existing.id);
    if (updErr) throw updErr;
    return existing.id as string;
  }

  const { data: inserted, error: insErr } = await supabase
    .from("option_values")
    .insert(payload)
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

function buildVariantKey(orderedOptionNames: string[], valueLabels: any[]) {
  const parts = orderedOptionNames.map((name, idx) => {
      const label = typeof valueLabels[idx] === 'object' ? valueLabels[idx].value : valueLabels[idx];
      return `${toTitleCase(name)}=${label}`;
  });
  return parts.join("|");
}

// Create product_options, option_values, and product_variants from an EnrichedOptionMap
export async function upsertEnrichedOptionsAndVariants(
  supabase: SupabaseClient,
  productId: string,
  options: EnrichedOptionMap,
  explicitVariants?: EnrichedVariant[]
): Promise<{ optionCount: number; variantCount: number }> {
  const entries = Object.entries(options).filter(([_, vals]) => Array.isArray(vals) && vals.length >= 1);
  if (entries.length === 0) return { optionCount: 0, variantCount: 0 };

  const orderedNames = entries.map(([name]) => name);
  const optionIds: string[] = [];
  for (let i = 0; i < orderedNames.length; i++) {
    const optionId = await upsertProductOption(supabase, productId, orderedNames[i], i);
    optionIds.push(optionId);
  }

  const valueMetadataMatrix: EnrichedOptionValue[][] = [];
  for (let i = 0; i < entries.length; i++) {
    const [, values] = entries[i];
    const metadata: EnrichedOptionValue[] = [];
    for (const item of values) {
      await upsertOptionValue(supabase, optionIds[i], item.value, { 
        price_difference: item.price_difference, 
        inventory: item.inventory 
      });
      metadata.push(item);
    }
    valueMetadataMatrix.push(metadata);
  }

  // If explicit variants are provided, use them. Otherwise, generate all combinations.
  if (explicitVariants && explicitVariants.length > 0) {
    for (const v of explicitVariants) {
      // Ensure the combination key follows the established option order
      const variantLabels = orderedNames.map(name => {
          const key = Object.keys(v.option_values).find(k => k.toLowerCase() === name.toLowerCase());
          return key ? v.option_values[key] : '';
      }).filter(Boolean);

      if (variantLabels.length !== orderedNames.length) continue; // Skip incomplete variants

      const key = buildVariantKey(orderedNames, variantLabels);
      const { error } = await supabase.from("product_variants").upsert({
        product_id: productId,
        combination_key: key,
        price_difference: v.price_difference || 0,
        inventory: v.inventory || 0,
        is_active: v.is_active !== false,
        option_values: v.option_values,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }, { onConflict: 'product_id,combination_key' });
      if (error) throw error;
    }
    return { optionCount: orderedNames.length, variantCount: explicitVariants.length };
  } else {
    const combos = combinations(valueMetadataMatrix);
    const { data: existingVariants } = await supabase
      .from("product_variants")
      .select("combination_key")
      .eq("product_id", productId);
    const existing = new Set((existingVariants || []).map((v: { combination_key: string }) => v.combination_key));

    const toInsert = [];
    for (const combo of combos) {
      const labels = combo.map(c => c.value);
      const key = buildVariantKey(orderedNames, labels);
      
      // Inherit pricing/inventory from option values (sum of diffs, min of inventory)
      const priceDiff = combo.reduce((sum, c) => sum + (c.price_difference || 0), 0);
      const inventory = combo.reduce((min, c) => Math.min(min, c.inventory || 0), Infinity);
      
      const optionValuesObj: Record<string, string> = {};
      orderedNames.forEach((name, idx) => {
        optionValuesObj[toTitleCase(name)] = labels[idx];
      });

      if (existing.has(key)) {
          // Update existing variant with new AI metadata
          const { error } = await supabase
            .from("product_variants")
            .update({ 
                price_difference: priceDiff, 
                inventory: inventory === Infinity ? 0 : inventory,
                option_values: optionValuesObj
            })
            .eq("product_id", productId)
            .eq("combination_key", key);
          if (error) throw error;
          continue;
      }

      toInsert.push({ 
        product_id: productId, 
        combination_key: key, 
        is_active: true,
        price_difference: priceDiff,
        inventory: inventory === Infinity ? 0 : inventory,
        option_values: optionValuesObj
      });
    }

    if (toInsert.length > 0) {
      const { error } = await supabase.from("product_variants").insert(toInsert);
      if (error) throw error;
    }

    return { optionCount: orderedNames.length, variantCount: combos.length };
  }
}

// Create product_options, option_values, and product_variants from an OptionMap (Compatibility)
export async function upsertOptionsAndVariantsFromOptionMap(
  supabase: SupabaseClient,
  productId: string,
  options: OptionMap
): Promise<{ optionCount: number; variantCount: number }> {
  // Convert simple OptionMap to EnrichedOptionMap
  const enriched: EnrichedOptionMap = {};
  for (const [key, vals] of Object.entries(options)) {
    enriched[key] = vals.map(v => ({ value: v, price_difference: 0, inventory: 10 }));
  }
  return upsertEnrichedOptionsAndVariants(supabase, productId, enriched);
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
