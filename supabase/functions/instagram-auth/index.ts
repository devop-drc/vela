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
      // Requesting more fields to ensure we get all necessary info for user_metadata and shop_details
      const profileUrl = `https://graph.facebook.com/v19.0/me?fields=id,email,first_name,last_name,picture,accounts{instagram_business_account{id,username,profile_picture_url,name,biography,followers_count,media_count,website}}&access_token=${longLivedToken}`;
      const profileResponse = await fetch(profileUrl);
      const profileData = await profileResponse.json();
      if (!profileResponse.ok) {
        console.error("Failed to fetch Facebook user profile:", profileData.error?.message || profileData);
        throw new Error(profileData.error?.message || 'Failed to fetch Facebook user profile.');
      }
      
      const { email, first_name, last_name, picture, accounts } = profileData;
      if (!email) throw new Error("Could not retrieve email from Facebook. Please ensure your account has a verified email and you granted email permissions.");

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
      let userId: string;

      // 4. Find or create user in Supabase auth
      const { data: users, error: listUsersError } = await supabaseAdmin.auth.admin.listUsers({ email: email });
      if (listUsersError) {
        console.error("Supabase Admin: Error listing users:", listUsersError);
        throw listUsersError;
      }

      if (users && users.users.length > 0) {
        userId = users.users[0].id;
        // Update existing user's metadata if necessary
        const { error: updateUserError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: {
            first_name,
            last_name,
            avatar_url: picture?.data?.url,
            full_name: `${first_name} ${last_name || ''}`.trim(),
            username: instagram_username, // Ensure Instagram username is in metadata
          }
        });
        if (updateUserError) console.error("Supabase Admin: Error updating user metadata:", updateUserError);
      } else {
        const tempPassword = crypto.randomUUID(); // Generate a temporary password for new users
        const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            first_name,
            last_name,
            avatar_url: picture?.data?.url,
            full_name: `${first_name} ${last_name || ''}`.trim(),
            username: instagram_username, // Ensure Instagram username is in metadata
          }
        });
        if (createUserError) {
          console.error("Supabase Admin: Error creating new user:", createUserError);
          throw createUserError;
        }
        userId = newUser.user.id;
      }

      // 5. Upsert integration record
      const { error: upsertError } = await supabaseAdmin.from('integrations').upsert({
        user_id: userId,
        provider: 'facebook',
        access_token: longLivedToken,
      }, { onConflict: 'user_id,provider' });
      if (upsertError) {
        console.error("Supabase DB: Error upserting integration:", upsertError);
        throw upsertError;
      }

      // 6. Upload Instagram profile picture to Supabase Storage
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
          uploadedLogoUrl = instagram_profile_picture_url; // Fallback to original URL if upload fails
        }
      } else if (picture?.data?.url) {
        uploadedLogoUrl = picture.data.url; // Fallback to Facebook profile picture
      }

      // 7. Ensure a business entry exists
      let { data: businessData, error: fetchBusinessError } = await supabaseAdmin
        .from('businesses')
        .select('id, name')
        .eq('user_id', userId)
        .single();

      if (fetchBusinessError && fetchBusinessError.code === 'PGRST116') {
        const { data: newBusiness, error: createBusinessError } = await supabaseAdmin
          .from('businesses')
          .insert({ user_id: userId, name: `${first_name}'s Business` })
          .select('id, name')
          .single();
        if (createBusinessError) {
          console.error("Supabase DB: Error creating new business:", createBusinessError);
          throw createBusinessError;
        }
        businessData = newBusiness;
      } else if (fetchBusinessError) {
        console.error("Supabase DB: Error fetching business:", fetchBusinessError);
        throw fetchBusinessError;
      }

      if (!businessData) throw new Error("Failed to get or create business for user.");

      const businessId = businessData.id;

      // 8. Update or insert shop_details
      const shopDetailsPayload = {
        business_id: businessId,
        shop_name: instagram_shop_name || `${first_name}'s Shop`,
        slug: instagram_username ? instagram_username.toLowerCase().replace(/[^a-z0-9-]/g, '') : `${first_name.toLowerCase()}-shop`,
        logo_url: uploadedLogoUrl,
        favicon_url: uploadedLogoUrl,
        currency: 'USD', // Default currency, user can change in settings
        headline: instagram_biography?.substring(0, 100) || null, // Use IG bio as initial headline
        about: instagram_biography || null, // Use IG bio as initial about
        contact_email: email,
        instagram_url: instagram_username ? `https://www.instagram.com/${instagram_username}` : null,
        followers_count: instagram_followers_count,
        media_count: instagram_media_count,
        website: instagram_website || null,
        username: instagram_username,
      };

      const { error: shopDetailsUpsertError } = await supabaseAdmin.from('shop_details').upsert(shopDetailsPayload, { onConflict: 'business_id' });
      if (shopDetailsUpsertError) console.error("Supabase DB: Error upserting shop details:", shopDetailsUpsertError);

      // 9. Generate magic link for seamless redirection
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: email,
        options: { redirectTo: `${origin}?integration_success=true` }
      });
      if (linkError) {
        console.error("Supabase Auth Admin: Error generating magic link:", linkError);
        throw linkError;
      }

      return Response.redirect(linkData.properties.action_link, 302);

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
      if (!origin) throw new Error('Missing origin parameter.');

      const statePayload = JSON.stringify({ origin });
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