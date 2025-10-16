import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const FACEBOOK_APP_ID = Deno.env.get('FACEBOOK_APP_ID');
const FACEBOOK_APP_SECRET = Deno.env.get('FACEBOOK_APP_SECRET');

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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let userAccessToken;
  let userId;

  try {
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

    const body = await req.json().catch(() => null);

    // Determine access token source: from body (server-to-server call) or DB (client-to-server call)
    if (body?.user_access_token) {
      userAccessToken = body.user_access_token;
      console.log(`Instagram Posts Function: Using access token from request body for user ${userId}.`);
    } else {
      const { data: integration, error: integrationError } = await supabase
        .from('integrations')
        .select('access_token')
        .eq('user_id', userId)
        .eq('provider', 'facebook')
        .single();

      if (integrationError || !integration) {
        console.error(`Instagram integration not found for user ${userId}:`, integrationError?.message || 'No integration record.');
        return new Response(JSON.stringify({ error: "Instagram integration not found for this user. Please connect your account in the settings." }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      userAccessToken = integration.access_token;
      console.log(`Instagram Posts Function: Using access token from DB for user ${userId}.`);
    }

    if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
        console.error('Instagram Posts Function Error: FACEBOOK_APP_ID or FACEBOOK_APP_SECRET is not configured in Supabase secrets.');
        return new Response(JSON.stringify({ error: "Server configuration error: Facebook App ID or Secret is missing." }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    
    // 1. Debug user access token to ensure it's valid
    const appAccessToken = `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;
    const debugUrl = `https://graph.facebook.com/debug_token?input_token=${userAccessToken}&access_token=${appAccessToken}`;
    const debugResponse = await fetch(debugUrl);
    const debugData = await debugResponse.json();

    if (!debugData.data || !debugData.data.is_valid) {
        console.error(`Instagram Posts Function Error for user ${userId}: Invalid or expired Facebook connection. Debug data:`, debugData);
        return new Response(JSON.stringify({ error: "Your Facebook connection is invalid or has expired. Please disconnect and reconnect in the settings." }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    
    // 2. Fetch Facebook pages to find the linked Instagram Business Account
    const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?fields=instagram_business_account,name&access_token=${userAccessToken}`;
    const pagesResponse = await fetch(pagesUrl);
    if (!pagesResponse.ok) {
        const errorData = await pagesResponse.json();
        console.error(`Instagram Posts Function Error for user ${userId}: Failed to fetch Facebook pages. Error:`, errorData.error?.message || errorData);
        return new Response(JSON.stringify({ error: errorData.error?.message || 'Failed to fetch Facebook pages. Please try reconnecting your account.' }), {
          status: pagesResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    const pagesData = await pagesResponse.json();

    const igAccount = pagesData.data?.find((page: any) => page.instagram_business_account);
    if (!igAccount) {
      const pageNames = pagesData.data.map((page: any) => page.name).join(', ');
      const detailedError = `We found the following Facebook Page(s): ${pageNames}. However, none of them have a linked Instagram Business Account that this app has permission to access. Please try disconnecting and reconnecting. During the Facebook login process, ensure you click "Edit Settings" and grant all requested permissions for both your Facebook Page and your Instagram account.`;
      console.error(`Instagram Posts Function Error for user ${userId}: No linked Instagram Business Account. Detailed error:`, detailedError);
      return new Response(JSON.stringify({ error: detailedError }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const igAccountId = igAccount.instagram_business_account.id;
    const fields = 'id,media_type,media_url,permalink,thumbnail_url,timestamp,caption';
    let allMedia: any[] = [];
    let mediaUrl: string | null = `https://graph.facebook.com/v19.0/${igAccountId}/media?fields=${fields}&access_token=${userAccessToken}&limit=100`;
    let pageCount = 0;
    const MAX_PAGES = 10; // Safety break to prevent overwhelming API

    // 3. Fetch all media posts from Instagram Business Account
    while (mediaUrl && pageCount < MAX_PAGES) {
        pageCount++;
        const mediaResponse = await fetch(mediaUrl);
        if (!mediaResponse.ok) {
            const errorData = await mediaResponse.json();
            console.error(`Instagram Posts Function Error for user ${userId}: Failed to fetch media from Instagram. Error:`, errorData.error?.message || errorData);
            throw new Error(errorData.error?.message || 'Failed to fetch media from Instagram.');
        }

        const pageData = await mediaResponse.json();
        if (pageData.data) {
            allMedia = allMedia.concat(pageData.data);
        }

        mediaUrl = pageData.paging?.next || null;
    }

    console.log(`Instagram Posts fetched for user ${userId}: ${allMedia.length} posts.`);

    // 4. Upload media to Supabase Storage and replace URLs
    const supabaseAdmin = getSupabaseAdmin();
    const uploadedMediaPromises = allMedia.map(async (post: any) => {
      let uploadedMediaUrl = post.media_url;
      let uploadedThumbnailUrl = post.thumbnail_url;

      const fileExtension = (url: string) => {
        const parts = url.split('.');
        return parts.length > 1 ? parts.pop()?.split('?')[0] : 'jpg';
      };

      const uploadFile = async (url: string, type: 'media' | 'thumbnail') => {
        if (!url) return null;
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Failed to fetch ${type} from Instagram: ${response.statusText}`);
          const blob = await response.blob();
          const fileName = `${userId}/${post.id}/${type}_${Date.now()}.${fileExtension(url)}`;
          
          const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('product-media')
            .upload(fileName, blob, {
              contentType: response.headers.get('content-type') || 'application/octet-stream',
              upsert: true,
            });

          if (uploadError) throw uploadError;
          
          const { data: publicUrlData } = supabaseAdmin.storage.from('product-media').getPublicUrl(fileName);
          return publicUrlData.publicUrl;
        } catch (uploadErr: any) {
          console.error(`Error uploading ${type} for post ${post.id}:`, uploadErr.message);
          return url; // Fallback to original URL if upload fails
        }
      };

      if (post.media_type === 'IMAGE' || post.media_type === 'CAROUSE_ALBUM') {
        uploadedMediaUrl = await uploadFile(post.media_url, 'media');
      } else if (post.media_type === 'VIDEO') {
        // For videos, we primarily use the thumbnail for display in grids/cards
        uploadedThumbnailUrl = await uploadFile(post.thumbnail_url, 'thumbnail');
        // Keep the original media_url for video playback if it's a direct link,
        // or upload if it's a short-lived URL that needs to be proxied/stored.
        // For now, we'll keep the original media_url for video playback.
        // If Instagram video URLs also expire quickly, a more robust solution
        // would involve uploading the video itself or using a streaming service.
      }

      return {
        ...post,
        media_url: uploadedMediaUrl || post.media_url,
        thumbnail_url: uploadedThumbnailUrl || post.thumbnail_url,
      };
    });

    const uploadedPosts = await Promise.all(uploadedMediaPromises);

    return new Response(JSON.stringify({ posts: uploadedPosts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(`Instagram Posts Function (Catch Block) Error for user ${userId || 'unknown'}:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});