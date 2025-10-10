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
const isRecurringActive = (startDate: string | null, endDate: string | null, repeatInterval: string | null): boolean => {
  const now = new Date();
  const currentYear = now.getFullYear();

  let effectiveStart: Date | null = null;
  let effectiveEnd: Date | null = null;

  try {
    if (startDate) effectiveStart = new Date(startDate);
    if (endDate) effectiveEnd = new Date(endDate);
  } catch (e) {
    console.error("Error parsing date in isRecurringActive:", e);
    return false; // If dates are invalid, it's not active
  }

  // Adjust dates to current year for recurrence logic if applicable
  if (repeatInterval && repeatInterval !== 'none') {
    if (effectiveStart) {
      effectiveStart.setFullYear(currentYear);
      // If start date is in the future of the current year, but was in the past of the original year,
      // it means it's a recurring event that already passed this year.
      // This logic might need more refinement for complex recurring patterns.
    }
    if (effectiveEnd) {
      effectiveEnd.setFullYear(currentYear);
      // Handle cross-year recurrence (e.g., Dec 15 - Jan 15)
      if (effectiveStart && effectiveEnd && effectiveStart > effectiveEnd) {
        effectiveEnd.setFullYear(currentYear + 1);
      }
    }
  }

  // Now, perform the absolute date range check using the (potentially adjusted) effective dates
  if (effectiveStart && now < effectiveStart) return false;
  if (effectiveEnd && now > effectiveEnd) return false;

  // If no repeat interval, or repeat is 'none', and it passed the absolute date check, it's active
  if (!repeatInterval || repeatInterval === 'none') return true;

  // For specific recurring intervals, apply additional logic
  switch (repeatInterval) {
    case 'daily':
      return true;
    case 'weekly':
      return now.getDay() === (effectiveStart ? effectiveStart.getDay() : now.getDay());
    case 'monthly':
      return now.getDate() === (effectiveStart ? effectiveStart.getDate() : now.getDate());
    case 'yearly':
      return (now.getMonth() === (effectiveStart ? effectiveStart.getMonth() : now.getMonth())) &&
             (now.getDate() === (effectiveStart ? effectiveStart.getDate() : now.getDate()));
    default:
      return false;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { shopSlug, page = 1, limit = 12 } = await req.json();
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
      .select('*, businesses(id, user_id, name)')
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
      // Do not throw, just log and proceed with null settings
    }
    console.log(`[get-public-shop-data] Design settings fetched: ${JSON.stringify(designSettings?.settings)}`);

    const offset = (page - 1) * limit;

    // Fetch active products for the business with pagination
    console.log(`[get-public-shop-data] Fetching products for business: ${businessId}, offset: ${offset}, limit: ${limit}`);
    const { data: products, error: productsError, count: totalProductsCount } = await supabaseAdmin
      .from('products')
      .select('*, interval_repetitions', { count: 'exact' })
      .eq('business_id', businessId)
      .neq('status', 'Draft')
      .range(offset, offset + limit - 1);

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
      // Do not throw, just log and proceed with empty array
    }
    console.log(`[get-public-shop-data] Best sellers fetched: ${bestSellers?.length}`);

    // Fetch recommended products (e.g., 4 random active products, excluding best sellers)
    console.log(`[get-public-shop-data] Fetching all active products for recommendations for business: ${businessId}`);
    const { data: allActiveProducts, error: allActiveProductsError } = await supabaseAdmin
      .from('products')
      .select('*, interval_repetitions')
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
        const isActive = isRecurringActive(element.start_date, element.end_date, element.repeat_interval);
        return isActive;
      });
    }
    console.log(`[get-public-shop-data] Active marquee elements fetched: ${activeMarqueeElements?.length}`);

    return new Response(JSON.stringify({
      shopDetails: {
        id: businessId,
        user_id: userId,
        name: shopDetails.businesses.name,
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
        instagram_url: shopDetails.instagram_url || null,
        username: shopDetails.username || null,
      },
      appearanceSettings: designSettings?.settings || null,
      products: products || [],
      totalProductsCount: totalProductsCount || 0,
      hasMore: (offset + (products?.length || 0)) < (totalProductsCount || 0),
      bestSellers: bestSellers || [],
      recommendedProducts: recommendedProducts || [],
      promotions: promotions || [],
      marqueeElements: activeMarqueeElements || [],
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