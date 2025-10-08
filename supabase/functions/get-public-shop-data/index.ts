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
      throw new Error("Shop not found or inaccessible.");
    }

    const businessId = shopDetails.businesses.id;
    const userId = shopDetails.businesses.user_id;

    // Fetch design settings for the business owner
    const { data: designSettings, error: designSettingsError } = await supabaseAdmin
      .from('design_settings')
      .select('settings')
      .eq('user_id', userId)
      .single();

    if (designSettingsError && designSettingsError.code !== 'PGRST116') {
      throw designSettingsError;
    }

    // Fetch Instagram profile data to get the instagram_url
    // This is now redundant as instagram_url is stored in shop_details, but kept for reference if needed
    // const { data: instagramProfile, error: instagramProfileError } = await supabaseAdmin.functions.invoke('instagram-profile', {
    //   headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` }, // Use service role key for function invocation
    //   body: { user_id: userId } // Pass user_id to the instagram-profile function
    // });

    // if (instagramProfileError) {
    //   console.error("Error invoking instagram-profile function:", instagramProfileError);
    // } else if (instagramProfile.error) {
    //   console.error("Error from instagram-profile function:", instagramProfile.error);
    // }

    const offset = (page - 1) * limit;

    // Fetch active products for the business with pagination
    const { data: products, error: productsError, count: totalProductsCount } = await supabaseAdmin
      .from('products')
      .select('*', { count: 'exact' }) // Get exact count
      .eq('business_id', businessId)
      .eq('status', 'Active')
      .range(offset, offset + limit - 1); // Apply range for pagination

    if (productsError) {
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