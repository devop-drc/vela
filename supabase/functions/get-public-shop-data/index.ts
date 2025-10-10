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
const isRecurringActive = (startDate: Date | null, endDate: Date | null, repeatInterval: string | null): boolean => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentDay = now.getDate();

  // Helper to create a date in the current year with month/day from another date
  const createDateInCurrentYear = (date: Date) => {
    const d = new Date(currentYear, date.getMonth(), date.getDate());
    // Handle cases where the original date is Feb 29 and current year is not leap year
    if (d.getMonth() !== date.getMonth()) {
      d.setDate(0); // Go to last day of previous month
    }
    return d;
  };

  // If it's a recurring event, adjust start/end dates to the current year for comparison
  let effectiveStart = startDate ? new Date(startDate) : null;
  let effectiveEnd = endDate ? new Date(endDate) : null;

  if (repeatInterval && repeatInterval !== 'none') {
    if (effectiveStart) effectiveStart = createDateInCurrentYear(effectiveStart);
    if (effectiveEnd) effectiveEnd = createDateInCurrentYear(effectiveEnd);

    // Handle cross-year recurrence (e.g., Dec 15 - Jan 15)
    if (effectiveStart && effectiveEnd && effectiveStart > effectiveEnd) {
      // If start is in current year and end is in current year but earlier,
      // it means the period spans across the year boundary.
      // So, adjust effectiveEnd to be in the *next* year.
      effectiveEnd.setFullYear(currentYear + 1);
    }
  }

  // Now, perform the absolute date range check using the (potentially adjusted) effective dates
  if (effectiveStart && now < effectiveStart) return false;
  if (effectiveEnd && now > effectiveEnd) return false;

  // If no repeat interval, or repeat is 'none', and it passed the absolute date check, it's active
  if (!repeatInterval || repeatInterval === 'none') return true;

  // For specific recurring intervals, apply additional logic
  // At this point, we know 'now' is within the overall (potentially yearly adjusted) date range.
  switch (repeatInterval) {
    case 'daily':
      return true; // Already within range, so daily is always active
    case 'weekly':
      // Check if today's day of the week matches the start date's day of the week
      return now.getDay() === (startDate ? new Date(startDate).getDay() : now.getDay());
    case 'monthly':
      // Check if today's day of the month matches the start date's day of the month
      return now.getDate() === (startDate ? new Date(startDate).getDate() : now.getDate());
    case 'yearly':
      // For yearly, we just need to ensure the month and day are within the original month/day range
      // This is already covered by the effectiveStart/effectiveEnd logic if they were adjusted to current year.
      // If it passed the effectiveStart/effectiveEnd check, it's active for yearly.
      return true; 
    default:
      return false;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { shopSlug, page = 1, limit = 12 } = await req.json(); // Add page and limit parameters
    console.log(`[get-public-shop-data] Received request for shopSlug: ${shopSlug}, page: ${page}, limit: ${limit}`);

    if (!shopSlug) {
      console.error("[get-public-shop-data] Missing shopSlug in request body.");
      return new Response(JSON.stringify({ error: "Missing shopSlug" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Fetch shop details first to get the business_id and user_id
    console.log(`[get-public-shop-data] Fetching shop details for slug: ${shopSlug}`);
    const { data: shopDetails, error: shopDetailsError } = await supabaseAdmin
      .from('shop_details')
      .select('*, businesses(id, user_id, name)') // Also fetch related business info
      .eq('slug', shopSlug)
      .single();

    if (shopDetailsError || !shopDetails || !shopDetails.businesses) {
      console.error(`[get-public-shop-data] Shop not found or inaccessible for slug: ${shopSlug}. Error: ${shopDetailsError?.message}`);
      throw new Error("Shop not found or inaccessible.");
    }
    console.log(`[get-public-shop-data] Shop details fetched: ${JSON.stringify(shopDetails)}`);

    const businessId = shopDetails.businesses.id;
    const userId = shopDetails.businesses.user_id;

    // Fetch design settings for the business owner
    console.log(`[get-public-shop-data] Fetching design settings for user: ${userId}`);
    const { data: designSettings, error: designSettingsError } = await supabaseAdmin
      .from('design_settings')
      .select('settings')
      .eq('user_id', userId)
      .single();

    if (designSettingsError && designSettingsError.code !== 'PGRST116') {
      console.error(`[get-public-shop-data] Error fetching design settings for user ${userId}. Error: ${designSettingsError?.message}`);
      throw designSettingsError;
    }
    console.log(`[get-public-shop-data] Design settings fetched: ${JSON.stringify(designSettings?.settings)}`);

    const offset = (page - 1) * limit;

    // Fetch active products for the business with pagination
    console.log(`[get-public-shop-data] Fetching products for business: ${businessId}, offset: ${offset}, limit: ${limit}`);
    const { data: products, error: productsError, count: totalProductsCount } = await supabaseAdmin
      .from('products')
      .select('*, interval_repetitions', { count: 'exact' }) // MODIFIED: Added interval_repetitions
      .eq('business_id', businessId)
      .neq('status', 'Draft') // MODIFIED: Exclude 'Draft' products
      .range(offset, offset + limit - 1); // Apply range for pagination

    if (productsError) {
      console.error(`[get-public-shop-data] Error fetching products for business ${businessId}. Error: ${productsError?.message}`);
      throw productsError;
    }
    console.log(`[get-public-shop-data] Products fetched: ${products?.length} (Total: ${totalProductsCount})`);

    // Fetch best sellers (top 5 products by total sales)
    console.log(`[get-public-shop-data] Fetching best sellers for business: ${businessId}`);
    const { data: bestSellers, error: bestSellersError } = await supabaseAdmin.rpc('get_top_products', { p_business_id: businessId });
    if (bestSellersError) {
      console.error(`[get-public-shop-data] Error fetching best sellers for business ${businessId}. Error: ${bestSellersError?.message}`);
    }
    console.log(`[get-public-shop-data] Best sellers fetched: ${bestSellers?.length}`);

    // Fetch recommended products (e.g., 4 random active products, excluding best sellers)
    console.log(`[get-public-shop-data] Fetching all active products for recommendations for business: ${businessId}`);
    const { data: allActiveProducts, error: allActiveProductsError } = await supabaseAdmin
      .from('products')
      .select('*, interval_repetitions') // MODIFIED: Added interval_repetitions
      .eq('business_id', businessId)
      .eq('status', 'Active');

    let recommendedProducts: any[] = [];
    if (allActiveProductsError) {
      console.error(`[get-public-shop-data] Error fetching all active products for recommendations for business ${businessId}. Error: ${allActiveProductsError?.message}`);
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
    console.log(`[get-public-shop-data] Recommended products fetched: ${recommendedProducts?.length}`);

    // Fetch active promotions for the business
    console.log(`[get-public-shop-data] Fetching promotions for user: ${userId}`);
    const { data: promotions, error: promotionsError } = await supabaseAdmin
      .from('promotions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .or(`start_date.is.null,start_date.lte.${new Date().toISOString()}`)
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString()}`);

    if (promotionsError) {
      console.error(`[get-public-shop-data] Error fetching promotions for user ${userId}. Error: ${promotionsError?.message}`);
    }
    console.log(`[get-public-shop-data] Promotions fetched: ${promotions?.length}`);

    // Fetch active marquee elements for the business, only filtering by is_active in SQL
    console.log(`[get-public-shop-data] Fetching marquee elements for user: ${userId}`);
    const { data: rawMarqueeElements, error: marqueeElementsError } = await supabaseAdmin
      .from('marquee_elements')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    let activeMarqueeElements: any[] = [];
    if (marqueeElementsError) {
      console.error(`[get-public-shop-data] Error fetching marquee elements for user ${userId}. Error: ${marqueeElementsError?.message}`);
    } else if (rawMarqueeElements) {
      activeMarqueeElements = rawMarqueeElements.filter(element => {
        const startDate = element.start_date ? new Date(element.start_date) : null;
        const endDate = element.end_date ? new Date(element.end_date) : null;
        const isActive = isRecurringActive(startDate, endDate, element.repeat_interval);
        return isActive;
      });
    }
    console.log(`[get-public-shop-data] Active marquee elements fetched: ${activeMarqueeElements?.length}`);

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
    console.error('[get-public-shop-data] Function Error (Catch Block):', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});