/**
 * bulk-publish-products — the "Choose what to generate and post" job.
 *
 * Body: { items: [{ productId, kind }] }  kind ∈ post_image | post_video |
 * story_image | story_video. Creates a sync_jobs row (summary.job_kind
 * 'bulk_publish') so the process widget tracks it, then per item:
 *  - image kinds: caption via publish-product-post preview (the merchant's
 *    caption style), then publish (post or story).
 *  - video kinds: enqueue a video_render_jobs row with publishAfter — the
 *    Remotion worker renders the MP4 and publishes it itself.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } }
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { items } = await req.json();
    if (!Array.isArray(items) || !items.length) return json({ error: 'No items to publish.' }, 400);
    if (items.length > 10) return json({ error: 'Max 10 products per bulk run.' }, 400);

    const { data: job } = await admin.from('sync_jobs').insert({
      user_id: user.id, status: 'in_progress', progress: 0, total: items.length,
      message: `Publishing ${items.length} products to Instagram…`,
      summary: { job_kind: 'bulk_publish', created: 0, failed: 0 },
    }).select('id').single();
    const jobId = job?.id ?? null;
    const upd = async (patch: Record<string, unknown>) => {
      if (jobId) await admin.from('sync_jobs').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', jobId);
    };

    // Studio prefs for video renders.
    const { data: studioRow } = await admin.from('instagram_studio_settings').select('settings').eq('user_id', user.id).maybeSingle();
    const studio = studioRow?.settings ?? {};
    const { data: shop } = await admin.from('shop_details')
      .select('shop_name, businesses!inner(user_id)').eq('businesses.user_id', user.id).maybeSingle();

    const invokePublish = async (body: Record<string, unknown>) => {
      const { data, error } = await supabase.functions.invoke('publish-product-post', { body, headers: { Authorization: authHeader } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(String(data.error));
      return data;
    };

    let ok = 0, failed = 0, queuedVideos = 0;
    const results: Array<{ productId: string; kind: string; ok: boolean; error?: string }> = [];
    for (const [i, item] of items.entries()) {
      const { productId, kind } = item;
      try {
        const { data: product } = await admin.from('products')
          .select('id, name, price, currency, media_url').eq('id', productId).eq('user_id', user.id).maybeSingle();
        if (!product) throw new Error('Product not found');
        await upd({ message: `(${i + 1}/${items.length}) ${product.name}…`, current_post_caption: product.name });

        const preview = await invokePublish({ productId, mode: 'preview' });
        if (preview?.error === 'reconnect_required') throw new Error('Instagram connection needs reconnecting');
        const caption = preview.caption ?? product.name;

        if (kind === 'post_image' || kind === 'story_image') {
          const pub = await invokePublish({
            productId, mode: 'publish', caption,
            publishKind: kind === 'story_image' ? 'story' : 'post',
          });
          if (pub?.error === 'reconnect_required') throw new Error('Instagram connection needs reconnecting');
          ok++;
        } else {
          // Video kinds: the render worker publishes after rendering.
          await admin.from('video_render_jobs').insert({
            user_id: user.id, product_id: productId,
            format: kind === 'story_video' ? 'story' : 'reel',
            template: studio.videoTemplate ?? 'gradient',
            props: {
              imageUrl: product.media_url, videoUrl: null,
              name: product.name, price: product.price, currency: product.currency || 'ALL',
              shopName: shop?.shop_name || '', accent: studio.accent ?? '#A31234',
              publishAfter: true, caption,
              publishKind: kind === 'story_video' ? 'story' : 'reel',
            },
          });
          queuedVideos++;
          ok++;
        }
        results.push({ productId, kind, ok: true });
      } catch (e) {
        failed++;
        results.push({ productId, kind, ok: false, error: (e as Error).message });
      }
      await upd({ progress: i + 1, summary: { job_kind: 'bulk_publish', created: ok, failed } });
    }

    await upd({
      status: 'completed',
      message: `Bulk publish finished — ${ok - queuedVideos} posted now, ${queuedVideos} videos rendering${failed ? `, ${failed} failed` : ''}.`,
      summary: { job_kind: 'bulk_publish', created: ok, failed },
    });
    return json({ jobId, results, published: ok - queuedVideos, queuedVideos, failed });
  } catch (e) {
    console.error('bulk-publish-products:', (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
