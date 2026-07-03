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

  // 1. Check absolute start and end dates (using UTC normalized dates)
  // If today is before the start date, it's inactive.
  if (startDate && todayUtcEnd.getTime() < startDate.getTime()) {
    return false;
  }
  // If today is after the end date, it's inactive.
  if (endDate && todayUtcStart.getTime() > endDate.getTime()) {
    return false;
  }

  // 2. If no repeat interval or 'none', and it passed step 1, it's active
  if (!repeatInterval || repeatInterval === 'none') {
    return true;
  }

  // 3. Handle specific recurring intervals
  if (!startDate) {
    // If it has a repeat interval but no start date, it's invalid/inactive
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

    // Fall back to the live Instagram profile picture when no logo has been uploaded.
    let resolvedLogoUrl = shopDetails.logo_url || null;
    if (!resolvedLogoUrl) {
      resolvedLogoUrl = await resolveInstagramLogo(supabaseAdmin, userId, shopDetails.ig_account_id || null);
    }

    // Fetch design settings for the business owner
    const { data: designSettings, error: designSettingsError } = await supabaseAdmin
      .from('design_settings')
      .select('settings')
      .eq('user_id', userId)
      .single();

    if (designSettingsError && designSettingsError.code !== 'PGRST116') {
      console.error(`[get-public-shop-data] Error fetching design settings for userId: ${userId}`, designSettingsError);
      throw designSettingsError;
    }

    const offset = (page - 1) * limit;

    // Fetch active products for the business with pagination
    const { data: products, error: productsError, count: totalProductsCount } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact' }) // Get exact count
      .eq('business_id', businessId)
      .neq('status', 'Draft') // MODIFIED: Exclude 'Draft' products
      .range(offset, offset + limit - 1); // Apply range for pagination

    if (productsError) {
      console.error(`[get-public-shop-data] Error fetching products for businessId: ${businessId}`, productsError);
      throw productsError;
    }

    // Fetch best sellers (top 5 products by total sales)
    const { data: bestSellers, error: bestSellersError } = await supabaseAdmin.rpc('get_top_products', { p_business_id: businessId });
    if (bestSellersError) {
      console.error("Error fetching best sellers:", bestSellersError);
    }

    // Fetch recommended products (e.g., 4 random active products, excluding best sellers)
    const { data: allActiveProducts, error: allActiveProductsError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'Active');

    let recommendedProducts: any[] = [];
    if (allActiveProductsError) {
      console.error("Error fetching all active products for recommendations:", allActiveProductsError);
    } else if (allActiveProducts) {
      const bestSellerIds = new Set((bestSellers || []).map((p: any) => p.product_id));
      const availableForRecommendation = allActiveProducts.filter(p => !bestSellerIds.has(p.id));
      
      // Shuffle and pick up to 4 random products
      for (let i = availableForRecommendation.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableForRecommendation[i], availableForRecommendation[j]] = [availableForRecommendation[j], availableForRecommendation[i]];
      }
      recommendedProducts = availableForRecommendation.slice(0, 4);
    }

    // Fetch active promotions for the business
    const { data: promotions, error: promotionsError } = await supabaseAdmin
      .from('promotions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .or(`start_date.is.null,start_date.lte.${new Date().toISOString()}`)
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`);

    if (promotionsError) {
      console.error("Error fetching promotions:", promotionsError);
    }

    // Fetch active marquee elements for the business, only filtering by is_active in SQL
    const { data: rawMarqueeElements, error: marqueeElementsError } = await supabaseAdmin
      .from('marquee_elements')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

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

    const byId = new Map<string, any>();
    const collect = (rows: any[] | null) => { for (const r of rows || []) byId.set(r.id, r); };

    if (normalizedEmail) {
      const { data, error } = await supabaseAdmin
        .from('orders').select(ORDER_SELECT)
        .eq('business_id', businessId)
        .ilike('customer_email', normalizedEmail) // parameterized, case-insensitive exact match
        .order('created_at', { ascending: false });
      if (error) console.error('[get-public-shop-data] Error fetching orders by email:', error);
      else collect(data);
    }
    if (idList.length > 0) {
      const { data, error } = await supabaseAdmin
        .from('orders').select(ORDER_SELECT)
        .eq('business_id', businessId)
        .in('id', idList)
        .order('created_at', { ascending: false });
      if (error) console.error('[get-public-shop-data] Error fetching orders by id:', error);
      else collect(data);
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
        storefront_type: shopDetails.storefront_type || 'instagram',
      },
      appearanceSettings: designSettings?.settings || null,
      products: products || [],
      totalProductsCount: totalProductsCount || 0, // Return total count
      hasMore: (offset + (products?.length || 0)) < (totalProductsCount || 0), // Calculate hasMore
      bestSellers: bestSellers || [],
      recommendedProducts: recommendedProducts || [],
      promotions: promotions || [], // Include promotions
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