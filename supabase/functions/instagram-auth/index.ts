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
    console.error("FACEBOOK_APP_ID or FACEBOOK_APP_SECRET is not configured in Supabase secrets.");
    return new Response(JSON.stringify({ error: "Server configuration error: Facebook App ID or Secret is missing." }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const isCallback = url.pathname.endsWith('/callback');

  if (isCallback) {
    let origin = '/';
    let userIdFromState: string | undefined;

    try {
      const encodedState = url.searchParams.get('state');
      if (encodedState) {
        const statePayload = atob(encodedState);
        const { origin: stateOrigin, userId } = JSON.parse(statePayload);
        if (stateOrigin) origin = stateOrigin;
        if (userId) userIdFromState = userId;
      }

      if (!userIdFromState) {
        throw new Error("User ID not found in OAuth state. Please ensure you are logged in before connecting Instagram.");
      }

      const error = url.searchParams.get('error');
      if (error) {
        const errorDescription = url.searchParams.get('error_description') || 'Permissions were denied.';
        console.error(`Facebook OAuth Callback Error: ${errorDescription}`);
        const redirectUrl = new URL(origin);
        redirectUrl.searchParams.set('integration_error', errorDescription);
        return Response.redirect(redirectUrl.toString(), 302);
      }

      const code = url.searchParams.get('code');
      if (!code) throw new Error('Authorization code not found in callback.');

      // 1. Exchange short-lived token
      const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${FACEBOOK_APP_ID}&redirect_uri=${REDIRECT_URI}&client_secret=${FACEBOOK_APP_SECRET}&code=${code}`;
      const tokenResponse = await fetch(tokenUrl);
      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok) {
        console.error("Failed to exchange short-lived token:", tokenData.error?.message || tokenData);
        throw new Error(tokenData.error?.message || 'Failed to exchange short-lived token.');
      }
      const shortLivedToken = tokenData.access_token;

      // 2. Exchange for long-lived token
      const longLivedTokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${FACEBOOK_APP_ID}&client_secret=${FACEBOOK_APP_SECRET}&fb_exchange_token=${shortLivedToken}`;
      const longLivedTokenResponse = await fetch(longLivedTokenUrl);
      const longLivedTokenData = await longLivedTokenResponse.json();
      if (!longLivedTokenResponse.ok) {
        console.error("Failed to exchange for long-lived token:", longLivedTokenData.error?.message || longLivedTokenData);
        throw new Error(longLivedTokenData.error?.message || 'Failed to exchange for long-lived token.');
      }
      const longLivedToken = longLivedTokenData.access_token;

      // 3. Fetch user profile and linked Instagram Business Account
      const profileUrl = `https://graph.facebook.com/v19.0/me?fields=id,email,first_name,last_name,picture,accounts{instagram_business_account{id,username,profile_picture_url,name,biography,followers_count,media_count,website}}&access_token=${longLivedToken}`;
      const profileResponse = await fetch(profileUrl);
      const profileData = await profileResponse.json();
      if (!profileResponse.ok) {
        console.error("Failed to fetch Facebook user profile:", profileData.error?.message || profileData);
        throw new Error(profileData.error?.message || 'Failed to fetch Facebook user profile.');
      }
      
      const { email, first_name, last_name, picture, accounts } = profileData;

      const igAccount = accounts?.data?.find((page: any) => page.instagram_business_account)?.instagram_business_account;

      if (!igAccount) {
        const errorDescription = "No linked Instagram Business Account found. Please ensure your Instagram account is a Business or Creator account and is linked to the Facebook Page you selected. Also, ensure you grant all requested permissions during the Facebook login process.";
        console.error(`Instagram Auth Error for user ${email}: ${errorDescription}`);
        const redirectUrl = new URL(origin);
        redirectUrl.searchParams.set('integration_error', errorDescription);
        return Response.redirect(redirectUrl.toString(), 302);
      }

      const instagram_username = igAccount.username;
      const instagram_profile_picture_url = igAccount.profile_picture_url;
      const instagram_shop_name = igAccount.name;
      const instagram_biography = igAccount.biography;
      const instagram_followers_count = igAccount.followers_count;
      const instagram_media_count = igAccount.media_count;
      const instagram_website = igAccount.website;

      const supabaseAdmin = getSupabaseAdmin();

      // 4. Upsert integration record for the existing user
      const { error: upsertError } = await supabaseAdmin.from('integrations').upsert({
        user_id: userIdFromState,
        provider: 'facebook',
        access_token: longLivedToken,
      }, { onConflict: 'user_id,provider' });
      if (upsertError) {
        console.error("Supabase DB: Error upserting integration:", upsertError);
        throw upsertError;
      }

      // 5. Upload Instagram profile picture to Supabase Storage
      let uploadedLogoUrl: string | null = null;
      if (instagram_profile_picture_url) {
        try {
          const imageResponse = await fetch(instagram_profile_picture_url);
          if (!imageResponse.ok) throw new Error(`Failed to fetch profile picture: ${imageResponse.statusText}`);
          const imageBlob = await imageResponse.blob();
          const fileName = `${userIdFromState}/profile_pic_${Date.now()}.jpg`;
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
          uploadedLogoUrl = instagram_profile_picture_url; // Fallback to original URL if upload fails
        }
      } else if (picture?.data?.url) {
        uploadedLogoUrl = picture.data.url; // Fallback to Facebook profile picture
      }

      // 6. Get the business ID for the existing user
      const { data: businessData, error: fetchBusinessError } = await supabaseAdmin
        .from('businesses')
        .select('id')
        .eq('user_id', userIdFromState)
        .single();

      if (fetchBusinessError || !businessData) {
        console.error("Supabase DB: Error fetching business for existing user:", fetchBusinessError);
        throw new Error("Could not find business profile for the logged-in user.");
      }

      const businessId = businessData.id;

      // 7. Update user profile with first_name, last_name, and avatar_url
      const { error: profileUpdateError } = await supabaseAdmin.from('profiles').upsert({
        id: userIdFromState,
        first_name: first_name,
        last_name: last_name,
        avatar_url: uploadedLogoUrl, // Update avatar_url in profiles table
        onboarding_complete: true,
      }, { onConflict: 'id' });
      if (profileUpdateError) {
        console.error("Supabase DB: Error upserting profile with Facebook data:", profileUpdateError);
        throw profileUpdateError;
      }

      // 8. Update or insert shop_details for the existing business
      const finalShopName = instagram_shop_name || `${first_name}'s Shop`;
      const finalSlug = instagram_username ? instagram_username.toLowerCase().replace(/[^a-z0-9-]/g, '') : `${first_name.toLowerCase()}-shop`;

      const shopDetailsPayload = {
        business_id: businessId,
        shop_name: finalShopName, // Use the Instagram shop name
        slug: finalSlug, // Use the Instagram username as slug if available
        logo_url: uploadedLogoUrl,
        favicon_url: uploadedLogoUrl,
        currency: 'USD', // Default currency, user can change in settings
        headline: instagram_biography?.substring(0, 100) || null, // Use IG bio as initial headline
        about: instagram_biography || null, // Use IG bio as initial about
        contact_email: email,
        instagram_url: instagram_username ? `https://www.instagram.com/${instagram_username}` : null, // Set instagram_url here
        followers_count: instagram_followers_count,
        media_count: instagram_media_count,
        website: instagram_website || null,
        username: instagram_username,
      };

      const { error: shopDetailsUpsertError } = await supabaseAdmin.from('shop_details').upsert(shopDetailsPayload, { onConflict: 'business_id' });
      if (shopDetailsUpsertError) console.error("Supabase DB: Error upserting shop details:", shopDetailsUpsertError);

      // 9. Redirect back to the origin with a success message
      const redirectUrl = new URL(origin);
      redirectUrl.searchParams.set('integration_success', 'true');
      return Response.redirect(redirectUrl.toString(), 302);

    } catch (error) {
      console.error('OAuth Callback Error (Catch Block):', error.message);
      const errorUrl = new URL(origin);
      errorUrl.searchParams.set('integration_error', error.message);
      return Response.redirect(errorUrl.toString(), 302);
    }
  } else {
    // Initial OAuth redirect
    try {
      const origin = url.searchParams.get('origin');
      const userId = url.searchParams.get('userId'); // Get userId from the initial request
      if (!origin || !userId) throw new Error('Missing origin or userId parameter.');

      const statePayload = JSON.stringify({ origin, userId }); // Include userId in state
      const encodedState = btoa(statePayload);
      // Ensure these scopes match or are a subset of what's requested in Login.tsx
      const scopes = 'public_profile,email,pages_show_list,instagram_basic,instagram_manage_insights,instagram_manage_comments,instagram_content_publish,pages_read_engagement,pages_manage_posts,pages_manage_metadata';
      
      const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
      authUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
      authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('state', encodedState);
      authUrl.searchParams.set('auth_type', 'rerequest'); // Always re-request permissions
      
      return Response.redirect(authUrl.toString(), 302);
    } catch (error) {
      console.error('Initial OAuth Redirect Error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
});