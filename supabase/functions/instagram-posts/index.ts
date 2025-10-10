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
  let userId; // To log which user is having issues

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('Instagram Posts Function Error: User not found or unauthorized.');
      return new Response(JSON.stringify({ error: 'User not found or unauthorized.' }), {
        status: 401, // Unauthorized
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    userId = user.id;

    const body = await req.json().catch(() => null);

    if (body?.user_access_token) {
      // Case 1: Called by another function (like periodic-sync) with a token in the body
      userAccessToken = body.user_access_token;
    } else {
      // Case 2: Called by a client, get token from the database
      const { data: integration, error: integrationError } = await supabase
        .from('integrations')
        .select('access_token')
        .eq('user_id', userId)
        .eq('provider', 'facebook')
        .single();

      if (integrationError || !integration) {
        console.error(`Instagram integration not found for user ${userId}:`, integrationError);
        return new Response(JSON.stringify({ error: "Instagram integration not found for this user. Please connect your account in the settings." }), {
          status: 404, // Not Found
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userAccessToken = integration.access_token;
    }

    if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
        console.error('Instagram Posts Function Error: App secrets are not configured.');
        return new Response(JSON.stringify({ error: "App secrets are not configured." }), {
          status: 500, // Internal Server Error
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    
    const appAccessToken = `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${userAccessToken}&access_token=${appAccessToken}`;
    const debugResponse = await fetch(debugUrl);
    const debugData = await debugResponse.json();

    if (!debugData.data || !debugData.data.is_valid) {
        console.error(`Instagram Posts Function Error for user ${userId}: Invalid or expired Facebook connection.`, debugData);
        return new Response(JSON.stringify({ error: "Your Facebook connection is invalid or has expired. Please disconnect and reconnect in the settings." }), {
          status: 401, // Unauthorized
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    
    const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account,name&access_token=${userAccessToken}`;
    const pagesResponse = await fetch(pagesUrl);
    if (!pagesResponse.ok) {
        const errorData = await pagesResponse.json();
        console.error(`Instagram Posts Function Error for user ${userId}: Failed to fetch Facebook pages.`, errorData);
        return new Response(JSON.stringify({ error: errorData.error?.message || 'Failed to fetch Facebook pages. Please try reconnecting your account.' }), {
          status: pagesResponse.status, // Propagate Facebook API status
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    const pagesData = await pagesResponse.json();

    const igAccount = pagesData.data?.find((page: any) => page.instagram_business_account);
    if (!igAccount) {
      const pageNames = pagesData.data.map((page: any) => page.name).join(', ');
      const detailedError = `We found the following Facebook Page(s): ${pageNames}. However, none of them have a linked Instagram Business Account that this app has permission to access. Please try disconnecting and reconnecting. During the Facebook login process, ensure you click "Edit Settings" and grant all requested permissions for both your Facebook Page and your Instagram account.`;
      console.error(`Instagram Posts Function Error for user ${userId}: No linked Instagram Business Account.`, detailedError);
      return new Response(JSON.stringify({ error: detailedError }), {
        status: 404, // Not Found
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
            console.error(`Instagram Posts Function Error for user ${userId}: Failed to fetch media from Instagram.`, errorData);
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
    console.error(`Instagram Posts Function Error for user ${userId || 'unknown'}:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, // Internal Server Error for unexpected errors
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});