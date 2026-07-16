import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { ensureCategoryAndType, upsertVariantsFromOptions } from "../_shared/catalog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeProductName(name: string): string {
  return name.toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '')
    .replace(/\b(the|a|an)\b/g, '')
    .trim();
}

// Level 1: Global Product Intelligence Cache
async function checkGlobalIntelligence(supabase: any, normalizedName: string) {
  // Exact match
  const { data } = await supabase
    .from('global_product_intelligence')
    .select('*')
    .eq('normalized_name', normalizedName)
    .gte('confidence', 0.7)
    .order('confidence', { ascending: false })
    .limit(1);

  let match = data?.[0] || null;

  // Fuzzy match fallback
  if (!match) {
    const { data: fuzzy } = await supabase.rpc('find_similar_product', {
      search_name: normalizedName,
      min_similarity: 0.6
    });
    if (fuzzy?.length > 0 && fuzzy[0].confidence >= 0.7) {
      match = fuzzy[0];
    }
  }

  if (match) {
    await supabase
      .from('global_product_intelligence')
      .update({ reuse_count: (match.reuse_count || 0) + 1, updated_at: new Date().toISOString() })
      .eq('id', match.id);

    return {
      category_name: match.category_name,
      type_name: match.type_name,
      description: match.description,
      tags: match.tags,
      specifications: match.specifications || [],
      options: match.options || [],
      source: 'global_intelligence' as const,
      cost: { grounding_used: false, tokens_used: 0, model_used: 'none' as const }
    };
  }
  return null;
}

// Level 2: User Product Reuse
async function checkUserProductReuse(supabase: any, userId: string, productName: string, currentProductId?: string) {
  const { data: matches } = await supabase
    .from('products')
    .select('id, name, category')
    .eq('user_id', userId)
    .neq('id', currentProductId || '00000000-0000-0000-0000-000000000000')
    .ilike('name', `%${productName.substring(0, 30)}%`)
    .limit(3);

  if (!matches?.length) return null;

  for (const match of matches) {
    const { data: specs } = await supabase
      .from('product_specifications')
      .select('key, value, unit')
      .eq('product_id', match.id);

    if (specs?.length > 0) {
      const { data: options } = await supabase
        .from('product_options')
        .select('name, option_values(value)')
        .eq('product_id', match.id);

      const formattedOptions = options?.map((o: any) => ({
        name: o.name,
        common_values: o.option_values?.map((v: any) => v.value) || []
      })) || [];

      // Populate global cache for future users
      const normalized = normalizeProductName(match.name);
      await supabase.from('global_product_intelligence').upsert({
        normalized_name: normalized,
        category_name: match.category || 'Uncategorized',
        type_name: 'General',
        specifications: specs,
        options: formattedOptions,
        source: 'user_reuse',
        confidence: 0.75,
        updated_at: new Date().toISOString()
      }, { onConflict: 'normalized_name,category_name,type_name', ignoreDuplicates: false });

      return {
        category_name: match.category,
        type_name: null,
        specifications: specs,
        options: formattedOptions,
        source: 'user_reuse' as const,
        cost: { grounding_used: false, tokens_used: 0, model_used: 'none' as const }
      };
    }
  }
  return null;
}

// Level 3: Category Template Defaults
async function checkCategoryTemplateDefaults(supabase: any, category?: string, type?: string) {
  // A category is REQUIRED: with only a type (or neither) the unfiltered
  // LIMIT 1 used to return a random template from the whole table, leaking one
  // product's spec keys (e.g. "feature: Text to speech…") into unrelated products.
  if (!category) return null;

  let query = supabase.from('category_templates').select('*');
  if (category) query = query.eq('category_name', category);
  if (type) query = query.eq('type_name', type);
  query = query.order('is_system', { ascending: true }).limit(1);

  const { data } = await query;
  const template = data?.[0];
  if (!template) return null;

  const specs = (template.default_specifications || [])
    .filter((s: any) => s.common_values?.length > 0)
    .map((s: any) => ({
      key: s.key,
      value: s.common_values[0],
      unit: s.unit || null,
    }));

  const filledCount = specs.length;
  const totalCount = (template.default_specifications || []).length;

  return {
    category_name: template.category_name,
    type_name: template.type_name,
    specifications: specs,
    options: template.default_options || [],
    source: 'template_default' as const,
    _sufficient: totalCount > 0 && filledCount / totalCount >= 0.8,
    cost: { grounding_used: false, tokens_used: 0, model_used: 'none' as const }
  };
}

// Level 4: Gemini — a two-rung cost ladder.
//   4a. gemini-2.5-flash-lite, NO search, JSON mode. Cheapest possible call
//       (~8× cheaper output than flash) — model knowledge + the caption cover
//       most branded products and everything the caption states.
//   4b. gemini-2.5-flash WITH Google Search grounding — only when 4a came back
//       thin. Grounding can't be combined with responseMimeType JSON, so this
//       rung uses a strict "JSON only" instruction + tolerant parsing.
// Every rung is capped (tokens, timeout), logged to ai_usage with per-model
// pricing, and the best rung's result wins.
const GEMINI_MODELS = {
  'flash-lite': { id: 'gemini-2.5-flash-lite', inPerM: 0.10, outPerM: 0.40 },
  'flash': { id: 'gemini-2.5-flash', inPerM: 0.30, outPerM: 2.50 },
} as const;
type GeminiModelKey = keyof typeof GEMINI_MODELS;

/** "Good enough to stop paying": at least 3 real specifications. */
const isRichResult = (r: any) => (r?.specifications?.length || 0) >= 3;

// Tolerant JSON extraction (grounded answers arrive as plain text).
const parseJsonLoose = (text: string): any => {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(stripped); } catch { /* fall through */ }
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(stripped.slice(start, end + 1));
  throw new Error('No JSON object in response');
};

async function geminiSpecAttempt(
  supabase: any,
  context: { product_name: string; category?: string; type?: string; caption?: string; normalized: string; user_id?: string },
  templateResult: any,
  modelKey: GeminiModelKey,
  useSearch: boolean
): Promise<any | null> {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) return null;
  const model = GEMINI_MODELS[modelKey];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${GEMINI_API_KEY}`;

  // Token diet: only non-empty lines, caption capped, known specs only if any.
  const lines = [
    `Find the exact specifications for this product.`,
    `Product name: ${context.product_name}`,
    context.category ? `Category: ${context.category}` : '',
    context.type ? `Type: ${context.type}` : '',
    context.caption ? `Caption: ${String(context.caption).slice(0, 600)}` : '',
    templateResult?.specifications?.length > 0
      ? `Already known specs:\n${templateResult.specifications.slice(0, 12).map((s: any) => `${s.key}: ${s.value}`).join('\n')}`
      : '',
    `Only state values you are confident about — omit anything you cannot verify. Do not invent.`,
    `Respond with ONLY a single JSON object (no markdown, no commentary):`,
    `{"specifications": [{"key": "...", "value": "...", "unit": "..."}], "options": [{"name": "...", "common_values": ["..."]}], "description": "...", "tags": ["..."], "category_name": "...", "type_name": "..."}`,
  ].filter(Boolean);
  const prompt = lines.join('\n');

  const generationConfig: any = {
    temperature: 0.2,
    maxOutputTokens: 1500,
    thinkingConfig: { thinkingBudget: 0 },
  };
  if (!useSearch) generationConfig.responseMimeType = 'application/json';
  const body: any = { contents: [{ parts: [{ text: prompt }] }], generationConfig };
  if (useSearch) body.tools = [{ google_search: {} }];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  let geminiData: any;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Gemini ${response.status}: ${await response.text()}`);
    geminiData = await response.json();
  } finally {
    clearTimeout(timeout);
  }

  // Best-effort cost ledger with the ACTUAL model's pricing.
  if (geminiData.usageMetadata && context.user_id) {
    try {
      const inputTokens = geminiData.usageMetadata.promptTokenCount ?? 0;
      const outputTokens = (geminiData.usageMetadata.candidatesTokenCount ?? 0) + (geminiData.usageMetadata.thoughtsTokenCount ?? 0);
      await supabase.from('ai_usage').insert({
        user_id: context.user_id,
        function_name: 'find-product-specs',
        model: model.id,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: Math.round(((inputTokens * model.inPerM + outputTokens * model.outPerM) / 1_000_000) * 1_000_000) / 1_000_000,
      });
    } catch (e) {
      console.warn('ai_usage logging failed:', (e as Error).message);
    }
  }

  const text = geminiData.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
  if (!text) return null;
  const analysis = parseJsonLoose(text);
  const groundingUsed = !!geminiData.candidates?.[0]?.groundingMetadata?.searchEntryPoint;

  return {
    category_name: analysis.category_name || context.category,
    type_name: analysis.type_name || context.type,
    description: analysis.description,
    tags: analysis.tags,
    specifications: analysis.specifications || [],
    options: analysis.options || [],
    source: useSearch ? ('google_search' as const) : ('ai_knowledge' as const),
    cost: {
      grounding_used: groundingUsed,
      tokens_used: geminiData.usageMetadata?.totalTokenCount || 0,
      model_used: modelKey,
    },
  };
}

async function searchWithGemini(
  supabase: any,
  context: { product_name: string; category?: string; type?: string; caption?: string; media_urls?: string[]; normalized: string; user_id?: string },
  templateResult?: any
) {
  let best: any = null;
  const consider = (r: any) => {
    if (r && (!best || (r.specifications?.length || 0) > (best.specifications?.length || 0))) best = r;
  };

  // Rung 4a: cheapest — flash-lite, model knowledge only.
  try {
    consider(await geminiSpecAttempt(supabase, context, templateResult, 'flash-lite', false));
  } catch (e) {
    console.warn('flash-lite spec attempt failed:', (e as Error).message);
  }

  // Rung 4b: only if still thin — flash + Google Search (the expensive rung).
  if (!isRichResult(best)) {
    try {
      consider(await geminiSpecAttempt(supabase, context, templateResult, 'flash', true));
    } catch (e) {
      console.warn('Grounded spec attempt failed:', (e as Error).message);
      // Last-resort fallback: flash without search (different model may still
      // beat flash-lite on obscure products).
      if (!best) {
        try {
          consider(await geminiSpecAttempt(supabase, context, templateResult, 'flash', false));
        } catch (e2) {
          console.warn('Plain flash spec attempt failed:', (e2 as Error).message);
        }
      }
    }
  }

  if (!best) return templateResult || null;

  // Populate the global intelligence cache so the NEXT lookup for this product
  // (any user) is free.
  try {
    await supabase.from('global_product_intelligence').upsert({
      normalized_name: context.normalized,
      category_name: best.category_name || context.category || 'Uncategorized',
      type_name: best.type_name || context.type || 'General',
      description: best.description || null,
      tags: best.tags || [],
      specifications: best.specifications || [],
      options: best.options || [],
      source: 'ai_classified',
      confidence: best.cost?.grounding_used ? 0.9 : 0.8,
      updated_at: new Date().toISOString()
    }, { onConflict: 'normalized_name,category_name,type_name', ignoreDuplicates: false });
  } catch (e) {
    console.warn('global intelligence upsert failed:', (e as Error).message);
  }

  return best;
}

// Write specifications to product_specifications table — one delete + ONE bulk
// upsert instead of a round trip per row.
async function writeSpecifications(supabase: any, productId: string, userId: string, specs: any[]) {
  // Clear old specs first to prevent accumulation
  await supabase.from('product_specifications').delete().eq('product_id', productId);

  const seen = new Set<string>();
  const rows = specs
    .filter((s: any) => s?.key && !seen.has(s.key) && !!seen.add(s.key))
    .map((s: any, i: number) => ({
      product_id: productId,
      user_id: userId,
      key: s.key,
      value: String(s.value || ''),
      unit: s.unit || null,
      display_order: i,
    }));
  if (rows.length === 0) return;
  const { error } = await supabase.from('product_specifications').upsert(rows, { onConflict: 'product_id,key', ignoreDuplicates: false });
  if (error) console.error('Bulk spec upsert failed:', error.message);
}

// Runs the full waterfall for one product and writes its specs.
async function processProduct(supabaseAdmin: any, params: any) {
  const { product_id, product_name, category, type, user_id, caption, media_urls, force_search } = params;

  const normalized = normalizeProductName(product_name);
  let result: any = null;

  // Cheapest-first waterfall: the FREE levels (L1 cache → L2 reuse → L3
  // templates) always run — even with force_search, a rich cached answer beats
  // any paid call. force_search only changes the acceptance bar: thin cached
  // results (fewer than 3 specs) escalate to the Gemini ladder instead of
  // being returned as-is.
  // Level 1: Global Intelligence
  result = await checkGlobalIntelligence(supabaseAdmin, normalized);
  if (result && force_search && !isRichResult(result)) result = null;

  // Level 2: User Product Reuse
  if (!result && user_id) {
    result = await checkUserProductReuse(supabaseAdmin, user_id, product_name, product_id);
    if (result && force_search && !isRichResult(result)) result = null;
  }

  // Level 3: Category Template Defaults
  if (!result) {
    result = await checkCategoryTemplateDefaults(supabaseAdmin, category, type);
    if (result && force_search && !isRichResult(result)) {
      // Keep as context for the AI prompt ("already known specs"), but don't stop here.
      result._sufficient = false;
    }
  }

  // Level 4: Gemini ladder (flash-lite → flash+search) — only when the free
  // levels produced nothing, or a template that isn't sufficient.
  if (!result || (result.source === 'template_default' && !result._sufficient)) {
    const geminiResult = await searchWithGemini(supabaseAdmin, {
      product_name, category: result?.category_name || category,
      type: result?.type_name || type, caption, media_urls, normalized, user_id
    }, result);
    if (geminiResult) result = geminiResult;
  }

  // Write specs to product_specifications table
  if (result?.specifications?.length > 0 && product_id && user_id) {
    await writeSpecifications(supabaseAdmin, product_id, user_id, result.specifications);
  }

  // Apply the full result to the catalog: auto-create the category + type
  // (with attribute definitions) if they don't exist, upgrade the product's
  // category/type when still generic, and create product options + variants
  // from the discovered options.
  if (result && user_id) {
    try {
      await ensureCategoryAndType(
        supabaseAdmin, user_id,
        result.category_name || category, result.type_name || type,
        result.specifications, result.options, product_id
      );
    } catch (e: any) {
      console.error('Category/type ensure failed:', e.message);
    }
    if (product_id && result.options) {
      try {
        // Accept both shapes: [{ name, common_values: [...] }] and { Name: [...] }.
        const optionMap: Record<string, any[]> = {};
        if (Array.isArray(result.options)) {
          for (const o of result.options) {
            const vals = (o?.common_values || o?.values || []).filter(Boolean);
            if (o?.name && vals.length > 0) optionMap[o.name] = vals;
          }
        } else if (typeof result.options === 'object') {
          for (const [name, vals] of Object.entries(result.options)) {
            if (Array.isArray(vals) && vals.length > 0) optionMap[name] = vals as any[];
          }
        }
        if (Object.keys(optionMap).length > 0) {
          await upsertVariantsFromOptions(supabaseAdmin, product_id, optionMap);
          result.options_created = true;
        }
      } catch (e: any) {
        console.error('Options/variants creation failed:', e.message);
      }
    }
  }

  // Clean up internal fields
  if (result?._sufficient !== undefined) delete result._sufficient;

  return result || { specifications: [], source: 'none' };
}

// Main handler
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Batch mode: { products: [{ product_id, product_name, ... }, ...] }.
    // Top-level fields (e.g. user_id) act as defaults for every item.
    if (Array.isArray(body.products)) {
      const { products: items, ...defaults } = body;
      const results: any[] = [];
      const CONCURRENCY = 3;
      for (let i = 0; i < items.length; i += CONCURRENCY) {
        const chunk = items.slice(i, i + CONCURRENCY);
        const chunkResults = await Promise.all(chunk.map((item: any) => {
          const params = { ...defaults, ...item };
          if (!params.product_name) {
            return Promise.resolve({ product_id: params.product_id ?? null, error: 'product_name is required' });
          }
          return processProduct(supabaseAdmin, params)
            .then((r: any) => ({ product_id: params.product_id ?? null, ...r }))
            .catch((e: any) => ({ product_id: params.product_id ?? null, error: e.message }));
        }));
        results.push(...chunkResults);
      }
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Single-product mode (backward compatible)
    if (!body.product_name) {
      return new Response(JSON.stringify({ error: 'product_name is required' }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const result = await processProduct(supabaseAdmin, body);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error('find-product-specs error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
