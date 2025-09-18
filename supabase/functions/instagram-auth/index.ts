import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const FACEBOOK_APP_ID = Deno.env.get('FACEBOOK_APP_ID');
const FACEBOOK_APP_SECRET = Deno.env.get('FACEBOOK_APP_SECRET');
const REDIRECT_URI = `${Deno.env.get('SUPABASE_URL')}/functions/v1/instagram-auth/callback`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getSupabaseAdmin = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
    return new Response(JSON.stringify({ error: "Facebook App ID or Secret is not configured." }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const isCallback = url.pathname.endsWith('/callback');

  if (isCallback) {
    let origin = '/';
    try {
      const encodedState = url.searchParams.get('state');
      if (encodedState) {
        const statePayload = atob(encodedState);
        const { origin: stateOrigin } = JSON.parse(statePayload);
        if (stateOrigin) origin = stateOrigin;
      }

      const error = url.searchParams.get('error');
      if (error) {
        const errorDescription = url.searchParams.get('error_description') || 'Permissions were denied.';
        const redirectUrl = new URL(origin);
        redirectUrl.searchParams.set('integration_error', errorDescription);
        return Response.redirect(redirectUrl.toString(), 302);
      }

      const code = url.searchParams.get('code');
      if (!code) throw new Error('Authorization code not found in callback.');

      const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&redirect_uri=${REDIRECT_URI}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}`;
      const tokenResponse = await fetch(tokenUrl);
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok) throw new Error(tokenData.error.message);
      const shortLivedToken = tokenData.access_token;

      const longLivedTokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&fb_exchange_token=${shortLivedToken}`;
      const longLivedTokenResponse = await fetch(longLivedTokenUrl);
      const longLivedTokenData = await longLivedTokenResponse.json();
      if (!longLivedTokenResponse.ok) throw new Error(longLivedTokenData.error.message);
      const longLivedToken = longLivedTokenData.access_token;

      const profileUrl = `https://graph.facebook.com/v19.0/me?fields=id,email,first_name,last_name,picture&access_token=${longLivedToken}`;
      const profileResponse = await fetch(profileUrl);
      const profileData = await profileResponse.json();
      if (!profileResponse.ok) throw new Error(profileData.error.message);
      
      const { email, first_name, last_name, picture } = profileData;
      if (!email) throw new Error("Could not retrieve email from Facebook. Please ensure your account has a verified email and you granted email permissions.");

      const supabaseAdmin = getSupabaseAdmin();
      let userId: string;

      // Correctly check for an existing user
      const { data: users, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers({ email: email });
      if (listUsersError) throw listUsersError;

      if (users && users.users.length > 0) {
        userId = users.users[0].id;
      } else {
        const tempPassword = crypto.randomUUID();
        const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            first_name,
            last_name,
            avatar_url: picture?.data?.url,
            full_name: `${first_name} ${last_name || ''}`.trim(),
          }
        });
        if (createUserError) throw createUserError;
        userId = newUser.user.id;
      }

      const { error: upsertError } = await supabaseAdmin.from('integrations').upsert({
        user_id: userId,
        provider: 'facebook',
        access_token: longLivedToken,
      }, { onConflict: 'user_id,provider' });
      if (upsertError) throw upsertError;

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: { redirectTo: `${origin}?integration_success=true` }
      });
      if (linkError) throw linkError;

      return Response.redirect(linkData.properties.action_link, 302);

    } catch (error) {
      console.error('OAuth Callback Error:', error.message);
      const errorUrl = new URL(origin);
      errorUrl.searchParams.set('integration_error', error.message);
      return Response.redirect(errorUrl.toString(), 302);
    }
  } else {
    try {
      const origin = url.searchParams.get('origin');
      if (!origin) throw new Error('Missing origin parameter.');

      const statePayload = JSON.stringify({ origin });
      const encodedState = btoa(statePayload);
      const scopes = 'public_profile,email,pages_show_list,instagram_basic,pages_read_engagement';
      
      const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
      authUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
      authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('state', encodedState);
      authUrl.searchParams.set('auth_type', 'rerequest');
      
      return Response.redirect(authUrl.toString(), 302);
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
});