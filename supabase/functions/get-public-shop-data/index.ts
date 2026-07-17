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

// Helper function to check if a recurring event is active today
const isRecurringActive = (startDate: Date | null, endDate: Date | null, repeatInterval: string | null, elementId: string, message: string): boolean => {
  const now = new Date();
  // Normalize 'now' to UTC midnight today for consistent comparison
  const todayUtcStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayUtcEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  const recurring = !!repeatInterval && repeatInterval !== 'none';

  // 1. Absolute start/end dates apply ONLY to non-recurring items. For a
  // recurring item the dates define the in-year day/month pattern (read in the
  // switch below), not a one-time cutoff — otherwise a 'yearly' element would
  // die forever once its original end_date passed.
  if (!recurring) {
    if (startDate && todayUtcEnd.getTime() < startDate.getTime()) return false;
    if (endDate && todayUtcStart.getTime() > endDate.getTime()) return false;
    return true;
  }

  // 2. Recurring: needs a start date to anchor the pattern.
  if (!startDate) {
    return false;
  }

  let isActiveByRecurrence = false;

  // Extract month and day from startDate and endDate (relative to their own year)
  const startMonth = startDate.getUTCMonth();
  const startDay = startDate.getUTCDate();
  const endMonth = endDate ? endDate.getUTCMonth() : startMonth;
  const endDay = endDate ? endDate.getUTCDate() : startDay;

  // Extract current month and day
  const currentMonth = todayUtcStart.getUTCMonth();
  const currentDay = todayUtcStart.getUTCDate();
  const currentDayOfWeek = todayUtcStart.getUTCDay(); // 0 (Sunday) to 6 (Saturday)
  const startDayOfWeek = startDate.getUTCDay();

  switch (repeatInterval) {
    case 'daily':
      isActiveByRecurrence = true;
      break;
    case 'weekly':
      // Check if today's day of week matches startDate's day of week
      isActiveByRecurrence = currentDayOfWeek === startDayOfWeek;
      break;
    case 'monthly':
      // Check if today's day of month falls within the recurring monthly window
      if (startDay <= endDay) { // Normal range within a month (e.g., 1st to 15th)
        isActiveByRecurrence = currentDay >= startDay && currentDay <= endDay;
      } else { // Range crosses month boundary (e.g., 25th to 5th of next month)
        // If startDay > endDay, it means the range spans across the month end.
        // It's active if today is >= startDay OR <= endDay.
        isActiveByRecurrence = currentDay >= startDay || currentDay <= endDay;
      }
      break;
    case 'yearly': {
      // Check if today's month and day fall within the recurring yearly window
      const isAfterStartMonth = currentMonth > startMonth || (currentMonth === startMonth && currentDay >= startDay);
      const isBeforeEndMonth = currentMonth < endMonth || (currentMonth === endMonth && currentDay <= endDay);

      if (startMonth <= endMonth) { // Normal range within a year (e.g., Jan 1 to Mar 15)
        isActiveByRecurrence = isAfterStartMonth && isBeforeEndMonth;
      } else { // Range crosses year boundary (e.g., Nov 15 to Feb 15)
        isActiveByRecurrence = isAfterStartMonth || isBeforeEndMonth;
      }
      break;
    }
    default:
      isActiveByRecurrence = false;
  }

  return isActiveByRecurrence;
};

// Resolve the shop's Instagram profile picture from the connected integration,
// mirroring what the dashboard does. Used as a fallback when shop_details.logo_url
// is empty. Returns null on any failure (never throws).
const resolveInstagramLogo = async (
  supabaseAdmin: any,
  userId: string,
  igAccountIdFromShop: string | null,
): Promise<string | null> => {
  try {
    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('access_token, ig_account_id')
      .eq('user_id', userId)
      .eq('provider', 'facebook')
      .maybeSingle();

    const token = integration?.access_token;
    if (!token) return null;

    let igId: string | null = integration?.ig_account_id || igAccountIdFromShop || null;

    // If we don't have the IG account id cached, discover it via the linked pages.
    if (!igId) {
      const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account&access_token=${token}`;
      const pagesRes = await fetch(pagesUrl);
      if (!pagesRes.ok) return null;
      const pagesData = await pagesRes.json();
      const acc = pagesData.data?.find((p: any) => p.instagram_business_account);
      igId = acc?.instagram_business_account?.id || null;
    }
    if (!igId) return null;

    const profileUrl = `https://graph.facebook.com/v19.0/${igId}?fields=profile_picture_url&access_token=${token}`;
    const profileRes = await fetch(profileUrl);
    if (!profileRes.ok) return null;
    const profileData = await profileRes.json();
    return profileData.profile_picture_url || null;
  } catch (e) {
    console.warn('[get-public-shop-data] Failed to resolve Instagram logo:', (e as Error)?.message);
    return null;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { shopSlug, page = 1, limit = 12, customerEmail, orderId, orderIds } = await req.json(); // Add customerEmail, orderId(s)
    if (!shopSlug) {
      return new Response(JSON.stringify({ error: "Missing shopSlug" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Fetch shop details first to get the business_id and user_id
    const { data: shopDetails, error: shopDetailsError } = await supabaseAdmin
      .from('shop_details')
      .select('*, businesses(id, user_id, name)') // Also fetch related business info
      .eq('slug', shopSlug)
      .single();

    if (shopDetailsError || !shopDetails || !shopDetails.businesses) {
      console.error(`[get-public-shop-data] Error: Shop not found or inaccessible for slug: ${shopSlug}`, shopDetailsError);
      throw new Error("Shop not found or inaccessible.");
    }

    const businessId = shopDetails.businesses.id;
    const userId = shopDetails.businesses.user_id;

    // Plan entitlements gate what the PUBLIC storefront serves (authoritative,
    // can't be bypassed client-side): custom theme is Business-only, Starter is
    // capped at 10 products with COD-only + no promotions/reviews, Pro at 100.
    const { data: subRow } = await supabaseAdmin
      .from('subscriptions')
      .select('plan_id, status, plans(id, product_limit, features)')
      .eq('user_id', userId)
      .maybeSingle();
    const planRow: any = (subRow as any)?.plans || null;
    const planId: string = planRow?.id || (subRow as any)?.plan_id || 'pro';
    const planFeatures: string[] = Array.isArray(planRow?.features) ? planRow.features : [];
    const isBusinessPlan = planId === 'business';
    const productCap: number | null = planRow?.product_limit ?? null;
    const capabilities = {
      card_payments: isBusinessPlan || planFeatures.includes('card_and_cod') || planFeatures.includes('card_payments'),
      reviews: isBusinessPlan || planFeatures.includes('reviews'),
      promotions: isBusinessPlan || planFeatures.includes('promotions'),
      custom_storefront: isBusinessPlan,
    };

    const offset = (page - 1) * limit;
    // Clamp pagination to the plan's product cap so a Starter shop can never
    // publicly serve more than its 10 products (Pro: 100).
    const rangeEnd = productCap != null ? Math.min(offset + limit - 1, productCap - 1) : offset + limit - 1;
    const pageBeyondCap = productCap != null && offset >= productCap;

    // Everything below depends only on businessId/userId, so it all runs in
    // ONE parallel round instead of a serial waterfall (the old flow chained
    // 7+ queries — plus external Facebook calls — back to back). Product
    // selects embed product_variants so the client can render option pickers
    // and variant facets with zero extra round trips.
    const PRODUCT_SELECT = '*, product_variants(combination_key, option_values, inventory, price_difference, is_active, is_default)';

    const [
      resolvedLogoUrl,
      designSettingsRes,
      productsRes,
      bestSellersRes,
      recommendationPoolRes,
      promotionsRes,
      marqueeRes,
    ] = await Promise.all([
      // Fall back to the live Instagram profile picture when no logo has been uploaded.
      shopDetails.logo_url
        ? Promise.resolve(shopDetails.logo_url)
        : resolveInstagramLogo(supabaseAdmin, userId, shopDetails.ig_account_id || null),
      supabaseAdmin
        .from('design_settings')
        .select('settings')
        .eq('user_id', userId)
        .single(),
      pageBeyondCap
        ? Promise.resolve({ data: [], error: null, count: productCap })
        : supabaseAdmin
            .from('products')
            .select(PRODUCT_SELECT, { count: 'exact' })
            .eq('business_id', businessId)
            .neq('status', 'Draft')
            // A product without a price can't be bought — never show it to customers.
            .not('price', 'is', null)
            .order('created_at', { ascending: false })
            .range(offset, rangeEnd),
      supabaseAdmin.rpc('get_top_products', { p_business_id: businessId }),
      // Recommendation pool: a bounded sample of 24 rows is plenty of variety —
      // reading the ENTIRE catalog on every storefront load just to pick 4 was
      // pure IO waste.
      supabaseAdmin
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('business_id', businessId)
        .eq('status', 'Active')
        .not('price', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(24),
      supabaseAdmin
        .from('promotions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true),
      supabaseAdmin
        .from('marquee_elements')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
    ]);

    const { data: designSettings, error: designSettingsError } = designSettingsRes;
    if (designSettingsError && designSettingsError.code !== 'PGRST116') {
      console.error(`[get-public-shop-data] Error fetching design settings for userId: ${userId}`, designSettingsError);
      throw designSettingsError;
    }

    const { data: products, error: productsError, count: totalProductsCount } = productsRes;
    if (productsError) {
      console.error(`[get-public-shop-data] Error fetching products for businessId: ${businessId}`, productsError);
      throw productsError;
    }

    const { data: rawBestSellers, error: bestSellersError } = bestSellersRes;
    if (bestSellersError) {
      console.error("Error fetching best sellers:", bestSellersError);
    }
    // Same customer-facing rule as the listings: hide unpriced/draft rows the RPC may return.
    const bestSellers = (rawBestSellers || []).filter((p: any) => p.price != null && p.status !== 'Draft');

    // Recommended products: 4 random-ish active products, excluding best sellers.
    const { data: recommendationPool, error: allActiveProductsError } = recommendationPoolRes;
    let recommendedProducts: any[] = [];
    if (allActiveProductsError) {
      console.error("Error fetching products for recommendations:", allActiveProductsError);
    } else if (recommendationPool) {
      const bestSellerIds = new Set((bestSellers || []).map((p: any) => p.product_id));
      const availableForRecommendation = recommendationPool.filter(p => !bestSellerIds.has(p.id));

      // Shuffle and pick up to 4 random products
      for (let i = availableForRecommendation.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableForRecommendation[i], availableForRecommendation[j]] = [availableForRecommendation[j], availableForRecommendation[i]];
      }
      recommendedProducts = availableForRecommendation.slice(0, 4);
    }

    // Active promotions use the SAME schedule logic as announcements (absolute
    // window for one-off promos, recurrence pattern for repeating ones) so a
    // recurring promotion actually recurs instead of dying at its first end_date.
    const { data: rawPromotions, error: promotionsError } = promotionsRes;
    if (promotionsError) {
      console.error("Error fetching promotions:", promotionsError);
    }
    const promotions = (rawPromotions || []).filter((p: any) => isRecurringActive(
      p.start_date ? new Date(p.start_date) : null,
      p.end_date ? new Date(p.end_date) : null,
      p.repeat_interval || null,
      p.id,
      p.name || ''
    ));

    const { data: rawMarqueeElements, error: marqueeElementsError } = marqueeRes;
    let activeMarqueeElements: any[] = [];
    if (marqueeElementsError) {
      console.error("Error fetching marquee elements:", marqueeElementsError);
    } else if (rawMarqueeElements) {
      activeMarqueeElements = rawMarqueeElements.filter(element => {
        const startDateObj = element.start_date ? new Date(element.start_date) : null;
        const endDateObj = element.end_date ? new Date(element.end_date) : null;
        const isActive = isRecurringActive(startDateObj, endDateObj, element.repeat_interval, element.id, element.message);
        return isActive;
      });
    }

    // Fetch orders for a customer (for the public "My Orders" lookup).
    // Match by email (case-insensitive) OR by any locally-saved order IDs, so a
    // guest customer always sees the orders they just placed on this device.
    // NOTE: inputs are validated/parameterized (no string-built filters) so a
    // crafted email/id can't inject extra conditions and leak other orders.
    let customerOrders: any[] = [];

    const ORDER_SELECT = `
      id,
      customer_name,
      customer_email,
      status,
      total_amount,
      created_at,
      updated_at,
      currency,
      payment_method,
      payment_status,
      shipping_address,
      shipping_city,
      shipping_state,
      shipping_zip,
      shipping_country,
      order_notes,
      order_items (
        product_id,
        quantity,
        price_at_purchase,
        selected_options,
        products (
          name,
          media_url,
          currency
        )
      )
    `;

    // Only accept well-formed UUIDs as order IDs.
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const rawIds: string[] = Array.isArray(orderIds) ? orderIds : [];
    if (typeof orderId === 'string') rawIds.push(orderId);
    const idList = Array.from(new Set(rawIds.filter((id: any) => typeof id === 'string' && uuidRe.test(id))));

    const normalizedEmail = typeof customerEmail === 'string' ? customerEmail.trim() : '';
    // Guest lookup needs email AND the order number from the confirmation
    // (first 8 hex chars of the order UUID). Email alone would let anyone
    // read a stranger's order history just by typing their address.
    const shortCode = typeof orderId === 'string' && /^[0-9a-f]{8}$/i.test(orderId.trim())
      ? orderId.trim().toLowerCase()
      : '';

    const byId = new Map<string, any>();
    const collect = (rows: any[] | null) => { for (const r of rows || []) byId.set(r.id, r); };

    // Both lookups are independent — run them together.
    const [ordersByEmail, ordersById] = await Promise.all([
      normalizedEmail && shortCode
        ? supabaseAdmin
            .from('orders').select(ORDER_SELECT)
            .eq('business_id', businessId)
            .ilike('customer_email', normalizedEmail) // parameterized, case-insensitive exact match
            .order('created_at', { ascending: false })
            .limit(50)
        : Promise.resolve(null),
      idList.length > 0
        ? supabaseAdmin
            .from('orders').select(ORDER_SELECT)
            .eq('business_id', businessId)
            .in('id', idList)
            .order('created_at', { ascending: false })
        : Promise.resolve(null),
    ]);
    if (ordersByEmail) {
      if (ordersByEmail.error) console.error('[get-public-shop-data] Error fetching orders by email:', ordersByEmail.error);
      // Only release the order whose number was actually presented.
      else collect((ordersByEmail.data || []).filter((o: any) => o.id.toLowerCase().startsWith(shortCode)));
    }
    if (ordersById) {
      if (ordersById.error) console.error('[get-public-shop-data] Error fetching orders by id:', ordersById.error);
      else collect(ordersById.data);
    }

    customerOrders = Array.from(byId.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());


    return new Response(JSON.stringify({
      shopDetails: {
        id: businessId,
        user_id: userId, // Include user_id here
        name: shopDetails.businesses.name, // Business name from the join
        shop_name: shopDetails.shop_name,
        slug: shopDetails.slug,
        logo_url: resolvedLogoUrl,
        favicon_url: shopDetails.favicon_url || resolvedLogoUrl,
        currency: shopDetails.currency,
        headline: shopDetails.headline,
        about: shopDetails.about,
        contact_email: shopDetails.contact_email,
        followers_count: shopDetails.followers_count,
        media_count: shopDetails.media_count,
        instagram_url: shopDetails.instagram_url || null, // Use instagram_url from shop_details
        username: shopDetails.username || null, // Use username from shop_details
        // Custom-designed storefront is a Business-plan feature; everyone else
        // serves the Instagram-style storefront regardless of stored setting.
        storefront_type: isBusinessPlan ? (shopDetails.storefront_type || 'instagram') : 'instagram',
      },
      appearanceSettings: designSettings?.settings || null,
      capabilities, // plan entitlements for the public storefront (card payments, reviews, promotions)
      products: products || [],
      totalProductsCount: productCap != null ? Math.min(totalProductsCount || 0, productCap) : (totalProductsCount || 0),
      hasMore: (offset + (products?.length || 0)) < (productCap != null ? Math.min(totalProductsCount || 0, productCap) : (totalProductsCount || 0)),
      bestSellers: bestSellers || [],
      recommendedProducts: capabilities.promotions ? (recommendedProducts || []) : (recommendedProducts || []),
      promotions: capabilities.promotions ? (promotions || []) : [],
      marqueeElements: activeMarqueeElements || [], // Include filtered marquee elements
      customerOrders: customerOrders || [], // Include customer orders
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('get-public-shop-data Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});