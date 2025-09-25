import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock data arrays
const firstNames = ["Alex", "Jordan", "Taylor", "Casey", "Riley", "Jamie", "Morgan", "Skyler", "Cameron", "Drew"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];
const statuses = ["Pending", "In Progress", "Fulfilled", "Fulfilled", "Fulfilled"]; // Skew towards fulfilled

const getRandomElement = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not found');

    const { data: business, error: businessError } = await supabase
      .from('businesses').select('id').eq('user_id', user.id).single();
    if (businessError || !business) throw new Error("Could not find your business profile.");

    const { data: products, error: productsError } = await supabase
      .from('products').select('id, price').eq('business_id', business.id).not('price', 'is', null).limit(50);
    if (productsError) throw productsError;
    if (!products || products.length === 0) {
      throw new Error("Please create at least one product with a price before generating mock data.");
    }

    const ordersToInsert = [];
    
    for (let i = 0; i < 25; i++) {
      const customer_name = `${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`;
      const customer_email = `${customer_name.toLowerCase().replace(' ', '.')}@example.com`;
      const status = getRandomElement(statuses);
      
      const created_at = new Date(Date.now() - Math.floor(Math.random() * 180 * 24 * 60 * 60 * 1000)).toISOString();
      
      const itemsInOrder = [];
      let total_amount = 0;
      const numItems = Math.floor(Math.random() * 3) + 1;

      for (let j = 0; j < numItems; j++) {
        const product = getRandomElement(products);
        const quantity = Math.floor(Math.random() * 2) + 1;
        const price_at_purchase = product.price;
        
        itemsInOrder.push({
          product_id: product.id,
          quantity,
          price_at_purchase,
        });
        total_amount += price_at_purchase * quantity;
      }

      ordersToInsert.push({
        business_id: business.id,
        customer_name,
        customer_email,
        status,
        total_amount: parseFloat(total_amount.toFixed(2)),
        created_at,
        items: itemsInOrder,
      });
    }

    const { data: insertedOrders, error: insertOrdersError } = await supabase
      .from('orders')
      .insert(ordersToInsert.map(({ items, ...order }) => order))
      .select('id');
    
    if (insertOrdersError) throw insertOrdersError;

    const allOrderItemsToInsert = [];
    for (let i = 0; i < insertedOrders.length; i++) {
        const orderId = insertedOrders[i].id;
        const items = ordersToInsert[i].items;
        for (const item of items) {
            allOrderItemsToInsert.push({
                order_id: orderId,
                ...item,
            });
        }
    }

    const { error: insertItemsError } = await supabase
      .from('order_items')
      .insert(allOrderItemsToInsert);

    if (insertItemsError) throw insertItemsError;

    return new Response(JSON.stringify({ message: `Successfully created ${insertedOrders.length} mock orders.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});