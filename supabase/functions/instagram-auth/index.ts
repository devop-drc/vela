import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

// These secrets must be set in your Supabase project settings
const FACEBOOK_APP_ID = Deno.env.get('FACEBOOK_APP_ID');
const FACEBOOK_APP_SECRET = Deno.env.get('FACEBOOK_APP_SECRET');
const REDIRECT_URI = `${Deno.env.get('SUPABASE_URL')}/functions/v1/instagram-auth/callback`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
    return new Response(JSON.stringify({ error: "Facebook App ID or Secret is not configured in Supabase secrets. Please set them in your project's settings." }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const isCallback = url.pathname.endsWith('/callback');

  if (isCallback) {
    // Step 2: Handle the callback from Facebook
    try {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state'); // The user's JWT

      if (!code) throw new Error('Authorization code not found.');
      if (!state) throw new Error('State (JWT) not found in callback.');

      // Step 3: Exchange code for a short-lived access token
      const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&redirect_uri=${REDIRECT_URI}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}`;
      const tokenResponse = await fetch(tokenUrl);
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error('Error fetching short-lived token:', errorData);
        throw new Error(`Failed to get access token: ${errorData.error.message}`);
      }
      const tokenData = await tokenResponse.json();
      const shortLivedToken = tokenData.access_token;

      // Step 4: Exchange for a long-lived token
      const longLivedTokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&fb_exchange_token=${shortLivedToken}`;
      const longLivedTokenResponse = await fetch(longLivedTokenUrl);
      if (!longLivedTokenResponse.ok) {
        const errorData = await longLivedTokenResponse.json();
        console.error('Error fetching long-lived token:', errorData);
        throw new Error(`Failed to get long-lived access token: ${errorData.error.message}`);
      }
      const longLivedTokenData = await longLivedTokenResponse.json();
      const longLivedToken = longLivedTokenData.access_token;

      // Step 5: Save the token using the JWT from 'state'
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: `Bearer ${state}` } } }
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found from JWT in state.');

      const { error: upsertError } = await supabase
        .from('integrations')
        .upsert({
          user_id: user.id,
          provider: 'facebook', // Use 'facebook' as the provider
          access_token: longLivedToken,
        }, { onConflict: 'user_id,provider' });

      if (upsertError) throw upsertError;

      // Step 6: Redirect user back to the app
      const appUrl = Deno.env.get('SUPABASE_URL')?.includes('localhost') ? 'http://localhost:8080' : `https://${url.hostname.split('.').slice(1).join('.')}`;
      return Response.redirect(`${appUrl}/products?instagram_connected=true`, 302);

    } catch (error) {
      console.error('OAuth Callback Error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } else {
    // Step 1: Redirect user to Facebook for authorization
    try {
      const jwt = url.searchParams.get('jwt');
      if (!jwt) throw new Error('Missing JWT in query parameters. User must be logged in.');

      const scopes = 'public_profile,pages_show_list,instagram_basic,instagram_content_publish,pages_read_engagement';
      const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
      authUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
      authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('state', jwt); // Pass JWT as state
      
      return Response.redirect(authUrl.toString(), 302);
    } catch (error) {
      console.error('OAuth Initial Redirect Error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
});