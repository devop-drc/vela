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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('Invalid token:', authError?.message);
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const user_id = user.id;

    // 1. Fetch the user's Instagram connection (prefer direct IG login)
    const { data: integrations, error: integrationError } = await supabaseAdmin
      .from('integrations')
      .select('provider, access_token, ig_account_id')
      .eq('user_id', user_id)
      .in('provider', ['instagram', 'facebook']);
    const integration = integrations?.find((r: any) => r.provider === 'instagram') ?? integrations?.[0];

    if (integrationError || !integration) {
      console.error(`Instagram integration not found for user ${user_id}:`, integrationError?.message || 'No integration record.');
      return new Response(JSON.stringify({ error: "Instagram integration not found for this user. Please connect your account in the settings." }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userAccessToken = integration.access_token;

    // 2-3. Fetch the profile per provider.
    let igProfileData: any;
    let pageFallbackName: string | null = null;
    if (integration.provider === 'instagram') {
      // Direct IG login: /me carries the profile; fall back to the minimal
      // field set if the rich one is rejected.
      const rich = 'name,username,profile_picture_url,biography,followers_count,media_count,website';
      const safe = 'name,username,profile_picture_url';
      let ok = false;
      for (const fields of [rich, safe]) {
        const res = await fetch(`https://graph.instagram.com/me?fields=${fields}&access_token=${userAccessToken}`);
        const data = await res.json();
        if (res.ok) { igProfileData = data; ok = true; break; }
        console.error(`IG profile fetch failed for user ${user_id} [${fields}]:`, data.error?.message);
      }
      if (!ok) {
        return new Response(JSON.stringify({ error: 'Failed to fetch Instagram profile details. Please try reconnecting your account.' }), {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Legacy Facebook-login connections: discover the IG account via Pages.
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
        return new Response(JSON.stringify({ error: 'No linked Instagram Business Account found. Please reconnect your Instagram account in the settings.' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      pageFallbackName = igAccount.name ?? null;

      const igAccountId = igAccount.instagram_business_account.id;
      const fields = 'name,username,profile_picture_url,biography,followers_count,media_count,website';
      const igProfileResponse = await fetch(`https://graph.facebook.com/v19.0/${igAccountId}?fields=${fields}&access_token=${userAccessToken}`);
      if (!igProfileResponse.ok) {
        const errorData = await igProfileResponse.json();
        console.error(`Failed to fetch Instagram profile details for account ${igAccountId}:`, errorData.error?.message || errorData);
        return new Response(JSON.stringify({ error: errorData.error?.message || 'Failed to fetch Instagram profile details.' }), {
          status: igProfileResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      igProfileData = await igProfileResponse.json();
    }

    const shopData = {
      shop_name: igProfileData.name || pageFallbackName || igProfileData.username,
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