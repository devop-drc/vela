import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const INSTAGRAM_APP_ID = '2052824951918159';
const REDIRECT_URI = 'https://ixiafbgaqszlokmzjjio.supabase.co/functions/v1/instagram-auth/callback';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/functions/v1/instagram-auth', '');

  // Step 1: Redirect user to Instagram for authorization
  if (path === '' || path === '/') {
    const authUrl = new URL('https://api.instagram.com/oauth/authorize');
    authUrl.searchParams.set('client_id', INSTAGRAM_APP_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('scope', 'user_profile,user_media');
    authUrl.searchParams.set('response_type', 'code');
    
    return Response.redirect(authUrl.toString(), 302);
  }

  // Step 2: Handle the callback from Instagram
  if (path === '/callback') {
    try {
      const code = url.searchParams.get('code');
      if (!code) {
        throw new Error('Authorization code not found.');
      }

      const INSTAGRAM_APP_SECRET = Deno.env.get('INSTAGRAM_APP_SECRET');
      if (!INSTAGRAM_APP_SECRET) {
        throw new Error('Instagram App Secret is not configured in Supabase secrets.');
      }

      // Step 3: Exchange the code for a short-lived access token
      const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: INSTAGRAM_APP_ID,
          client_secret: INSTAGRAM_APP_SECRET,
          grant_type: 'authorization_code',
          redirect_uri: REDIRECT_URI,
          code: code,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error('Error fetching short-lived token:', errorData);
        throw new Error(`Failed to get access token: ${errorData.error_message}`);
      }

      const tokenData = await tokenResponse.json();
      const shortLivedToken = tokenData.access_token;

      // Step 4: Exchange the short-lived token for a long-lived token
      const longLivedTokenResponse = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${INSTAGRAM_APP_SECRET}&access_token=${shortLivedToken}`);
      
      if (!longLivedTokenResponse.ok) {
        const errorData = await longLivedTokenResponse.json();
        console.error('Error fetching long-lived token:', errorData);
        throw new Error(`Failed to get long-lived access token: ${errorData.error.message}`);
      }

      const longLivedTokenData = await longLivedTokenResponse.json();
      const longLivedToken = longLivedTokenData.access_token;

      // Step 5: Save the long-lived token to the database
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('Missing authorization header');
      }

      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not found');
      }

      const { error: upsertError } = await supabase
        .from('integrations')
        .upsert({
          user_id: user.id,
          provider: 'instagram',
          access_token: longLivedToken,
        }, { onConflict: 'user_id,provider' });

      if (upsertError) {
        throw upsertError;
      }

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
  }

  return new Response(JSON.stringify({ message: 'Not Found' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});