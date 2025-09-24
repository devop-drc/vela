import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getSupabaseAdmin = () => createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

const updateJobProgress = async (supabase: SupabaseClient, jobId: string, progress: number, total: number, message: string, thumbnailUrl: string | null = null) => {
  const payload: any = { progress, total, message, status: 'in_progress', updated_at: new Date().toISOString() };
  if (thumbnailUrl) {
    payload.thumbnail_url = thumbnailUrl;
  }
  await supabase.from('sync_jobs').update(payload).eq('id', jobId);
};

const analyzeAndEnrichPost = async (supabaseAdmin: SupabaseClient, post: any) => {
    try {
        const { data: analysis, error: analysisError } = await supabaseAdmin.functions.invoke('ai-product-classifier', { 
            body: { caption: post.caption, imageUrl: post.media_url } 
        });
        if (analysisError) throw analysisError;
        return analysis;
    } catch (e) {
        console.error(`Error analyzing post ${post.id}:`, e.message);
        return { skipped: true, reason: e.message };
    }
};

const syncProcess = async (supabaseAdmin: SupabaseClient, user: any, jobId: string, syncType: 'quick' | 'full') => {
  const summary = { created: 0, updated: 0, skipped: 0, skipped_items: [] as any[] };
  try {
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses').select('id').eq('user_id', user.id).single();
    if (businessError || !business) throw new Error("Could not find business profile.");

    await updateJobProgress(supabaseAdmin, jobId, 0, 100, "Fetching Instagram posts...");
    
    const { data: postsData, error: postsError } = await supabaseAdmin.functions.invoke('instagram-posts', {
      headers: { Authorization: `Bearer ${user.token}` },
    });
    if (postsError) throw postsError;
    if (postsData.error) throw new Error(postsData.error);

    const allPosts = postsData.posts || [];
    if (allPosts.length === 0) {
      await supabaseAdmin.from('sync_jobs').update({ status: 'completed', message: 'No posts found to sync.', summary }).eq('id', jobId);
      return;
    }

    const { data: existingProducts, error: productsError } = await supabaseAdmin
      .from('products').select('id, instagram_post_id').eq('business_id', business.id);
    if (productsError) throw productsError;
    const existingProductMap = new Map(existingProducts.map(p => [p.instagram_post_id, p.id]));

    const postsToProcess = syncType === 'quick'
      ? allPosts.filter((p: any) => !existingProductMap.has(p.id))
      : allPosts;
    
    const total = postsToProcess.length;
    await updateJobProgress(supabaseAdmin, jobId, 0, total, `Found ${total} posts to process.`);

    if (total === 0) {
      await supabaseAdmin.from('sync_jobs').update({ status: 'completed', message: 'No new posts to sync.', summary }).eq('id', jobId);
      return;
    }

    const productsToUpsert = [];
    let processedCount = 0;

    for (const post of postsToProcess) {
      processedCount++;
      const captionSnippet = post.caption ? `"${post.caption.substring(0, 30)}..."` : `post without caption`;
      await updateJobProgress(supabaseAdmin, jobId, processedCount, total, `Analyzing: ${captionSnippet}`, post.thumbnail_url || post.media_url);

      const { product: productPayload, skipped, reason } = await analyzeAndEnrichPost(supabaseAdmin, post);
      
      if (skipped) {
        summary.skipped++;
        summary.skipped_items.push({
            name: post.caption ? post.caption.substring(0, 50) + '...' : `Post ID ${post.id}`,
            reason: reason || "Not a product.",
            thumbnail_url: post.thumbnail_url || post.media_url
        });
      } else if (productPayload) {
        const existingId = existingProductMap.get(post.id);
        const payload: any = { 
            ...productPayload, 
            business_id: business.id, 
            user_id: user.id,
            status: 'Draft',
            instagram_post_id: post.id,
            media_url: post.media_url,
            thumbnail_url: post.thumbnail_url,
            media_type: post.media_type,
        };
        
        if (existingId) {
          payload.id = existingId;
          summary.updated++;
        } else {
          summary.created++;
        }
        productsToUpsert.push(payload);
      }
    }

    if (productsToUpsert.length > 0) {
      await updateJobProgress(supabaseAdmin, jobId, total, total, `Saving ${productsToUpsert.length} products...`);
      const { error: upsertError } = await supabaseAdmin.from('products').upsert(productsToUpsert);
      if (upsertError) throw upsertError;
    }

    if (syncType === 'full') {
        const allInstagramPostIds = new Set(allPosts.map((p: any) => p.id));
        const productsToArchive = existingProducts.filter(p => p.instagram_post_id && !allInstagramPostIds.has(p.instagram_post_id));
        
        if (productsToArchive.length > 0) {
            await updateJobProgress(supabaseAdmin, jobId, total, total, `Archiving ${productsToArchive.length} old products...`);
            const idsToUpdate = productsToArchive.map(p => p.id);
            const { error: updateError } = await supabaseAdmin.from('products').update({ status: 'Draft' }).in('id', idsToUpdate);
            if (updateError) console.error(`Failed to archive products for user ${user.id}:`, updateError);
        }
        await supabaseAdmin.from('businesses').update({ last_full_sync_at: new Date().toISOString() }).eq('id', business.id);
    }

    const finalMessage = `Sync complete. Created ${summary.created}, updated ${summary.updated}, skipped ${summary.skipped}.`;
    await supabaseAdmin.from('sync_jobs').update({ status: 'completed', progress: total, total, message: finalMessage, summary }).eq('id', jobId);

  } catch (error) {
    console.error('Background Sync Error:', error.message);
    await supabaseAdmin.from('sync_jobs').update({ status: 'failed', message: error.message, summary }).eq('id', jobId);
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { syncType } = await req.json();

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) throw new Error('User not found');

    const { data: job, error: jobError } = await supabaseAdmin
      .from('sync_jobs')
      .insert({ user_id: user.id, status: 'starting', message: 'Initiating sync...' })
      .select('id')
      .single();

    if (jobError) throw jobError;

    // Do not await this, let it run in the background
    syncProcess(supabaseAdmin, { ...user, token }, job.id, syncType);

    return new Response(JSON.stringify({ jobId: job.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});