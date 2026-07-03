import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getAdmin = () => createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

const isInstagramCdnUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return /(?:cdninstagram\.com|fbcdn\.net)/i.test(url);
};

const fileExt = (url: string): string => {
  const clean = url.split('?')[0];
  const parts = clean.split('.');
  const ext = parts.length > 1 ? parts.pop() : '';
  return (ext && ext.length <= 5) ? ext.toLowerCase() : 'jpg';
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = getAdmin();
    const body = await req.json().catch(() => ({}));
    const targetProductIds: string[] | undefined = body?.product_ids;

    // Fetch Instagram access token
    const { data: integration } = await admin
      .from('integrations')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('provider', 'facebook')
      .maybeSingle();

    if (!integration?.access_token) {
      return new Response(JSON.stringify({ error: 'Instagram integration not found. Please reconnect your account.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const accessToken = integration.access_token;

    // Fetch candidate products
    let query = admin
      .from('products')
      .select('id, instagram_post_id, media_url, thumbnail_url, media_type, media_gallery, name')
      .eq('user_id', user.id);

    if (targetProductIds && targetProductIds.length > 0) {
      query = query.in('id', targetProductIds);
    }

    const { data: products, error: productsError } = await query;
    if (productsError) throw productsError;

    // Stale = anything with an Instagram CDN URL anywhere, or a missing media_url that has a post id
    const stale = (products || []).filter(p => {
      const galleryStale = Array.isArray(p.media_gallery) && p.media_gallery.some(isInstagramCdnUrl);
      return p.instagram_post_id && (
        isInstagramCdnUrl(p.media_url) ||
        isInstagramCdnUrl(p.thumbnail_url) ||
        galleryStale ||
        !p.media_url
      );
    });

    if (stale.length === 0) {
      return new Response(JSON.stringify({ refreshed: 0, failed: 0, total: 0, message: 'No products need image refresh.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }

    // Group by instagram_post_id so a carousel with multiple combo-children is fetched once
    const byPost: Record<string, typeof stale> = {};
    for (const p of stale) {
      const key = p.instagram_post_id!;
      (byPost[key] ||= []).push(p);
    }

    let refreshed = 0;
    let failed = 0;
    const failures: { product_id: string; reason: string }[] = [];

    const uploadToStorage = async (sourceUrl: string, postId: string, kind: string) => {
      const imgResp = await fetch(sourceUrl);
      if (!imgResp.ok) throw new Error(`fetch ${imgResp.status}`);
      const blob = await imgResp.blob();
      const path = `${user.id}/${postId}/${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt(sourceUrl)}`;
      const { error: upErr } = await admin.storage
        .from('product-media')
        .upload(path, blob, {
          contentType: imgResp.headers.get('content-type') || 'image/jpeg',
          upsert: true,
        });
      if (upErr) throw upErr;
      return admin.storage.from('product-media').getPublicUrl(path).data.publicUrl;
    };

    const postIds = Object.keys(byPost);
    const POST_BATCH = 4;
    for (let i = 0; i < postIds.length; i += POST_BATCH) {
      const batch = postIds.slice(i, i + POST_BATCH);
      await Promise.all(batch.map(async (postId) => {
        const productsForPost = byPost[postId];
        try {
          // 1. Fetch the post itself
          const graphUrl = `https://graph.facebook.com/v19.0/${postId}?fields=media_url,thumbnail_url,media_type&access_token=${accessToken}`;
          const resp = await fetch(graphUrl);
          if (!resp.ok) {
            const errText = await resp.text().catch(() => '');
            throw new Error(`Graph API ${resp.status}: ${errText.slice(0, 160)}`);
          }
          const data = await resp.json();
          const mediaType: string = data.media_type || productsForPost[0].media_type || 'IMAGE';
          const parentMedia: string | undefined = data.media_url;
          const parentThumb: string | undefined = data.thumbnail_url;

          // 2. If carousel, fetch children for full gallery
          let childrenUrls: string[] = [];
          if (mediaType === 'CAROUSEL_ALBUM') {
            try {
              const childResp = await fetch(`https://graph.facebook.com/v19.0/${postId}/children?fields=id,media_url,media_type,thumbnail_url&access_token=${accessToken}`);
              if (childResp.ok) {
                const childData = await childResp.json();
                const items: any[] = Array.isArray(childData.data) ? childData.data : [];
                childrenUrls = items
                  .map(c => c.media_type === 'VIDEO' ? c.thumbnail_url : c.media_url)
                  .filter(Boolean);
              }
            } catch { /* non-fatal */ }
          }

          // 3. Upload everything we have to storage in parallel
          const uniqueSources = Array.from(new Set([
            ...(parentMedia ? [parentMedia] : []),
            ...(parentThumb && parentThumb !== parentMedia ? [parentThumb] : []),
            ...childrenUrls,
          ].filter(Boolean)));

          if (uniqueSources.length === 0) {
            throw new Error('Graph API returned no usable media');
          }

          const sourceToStorage = new Map<string, string>();
          await Promise.all(uniqueSources.map(async (src) => {
            try {
              const stored = await uploadToStorage(src, postId, mediaType === 'VIDEO' ? 'thumbnail' : 'media');
              sourceToStorage.set(src, stored);
            } catch (err: any) {
              console.warn(`[refresh] upload failed for ${postId}: ${err?.message}`);
            }
          }));

          if (sourceToStorage.size === 0) {
            throw new Error('All uploads failed');
          }

          const newParentMedia = parentMedia ? sourceToStorage.get(parentMedia) : undefined;
          const newParentThumb = parentThumb ? sourceToStorage.get(parentThumb) : newParentMedia;
          const newGallery = childrenUrls.length
            ? childrenUrls.map(c => sourceToStorage.get(c)).filter(Boolean) as string[]
            : (newParentMedia ? [newParentMedia] : []);

          // 4. Update each product associated with this post
          await Promise.all(productsForPost.map(async (product, idx) => {
            try {
              const update: Record<string, any> = {};

              if (mediaType === 'VIDEO') {
                if (newParentThumb) update.thumbnail_url = newParentThumb;
                if (newParentMedia) update.media_url = newParentMedia;
              } else if (childrenUrls.length && newGallery.length) {
                // Carousel: assign each combo-product a different child if possible, fallback to first
                const myUrl = newGallery[Math.min(idx, newGallery.length - 1)];
                update.media_url = myUrl;
                update.thumbnail_url = myUrl;
                if (productsForPost.length === 1) {
                  // Single product owns the whole gallery
                  update.media_gallery = newGallery;
                }
              } else if (newParentMedia) {
                update.media_url = newParentMedia;
                update.thumbnail_url = newParentThumb || newParentMedia;
              }

              if (Object.keys(update).length === 0) {
                failures.push({ product_id: product.id, reason: 'no media to assign' });
                failed++;
                return;
              }

              const { error: updErr } = await admin.from('products').update(update).eq('id', product.id);
              if (updErr) throw updErr;
              refreshed++;
            } catch (err: any) {
              failed++;
              failures.push({ product_id: product.id, reason: err?.message || 'update error' });
            }
          }));
        } catch (err: any) {
          for (const p of productsForPost) {
            failed++;
            failures.push({ product_id: p.id, reason: err?.message || 'unknown' });
          }
          console.error(`[refresh-product-media] post ${postId} failed:`, err?.message);
        }
      }));
    }

    return new Response(JSON.stringify({
      refreshed, failed, total: stale.length, posts_processed: postIds.length, failures: failures.slice(0, 30),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
    });
  } catch (err: any) {
    console.error('[refresh-product-media] fatal:', err?.message);
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
