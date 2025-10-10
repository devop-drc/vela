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
    const { user_id } = await req.json(); // Expect user_id in the body
    if (!user_id) {
      console.error('Instagram Profile Function Error: User ID is required.');
      return new Response(JSON.stringify({ error: 'User ID is required.' }), {
        status: 400, // Bad Request
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role key for admin access
      { auth: { persistSession: false } }
    );

    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('access_token')
      .eq('user_id', user_id) // Use the provided user_id
      .eq('provider', 'facebook')
      .single();

    if (integrationError || !integration) {
      console.error(`Instagram integration not found for user ${user_id}:`, integrationError);
      return new Response(JSON.stringify({ error: "Instagram integration not found for this user. Please connect your account in the settings." }), {
        status: 404, // Not Found
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userAccessToken = integration.access_token;

    const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account,name,picture{url}&access_token=${userAccessToken}`;
    const pagesResponse = await fetch(pagesUrl);
    if (!pagesResponse.ok) {
      const errorData = await pagesResponse.json();
      console.error(`Failed to fetch Facebook pages for user ${user_id}:`, errorData);
      return new Response(JSON.stringify({ error: errorData.error?.message || 'Failed to fetch Facebook pages.' }), {
        status: pagesResponse.status, // Propagate Facebook API status
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const pagesData = await pagesResponse.json();

    const igAccount = pagesData.data?.find((page: any) => page.instagram_business_account);
    if (!igAccount) {
      console.warn(`No linked Instagram Business Account found for user ${user_id}.`);
      return new Response(JSON.stringify({ error: 'No linked Instagram Business Account found. Please ensure your Instagram account is a Business or Creator account and is linked to the Facebook Page you selected. Also, ensure you grant all requested permissions during the Facebook login process.' }), {
        status: 404, // Not Found
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const igAccountId = igAccount.instagram_business_account.id;
    const fields = 'name,username,profile_picture_url,biography,followers_count,media_count,website'; // Added 'website' to fields
    const igProfileUrl = `https://graph.facebook.com/v19.0/${igAccountId}?fields=${fields}&access_token=${userAccessToken}`;
    
    const igProfileResponse = await fetch(igProfileUrl);
    if (!igProfileResponse.ok) {
      const errorData = await igProfileResponse.json();
      console.error(`Failed to fetch Instagram profile details for account ${igAccountId}:`, errorData);
      return new Response(JSON.stringify({ error: errorData.error?.message || 'Failed to fetch Instagram profile details.' }), {
        status: igProfileResponse.status, // Propagate Instagram API status
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const igProfileData = await igProfileResponse.json();

    console.log(`Instagram Profile Data for user ${user_id}:`, igProfileData); // Detailed log

    const shopData = {
      shop_name: igProfileData.name || igAccount.name,
      username: igProfileData.username,
      description: igProfileData.biography,
      logo_url: igProfileData.profile_picture_url || null, // Ensure null if empty
      favicon_url: igProfileData.profile_picture_url || null, // Ensure null if empty
      followers_count: igProfileData.followers_count,
      media_count: igProfileData.media_count,
      instagram_url: `https://www.instagram.com/${igProfileData.username}`, // Construct Instagram profile URL
    };

    return new Response(JSON.stringify(shopData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Instagram Profile Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, // Internal Server Error for unexpected errors
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});