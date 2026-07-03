// Public single-product lookup for storefront deep links. Scoped to the shop
// slug so a product id can only be read through its own shop, and Draft
// products stay hidden (mirrors get-public-shop-data's visibility rule).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { shopSlug, productId } = await req.json();
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!shopSlug || typeof productId !== 'string' || !uuidRe.test(productId)) {
      return new Response(JSON.stringify({ error: "Missing shopSlug or invalid productId" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { data: shop, error: shopError } = await supabaseAdmin
      .from('shop_details')
      .select('businesses(id)')
      .eq('slug', shopSlug)
      .single();
    if (shopError || !shop?.businesses) {
      return new Response(JSON.stringify({ error: "Shop not found." }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: product, error: productError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('business_id', (shop.businesses as any).id)
      .neq('status', 'Draft')
      .maybeSingle();
    if (productError) throw productError;

    return new Response(JSON.stringify({ product: product ?? null }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('get-public-product Function Error:', (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
