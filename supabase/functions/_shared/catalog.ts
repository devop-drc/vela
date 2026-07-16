// Shared catalog helpers: category/type auto-creation and option/variant
// upserts. Used by background-sync (post analysis) and find-product-specs
// (on-demand AI enrichment) so a product analyzed from EITHER path always gets
// its category, type, attribute definitions, options and variants created.

// deno-lint-ignore-file no-explicit-any

export const toTitleCase = (str: string) =>
  str.replace(/_/g, ' ').replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

export const combinations = <T,>(arrays: T[][]): T[][] => {
  if (arrays.length === 0) return [];
  return arrays.reduce<T[][]>((acc, curr) => {
    if (acc.length === 0) return curr.map((v) => [v]);
    const next: T[][] = [];
    for (const prev of acc) {
      for (const v of curr) next.push([...prev, v]);
    }
    return next;
  }, []);
};

export const buildVariantKey = (orderedOptionNames: string[], valueLabels: string[]) =>
  orderedOptionNames.map((name, idx) => `${name}=${valueLabels[idx]}`).join('|');

/** Find-or-create a user category by (title-cased) name; returns its id. */
export const upsertCategory = async (supabase: any, name: string, userId: string): Promise<string> => {
  const normalizedName = toTitleCase(name);
  let { data, error } = await supabase.from('categories').select('id').eq('name', normalizedName).eq('user_id', userId).single();
  if (error && error.code !== 'PGRST116') throw error;
  if (data) return data.id;

  ({ data, error } = await supabase.from('categories').insert({ name: normalizedName, user_id: userId }).select('id').single());
  if (error) {
    // Lost a create race — read the row the other writer made.
    const { data: existing } = await supabase.from('categories').select('id').eq('name', normalizedName).eq('user_id', userId).single();
    if (existing) return existing.id;
    throw error;
  }
  return data!.id;
};

/** Find-or-create a type under a category, merging in any new attribute definitions. */
export const upsertTypeAndMergeAttributes = async (
  supabase: any,
  categoryId: string,
  typeName: string,
  newAttributes: any[],
  userId: string
): Promise<void> => {
  const normalizedTypeName = toTitleCase(typeName);
  const { data: existingType, error } = await supabase.from('types').select('id, attributes').eq('category_id', categoryId).eq('name', normalizedTypeName).single();
  if (error && error.code !== 'PGRST116') throw error;

  const newAttributesMap = new Map((newAttributes || []).map((attr) => [attr.name, attr]));

  if (existingType) {
    const existingAttributesMap = new Map((existingType.attributes || []).map((attr: any) => [attr.name, attr]));
    let changed = false;
    for (const [name, newAttr] of newAttributesMap.entries()) {
      if (!existingAttributesMap.has(name)) {
        existingAttributesMap.set(name, newAttr);
        changed = true;
      }
    }
    if (changed) {
      const mergedAttributes = Array.from(existingAttributesMap.values());
      const { error: updateError } = await supabase.from('types').update({ attributes: mergedAttributes }).eq('id', existingType.id);
      if (updateError) throw updateError;
    }
  } else {
    const attributesToInsert = Array.from(newAttributesMap.values());
    const { error: insertError } = await supabase.from('types').insert({
      category_id: categoryId,
      name: normalizedTypeName,
      attributes: attributesToInsert,
      user_id: userId,
    });
    if (insertError && insertError.code !== '23505') throw insertError; // tolerate create races
  }
};

/** Build attribute-definition rows for `types.attributes` from AI specs + options. */
export const attributesFromAnalysis = (
  specifications: Record<string, any> | Array<{ key: string }> | null | undefined,
  options: Record<string, any> | Array<{ name: string; common_values?: any[] }> | null | undefined
): any[] => {
  const attrList: any[] = [];
  if (Array.isArray(specifications)) {
    for (const s of specifications) if (s?.key) attrList.push({ name: s.key, inputType: 'text', isOption: false });
  } else if (specifications && typeof specifications === 'object') {
    for (const name of Object.keys(specifications)) attrList.push({ name, inputType: 'text', isOption: false });
  }
  const pushOption = (name: string, vals: any[]) => attrList.push({
    name,
    inputType: name.toLowerCase().includes('color') ? 'color' : 'tags',
    isOption: true,
    possibleValues: vals,
  });
  if (Array.isArray(options)) {
    for (const o of options) if (o?.name) pushOption(o.name, o.common_values || []);
  } else if (options && typeof options === 'object') {
    for (const [name, vals] of Object.entries(options)) pushOption(name, Array.isArray(vals) ? vals : []);
  }
  return attrList;
};

/**
 * Create product_options / option_values / product_variants for a product from
 * AI-shaped options ({ Name: ["A","B"] } or values as { value, price_difference,
 * inventory } objects). Bulk reads + bulk inserts; existing rows are never
 * duplicated (keys use the "::" separator on BOTH sides — a historical mismatch
 * here inserted duplicate values on every sync).
 */
export const upsertVariantsFromOptions = async (supabase: any, productId: string, aiOptions: Record<string, any[]>) => {
  const optionEntries = Object.entries(aiOptions || {}).filter(([_, vals]) => Array.isArray(vals) && vals.length > 0);
  if (optionEntries.length === 0) return;

  const orderedNames = optionEntries.map(([name]) => toTitleCase(name));

  // 1) Read existing options + variants for this product (2 queries, in parallel)
  const [optionsRes, variantsRes] = await Promise.all([
    supabase.from('product_options').select('id, name').eq('product_id', productId),
    supabase.from('product_variants').select('id, combination_key').eq('product_id', productId),
  ]);
  if (optionsRes.error) throw optionsRes.error;
  if (variantsRes.error) throw variantsRes.error;
  const optionIdByName = new Map<string, string>((optionsRes.data || []).map((o: any) => [o.name, o.id]));

  // 2) Read existing values of the options we're touching (1 query, .in())
  const relevantOptionIds = Array.from(new Set(orderedNames.map((n) => optionIdByName.get(n)).filter(Boolean))) as string[];
  const existingValueKeys = new Set<string>();
  if (relevantOptionIds.length > 0) {
    const { data: existingValues, error: valSelErr } = await supabase
      .from('option_values')
      .select('option_id, value')
      .in('option_id', relevantOptionIds);
    if (valSelErr) throw valSelErr;
    for (const v of existingValues || []) existingValueKeys.add(`${v.option_id}::${v.value}`);
  }

  // 3) ONE bulk insert for missing options (uniqueness: title-cased name per product)
  const optionsToInsert: any[] = [];
  orderedNames.forEach((name, i) => {
    if (!optionIdByName.has(name) && !optionsToInsert.some((o) => o.name === name)) {
      optionsToInsert.push({ product_id: productId, name, position: i, is_active: true });
    }
  });
  if (optionsToInsert.length > 0) {
    const { data: insertedOptions, error: optInsErr } = await supabase
      .from('product_options')
      .insert(optionsToInsert)
      .select('id, name');
    if (optInsErr) throw optInsErr;
    for (const o of insertedOptions || []) optionIdByName.set(o.name, o.id);
  }

  // 4) ONE bulk insert for missing values (uniqueness: trimmed value per option)
  const valueLabelMatrix: string[][] = [];
  const valuesToInsert: any[] = [];
  for (let i = 0; i < optionEntries.length; i++) {
    const [, values] = optionEntries[i];
    const optionId = optionIdByName.get(orderedNames[i]);
    const labels: string[] = [];
    for (const raw of values) {
      let val: string;
      let priceDiff = 0;
      let optInventory = 10;

      if (typeof raw === 'object' && raw !== null) {
        val = String(raw.value || raw).trim();
        priceDiff = raw.price_difference || 0;
        optInventory = raw.inventory || 10;
      } else {
        val = String(raw).trim();
      }
      if (!val) continue;

      labels.push(val);
      const valueKey = `${optionId}::${val}`;
      if (optionId && !existingValueKeys.has(valueKey)) {
        existingValueKeys.add(valueKey); // also dedupes repeats within this batch
        valuesToInsert.push({ option_id: optionId, value: val, is_active: true, price_difference: priceDiff, inventory: optInventory });
      }
    }
    valueLabelMatrix.push(labels);
  }
  if (valuesToInsert.length > 0) {
    const { error: valInsErr } = await supabase.from('option_values').insert(valuesToInsert);
    if (valInsErr) throw valInsErr;
  }

  const combosLabels = combinations(valueLabelMatrix);
  const existingKeys = new Set((variantsRes.data || []).map((v: any) => v.combination_key));

  // Build a lookup for option value inventory: { "Color": { "Red": 10, "Blue": 5 } }
  const valueInventoryMap: Record<string, Record<string, number>> = {};
  for (let i = 0; i < optionEntries.length; i++) {
    const [, values] = optionEntries[i];
    const name = orderedNames[i];
    valueInventoryMap[name] = {};
    for (const raw of values) {
      if (typeof raw === 'object' && raw !== null) {
        valueInventoryMap[name][String(raw.value || raw).trim()] = raw.inventory || 10;
      } else {
        valueInventoryMap[name][String(raw).trim()] = 10;
      }
    }
  }

  const toInsert: any[] = [];
  for (let i = 0; i < combosLabels.length; i++) {
    const variantKey = buildVariantKey(orderedNames, combosLabels[i]);
    if (existingKeys.has(variantKey)) continue;
    existingKeys.add(variantKey); // dedupe combos that repeat within this batch
    const optionValuesObj: Record<string, string> = {};
    // Calculate variant inventory as minimum of its option values' inventories
    let variantInventory = Infinity;
    orderedNames.forEach((name, idx) => {
      optionValuesObj[name] = combosLabels[i][idx];
      const valInv = valueInventoryMap[name]?.[combosLabels[i][idx]] ?? 10;
      if (valInv < variantInventory) variantInventory = valInv;
    });
    if (!isFinite(variantInventory)) variantInventory = 10;
    toInsert.push({ product_id: productId, combination_key: variantKey, option_values: optionValuesObj, inventory: variantInventory, is_active: true });
  }
  if (toInsert.length > 0) {
    const { error } = await supabase.from('product_variants').insert(toInsert);
    if (error) throw error;
  }
};

/**
 * Ensure a user's category + type exist (creating them with attribute
 * definitions from the analysis) and optionally upgrade the product row's
 * category / details.type when they're still missing or generic.
 */
export const ensureCategoryAndType = async (
  supabase: any,
  userId: string,
  categoryName: string | null | undefined,
  typeName: string | null | undefined,
  specifications: any,
  options: any,
  productId?: string
): Promise<void> => {
  const normCat = toTitleCase(categoryName || 'Uncategorized');
  const normType = toTitleCase(typeName || 'General');
  if (normCat === 'Uncategorized' && normType === 'General') return;

  const catId = await upsertCategory(supabase, normCat, userId);
  await upsertTypeAndMergeAttributes(supabase, catId, normType, attributesFromAnalysis(specifications, options), userId);

  if (!productId) return;
  // Upgrade the product row only when its current values are missing/generic —
  // never overwrite a merchant's deliberate categorization.
  const { data: prod } = await supabase.from('products').select('category, details').eq('id', productId).single();
  if (!prod) return;
  const update: Record<string, any> = {};
  const curCat = (prod.category || '').trim();
  if ((!curCat || curCat.toLowerCase() === 'uncategorized') && normCat !== 'Uncategorized') {
    update.category = normCat;
  }
  const details = (prod.details && typeof prod.details === 'object' && !Array.isArray(prod.details)) ? { ...prod.details } : {};
  const curType = String(details.type || '').trim();
  if ((!curType || curType.toLowerCase() === 'general' || curType.toLowerCase() === 'generic') && normType !== 'General') {
    details.type = normType;
    update.details = details;
  }
  if (Object.keys(update).length > 0) {
    await supabase.from('products').update(update).eq('id', productId);
  }
};
