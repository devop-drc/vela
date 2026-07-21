/**
 * instagram-auth — merchant connects their Instagram professional account.
 *
 * Uses the "Instagram API with Instagram Login" (business login) flow:
 * the merchant logs in with their INSTAGRAM credentials — no Facebook
 * account or Page linking required. Requirements: the IG account must be
 * a professional (Business/Creator) account, and until App Review passes,
 * the IG account must be an Instagram Tester on the Meta app.
 *
 * Flow: /instagram-auth?origin&userId → instagram.com/oauth/authorize
 *   → /instagram-auth/callback?code&state
 *   → api.instagram.com/oauth/access_token        (short-lived)
 *   → graph.instagram.com/access_token             (long-lived, ~60 days)
 *   → graph.instagram.com/me                       (profile bootstrap)
 *   → integrations upsert (provider 'instagram', token_expires_at)
 *   → redirect back to origin.
 *
 * Long-lived tokens are refreshed by periodic-sync before they expire.
 * Legacy rows with provider 'facebook' (old app, no longer ours) keep
 * working read-only until merchants reconnect through this flow.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const IG_APP_ID = Deno.env.get('INSTAGRAM_APP_ID');
const IG_APP_SECRET = Deno.env.get('INSTAGRAM_APP_SECRET');
const REDIRECT_URI = `${Deno.env.get('SUPABASE_URL')}/functions/v1/instagram-auth/callback`;
const IG_GRAPH = 'https://graph.instagram.com';
const SCOPES = 'instagram_business_basic,instagram_business_content_publish';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getSupabaseAdmin = () => createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!IG_APP_ID || !IG_APP_SECRET) {
    console.error("INSTAGRAM_APP_ID or INSTAGRAM_APP_SECRET is not configured in Supabase secrets.");
    return new Response(JSON.stringify({ error: "Server configuration error: Instagram app credentials are missing." }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        const { origin: stateOrigin, userId } = JSON.parse(atob(encodedState));
        if (stateOrigin) origin = stateOrigin;
        if (userId) userIdFromState = userId;
      }
      if (!userIdFromState) {
        throw new Error("User ID not found in OAuth state. Please ensure you are logged in before connecting Instagram.");
      }

      const oauthError = url.searchParams.get('error');
      if (oauthError) {
        const errorDescription = url.searchParams.get('error_description') || 'Permissions were denied.';
        console.error(`Instagram OAuth Callback Error: ${errorDescription}`);
        const redirectUrl = new URL(origin);
        redirectUrl.searchParams.set('integration_error', errorDescription);
        return Response.redirect(redirectUrl.toString(), 302);
      }

      const code = url.searchParams.get('code');
      if (!code) throw new Error('Authorization code not found in callback.');

      // 1. code → short-lived token (+ the IG user id used for API calls)
      const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: IG_APP_ID,
          client_secret: IG_APP_SECRET,
          grant_type: 'authorization_code',
          redirect_uri: REDIRECT_URI,
          code,
        }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.access_token) {
        console.error("Failed to exchange code:", tokenData);
        throw new Error(tokenData.error_message || tokenData.error?.message || 'Failed to exchange the authorization code.');
      }
      const shortToken = tokenData.access_token as string;
      const igUserIdFromToken = tokenData.user_id ? String(tokenData.user_id) : null;

      // 2. short-lived → long-lived (~60 days; periodic-sync refreshes it)
      const llRes = await fetch(`${IG_GRAPH}/access_token?grant_type=ig_exchange_token&client_secret=${IG_APP_SECRET}&access_token=${shortToken}`);
      const llData = await llRes.json();
      if (!llRes.ok || !llData.access_token) {
        console.error("Failed to exchange for long-lived token:", llData);
        throw new Error(llData.error?.message || 'Failed to exchange for a long-lived token.');
      }
      const longToken = llData.access_token as string;
      const expiresAt = new Date(Date.now() + (llData.expires_in ?? 5184000) * 1000).toISOString();

      // 3. profile bootstrap — try the rich field set, fall back to the safe one
      const richFields = 'user_id,username,name,account_type,profile_picture_url,followers_count,media_count,biography,website';
      const safeFields = 'user_id,username,name,account_type,profile_picture_url';
      let profile: any = null;
      for (const fields of [richFields, safeFields]) {
        const pRes = await fetch(`${IG_GRAPH}/me?fields=${fields}&access_token=${longToken}`);
        const pData = await pRes.json();
        if (pRes.ok) { profile = pData; break; }
        console.error(`Profile fetch failed for fields [${fields}]:`, pData.error?.message);
      }
      if (!profile) throw new Error('Could not load the Instagram profile after login.');

      if (profile.account_type && !['BUSINESS', 'MEDIA_CREATOR', 'CREATOR'].includes(String(profile.account_type).toUpperCase())) {
        const msg = 'This Instagram account is not a professional account. Switch it to Business or Creator in the Instagram app, then try again.';
        const redirectUrl = new URL(origin);
        redirectUrl.searchParams.set('integration_error', msg);
        return Response.redirect(redirectUrl.toString(), 302);
      }

      const igAccountId = String(profile.user_id ?? igUserIdFromToken ?? profile.id);
      const igUsername = profile.username as string | undefined;

      const supabaseAdmin = getSupabaseAdmin();

      // 4. store the integration (new provider; legacy 'facebook' rows are
      //    left untouched so old data keeps working until it naturally dies)
      const { error: upsertError } = await supabaseAdmin.from('integrations').upsert({
        user_id: userIdFromState,
        provider: 'instagram',
        access_token: longToken,
        ig_account_id: igAccountId,
        token_expires_at: expiresAt,
      }, { onConflict: 'user_id,provider' });
      if (upsertError) { console.error("Error upserting integration:", upsertError); throw upsertError; }

      // 5. profile picture → storage (deterministic path)
      let uploadedLogoUrl: string | null = null;
      if (profile.profile_picture_url) {
        try {
          const imageResponse = await fetch(profile.profile_picture_url);
          if (!imageResponse.ok) throw new Error(`Failed to fetch profile picture: ${imageResponse.statusText}`);
          const imageBlob = await imageResponse.blob();
          const fileName = `${userIdFromState}/profile.jpg`;
          const { error: uploadError } = await supabaseAdmin.storage.from('shop-assets')
            .upload(fileName, imageBlob, { contentType: imageResponse.headers.get('content-type') || 'image/jpeg', upsert: true });
          if (uploadError) throw uploadError;
          uploadedLogoUrl = supabaseAdmin.storage.from('shop-assets').getPublicUrl(fileName).data.publicUrl;
        } catch (uploadErr) {
          console.error("Error uploading profile picture:", (uploadErr as Error).message);
          uploadedLogoUrl = profile.profile_picture_url;
        }
      }

      // 6. business for this user
      const { data: businessData, error: fetchBusinessError } = await supabaseAdmin
        .from('businesses').select('id').eq('user_id', userIdFromState).single();
      if (fetchBusinessError || !businessData) {
        console.error("Error fetching business:", fetchBusinessError);
        throw new Error("Could not find business profile for the logged-in user.");
      }

      // 7. profile row (IG login carries no email/name split — use what we have)
      const { error: profileUpdateError } = await supabaseAdmin.from('profiles').upsert({
        id: userIdFromState,
        avatar_url: uploadedLogoUrl,
        onboarding_complete: true,
      }, { onConflict: 'id' });
      if (profileUpdateError) { console.error("Error upserting profile:", profileUpdateError); throw profileUpdateError; }

      // 8. shop bootstrap from the IG profile
      const finalShopName = profile.name || igUsername || 'My Shop';
      const finalSlug = igUsername ? igUsername.toLowerCase().replace(/[^a-z0-9-]/g, '') : `shop-${igAccountId.slice(-6)}`;
      const { error: shopDetailsUpsertError } = await supabaseAdmin.from('shop_details').upsert({
        business_id: businessData.id,
        shop_name: finalShopName,
        slug: finalSlug,
        logo_url: uploadedLogoUrl,
        favicon_url: uploadedLogoUrl,
        currency: 'USD',
        headline: profile.biography?.substring(0, 100) || null,
        about: profile.biography || null,
        instagram_url: igUsername ? `https://www.instagram.com/${igUsername}` : null,
        followers_count: profile.followers_count ?? null,
        media_count: profile.media_count ?? null,
        website: profile.website || null,
        username: igUsername ?? null,
        ig_account_id: igAccountId,
      }, { onConflict: 'business_id' });
      if (shopDetailsUpsertError) console.error("Error upserting shop details:", shopDetailsUpsertError);

      const redirectUrl = new URL(origin);
      redirectUrl.searchParams.set('integration_success', 'true');
      return Response.redirect(redirectUrl.toString(), 302);
    } catch (error) {
      console.error('OAuth Callback Error:', (error as Error).message);
      const errorUrl = new URL(origin);
      errorUrl.searchParams.set('integration_error', (error as Error).message);
      return Response.redirect(errorUrl.toString(), 302);
    }
  }

  // Initial redirect → Instagram's business-login screen
  try {
    const origin = url.searchParams.get('origin');
    const userId = url.searchParams.get('userId');
    if (!origin || !userId) throw new Error('Missing origin or userId parameter.');

    const encodedState = btoa(JSON.stringify({ origin, userId }));
    const authUrl = new URL('https://www.instagram.com/oauth/authorize');
    authUrl.searchParams.set('client_id', IG_APP_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', SCOPES);
    authUrl.searchParams.set('state', encodedState);
    return Response.redirect(authUrl.toString(), 302);
  } catch (error) {
    console.error('Initial OAuth Redirect Error:', (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
