import { SupabaseClient } from "@supabase/supabase-js";

export type OptionMap = Record<string, string[]>;

type AIItem = {
  name: string;
  description?: string;
  specifications?: Record<string, unknown>;
  options?: any;
  required?: boolean;
  min_qty?: number;
  max_qty?: number;
  default_options?: Record<string, string>;
  base_price?: number | null;
};

type AICombo = {
  title?: string;
  description?: string;
  recommended_order?: string[];
};

const toTitleCase = (s: string) => s.replace(/_/g, " ").replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());

export function normalizeOptions(raw: any): OptionMap {
  if (!raw) return {};
  if (!Array.isArray(raw) && typeof raw === "object") {
    const map: OptionMap = {};
    for (const [k, v] of Object.entries(raw)) {
      if (Array.isArray(v)) map[k] = v.map((x) => String(x).trim()).filter(Boolean);
    }
    return map;
  }
  if (Array.isArray(raw)) {
    const map: OptionMap = {};
    for (const r of raw) {
      if (r && r.name && Array.isArray(r.values)) {
        map[r.name] = r.values.map((x: any) => String(x).trim()).filter(Boolean);
      }
    }
    return map;
  }
  return {};
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

function buildVariantKey(names: string[], values: string[]): string {
  return names.map((n, i) => `${toTitleCase(n)}=${values[i]}`).join("|");
}

async function createCombo(supabase: SupabaseClient, userId: string, instagram_post_id: string | null | undefined, title?: string, description?: string) {
  const { data, error } = await supabase
    .from("combo_products")
    .insert({ user_id: userId, instagram_post_id: instagram_post_id ?? null, title: title || "Combo", description: description || null })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function createComboItem(supabase: SupabaseClient, comboId: string, item: AIItem, display_order: number) {
  const { data, error } = await supabase
    .from("combo_items")
    .insert({
      combo_id: comboId,
      item_name: item.name,
      item_description: item.description || null,
      required: !!item.required,
      min_qty: item.min_qty ?? (item.required ? 1 : 0),
      max_qty: item.max_qty ?? 1,
      display_order,
      base_price: item.base_price ?? null
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function upsertItemOption(supabase: SupabaseClient, comboItemId: string, name: string, position: number) {
  const { data, error } = await supabase
    .from("combo_item_options")
    .insert({ combo_item_id: comboItemId, name: toTitleCase(name), position, display_order: position })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function insertOptionValue(supabase: SupabaseClient, itemOptionId: string, value: string) {
  const { data, error } = await supabase
    .from("combo_option_values")
    .insert({ item_option_id: itemOptionId, value: String(value).trim(), is_active: true })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function generateComboFromAI(
  supabase: SupabaseClient,
  userId: string,
  instagram_post_id: string | null | undefined,
  combo: AICombo,
  items: AIItem[]
) {
  // Create combo
  const comboId = await createCombo(supabase, userId, instagram_post_id, combo?.title, combo?.description);

  // Display order mapping
  const orderNames = Array.isArray(combo?.recommended_order) ? combo!.recommended_order! : [];
  const orderedItems = items
    .map((it) => ({ it, idx: orderNames.indexOf(it.name) }))
    .sort((a, b) => (a.idx === -1 && b.idx === -1 ? 0 : a.idx === -1 ? 1 : b.idx === -1 ? -1 : a.idx - b.idx))
    .map((x) => x.it);

  for (let i = 0; i < orderedItems.length; i++) {
    const item = orderedItems[i];
    const comboItemId = await createComboItem(supabase, comboId, item, i);

    // Normalize options from item.options or derive from array-valued specifications
    let optMap: OptionMap = {};
    if (item.options) optMap = normalizeOptions(item.options);
    if (!optMap || Object.keys(optMap).length === 0) {
      const derived: OptionMap = {};
      if (item.specifications && typeof item.specifications === "object") {
        for (const [k, v] of Object.entries(item.specifications)) {
          if (Array.isArray(v) && v.length > 1) {
            const vals = v.map((x) => String(x).trim()).filter(Boolean);
            if (vals.length > 1) derived[k] = Array.from(new Set(vals));
          }
        }
      }
      optMap = derived;
    }

    const names = Object.keys(optMap);
    const labelMatrix: string[][] = [];
    for (let pos = 0; pos < names.length; pos++) {
      const name = names[pos];
      const optionId = await upsertItemOption(supabase, comboItemId, name, pos);
      const values = optMap[name] || [];
      const labels: string[] = [];
      for (const val of values) {
        await insertOptionValue(supabase, optionId, val);
        labels.push(val);
      }
      labelMatrix.push(labels);
    }

    // Build variants
    const combos = combinations(labelMatrix);
    const toInsert: any[] = [];
    for (let c = 0; c < combos.length; c++) {
      const key = buildVariantKey(names, combos[c]);
      toInsert.push({ combo_item_id: comboItemId, combination_key: key, is_active: true });
    }
    if (toInsert.length > 0) {
      const { error } = await supabase.from("combo_item_variants").insert(toInsert);
      if (error) throw error;
    }

    // Default combination key from default_options if provided
    if (item.default_options && Object.keys(item.default_options).length > 0) {
      const defNames = names;
      const defVals = defNames.map((n) => item.default_options![n] || "");
      const defKey = buildVariantKey(defNames, defVals);
      await supabase.from("combo_items").update({ default_combination_key: defKey }).eq("id", comboItemId);
    }
  }

  return { comboId };
}
