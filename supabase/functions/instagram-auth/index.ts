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
    return new Response('ok', { headers: corsHeaders });
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

      const profileUrl = `https://graph.facebook.com/v19.0/me?fields=id,email,first_name,last_name,picture,accounts{instagram_business_account{username,profile_picture_url,name}}&access_token=${longLivedToken}`;
      const profileResponse = await fetch(profileUrl);
      const profileData = await profileResponse.json();
      if (!profileResponse.ok) throw new Error(profileData.error.message);
      
      const { email, first_name, last_name, picture, accounts } = profileData;
      if (!email) throw new Error("Could not retrieve email from Facebook. Please ensure your account has a verified email and you granted email permissions.");

      const igAccount = accounts?.data?.find((page: any) => page.instagram_business_account)?.instagram_business_account;
      const instagram_username = igAccount?.username;
      const instagram_profile_picture_url = igAccount?.profile_picture_url;
      const instagram_shop_name = igAccount?.name;

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
            username: instagram_username, // Store Instagram username in user_metadata
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

      let uploadedLogoUrl: string | null = null;
      if (instagram_profile_picture_url) {
        try {
          const imageResponse = await fetch(instagram_profile_picture_url);
          if (!imageResponse.ok) throw new Error(`Failed to fetch profile picture: ${imageResponse.statusText}`);
          const imageBlob = await imageResponse.blob();
          const fileName = `${userId}/profile_pic_${Date.now()}.jpg`;
          const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('shop-assets')
            .upload(fileName, imageBlob, {
              contentType: imageResponse.headers.get('content-type') || 'image/jpeg',
              upsert: true,
            });

          if (uploadError) throw uploadError;
          
          const { data: publicUrlData } = supabaseAdmin.storage.from('shop-assets').getPublicUrl(fileName);
          uploadedLogoUrl = publicUrlData.publicUrl;
        } catch (uploadErr: any) {
          console.error("Error uploading profile picture to storage:", uploadErr.message);
          // Fallback to original URL if upload fails
          uploadedLogoUrl = instagram_profile_picture_url;
        }
      } else if (picture?.data?.url) {
        // Fallback to Facebook profile picture if Instagram one is not available
        uploadedLogoUrl = picture.data.url;
      }

      // Update or insert shop_details with Instagram info and uploaded URL
      const shopDetailsPayload = {
        business_id: (await supabaseAdmin.from('businesses').select('id').eq('user_id', userId).single()).data?.id,
        shop_name: instagram_shop_name || `${first_name}'s Shop`,
        slug: instagram_username ? instagram_username.toLowerCase().replace(/[^a-z0-9-]/g, '') : `${first_name.toLowerCase()}-shop`,
        logo_url: uploadedLogoUrl, // Use the uploaded URL
        favicon_url: uploadedLogoUrl, // Use the uploaded URL for favicon
        contact_email: email,
        instagram_url: instagram_username ? `https://www.instagram.com/${instagram_username}` : null,
      };

      const { error: shopDetailsUpsertError } = await supabaseAdmin.from('shop_details').upsert(shopDetailsPayload, { onConflict: 'business_id' });
      if (shopDetailsUpsertError) console.error("Error upserting shop details:", shopDetailsUpsertError);


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