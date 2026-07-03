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

// Public endpoint: lets a guest leave a review for a product they bought, but only
// after their order is marked received/paid ('Fulfilled'). All checks are done
// server-side against the order so reviews can't be forged.
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { orderId, productId, customerEmail, rating, comment } = await req.json();

    const numRating = Number(rating);
    if (!orderId || !productId || !customerEmail || !numRating || numRating < 1 || numRating > 5) {
      return new Response(JSON.stringify({ error: "Please provide a rating from 1 to 5." }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Load the order and confirm it belongs to this customer.
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, business_id, customer_name, customer_email, status, order_items(product_id)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "We couldn't find that order." }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if ((order.customer_email || '').trim().toLowerCase() !== String(customerEmail).trim().toLowerCase()) {
      return new Response(JSON.stringify({ error: "This order doesn't match your email." }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Only delivered/paid orders can be reviewed.
    if (order.status !== 'Fulfilled') {
      return new Response(JSON.stringify({ error: "You can leave a review once your order is marked received." }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. The product must actually be in this order.
    const productIds = (order.order_items || []).map((i: any) => i.product_id);
    if (!productIds.includes(productId)) {
      return new Response(JSON.stringify({ error: "That product isn't part of this order." }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Insert (one review per product per order).
    const { error: insertError } = await supabaseAdmin.from('product_reviews').insert({
      product_id: productId,
      order_id: orderId,
      business_id: order.business_id,
      customer_name: order.customer_name,
      customer_email: (order.customer_email || '').trim(),
      rating: numRating,
      comment: typeof comment === 'string' ? comment.trim().slice(0, 2000) : null,
    });

    if (insertError) {
      if ((insertError.message || '').includes('duplicate') || insertError.code === '23505') {
        return new Response(JSON.stringify({ error: "You've already reviewed this item for this order." }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error('submit-review insert error:', insertError);
      throw new Error(insertError.message);
    }

    return new Response(JSON.stringify({ message: "Thanks for your review!" }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('submit-review Function Error:', (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
