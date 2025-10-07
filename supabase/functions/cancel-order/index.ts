import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getSupabaseAdmin = () => createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

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

    // 1. Verify the order belongs to the customer and the shop
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, status, business_id, order_items(product_id, quantity, products(pricing_type))')
      .eq('id', orderId)
      .eq('customer_email', customerEmail)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found or you do not have permission to cancel it.");
    }

    // 2. Verify the order belongs to the specified shopSlug
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shop_details')
      .select('business_id')
      .eq('slug', shopSlug)
      .single();

    if (shopError || !shopData || shopData.business_id !== order.business_id) {
      throw new Error("Order does not belong to this shop.");
    }

    // 3. Check if the order can be cancelled (e.g., only 'Pending' orders)
    if (order.status !== 'Pending') {
      throw new Error(`Order cannot be cancelled. Current status is '${order.status}'.`);
    }

    // 4. Update order status to 'Cancelled'
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'Cancelled', payment_status: 'refunded' }) // Assuming payment is refunded or not processed
      .eq('id', orderId);

    if (updateError) {
      throw new Error(`Failed to update order status: ${updateError.message}`);
    }

    // 5. Restore product inventory for 'one_time' products
    for (const item of order.order_items) {
      if (item.products?.pricing_type === 'one_time') {
        const { error: inventoryError } = await supabaseAdmin
          .from('products')
          .update({ inventory: Deno.raw('inventory + ' + item.quantity) })
          .eq('id', item.product_id);
        
        if (inventoryError) {
          console.error(`Failed to restore inventory for product ${item.product_id}:`, inventoryError);
          // Log error but don't block the cancellation
        }
      }
    }

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