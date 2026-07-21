// Public single-product lookup for storefront deep links. Scoped to the shop
// slug so a product id can only be read through its own shop, and Draft
// products stay hidden (mirrors get-public-shop-data's visibility rule).

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getSupabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { cached } from "../_shared/cache.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // GET (query params) is the cacheable path; POST body remains supported.
    let shopSlug: string | undefined;
    let productId: unknown;
    if (req.method === 'GET') {
      const u = new URL(req.url);
      shopSlug = u.searchParams.get('shopSlug') || undefined;
      productId = u.searchParams.get('productId') || undefined;
    } else {
      ({ shopSlug, productId } = await req.json());
    }

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!shopSlug || typeof productId !== 'string' || !uuidRe.test(productId)) {
      return new Response(JSON.stringify({ error: "Missing shopSlug or invalid productId" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await cached(
      `pubprod:${shopSlug}:${productId.toLowerCase()}`,
      300,
      async () => {
        const supabaseAdmin = getSupabaseAdmin();

        const { data: shop, error: shopError } = await supabaseAdmin
          .from('shop_details')
          .select('businesses(id)')
          .eq('slug', shopSlug)
          .single();
        if (shopError || !shop?.businesses) {
          return { notFound: true };
        }

        // Embed the product's variant rows so the client can render option pickers
        // without a second round trip.
        const { data: product, error: productError } = await supabaseAdmin
          .from('products')
          .select('*, product_variants(combination_key, option_values, inventory, price_difference, is_active, is_default), product_specifications(key, value, unit, display_order)')
          .eq('id', productId as string)
          .eq('business_id', (shop.businesses as any).id)
          .neq('status', 'Draft')
          .maybeSingle();
        if (productError) throw productError;

        return { product: product ?? null };
      },
      { memTtlSeconds: 60 },
    );

    if ((payload as any).notFound) {
      return new Response(JSON.stringify({ error: "Shop not found." }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(payload), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
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
