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

  console.log(`[isRecurringActive - ${elementId}] Checking: '${message}'`);
  console.log(`[isRecurringActive - ${elementId}] Current Time (UTC): ${now.toISOString()}`);
  console.log(`[isRecurringActive - ${elementId}] Today UTC Start: ${todayUtcStart.toISOString()}`);
  console.log(`[isRecurringActive - ${elementId}] Today UTC End: ${todayUtcEnd.toISOString()}`);
  console.log(`[isRecurringActive - ${elementId}] Raw Start Date from DB: ${startDate?.toISOString() || 'null'}`);
  console.log(`[isRecurringActive - ${elementId}] Raw End Date from DB: ${endDate?.toISOString() || 'null'}`);
  console.log(`[isRecurringActive - ${elementId}] Repeat Interval: ${repeatInterval || 'null'}`);

  // Normalize DB dates to UTC day start/end for comparison
  const normalizedDbStartDate = startDate ? new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())) : null;
  const normalizedDbEndDate = endDate ? new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate(), 23, 59, 59, 999)) : null;

  console.log(`[isRecurringActive - ${elementId}] Normalized DB Start Date (UTC): ${normalizedDbStartDate?.toISOString() || 'null'}`);
  console.log(`[isRecurringActive - ${elementId}] Normalized DB End Date (UTC): ${normalizedDbEndDate?.toISOString() || 'null'}`);

  // 1. Check absolute start and end dates (using UTC normalized dates)
  if (normalizedDbStartDate && todayUtcEnd.getTime() < normalizedDbStartDate.getTime()) {
    console.log(`[isRecurringActive - ${elementId}] Reason: Today is before normalized DB start date.`);
    return false;
  }
  if (normalizedDbEndDate && todayUtcStart.getTime() > normalizedDbEndDate.getTime()) {
    console.log(`[isRecurringActive - ${elementId}] Reason: Today is after normalized DB end date.`);
    return false;
  }

  // 2. If no repeat interval or 'none', and it passed step 1, it's active
  if (!repeatInterval || repeatInterval === 'none') {
    console.log(`[isRecurringActive - ${elementId}] Result: Active (no repeat interval, within absolute dates).`);
    return true;
  }

  // 3. Handle specific recurring intervals
  // For recurring, a start date is essential to define the pattern.
  if (!startDate) {
    console.warn(`[isRecurringActive - ${elementId}] Reason: Recurring announcement has repeat_interval '${repeatInterval}' but no valid start_date. Skipping.`);
    return false;
  }

  let isActiveByRecurrence = false;

  // Extract month and day from startDate and endDate (relative to their own year)
  const startMonth = startDate.getUTCMonth();
  const startDay = startDate.getUTCDate();
  const endMonth = endDate ? endDate.getUTCMonth() : startMonth; // If no end date, assume it's just the start day
  const endDay = endDate ? endDate.getUTCDate() : startDay;

  // Extract current month and day
  const currentMonth = todayUtcStart.getUTCMonth();
  const currentDay = todayUtcStart.getUTCDate();

  switch (repeatInterval) {
    case 'daily':
      isActiveByRecurrence = true; // Already covered by absolute date range
      break;
    case 'weekly':
      // Check if today's day of week matches startDate's day of week
      isActiveByRecurrence = todayUtcStart.getUTCDay() === startDate.getUTCDay();
      break;
    case 'monthly':
      // Check if today's day of month falls within the recurring monthly window
      if (startDay <= endDay) { // Normal range within a month (e.g., 1st to 15th)
        isActiveByRecurrence = currentDay >= startDay && currentDay <= endDay;
      } else { // Range crosses month boundary (e.g., 25th to 5th of next month)
        // For monthly repeats, if startDay > endDay, it implies an invalid range for a single month.
        // We'll consider it active if today is >= startDay OR <= endDay (crossing month boundary)
        isActiveByRecurrence = currentDay >= startDay || currentDay <= endDay;
        console.warn(`[isRecurringActive - ${elementId}] Monthly repeat has startDay (${startDay}) > endDay (${endDay}). Interpreting as range crossing month boundary.`);
      }
      break;
    case 'yearly':
      // Check if today's month and day fall within the recurring yearly window
      if (startMonth < endMonth) { // Normal range within a year (e.g., Jan 1 to Mar 15)
        isActiveByRecurrence = (currentMonth > startMonth && currentMonth < endMonth) ||
                               (currentMonth === startMonth && currentDay >= startDay) ||
                               (currentMonth === endMonth && currentDay <= endDay);
      } else if (startMonth > endMonth) { // Range crosses year boundary (e.g., Nov 15 to Feb 15)
        isActiveByRecurrence = (currentMonth > startMonth || currentMonth < endMonth) ||
                               (currentMonth === startMonth && currentDay >= startDay) ||
                               (currentMonth === endMonth && currentDay <= endDay);
      } else { // Same month (e.g., Oct 1 to Oct 15)
        isActiveByRecurrence = currentMonth === startMonth && currentDay >= startDay && currentDay <= endDay;
      }
      break;
    default:
      isActiveByRecurrence = false;
  }

  console.log(`[isRecurringActive - ${elementId}] Recurrence Check for '${repeatInterval}': Result: ${isActiveByRecurrence}`);
  return isActiveByRecurrence;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { shopSlug, page = 1, limit = 12 } = await req.json(); // Add page and limit parameters
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
    console.log(`[get-public-shop-data] Fetching data for shopSlug: ${shopSlug}, userId: ${userId}, businessId: ${businessId}`);

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
      console.log(`[get-public-shop-data] Raw Marquee Elements fetched (${rawMarqueeElements.length} items):`, rawMarqueeElements); // DEBUG LOG: Show raw fetched elements
      activeMarqueeElements = rawMarqueeElements.filter(element => {
        const startDateObj = element.start_date ? new Date(element.start_date) : null;
        const endDateObj = element.end_date ? new Date(element.end_date) : null;
        const isActive = isRecurringActive(startDateObj, endDateObj, element.repeat_interval, element.id, element.message);
        console.log(`[get-public-shop-data] Final decision for Marquee Element '${element.message}' (ID: ${element.id}): isActive=${isActive}`); // DEBUG LOG
        return isActive;
      });
      console.log(`[get-public-shop-data] Active Marquee Elements after filtering (${activeMarqueeElements.length} items):`, activeMarqueeElements); // DEBUG LOG: Show filtered elements
    }

    return new Response(JSON.stringify({
      shopDetails: {
        id: businessId,
        user_id: userId, // Include user_id here
        name: shopDetails.businesses.name, // Business name from the join
        shop_name: shopDetails.shop_name,
        slug: shopDetails.slug,
        logo_url: shopDetails.logo_url,
        favicon_url: shopDetails.favicon_url,
        currency: shopDetails.currency,
        headline: shopDetails.headline,
        about: shopDetails.about,
        contact_email: shopDetails.contact_email,
        followers_count: shopDetails.followers_count,
        media_count: shopDetails.media_count,
        instagram_url: shopDetails.instagram_url || null, // Use instagram_url from shop_details
        username: shopDetails.username || null, // Use username from shop_details
      },
      appearanceSettings: designSettings?.settings || null,
      products: products || [],
      totalProductsCount: totalProductsCount || 0, // Return total count
      hasMore: (offset + (products?.length || 0)) < (totalProductsCount || 0), // Calculate hasMore
      bestSellers: bestSellers || [],
      recommendedProducts: recommendedProducts || [],
      promotions: promotions || [], // Include promotions
      marqueeElements: activeMarqueeElements || [], // Include filtered marquee elements
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