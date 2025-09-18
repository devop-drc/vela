import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not found');

    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('provider', 'facebook')
      .single();

    if (integrationError || !integration) {
      throw new Error("Instagram integration not found. Please connect your account in the settings.");
    }
    const userAccessToken = integration.access_token;

    const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account,name,picture{url}&access_token=${userAccessToken}`;
    const pagesResponse = await fetch(pagesUrl);
    if (!pagesResponse.ok) throw new Error('Failed to fetch Facebook pages.');
    const pagesData = await pagesResponse.json();

    const igAccount = pagesData.data?.find((page: any) => page.instagram_business_account);
    if (!igAccount) throw new Error('No linked Instagram Business Account found.');
    
    const igAccountId = igAccount.instagram_business_account.id;
    const fields = 'name,username,profile_picture_url,biography,followers_count,media_count';
    const igProfileUrl = `https://graph.facebook.com/v19.0/${igAccountId}?fields=${fields}&access_token=${userAccessToken}`;
    
    const igProfileResponse = await fetch(igProfileUrl);
    if (!igProfileResponse.ok) throw new Error('Failed to fetch Instagram profile details.');
    const igProfileData = await igProfileResponse.json();

    const shopData = {
      shop_name: igProfileData.name || igAccount.name,
      username: igProfileData.username,
      description: igProfileData.biography,
      logo_url: igProfileData.profile_picture_url,
      favicon_url: igAccount.picture?.data?.url,
      followers_count: igProfileData.followers_count,
      media_count: igProfileData.media_count,
    };

    return new Response(JSON.stringify(shopData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});