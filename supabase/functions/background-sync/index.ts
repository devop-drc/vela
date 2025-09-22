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
  await supabase.from('sync_jobs').update({ progress, total, message, thumbnail_url: thumbnailUrl, status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', jobId);
};

const syncProcess = async (supabaseAdmin: SupabaseClient, user: any, jobId: string, syncType: 'quick' | 'full') => {
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
      await supabaseAdmin.from('sync_jobs').update({ status: 'completed', message: 'No posts found to sync.' }).eq('id', jobId);
      return;
    }

    const { data: existingProducts, error: productsError } = await supabaseAdmin
      .from('products').select('id, instagram_post_id').eq('business_id', business.id);
    if (productsError) throw productsError;
    const existingPostIds = new Set(existingProducts.map(p => p.instagram_post_id));

    let postsToProcess = allPosts;
    if (syncType === 'quick') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      postsToProcess = allPosts.filter((p: any) => new Date(p.timestamp) > thirtyDaysAgo);
    }

    const newPosts = postsToProcess.filter((p: any) => !existingPostIds.has(p.id));
    const total = newPosts.length;
    await updateJobProgress(supabaseAdmin, jobId, 0, total, `Found ${total} new posts to analyze.`);

    if (total === 0) {
      await supabaseAdmin.from('sync_jobs').update({ status: 'completed', message: 'No new posts to sync.' }).eq('id', jobId);
      return;
    }

    const productsToInsert = [];
    let processedCount = 0;

    for (const post of newPosts) {
      processedCount++;
      const captionSnippet = post.caption ? `"${post.caption.substring(0, 40)}..."` : `post without caption`;
      await updateJobProgress(supabaseAdmin, jobId, processedCount, total, `Analyzing: ${captionSnippet}`, post.thumbnail_url || post.media_url);

      if (!post.caption) continue;

      try {
        const { data: analysis, error: analysisError } = await supabaseAdmin.functions.invoke('ai-product-analyzer', { body: { caption: post.caption } });
        if (analysisError || !analysis || !analysis.isProductPost) continue;

        const p = analysis.product;
        let enrichedDetails = p.details || {};

        if (p.name && p.category && p.details?.type) {
          const { data: specData, error: specError } = await supabaseAdmin.functions.invoke('ai-spec-finder', {
            body: { productName: p.name, categoryName: p.category, typeName: p.details.type }
          });
          if (!specError && specData && !specData.error) {
            enrichedDetails = { ...enrichedDetails, ...specData };
          }
        }
        
        productsToInsert.push({
          business_id: business.id, name: p.name, caption: p.description, category: p.category,
          price: p.price, currency: p.currency, tags: p.tags, details: enrichedDetails,
          status: 'Draft', instagram_post_id: post.id, media_url: post.media_url,
          thumbnail_url: post.thumbnail_url, media_type: post.media_type,
        });

      } catch (e) {
        console.error(`Error processing post ${post.id}:`, e.message);
      }
    }

    if (productsToInsert.length > 0) {
      await updateJobProgress(supabaseAdmin, jobId, total, total, `Saving ${productsToInsert.length} new products...`);
      const { error: insertError } = await supabaseAdmin.from('products').insert(productsToInsert);
      if (insertError) throw insertError;
    }

    if (syncType === 'full') {
        await supabaseAdmin.from('businesses').update({ last_full_sync_at: new Date().toISOString() }).eq('id', business.id);
    }

    const finalMessage = `Sync complete. Added ${productsToInsert.length} new products.`;
    await supabaseAdmin.from('sync_jobs').update({ status: 'completed', progress: total, total, message: finalMessage }).eq('id', jobId);

  } catch (error) {
    console.error('Background Sync Error:', error.message);
    await supabaseAdmin.from('sync_jobs').update({ status: 'failed', message: error.message }).eq('id', jobId);
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
      .insert({ user_id: user.id, status: 'starting' })
      .select('id')
      .single();

    if (jobError) throw jobError;

    // Do not await this call, let it run in the background
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