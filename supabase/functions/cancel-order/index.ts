import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import { invalidateShopCache } from '../_shared/cache.ts';

const getSupabaseAdmin = () => createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

// Keep denormalized caches in sync after variant stock was restored.
const resyncProductStock = async (supabaseAdmin: any, productId: string): Promise<void> => {
  const { data: variants } = await supabaseAdmin
    .from('product_variants')
    .select('inventory, option_values')
    .eq('product_id', productId);
  if (!variants || variants.length === 0) return;

  const total = variants.reduce((sum: number, v: any) => sum + (v.inventory || 0), 0);
  const { data: prod } = await supabaseAdmin
    .from('products')
    .select('status, pricing_type')
    .eq('id', productId)
    .single();

  const productUpdate: { inventory: number; status?: string } = { inventory: total };
  if (prod?.pricing_type !== 'subscription' && prod?.status !== 'Draft') {
    productUpdate.status = total > 0 ? 'Active' : 'Out of Stock';
  }
  await supabaseAdmin.from('products').update(productUpdate).eq('id', productId);

  const { data: opts } = await supabaseAdmin
    .from('product_options')
    .select('name, option_values(id, value)')
    .eq('product_id', productId);
  for (const opt of opts || []) {
    for (const val of opt.option_values || []) {
      const derived = variants.reduce(
        (sum: number, v: any) => (v.option_values?.[opt.name] === val.value ? sum + (v.inventory || 0) : sum),
        0,
      );
      await supabaseAdmin.from('option_values').update({ inventory: derived }).eq('id', val.id);
    }
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { orderId, customerEmail, shopSlug } = await req.json();

    if (!orderId || !customerEmail || !shopSlug) {
      return new Response(JSON.stringify({ error: "Missing required parameters: orderId, customerEmail, or shopSlug." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Verify the order belongs to this customer (case-insensitive email).
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status, business_id, order_items(product_id, selected_options)')
      .eq('id', orderId)
      .ilike('customer_email', (customerEmail || '').trim())
      .single();

    if (orderError || !order) {
      throw new Error("Order not found or you do not have permission to cancel it.");
    }

    // 2. Verify the order belongs to the specified shop.
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shop_details')
      .select('business_id')
      .eq('slug', shopSlug)
      .single();

    if (shopError || !shopData || shopData.business_id !== order.business_id) {
      throw new Error("Order does not belong to this shop.");
    }

    // 3. Only 'Pending' orders may be cancelled by the customer.
    if (order.status !== 'Pending') {
      throw new Error(`Order cannot be cancelled. Current status is '${order.status}'.`);
    }

    // 4. Restore inventory + mark cancelled atomically.
    const { error: restoreError } = await supabaseAdmin.rpc('restore_order_inventory', { p_order_id: orderId });
    if (restoreError) {
      throw new Error(`Failed to cancel order: ${restoreError.message}`);
    }

    // 5. Resync denormalized caches ONLY for products restored via the variant
    // path. Base-path items already had their base inventory restored directly
    // by the RPC; resyncing them would clobber base with the variant sum.
    const affected = new Set<string>(
      (order.order_items || [])
        .filter((i: any) => i.product_id && i.selected_options && Object.keys(i.selected_options).length > 0)
        .map((i: any) => i.product_id),
    );
    for (const productId of affected) {
      await resyncProductStock(supabaseAdmin, productId);
    }

    // Stock was restored — drop cached public storefront payloads so shoppers
    // see fresh availability. Fails open inside the helper.
    await invalidateShopCache({ slug: shopSlug, businessId: order.business_id });

    return new Response(JSON.stringify({ message: "Order cancelled successfully!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Cancel Order Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
