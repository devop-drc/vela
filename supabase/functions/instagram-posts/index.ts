import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

const FACEBOOK_APP_ID = Deno.env.get('FACEBOOK_APP_ID');
const FACEBOOK_APP_SECRET = Deno.env.get('FACEBOOK_APP_SECRET');

const getSupabaseAdmin = () => createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let userAccessToken;
  let userId;

  try {
    const body = await req.json().catch(() => null);
    const bearer = (req.headers.get('Authorization') || '').replace('Bearer ', '');
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (SERVICE_KEY && bearer === SERVICE_KEY && body?.user_id) {
      // Internal server-to-server call (e.g. webhook-triggered sync).
      userId = body.user_id;
    } else {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('Instagram Posts Function Error: User not found or unauthorized from client request.');
        return new Response(JSON.stringify({ error: 'User not found or unauthorized.' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userId = user.id;
    }

    // Determine access token source: from body (server-to-server call) or DB
    // (client-to-server call). Prefer the direct-Instagram connection.
    let provider = 'facebook';
    let storedIgId: string | null = null;
    if (body?.user_access_token) {
      userAccessToken = body.user_access_token;
      provider = body.provider || 'facebook';
      storedIgId = body.ig_account_id || null;
    } else {
      // Admin lookup works for both auth modes (RLS-free).
      const { data: integrations, error: integrationError } = await getSupabaseAdmin()
        .from('integrations')
        .select('provider, access_token, ig_account_id')
        .eq('user_id', userId)
        .in('provider', ['instagram', 'facebook']);
      const integration = integrations?.find((r: any) => r.provider === 'instagram') ?? integrations?.[0];

      if (integrationError || !integration) {
        console.error(`[${userId}] Instagram integration not found:`, integrationError?.message || 'No integration record.');
        return new Response(JSON.stringify({ error: "Instagram integration not found for this user. Please connect your account in the settings." }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userAccessToken = integration.access_token;
      provider = integration.provider;
      storedIgId = integration.ig_account_id || null;
    }
    const graphBase = provider === 'instagram' ? 'https://graph.instagram.com' : 'https://graph.facebook.com/v19.0';

    // 1-2. Resolve + validate the IG account id per provider.
    let igAccountId: string | null = null;
    if (provider === 'instagram') {
      // Direct IG login: /me both validates the token and yields the id.
      const meRes = await fetch(`${graphBase}/me?fields=user_id&access_token=${userAccessToken}`);
      const meData = await meRes.json();
      if (!meRes.ok) {
        console.error(`[${userId}] Invalid or expired Instagram connection:`, meData.error?.message || meData);
        return new Response(JSON.stringify({ error: "Your Instagram connection is invalid or has expired. Please disconnect and reconnect in the settings." }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      igAccountId = storedIgId || String(meData.user_id ?? meData.id);
    } else {
      if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
        console.error(`[${userId}] Instagram Posts Function Error: FACEBOOK_APP_ID or FACEBOOK_APP_SECRET is not configured.`);
        return new Response(JSON.stringify({ error: "Server configuration error: Facebook App ID or Secret is missing." }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // Legacy Facebook-login connections: debug the token, then discover the
      // IG account through the user's Pages.
      const appAccessToken = `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;
      const debugUrl = `https://graph.facebook.com/debug_token?input_token=${userAccessToken}&access_token=${appAccessToken}`;
      const debugResponse = await fetch(debugUrl);
      const debugData = await debugResponse.json();

      if (!debugData.data || !debugData.data.is_valid) {
        console.error(`[${userId}] Invalid or expired Facebook connection. Debug data:`, debugData);
        return new Response(JSON.stringify({ error: "Your Facebook connection is invalid or has expired. Please disconnect and reconnect in the settings." }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const pagesUrl = `${graphBase}/me/accounts?fields=instagram_business_account,name&access_token=${userAccessToken}`;
      const pagesResponse = await fetch(pagesUrl);
      if (!pagesResponse.ok) {
        const errorData = await pagesResponse.json();
        console.error(`[${userId}] Failed to fetch Facebook pages. Error:`, errorData.error?.message || errorData);
        return new Response(JSON.stringify({ error: errorData.error?.message || 'Failed to fetch Facebook pages. Please try reconnecting your account.' }), {
          status: pagesResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const pagesData = await pagesResponse.json();

      const igAccount = pagesData.data?.find((page: any) => page.instagram_business_account);
      if (!igAccount) {
        const pageNames = pagesData.data.map((page: any) => page.name).join(', ');
        const detailedError = `We found the following Facebook Page(s): ${pageNames}. However, none of them have a linked Instagram Business Account that this app has permission to access. Please try disconnecting and reconnecting.`;
        console.error(`[${userId}] No linked Instagram Business Account. Detailed error:`, detailedError);
        return new Response(JSON.stringify({ error: detailedError }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      igAccountId = igAccount.instagram_business_account.id;
    }

    // Optional incremental fetch: `since` (unix seconds or ISO datetime) limits
    // the Graph API media query to posts published after that moment, so quick
    // syncs stop re-paginating the merchant's entire history. Ignored when
    // absent or unparsable. Graph API `paging.next` links carry `since` along.
    let sinceUnix: number | null = null;
    const rawSince = body?.since;
    if (rawSince !== undefined && rawSince !== null && rawSince !== '') {
      let n = typeof rawSince === 'number'
        ? rawSince
        : (/^\d+$/.test(String(rawSince).trim()) ? Number(rawSince) : new Date(String(rawSince)).getTime() / 1000);
      if (Number.isFinite(n) && n > 0) {
        if (n > 1e12) n = n / 1000; // milliseconds epoch → seconds
        sinceUnix = Math.floor(n);
      }
    }

    const fields = 'id,media_type,media_url,permalink,thumbnail_url,timestamp,caption';
    let allMedia: any[] = [];
    let mediaUrl: string | null = `${graphBase}/${igAccountId}/media?fields=${fields}&access_token=${userAccessToken}&limit=100${sinceUnix ? `&since=${sinceUnix}` : ''}`;
    let pageCount = 0;
    const MAX_PAGES = 10; // Safety break to prevent overwhelming API

    // 3. Fetch all media posts from Instagram Business Account
    while (mediaUrl && pageCount < MAX_PAGES) {
        pageCount++;
        const mediaResponse = await fetch(mediaUrl);
        if (!mediaResponse.ok) {
            const errorData = await mediaResponse.json();
            console.error(`[${userId}] Failed to fetch media from Instagram (page ${pageCount}). Error:`, errorData.error?.message || errorData);
            throw new Error(errorData.error?.message || 'Failed to fetch media from Instagram.');
        }

        const pageData = await mediaResponse.json();
        if (pageData.data) {
            allMedia = allMedia.concat(pageData.data);
        }

        mediaUrl = pageData.paging?.next || null;
    }

    // If the loop stopped because it hit the page cap (not because it ran out
    // of pages), the media list is incomplete. Callers that diff this list to
    // detect deletions MUST NOT treat missing posts as deleted in that case.
    const truncated = mediaUrl !== null;

    // 4. Upload media to Supabase Storage and replace URLs
    // Skip upload if called with skip_upload flag (e.g., during sync — uses Instagram CDN URLs directly)
    const skipUpload = body?.skip_upload === true;
    if (skipUpload) {
      return new Response(JSON.stringify({ posts: allMedia, truncated }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const uploadedMediaPromises = allMedia.map(async (post: any) => {
      let uploadedMediaUrl = post.media_url;
      let uploadedThumbnailUrl = post.thumbnail_url;

      const fileExtension = (url: string) => {
        const parts = url.split('.');
        return parts.length > 1 ? parts.pop()?.split('?')[0] : 'jpg';
      };

      const uploadFile = async (url: string, type: 'media' | 'thumbnail') => {
        if (!url) {
          return null;
        }
        try {
          const response = await fetch(url);
          if (!response.ok) {
            console.error(`[${userId}][Post ${post.id}] Failed to fetch ${type} from Instagram. Status: ${response.status}, URL: ${url}`);
            throw new Error(`Failed to fetch ${type} from Instagram: ${response.statusText}`);
          }
          const blob = await response.blob();
          const fileName = `${userId}/${post.id}/${type}_${Date.now()}.${fileExtension(url)}`;
          
          const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('product-media')
            .upload(fileName, blob, {
              contentType: response.headers.get('content-type') || 'application/octet-stream',
              upsert: true,
            });

          if (uploadError) {
            console.error(`[${userId}][Post ${post.id}] Error uploading ${type} to storage:`, uploadError.message);
            throw uploadError;
          }
          
          const { data: publicUrlData } = supabaseAdmin.storage.from('product-media').getPublicUrl(fileName);
          return publicUrlData.publicUrl;
        } catch (uploadErr: any) {
          console.error(`[${userId}][Post ${post.id}] Final error during ${type} upload process:`, uploadErr.message);
          return null; 
        }
      };

      if (post.media_type === 'IMAGE' || post.media_type === 'CAROUSEL_ALBUM') {
        uploadedMediaUrl = await uploadFile(post.media_url, 'media');
      } else if (post.media_type === 'VIDEO') {
        uploadedThumbnailUrl = await uploadFile(post.thumbnail_url, 'thumbnail');
        // For videos, we'll also try to upload the main video file if it's not null
        // This ensures we have a permanent link for playback if needed, though thumbnail is primary for display
        if (post.media_url) {
          uploadedMediaUrl = await uploadFile(post.media_url, 'media');
        }
      }

      return {
        ...post,
        media_url: uploadedMediaUrl, 
        thumbnail_url: uploadedThumbnailUrl, 
      };
    });

    const uploadedPosts = await Promise.all(uploadedMediaPromises);

    return new Response(JSON.stringify({ posts: uploadedPosts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(`[${userId || 'unknown'}] Instagram Posts Function (Catch Block) Error:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});