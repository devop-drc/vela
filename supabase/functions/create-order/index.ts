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
    const { shopSlug, customerInfo, cartItems, totalAmount, currency } = await req.json();

    if (!shopSlug || !customerInfo || !cartItems || cartItems.length === 0 || !totalAmount || !currency) {
      return new Response(JSON.stringify({ error: "Missing required order details." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Find the business ID using the shopSlug
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shop_details')
      .select('business_id')
      .eq('slug', shopSlug)
      .single();

    if (shopError || !shopData) {
      throw new Error("Shop not found or inaccessible.");
    }
    const businessId = shopData.business_id;

    // 2. Insert the new order
    const { data: newOrder, error: orderInsertError } = await supabaseAdmin
      .from('orders')
      .insert({
        business_id: businessId,
        customer_name: `${customerInfo.firstName} ${customerInfo.lastName}`,
        customer_email: customerInfo.email,
        status: 'Pending', // Default status for new orders
        total_amount: totalAmount,
        currency: currency,
      })
      .select('*') // Select all columns to return the full order object
      .single();

    if (orderInsertError || !newOrder) {
      throw new Error(`Failed to create order: ${orderInsertError?.message || 'Unknown error'}`);
    }

    const orderId = newOrder.id;

    // 3. Insert order items
    const orderItemsToInsert = cartItems.map((item: any) => ({
      order_id: orderId,
      product_id: item.productId,
      quantity: item.quantity,
      price_at_purchase: item.price,
    }));

    const { error: orderItemsInsertError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsToInsert);

    if (orderItemsInsertError) {
      // If order items fail, consider rolling back the order or marking it as problematic
      console.error(`Failed to insert order items for order ${orderId}:`, orderItemsInsertError);
      // Optionally, update the order status to 'Failed' or 'Problematic'
      await supabaseAdmin.from('orders').update({ status: 'Problematic', message: 'Failed to add items' }).eq('id', orderId);
      throw new Error(`Order created, but failed to add items: ${orderItemsInsertError.message}`);
    }

    return new Response(JSON.stringify({ message: "Order placed successfully!", order: newOrder }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Create Order Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});