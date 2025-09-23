import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const FACEBOOK_APP_ID = Deno.env.get('FACEBOOK_APP_ID');
const FACEBOOK_APP_SECRET = Deno.env.get('FACEBOOK_APP_SECRET');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let userAccessToken;

  try {
    const body = await req.json().catch(() => null);

    if (body?.user_access_token) {
      // Case 1: Called by another function (like periodic-sync) with a token in the body
      userAccessToken = body.user_access_token;
    } else {
      // Case 2: Called by a client, get token from the database
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
        return new Response(JSON.stringify({ posts: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }
      userAccessToken = integration.access_token;
    }

    if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
        throw new Error("App secrets are not configured.");
    }
    
    const appAccessToken = `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${userAccessToken}&access_token=${appAccessToken}`;
    const debugResponse = await fetch(debugUrl);
    const debugData = await debugResponse.json();

    if (!debugData.data || !debugData.data.is_valid) {
        throw new Error("Your Facebook connection is invalid or has expired. Please disconnect and reconnect in the settings.");
    }
    
    const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account,name&access_token=${userAccessToken}`;
    const pagesResponse = await fetch(pagesUrl);
    if (!pagesResponse.ok) {
        const errorData = await pagesResponse.json();
        throw new Error('Failed to fetch Facebook pages. Please try reconnecting your account.');
    }
    const pagesData = await pagesResponse.json();

    const igAccount = pagesData.data?.find((page: any) => page.instagram_business_account);
    if (!igAccount) {
      const pageNames = pagesData.data.map((page: any) => page.name).join(', ');
      const detailedError = `We found the following Facebook Page(s): ${pageNames}. However, none of them have a linked Instagram Business Account that this app has permission to access. Please try disconnecting and reconnecting. During the Facebook login process, ensure you click "Edit Settings" and grant all requested permissions for both your Facebook Page and your Instagram account.`;
      throw new Error(detailedError);
    }
    
    const igAccountId = igAccount.instagram_business_account.id;
    const fields = 'id,media_type,media_url,permalink,thumbnail_url,timestamp,caption';
    let allMedia: any[] = [];
    let mediaUrl: string | null = `https://graph.facebook.com/v19.0/${igAccountId}/media?fields=${fields}&access_token=${userAccessToken}&limit=100`;
    let pageCount = 0;
    const MAX_PAGES = 10; // Safety break to prevent infinite loops

    while (mediaUrl && pageCount < MAX_PAGES) {
        pageCount++;
        const mediaResponse = await fetch(mediaUrl);
        if (!mediaResponse.ok) {
            const errorData = await mediaResponse.json();
            throw new Error(errorData.error.message || 'Failed to fetch media from Instagram.');
        }

        const pageData = await mediaResponse.json();
        if (pageData.data) {
            allMedia = allMedia.concat(pageData.data);
        }

        mediaUrl = pageData.paging?.next || null;
    }

    return new Response(JSON.stringify({ posts: allMedia }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});