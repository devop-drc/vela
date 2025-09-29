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
    const { businessId } = await req.json();
    if (!businessId) {
      return new Response(JSON.stringify({ error: "Missing businessId" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Fetch business details to get user_id for design settings
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .select('id, user_id, name')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      throw new Error("Business not found or inaccessible.");
    }

    // Fetch shop details
    const { data: shopDetails, error: shopDetailsError } = await supabaseAdmin
      .from('shop_details')
      .select('*')
      .eq('business_id', businessId)
      .single();

    if (shopDetailsError && shopDetailsError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw shopDetailsError;
    }

    // Fetch design settings for the business owner
    const { data: designSettings, error: designSettingsError } = await supabaseAdmin
      .from('design_settings')
      .select('settings')
      .eq('user_id', business.user_id)
      .single();

    if (designSettingsError && designSettingsError.code !== 'PGRST116') {
      throw designSettingsError;
    }

    // Fetch active products for the business
    const { data: products, error: productsError } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('business_id', businessId)
      .eq('status', 'Active');

    if (productsError) {
      throw productsError;
    }

    return new Response(JSON.stringify({
      shopDetails: {
        id: business.id,
        name: business.name,
        ...shopDetails,
      },
      appearanceSettings: designSettings?.settings || null,
      products: products || [],
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