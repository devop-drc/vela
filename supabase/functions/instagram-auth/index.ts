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
      console.log("--- Instagram Auth Callback Initiated ---");
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');
      const encodedState = url.search_params.get('state');
      
      let origin = '/'; // Default fallback
      if (encodedState) {
        try {
          const statePayload = atob(encodedState);
          const { origin: stateOrigin } = JSON.parse(statePayload);
          if (stateOrigin) origin = stateOrigin;
        } catch (e) {
          console.error("Failed to parse state:", e);
        }
      }

      if (error) {
        const friendlyError = errorDescription || 'Permissions were denied on Facebook.';
        const redirectUrl = new URL(`${origin}/settings`);
        redirectUrl.searchParams.set('integration_error', friendlyError);
        return Response.redirect(redirectUrl.toString(), 302);
      }

      const code = url.searchParams.get('code');
      console.log("Callback received with code:", code ? "Exists" : "Missing", "| state:", encodedState ? "Exists" : "Missing");
      if (!code || !encodedState) throw new Error('Authorization code or state not found in callback.');

      const statePayload = atob(encodedState);
      const { jwt } = JSON.parse(statePayload);
      if (!jwt) throw new Error('JWT not found in state.');
      console.log("State successfully decoded. JWT found.");

      // Step 3: Exchange code for a short-lived access token
      console.log("Step 3: Exchanging code for short-lived token...");
      const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&redirect_uri=${REDIRECT_URI}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}`;
      const tokenResponse = await fetch(tokenUrl);
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        console.error('Error fetching short-lived token:', errorData);
        throw new Error(`Failed to get access token: ${errorData.error.message}`);
      }
      const tokenData = await tokenResponse.json();
      const shortLivedToken = tokenData.access_token;
      console.log("Successfully received short-lived token:", shortLivedToken ? `...${shortLivedToken.slice(-5)}` : "Not found");

      // Step 4: Exchange for a long-lived token
      console.log("Step 4: Exchanging for long-lived token...");
      const longLivedTokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&fb_exchange_token=${shortLivedToken}`;
      const longLivedTokenResponse = await fetch(longLivedTokenUrl);
      if (!longLivedTokenResponse.ok) {
        const errorData = await longLivedTokenResponse.json();
        console.error('Error fetching long-lived token:', errorData);
        throw new Error(`Failed to get long-lived access token: ${errorData.error.message}`);
      }
      const longLivedTokenData = await longLivedTokenResponse.json();
      const longLivedToken = longLivedTokenData.access_token;
      console.log("Successfully received long-lived token:", longLivedToken ? `...${longLivedToken.slice(-5)}` : "Not found");

      // --- TEST REQUESTS ---
      console.log("--- Running Test Requests with Long-Lived Token ---");
      try {
        const meUrl = `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${longLivedToken}`;
        const meResponse = await fetch(meUrl);
        const meData = await meResponse.json();
        if (!meResponse.ok) {
            console.error("Test Request 1 (/me) FAILED:", meData);
        } else {
            console.log("Test Request 1 (/me) SUCCESS:", meData);
        }
      } catch (e) {
        console.error("Error during Test Request 1 (/me):", e.message);
      }
      try {
        const appAccessToken = `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;
        const debugUrl = `https://graph.facebook.com/debug_token?input_token=${longLivedToken}&access_token=${appAccessToken}`;
        const debugResponse = await fetch(debugUrl);
        const debugData = await debugResponse.json();
        if (!debugResponse.ok || !debugData.data || !debugData.data.is_valid) {
            console.error("Test Request 2 (debug_token) FAILED:", debugData);
        } else {
            console.log("Test Request 2 (debug_token) SUCCESS. Scopes:", debugData.data.scopes);
        }
      } catch (e) {
        console.error("Error during Test Request 2 (debug_token):", e.message);
      }
      console.log("--- Finished Test Requests ---");

      // Step 5: Save the token using the JWT from 'state'
      console.log("Step 5: Saving token to Supabase...");
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: `Bearer ${jwt}` } } }
      );

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found from JWT in state.');
      console.log("Supabase user found:", user.id);

      const { error: upsertError } = await supabase
        .from('integrations')
        .upsert({
          user_id: user.id,
          provider: 'facebook',
          access_token: longLivedToken,
        }, { onConflict: 'user_id,provider' });

      if (upsertError) {
        console.error("Supabase upsert FAILED:", upsertError);
        throw upsertError;
      }
      console.log("Token successfully saved to 'integrations' table.");

      // Step 6: Redirect user back to the app
      console.log("--- Instagram Auth Callback Complete. Redirecting... ---");
      return Response.redirect(`${origin}/products?instagram_connected=true`, 302);

    } catch (error) {
      console.error('OAuth Callback Error:', error.message);
      const genericErrorUrl = new URL(req.headers.get('origin') || Deno.env.get('SUPABASE_URL') || '/');
      genericErrorUrl.pathname = '/settings';
      genericErrorUrl.searchParams.set('integration_error', error.message);
      return Response.redirect(genericErrorUrl.toString(), 302);
    }
  } else {
    // Step 1: Redirect user to Facebook for authorization
    try {
      console.log("--- Instagram Auth Step 1 Initiated ---");
      const jwt = url.searchParams.get('jwt');
      const origin = url.searchParams.get('origin');
      console.log("Received JWT:", jwt ? "Yes" : "No", "| Received Origin:", origin);
      if (!jwt) throw new Error('Missing JWT in query parameters. User must be logged in.');
      if (!origin) throw new Error('Missing origin in query parameters.');

      const statePayload = JSON.stringify({ jwt, origin });
      const encodedState = btoa(statePayload);

      const scopes = 'public_profile,pages_show_list,instagram_basic,instagram_content_publish,pages_read_engagement,business_management';
      const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
      authUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
      authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('state', encodedState);
      authUrl.searchParams.set('auth_type', 'rerequest');
      
      console.log("Redirecting user to Facebook for authorization...");
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