import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();
    if (!user_id) {
      console.error('Instagram Profile Function Error: User ID is required in request body.');
      return new Response(JSON.stringify({ error: 'User ID is required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // 1. Fetch user's Instagram access token from integrations table
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('access_token')
      .eq('user_id', user_id)
      .eq('provider', 'facebook')
      .single();

    if (integrationError || !integration) {
      console.error(`Instagram integration not found for user ${user_id}:`, integrationError?.message || 'No integration record.');
      return new Response(JSON.stringify({ error: "Instagram integration not found for this user. Please connect your account in the settings." }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userAccessToken = integration.access_token;

    // 2. Fetch Facebook pages to find the linked Instagram Business Account
    const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account,name,picture{url}&access_token=${userAccessToken}`;
    const pagesResponse = await fetch(pagesUrl);
    if (!pagesResponse.ok) {
      const errorData = await pagesResponse.json();
      console.error(`Failed to fetch Facebook pages for user ${user_id}:`, errorData.error?.message || errorData);
      return new Response(JSON.stringify({ error: errorData.error?.message || 'Failed to fetch Facebook pages. Please try reconnecting your account.' }), {
        status: pagesResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const pagesData = await pagesResponse.json();

    const igAccount = pagesData.data?.find((page: any) => page.instagram_business_account);
    if (!igAccount) {
      console.warn(`No linked Instagram Business Account found for user ${user_id} after fetching Facebook pages.`);
      return new Response(JSON.stringify({ error: 'No linked Instagram Business Account found. Please ensure your Instagram account is a Business or Creator account and is linked to the Facebook Page you selected. Also, ensure you grant all requested permissions during the Facebook login process.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const igAccountId = igAccount.instagram_business_account.id;
    const fields = 'name,username,profile_picture_url,biography,followers_count,media_count,website';
    const igProfileUrl = `https://graph.facebook.com/v19.0/${igAccountId}?fields=${fields}&access_token=${userAccessToken}`;
    
    // 3. Fetch Instagram Business Profile details
    const igProfileResponse = await fetch(igProfileUrl);
    if (!igProfileResponse.ok) {
      const errorData = await igProfileResponse.json();
      console.error(`Failed to fetch Instagram profile details for account ${igAccountId}:`, errorData.error?.message || errorData);
      return new Response(JSON.stringify({ error: errorData.error?.message || 'Failed to fetch Instagram profile details.' }), {
        status: igProfileResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const igProfileData = await igProfileResponse.json();

    console.log(`Instagram Profile Data fetched for user ${user_id}:`, igProfileData);

    const shopData = {
      shop_name: igProfileData.name || igAccount.name,
      username: igProfileData.username,
      description: igProfileData.biography,
      logo_url: igProfileData.profile_picture_url || null,
      favicon_url: igProfileData.profile_picture_url || null,
      followers_count: igProfileData.followers_count,
      media_count: igProfileData.media_count,
      instagram_url: `https://www.instagram.com/${igProfileData.username}`,
    };

    return new Response(JSON.stringify(shopData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Instagram Profile Function (Catch Block) Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});