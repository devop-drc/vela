import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  if (!category && !type) return null;

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

// Level 4: Gemini Flash with Dynamic Retrieval
async function searchWithGemini(
  supabase: any,
  context: { product_name: string; category?: string; type?: string; caption?: string; media_urls?: string[]; normalized: string },
  templateResult?: any
) {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  if (!GEMINI_API_KEY) return templateResult || null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const knownSpecs = templateResult?.specifications?.length > 0
    ? templateResult.specifications.map((s: any) => `${s.key}: ${s.value}`).join('\n')
    : 'None';

  const prompt = `Find the exact specifications for this product.

Product name: ${context.product_name}
${context.category ? `Category: ${context.category}` : ''}
${context.type ? `Type: ${context.type}` : ''}
${context.caption ? `Caption/description: ${context.caption}` : ''}
Already known specs: ${knownSpecs}

Fill in accurate values for each specification. Use Google Search ONLY if the product is not well-known or if the caption lacks specific details.
Return JSON: {"specifications": [{"key": "...", "value": "...", "unit": "..."}], "options": [{"name": "...", "common_values": ["..."]}], "description": "...", "tags": ["..."], "category_name": "...", "type_name": "..."}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        tool_config: {
          google_search_retrieval: {
            dynamic_retrieval_config: { mode: "MODE_DYNAMIC", dynamic_threshold: 0.5 }
          }
        },
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const geminiData = await response.json();
    const text = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return templateResult || null;

    const analysis = JSON.parse(text);
    const groundingUsed = !!geminiData.candidates?.[0]?.groundingMetadata?.searchEntryPoint;

    // Populate global intelligence cache
    await supabase.from('global_product_intelligence').upsert({
      normalized_name: context.normalized,
      category_name: analysis.category_name || context.category || 'Uncategorized',
      type_name: analysis.type_name || context.type || 'General',
      description: analysis.description || null,
      tags: analysis.tags || [],
      specifications: analysis.specifications || [],
      options: analysis.options || [],
      source: 'ai_classified',
      confidence: groundingUsed ? 0.9 : 0.8,
      updated_at: new Date().toISOString()
    }, { onConflict: 'normalized_name,category_name,type_name', ignoreDuplicates: false });

    return {
      category_name: analysis.category_name || context.category,
      type_name: analysis.type_name || context.type,
      description: analysis.description,
      tags: analysis.tags,
      specifications: analysis.specifications || [],
      options: analysis.options || [],
      source: 'google_search' as const,
      cost: {
        grounding_used: groundingUsed,
        tokens_used: geminiData.usageMetadata?.totalTokenCount || 0,
        model_used: 'flash' as const
      }
    };
  } catch (error) {
    console.error('Gemini search failed:', error);
    return templateResult || null;
  }
}

// Write specifications to product_specifications table
async function writeSpecifications(supabase: any, productId: string, userId: string, specs: any[]) {
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    await supabase.from('product_specifications').upsert({
      product_id: productId,
      user_id: userId,
      key: s.key,
      value: String(s.value || ''),
      unit: s.unit || null,
      display_order: i
    }, { onConflict: 'product_id,key', ignoreDuplicates: false });
  }
}

// Main handler
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { product_id, product_name, category, type, user_id, caption, media_urls, force_search } = body;

    if (!product_name) {
      return new Response(JSON.stringify({ error: 'product_name is required' }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const normalized = normalizeProductName(product_name);
    let result: any = null;

    // Waterfall: L1 → L2 → L3 → L4
    if (!force_search) {
      // Level 1: Global Intelligence
      result = await checkGlobalIntelligence(supabaseAdmin, normalized);

      // Level 2: User Product Reuse
      if (!result && user_id) {
        result = await checkUserProductReuse(supabaseAdmin, user_id, product_name, product_id);
      }

      // Level 3: Category Template Defaults
      if (!result) {
        result = await checkCategoryTemplateDefaults(supabaseAdmin, category, type);
      }
    }

    // Level 4: Gemini (if no result, or template was insufficient)
    if (!result || (result.source === 'template_default' && !result._sufficient)) {
      const geminiResult = await searchWithGemini(supabaseAdmin, {
        product_name, category: result?.category_name || category,
        type: result?.type_name || type, caption, media_urls, normalized
      }, result);
      if (geminiResult) result = geminiResult;
    }

    // Write specs to product_specifications table
    if (result?.specifications?.length > 0 && product_id && user_id) {
      await writeSpecifications(supabaseAdmin, product_id, user_id, result.specifications);
    }

    // Clean up internal fields
    if (result?._sufficient !== undefined) delete result._sufficient;

    return new Response(JSON.stringify(result || { specifications: [], source: 'none' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error('find-product-specs error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
