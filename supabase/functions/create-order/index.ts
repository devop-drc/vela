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

// Build the same variant combination_key the frontend uses
// (CombinedVariantManager.normalizeKey): sorted "Name:Value" joined by "|".
const buildCombinationKey = (selectedOptions: Record<string, unknown>): string =>
  Object.keys(selectedOptions)
    .sort()
    .map((k) => {
      const v = selectedOptions[k];
      return `${k}:${Array.isArray(v) ? v.join(',') : v}`;
    })
    .join('|');

// After a variant's stock changes, keep the product's base inventory, status and
// each option value's derived stock in sync (denormalized caches; best-effort,
// the source of truth is product_variants.inventory).
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
    // NOTE: client-supplied prices/totals are intentionally ignored. All pricing
    // is re-derived server-side from the database to prevent tampering.
    const {
      shopSlug, customerInfo, cartItems, paymentMethod,
      shippingAddress, shippingCity, shippingZip, shippingCountry,
      shippingNotesSeller, shippingNotesCourier,
    } = await req.json();

    if (!shopSlug || !customerInfo || !customerInfo.email || !Array.isArray(cartItems) || cartItems.length === 0 || !paymentMethod) {
      return new Response(JSON.stringify({ error: "Missing required order details." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Resolve the shop -> business + owner + display currency.
    const { data: shopData, error: shopError } = await supabaseAdmin
      .from('shop_details')
      .select('business_id, currency, businesses(user_id)')
      .eq('slug', shopSlug)
      .single();

    if (shopError || !shopData) {
      console.error("create-order: Shop not found for slug:", shopSlug, shopError);
      throw new Error("Shop not found or inaccessible.");
    }
    const businessId = shopData.business_id;
    const ownerUserId = (shopData as any).businesses?.user_id;
    const shopCurrency = shopData.currency || 'ALL';

    // 2. Exchange rates (ALL-based) — fetched once, used for shipping + flat discounts.
    let rates: Record<string, number> = {};
    try {
      const { data: ratesData } = await supabaseAdmin.functions.invoke('exchange-rates');
      if (ratesData?.rates) rates = ratesData.rates;
    } catch (e) {
      console.warn("create-order: failed to fetch exchange rates, treating non-ALL amounts as ALL.", (e as Error)?.message);
    }
    // Convert between currencies using ALL-based rates (rate[X] = X per 1 ALL).
    const convert = (amount: number, from: string, to: string): number => {
      if (from === to) return amount;
      const fromRate = rates[from];
      const toRate = rates[to];
      if (!fromRate || !toRate) return amount;
      return Math.round(amount * (toRate / fromRate) * 100) / 100;
    };

    // 3. Active discount promotions for this shop owner.
    let promotions: any[] = [];
    if (ownerUserId) {
      const { data: promoData } = await supabaseAdmin
        .from('promotions')
        .select('*')
        .eq('user_id', ownerUserId)
        .eq('is_active', true);
      promotions = promoData || [];
    }
    const now = Date.now();
    const discountedALL = (baseALL: number, productId: string): number => {
      const promo = promotions.find((p) =>
        p.type === 'discount' && p.value &&
        (!p.start_date || new Date(p.start_date).getTime() <= now) &&
        (!p.end_date || new Date(p.end_date).getTime() >= now) &&
        (!p.target_products || p.target_products.length === 0 || p.target_products.includes(productId)));
      if (!promo) return baseALL;
      const v = promo.value;
      if (v.discountType === 'percentage') return Math.max(0, baseALL * (1 - (v.discountValue || 0) / 100));
      if (v.discountType === 'flat') return Math.max(0, baseALL - convert(v.discountValue || 0, shopCurrency, 'ALL'));
      return baseALL;
    };

    // 4. Re-derive each line's authoritative ALL price from the DB.
    const rpcItems: any[] = [];
    let subtotalALL = 0;
    for (const item of cartItems) {
      const { data: product, error: productErr } = await supabaseAdmin
        .from('products')
        .select('id, price, currency, pricing_type')
        .eq('id', item.productId)
        .single();
      if (productErr || !product) {
        throw new Error("One of the products in your cart is no longer available.");
      }

      const quantity = Math.max(1, parseInt(String(item.quantity), 10) || 1);
      let unitALL = convert(Number(product.price) || 0, product.currency || 'ALL', 'ALL');

      const sel = item.selectedOptions && typeof item.selectedOptions === 'object' ? item.selectedOptions : null;
      let combinationKey: string | null = null;

      if (sel && Object.keys(sel).length > 0) {
        combinationKey = buildCombinationKey(sel);
        // Add the price difference of each selected option value (stored in ALL).
        const { data: opts } = await supabaseAdmin
          .from('product_options')
          .select('name, option_values(value, price_difference)')
          .eq('product_id', product.id);
        for (const opt of opts || []) {
          const chosen = sel[opt.name];
          const match = (opt.option_values || []).find((v: any) => v.value === chosen);
          if (match) unitALL += Number(match.price_difference) || 0;
        }
      }

      unitALL = Math.round(discountedALL(unitALL, product.id) * 100) / 100;
      subtotalALL += unitALL * quantity;

      rpcItems.push({
        product_id: product.id,
        quantity,
        selected_options: sel,
        combination_key: combinationKey,
        unit_price_all: unitALL,
      });
    }

    // 5. Shipping (mirror storefront: free over $50, else $5, both in USD -> ALL).
    const freeThresholdALL = convert(50, 'USD', 'ALL');
    const shippingALL = subtotalALL >= freeThresholdALL ? 0 : convert(5, 'USD', 'ALL');
    const totalALL = Math.round((subtotalALL + shippingALL) * 100) / 100;

    // 6. Place the order atomically (stock validated + decremented in one transaction).
    const { data: newOrder, error: rpcError } = await supabaseAdmin.rpc('place_order', {
      p_business_id: businessId,
      p_customer_name: `${customerInfo.firstName ?? ''} ${customerInfo.lastName ?? ''}`.trim(),
      p_customer_email: (customerInfo.email || '').trim(),
      p_payment_method: paymentMethod,
      p_payment_status: paymentMethod === 'cash_on_delivery' ? 'pending' : 'processing',
      p_shipping_address: shippingAddress ?? null,
      p_shipping_city: shippingCity ?? null,
      p_shipping_zip: shippingZip ?? null,
      p_shipping_country: shippingCountry ?? null,
      p_shipping_notes_seller: shippingNotesSeller ?? null,
      p_shipping_notes_courier: shippingNotesCourier ?? null,
      p_total_amount: totalALL,
      p_items: rpcItems,
    });

    if (rpcError) {
      console.error("create-order: place_order RPC failed:", rpcError);
      const rpcErrStr = JSON.stringify(rpcError);
      if (rpcErrStr.includes('insufficient_stock')) {
        return new Response(JSON.stringify({ error: "Sorry, one or more items just went out of stock. Please review your cart." }), {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Failed to place order: ${rpcError.message}`);
    }

    // 7. Resync denormalized caches for products whose variant stock changed.
    const affectedProducts = new Set<string>(rpcItems.filter((i) => i.combination_key).map((i) => i.product_id));
    for (const productId of affectedProducts) {
      await resyncProductStock(supabaseAdmin, productId);
    }

    return new Response(JSON.stringify({ message: "Order placed successfully!", order: newOrder }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('create-order: Function Error (Catch Block):', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
