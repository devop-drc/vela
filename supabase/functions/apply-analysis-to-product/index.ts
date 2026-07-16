// Applies an AI analysis to an existing product — the SAME persistence the
// background sync uses: specifications → product_specifications, options →
// product_options/option_values/product_variants, and category/type
// auto-creation (with attribute definitions). Used by the manual Instagram
// importer, whose "Create product" used to drop everything but the base row.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { ensureCategoryAndType, upsertVariantsFromOptions } from "../_shared/catalog.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { product_id, analysis } = await req.json();
    if (!product_id || !analysis) throw new Error('product_id and analysis are required.');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // The caller must own the product (verified via their JWT, not trusted input).
    const bearer = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(bearer);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: product } = await supabaseAdmin
      .from('products').select('id, user_id').eq('id', product_id).eq('user_id', user.id).maybeSingle();
    if (!product) {
      return new Response(JSON.stringify({ error: 'Product not found.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1) Specifications → product_specifications (bulk, deduped by key).
    const rawSpecs = analysis.specifications;
    const specRows: any[] = [];
    const seen = new Set<string>();
    const pushSpec = (key: string, value: any, unit: any) => {
      const k = String(key || '').trim();
      if (!k || seen.has(k)) return;
      seen.add(k);
      specRows.push({
        product_id, user_id: user.id, key: k,
        value: String(value ?? ''), unit: unit || null, display_order: specRows.length,
      });
    };
    if (Array.isArray(rawSpecs)) {
      for (const s of rawSpecs) if (s?.key) pushSpec(s.key, s.value, s.unit);
    } else if (rawSpecs && typeof rawSpecs === 'object') {
      for (const [k, v] of Object.entries(rawSpecs)) pushSpec(k, Array.isArray(v) ? v.join(', ') : v, null);
    }
    if (specRows.length > 0) {
      await supabaseAdmin.from('product_specifications').delete().eq('product_id', product_id);
      const { error } = await supabaseAdmin.from('product_specifications').upsert(specRows, { onConflict: 'product_id,key' });
      if (error) console.error('Spec upsert failed:', error.message);
    }

    // 2) Options → product_options / option_values / product_variants.
    let optionsCreated = false;
    const rawOptions = analysis.options;
    const optionMap: Record<string, any[]> = {};
    if (Array.isArray(rawOptions)) {
      for (const o of rawOptions) {
        const vals = (o?.values || o?.common_values || []).filter(Boolean);
        if (o?.name && vals.length > 0) optionMap[o.name] = vals;
      }
    } else if (rawOptions && typeof rawOptions === 'object') {
      for (const [name, vals] of Object.entries(rawOptions)) {
        if (Array.isArray(vals) && vals.length > 0) optionMap[name] = vals as any[];
      }
    }
    if (Object.keys(optionMap).length > 0) {
      await upsertVariantsFromOptions(supabaseAdmin, product_id, optionMap);
      optionsCreated = true;
    }

    // 3) Category/type auto-creation + product row upgrade when generic.
    try {
      await ensureCategoryAndType(
        supabaseAdmin, user.id,
        analysis.categoryName || analysis.category_name,
        analysis.typeName || analysis.type_name,
        rawSpecs, rawOptions, product_id
      );
    } catch (e) {
      console.error('Category/type ensure failed:', (e as Error).message);
    }

    return new Response(JSON.stringify({ ok: true, specs: specRows.length, options_created: optionsCreated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('apply-analysis-to-product error:', (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
