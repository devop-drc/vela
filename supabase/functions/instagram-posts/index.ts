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
      return new Response(JSON.stringify({ posts: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    const userAccessToken = integration.access_token;

    // New Diagnostic Step: Debug the user's token to verify permissions
    if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
        throw new Error("App secrets are not configured.");
    }
    const appAccessToken = `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${userAccessToken}&access_token=${appAccessToken}`;
    const debugResponse = await fetch(debugUrl);
    const debugData = await debugResponse.json();

    if (!debugData.data || !debugData.data.is_valid) {
        console.error("Token validation failed:", debugData);
        throw new Error("Your Facebook connection is invalid or has expired. Please disconnect and reconnect in the settings.");
    }

    const grantedScopes = debugData.data.scopes || [];
    if (!grantedScopes.includes('pages_show_list')) {
        const errorMessage = `The essential 'pages_show_list' permission was not granted. This means we can't see your Facebook Pages. Please try removing the app from your Facebook 'Business Integrations' settings and reconnecting, ensuring all permissions are approved.`;
        throw new Error(errorMessage);
    }

    // Original logic to fetch pages
    const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account,name&access_token=${userAccessToken}`;
    const pagesResponse = await fetch(pagesUrl);
    if (!pagesResponse.ok) {
        const errorData = await pagesResponse.json();
        console.error('Failed to fetch Facebook pages:', errorData);
        throw new Error('Failed to fetch Facebook pages. Please try reconnecting your account.');
    }
    const pagesData = await pagesResponse.json();

    if (!pagesData.data || pagesData.data.length === 0) {
      throw new Error('No Facebook Pages were found, even though permissions seem correct. Please ensure you are an admin of the page and that it is correctly linked to your Instagram Business Account.');
    }

    const igAccount = pagesData.data?.find((page: any) => page.instagram_business_account);
    if (!igAccount) {
      const pageNames = pagesData.data.map((page: any) => page.name).join(', ');
      const detailedError = `We found the following Facebook Page(s): ${pageNames}. However, none of them have a linked Instagram Business Account that this app has permission to access. Please try disconnecting and reconnecting. During the Facebook login process, ensure you click "Edit Settings" and grant all requested permissions for both your Facebook Page and your Instagram account.`;
      throw new Error(detailedError);
    }
    
    const igAccountId = igAccount.instagram_business_account.id;
    const fields = 'id,media_type,media_url,permalink,thumbnail_url,timestamp,caption';
    const mediaUrl = `https://graph.facebook.com/v19.0/${igAccountId}/media?fields=${fields}&access_token=${userAccessToken}`;

    const mediaResponse = await fetch(mediaUrl);
    if (!mediaResponse.ok) {
      const errorData = await mediaResponse.json();
      console.error('Instagram Graph API Error:', errorData);
      throw new Error(errorData.error.message || 'Failed to fetch media from Instagram.');
    }

    const { data } = await mediaResponse.json();

    return new Response(JSON.stringify({ posts: data }), {
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