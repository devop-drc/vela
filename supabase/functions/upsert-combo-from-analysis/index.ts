import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisItem {
  productName: string;
  price?: number | null;
  currency?: string | null;
  inventory?: number | null;
  specifications?: Record<string, any>;
  options?: Record<string, Array<{ value: string; price_difference: number; inventory: number }>>;
  variants?: Array<{ option_values: Record<string, string>; price_difference?: number; inventory?: number; is_active?: boolean }>;
  required?: boolean;
  min_qty?: number;
  max_qty?: number;
  media_url?: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { instagram_post_id, user_id, analysis } = await req.json();
    if (!instagram_post_id || !user_id || !analysis) throw new Error('instagram_post_id, user_id and analysis are required');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Fetch exchange rates once (ALL-based map). Fallback: no conversion.
    let rates: Record<string, number> | null = null;
    try {
      const { data: ratesRes, error: ratesErr } = await supabase.functions.invoke('exchange-rates');
      if (!ratesErr && ratesRes && ratesRes.rates) rates = ratesRes.rates as Record<string, number>;
    } catch {}

    const convertToALL = (amount: number | null | undefined, from: string | null | undefined): number | null => {
      if (amount == null) return null;
      const fromCur = (from || 'ALL').toUpperCase();
      if (!rates || fromCur === 'ALL') return amount;
      const fromRate = rates[fromCur];
      const toRate = rates['ALL'] ?? 1;
      if (!fromRate || !toRate) return amount;
      // amount_in_ALL = amount * (rate[ALL] / rate[from])
      const converted = amount * (toRate / fromRate);
      return Math.round(converted * 100) / 100;
    };

    const items: AnalysisItem[] = Array.isArray(analysis.products) ? analysis.products : [];
    if (items.length < 2) {
      return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'Not a multi-product analysis' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Fetch business_id for this user
    const { data: bizData } = await supabase.from('businesses').select('id').eq('user_id', user_id).single();
    const business_id = bizData?.id;

    // 1) Upsert combo_products by instagram_post_id
    const title = analysis.combo?.title || analysis.productName || 'Combo Product';
    const description = analysis.combo?.description || analysis.description || null;

    // Try to find existing combo
    const { data: existingCombo } = await supabase
      .from('combo_products')
      .select('id')
      .eq('instagram_post_id', instagram_post_id)
      .maybeSingle();

    let comboId: string;
    if (existingCombo?.id) {
      const { data: updated, error: upErr } = await supabase
        .from('combo_products')
        .update({ title, description, user_id, ...(business_id ? { business_id } : {}) })
        .eq('id', existingCombo.id)
        .select('id')
        .single();
      if (upErr) throw upErr;
      comboId = updated.id as string;
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from('combo_products')
        .insert({ title, description, instagram_post_id, user_id, ...(business_id ? { business_id } : {}) })
        .select('id')
        .single();
      if (insErr) throw insErr;
      comboId = inserted.id as string;
    }

    // 2) Iterate items: upsert products (per item), then combo_items linked to product_id
    const createdItems: any[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const base_price_all = typeof it.price === 'number' ? convertToALL(it.price, it.currency || 'ALL') : null;

      // Find or create product under this user and post with same name
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id')
        .eq('user_id', user_id)
        .eq('instagram_post_id', instagram_post_id)
        .eq('name', it.productName)
        .maybeSingle();

      let productId: string;
      if (existingProduct?.id) {
        const { data: updatedProd, error: upProdErr } = await supabase
          .from('products')
          .update({
            name: it.productName,
            caption: description,
            price: base_price_all,
            currency: 'ALL',
            inventory: it.inventory ?? 0,
            details: { ...(it.specifications || {}) },
            media_url: it.media_url || null,
            thumbnail_url: it.media_url || null,
            ...(business_id ? { business_id } : {}),
          })
          .eq('id', existingProduct.id)
          .select('id')
          .single();
        if (upProdErr) throw upProdErr;
        productId = updatedProd.id as string;
      } else {
        const { data: insertedProd, error: insProdErr } = await supabase
          .from('products')
          .insert({
            user_id,
            instagram_post_id,
            name: it.productName,
            caption: description,
            price: base_price_all,
            currency: 'ALL',
            inventory: it.inventory ?? 0,
            details: { ...(it.specifications || {}) },
            media_url: it.media_url || null,
            thumbnail_url: it.media_url || null,
            pricing_type: 'one_time',
            status: (it.inventory ?? 0) === 0 ? 'Out of Stock' : 'Draft',
            ...(business_id ? { business_id } : {}),
          })
          .select('id')
          .single();
        if (insProdErr) throw insProdErr;
        productId = insertedProd.id as string;
      }

      // Write specs to product_specifications table
      if (it.specifications && productId) {
        const specsArray = Array.isArray(it.specifications) ? it.specifications :
          Object.entries(it.specifications).map(([key, value]) => ({ key, value: String(value), unit: null }));

        for (let si = 0; si < specsArray.length; si++) {
          const spec = specsArray[si];
          await supabase.from('product_specifications').upsert({
            product_id: productId,
            user_id: user_id,
            key: typeof spec === 'object' ? spec.key : String(spec),
            value: typeof spec === 'object' ? String(spec.value || '') : '',
            unit: typeof spec === 'object' ? (spec.unit || null) : null,
            display_order: si
          }, { onConflict: 'product_id,key' });
        }
      }

      // Upsert combo_items for this product
      const { data: existingItem } = await supabase
        .from('combo_items')
        .select('id')
        .eq('combo_id', comboId)
        .eq('product_id', productId)
        .maybeSingle();

      let comboItemId: string;
      const itemPayload = {
        combo_id: comboId,
        product_id: productId,
        item_name: it.productName,
        base_price: base_price_all,
        required: !!it.required,
        min_qty: it.min_qty ?? 0,
        max_qty: it.max_qty ?? 1,
        display_order: i,
      };

      if (existingItem?.id) {
        const { data: updatedItem, error: upItemErr } = await supabase
          .from('combo_items')
          .update(itemPayload)
          .eq('id', existingItem.id)
          .select('id')
          .single();
        if (upItemErr) throw upItemErr;
        comboItemId = updatedItem.id as string;
      } else {
        const { data: insertedItem, error: insItemErr } = await supabase
          .from('combo_items')
          .insert(itemPayload)
          .select('id')
          .single();
        if (insItemErr) throw insItemErr;
        comboItemId = insertedItem.id as string;
      }

      // 3) Upsert combo options and values
      const options = it.options || {};
      const orderedOptionNames = Object.keys(options);
      const optionIdMap: Record<string, string> = {};
      for (let oi = 0; oi < orderedOptionNames.length; oi++) {
        const optName = orderedOptionNames[oi];
        // find or insert combo_item_options
        const { data: existingOpt } = await supabase
          .from('combo_item_options')
          .select('id')
          .eq('combo_item_id', comboItemId)
          .eq('name', optName)
          .maybeSingle();
        let itemOptionId: string;
        if (existingOpt?.id) {
          itemOptionId = existingOpt.id as string;
        } else {
          const { data: insOpt, error: insOptErr } = await supabase
            .from('combo_item_options')
            .insert({ combo_item_id: comboItemId, name: optName, position: oi, display_order: oi })
            .select('id')
            .single();
          if (insOptErr) throw insOptErr;
          itemOptionId = insOpt.id as string;
        }
        optionIdMap[optName] = itemOptionId;

        const values = Array.isArray(options[optName]) ? options[optName] : [];
        for (let vi = 0; vi < values.length; vi++) {
          const item = values[vi];
          const val = (item && typeof item === 'object') ? item.value : String(item || '');
          const priceDiffRaw = (item && typeof item === 'object') ? item.price_difference : 0;
          const inventory = (item && typeof item === 'object') ? item.inventory : 10;
          
          const priceDiffConverted = convertToALL(priceDiffRaw, it.currency || 'ALL');

          const { data: existingVal } = await supabase
            .from('combo_option_values')
            .select('id')
            .eq('item_option_id', itemOptionId)
            .eq('value', val)
            .maybeSingle();
            
          const valPayload = { 
              item_option_id: itemOptionId, 
              value: val, 
              display_order: vi, 
              is_active: true,
              price_difference: priceDiffConverted,
              inventory
          };

          if (existingVal?.id) {
              await supabase.from('combo_option_values').update(valPayload).eq('id', existingVal.id);
          } else {
              const { error: insValErr } = await supabase.from('combo_option_values').insert(valPayload);
              if (insValErr) throw insValErr;
          }
        }
      }

      // 4) Upsert combo variants
      const variants = Array.isArray(it.variants) ? it.variants : [];
      if (variants.length > 0) {
        for (const v of variants) {
          const option_values = v.option_values || {};
          // Build combination_key as Name=Value|...
          const keyParts = Object.keys(option_values).map(k => `${k}=${option_values[k]}`);
          const combination_key = keyParts.join('|');
          const { data: existingVar } = await supabase
            .from('combo_item_variants')
            .select('id')
            .eq('combo_item_id', comboItemId)
            .eq('combination_key', combination_key)
            .maybeSingle();
          const varPriceDiff = typeof v.price_difference === 'number' ? convertToALL(v.price_difference, it.currency || 'ALL') : 0;

          const varPayload = {
            combo_item_id: comboItemId,
            combination_key,
            inventory: v.inventory ?? null,
            price_difference: varPriceDiff,
            is_active: v.is_active ?? true,
            option_values,
          };

          if (existingVar?.id) {
            const { error: upVarErr } = await supabase
              .from('combo_item_variants')
              .update(varPayload)
              .eq('id', existingVar.id);
            if (upVarErr) throw upVarErr;
          } else {
            const { error: insVarErr } = await supabase
              .from('combo_item_variants')
              .insert(varPayload);
            if (insVarErr) throw insVarErr;
          }
        }
      } else if (orderedOptionNames.length === 0) {
        // Single-variant fallback (no options/variants)
        const { data: existingDefault } = await supabase
          .from('combo_item_variants')
          .select('id')
          .eq('combo_item_id', comboItemId)
          .eq('combination_key', 'DEFAULT')
          .maybeSingle();
        if (!existingDefault?.id) {
          const { error: insDefaultErr } = await supabase
            .from('combo_item_variants')
            .insert({ combo_item_id: comboItemId, combination_key: 'DEFAULT', is_active: true, option_values: {} });
          if (insDefaultErr) throw insDefaultErr;
        }
      }

      createdItems.push({ combo_item_id: comboItemId, product_id: productId });
    }

    // 5) Mark parent product (optional): ensure a visible parent product row with multi flag
    // Attempt to find a product for the same post that can act as parent and mark it
    const { data: postProducts } = await supabase
      .from('products')
      .select('id, details')
      .eq('instagram_post_id', instagram_post_id)
      .eq('user_id', user_id)
      .limit(1);

    if (postProducts && postProducts.length > 0) {
      const parent = postProducts[0];
      const details = { ...(parent.details || {}), multi_product: true };
      await supabase.from('products').update({ details }).eq('id', parent.id);
    }

    return new Response(JSON.stringify({ ok: true, combo_id: comboId, items: createdItems }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('upsert-combo-from-analysis error:', (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
