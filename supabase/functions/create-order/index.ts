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

// Currency conversion helper (assumes rates are ALL-based)
const convertCurrencyServer = async (amount: number, fromCurrency: string, toCurrency: string = 'ALL'): Promise<number> => {
  if (fromCurrency === toCurrency) return amount;

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.functions.invoke('exchange-rates');
  if (error || data.error) {
    console.error("Server-side currency conversion: Failed to fetch exchange rates.", error || data.error);
    return amount; // Return original amount on error
  }
  const exchangeRates = data.rates;

  const fromRate = exchangeRates[fromCurrency];
  const toRate = exchangeRates[toCurrency];

  if (!fromRate || !toRate) {
    console.warn(`Server-side currency conversion: Missing exchange rate for conversion from ${fromCurrency} to ${toCurrency}.`);
    return amount; // Return original amount if rates are missing
  }

  // Rates are ALL-based: rate[X] means 1 ALL = X of currency X
  // To convert from A to B: amount_in_B = amount_in_A * (rate[B] / rate[A])
  const convertedAmount = amount * (toRate / fromRate);
  
  return Math.round(convertedAmount * 100) / 100;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { shopSlug, customerInfo, cartItems, totalAmount, currency, paymentMethod, shippingAddress, shippingCity, shippingState, shippingZip, shippingCountry, shippingNotesSeller, shippingNotesCourier } = await req.json();

    if (!shopSlug || !customerInfo || !cartItems || cartItems.length === 0 || !totalAmount || !currency || !paymentMethod) {
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

    // Convert totalAmount from client's display currency to ALL for storage
    const totalAmountInALL = await convertCurrencyServer(totalAmount, currency, 'ALL');

    // 2. Insert the new order
    const { data: newOrder, error: orderInsertError } = await supabaseAdmin
      .from('orders')
      .insert({
        business_id: businessId,
        customer_name: customerInfo.customerName, // Updated from firstName/lastName
        customer_email: customerInfo.customerEmail, // Updated
        customer_phone: customerInfo.customerPhone, // New field
        status: 'Pending', // Default order status for new orders
        total_amount: totalAmountInALL, // Store total in ALL
        currency: 'ALL', // Always store order currency as ALL
        payment_method: paymentMethod, // New: Store selected payment method
        payment_status: paymentMethod === 'cash_on_delivery' ? 'pending' : 'paid', // New: Set initial payment status
        shipping_address: shippingAddress, // New: Store shipping details
        shipping_city: shippingCity,
        shipping_state: shippingState,
        shipping_zip: shippingZip,
        shipping_country: shippingCountry,
        shipping_notes_seller: shippingNotesSeller, // New: Notes for seller
        shipping_notes_courier: shippingNotesCourier, // New: Notes for courier
      })
      .select('*') // Select all columns to return the full order object
      .single();

    if (orderInsertError || !newOrder) {
      throw new Error(`Failed to create order: ${orderInsertError?.message || 'Unknown error'}`);
    }

    const orderId = newOrder.id;

    // 3. Insert order items and update product inventory/status
    const orderItemsToInsert = [];
    for (const item of cartItems) {
      // Convert item.price from client's display currency to ALL for storage
      const itemPriceInALL = await convertCurrencyServer(item.price, currency, 'ALL');

      orderItemsToInsert.push({
        order_id: orderId,
        product_id: item.productId,
        quantity: item.quantity,
        price_at_purchase: itemPriceInALL, // Store item price in ALL
        selected_options: item.selectedOptions, // New field
        interval_repetitions: item.intervalRepetitions, // New field
      });

      // Fetch product to check pricing_type and current inventory
      const { data: product, error: productFetchError } = await supabaseAdmin
        .from('products')
        .select('pricing_type, inventory')
        .eq('id', item.productId)
        .single();

      if (productFetchError || !product) {
        console.error(`Failed to fetch product ${item.productId} for inventory update:`, productFetchError);
        // Continue with order, but log the inventory issue
        continue;
      }

      if (product.pricing_type === 'one_time') {
        const newInventory = product.inventory - item.quantity;
        const updatePayload: { inventory: number; status?: string } = { inventory: newInventory };

        if (newInventory <= 0) {
          updatePayload.status = 'Out of Stock';
        }

        const { error: inventoryUpdateError } = await supabaseAdmin
          .from('products')
          .update(updatePayload)
          .eq('id', item.productId);
        
        if (inventoryUpdateError) {
          console.error(`Failed to update inventory for product ${item.productId}:`, inventoryUpdateError);
          // Log error but don't block the cancellation
        }
      }
    }

    const { error: orderItemsInsertError } = await supabaseAdmin
      .from('order_items')
      .insert(orderItemsToInsert);

    if (orderItemsInsertError) {
      console.error(`Failed to insert order items for order ${orderId}:`, orderItemsInsertError);
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