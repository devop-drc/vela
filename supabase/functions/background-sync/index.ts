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

const toTitleCase = (str: string) => str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

const upsertCategory = async (supabase: SupabaseClient, name: string, userId: string) => {
  const normalizedName = toTitleCase(name);
  let { data, error } = await supabase.from('categories').select('id').eq('name', normalizedName).eq('user_id', userId).single();
  if (error && error.code !== 'PGRST116') throw error;
  if (data) return data.id;
  
  ({ data, error } = await supabase.from('categories').insert({ name: normalizedName, user_id: userId }).select('id').single());
  if (error) throw error;
  return data.id;
};

const upsertTypeAndMergeAttributes = async (supabase: SupabaseClient, categoryId: string, typeName: string, newAttributes: any[], userId: string) => {
  const normalizedTypeName = toTitleCase(typeName);
  let { data: existingType, error } = await supabase.from('types').select('id, attributes').eq('category_id', categoryId).eq('name', normalizedTypeName).eq('user_id', userId).single();
  if (error && error.code !== 'PGRST116') throw error;

  const newAttributesMap = new Map((newAttributes || []).map(attr => [attr.name, { name: attr.name, inputType: attr.inputType, possibleValues: attr.possibleValues }]));

  if (existingType) {
    const existingAttributesMap = new Map((existingType.attributes || []).map((attr: any) => [attr.name, attr]));
    for (const [name, newAttr] of newAttributesMap.entries()) {
      if (!existingAttributesMap.has(name)) {
        existingAttributesMap.set(name, newAttr);
      }
    }
    const mergedAttributes = Array.from(existingAttributesMap.values());
    const { error: updateError } = await supabase.from('types').update({ attributes: mergedAttributes }).eq('id', existingType.id);
    if (updateError) throw updateError;
  } else {
    const attributesToInsert = Array.from(newAttributesMap.values());
    const { error: insertError } = await supabase.from('types').insert({ category_id: categoryId, name: normalizedTypeName, attributes: attributesToInsert, user_id: userId });
    if (insertError) throw insertError;
  }
};

const updateJobProgress = async (supabase: SupabaseClient, jobId: string, progress: number, total: number, message: string, thumbnailUrl: string | null = null, caption: string | null = null, aiMessage: string | null = null) => {
  const payload: any = { progress, total, message, status: 'in_progress', updated_at: new Date().toISOString() };
  if (thumbnailUrl) payload.thumbnail_url = thumbnailUrl;
  if (caption) payload.current_post_caption = caption;
  if (aiMessage) payload.ai_analysis_message = aiMessage;
  await supabase.from('sync_jobs').update(payload).eq('id', jobId);
};

const syncProcess = async (supabaseAdmin: SupabaseClient, user: any, jobId: string, syncType: 'quick' | 'full') => {
  const summary = { created: 0, updated: 0, skipped: 0, skipped_items: [] as any[] };
  try {
    const { data: business, error: businessError } = await supabaseAdmin.from('businesses').select('id').eq('user_id', user.id).single();
    if (businessError || !business) throw new Error("Could not find business profile.");

    await updateJobProgress(supabaseAdmin, jobId, 0, 100, "Fetching Instagram posts...");
    
    const { data: postsData, error: postsError } = await supabaseAdmin.functions.invoke('instagram-posts', { headers: { Authorization: `Bearer ${user.token}` } });
    if (postsError) throw postsError;
    if (postsData.error) throw new Error(postsData.error);

    const allPosts = postsData.posts || [];
    if (allPosts.length === 0) {
      await supabaseAdmin.from('sync_jobs').update({ status: 'completed', message: 'No posts found to sync.', summary }).eq('id', jobId);
      return;
    }

    const { data: existingProducts, error: productsError } = await supabaseAdmin.from('products').select('id, instagram_post_id').eq('business_id', business.id);
    if (productsError) throw productsError;
    const existingProductMap = new Map(existingProducts.map(p => [p.instagram_post_id, p.id]));

    const postsToProcess = syncType === 'quick' ? allPosts.filter((p: any) => !existingProductMap.has(p.id)) : allPosts;
    const total = postsToProcess.length;
    if (total === 0) {
      await supabaseAdmin.from('sync_jobs').update({ status: 'completed', message: 'No new posts to sync.', summary }).eq('id', jobId);
      return;
    }
    await updateJobProgress(supabaseAdmin, jobId, 0, total, `Found ${total} posts to process.`);

    const productsToUpsert = [];
    for (const [index, post] of postsToProcess.entries()) {
      const captionSnippet = post.caption ? `"${post.caption.substring(0, 30)}..."` : `post without caption`;
      await updateJobProgress(supabaseAdmin, jobId, index + 1, total, `Analyzing: ${captionSnippet}`, post.thumbnail_url || post.media_url, post.caption, "Running AI product classification...");

      if (!post.caption) {
        summary.skipped++;
        summary.skipped_items.push({ name: captionSnippet, reason: "Post has no caption to analyze.", thumbnail_url: post.thumbnail_url || post.media_url });
        continue;
      }

      const { data: analysis, error: analysisError } = await supabaseAdmin.functions.invoke('ai-product-classifier', { body: { caption: post.caption, user_id: user.id } });
      if (analysisError || analysis.error) {
        summary.skipped++;
        summary.skipped_items.push({ name: captionSnippet, reason: analysisError?.message || analysis?.error || "Analysis function failed.", thumbnail_url: post.thumbnail_url || post.media_url });
        continue;
      }

      if (!analysis.isProductPost) {
        summary.skipped++;
        summary.skipped_items.push({ name: captionSnippet, reason: "AI determined this is not a product post.", thumbnail_url: post.thumbnail_url || post.media_url });
        continue;
      }

      const { categoryName, typeName, attributes, ...productInfo } = analysis;
      if (categoryName && typeName) {
        const categoryId = await upsertCategory(supabaseAdmin, categoryName, user.id);
        await upsertTypeAndMergeAttributes(supabaseAdmin, categoryId, typeName, attributes || [], user.id);
      }

      const details: { [key: string]: any } = { type: toTitleCase(typeName) };
      if (attributes) {
        for (const attr of attributes) { details[attr.name] = attr.value; }
      }

      const productPayload = {
        name: productInfo.productName,
        caption: productInfo.description,
        price: productInfo.price,
        currency: productInfo.currency,
        tags: productInfo.tags,
        category: toTitleCase(categoryName),
        details: details,
        business_id: business.id, 
        user_id: user.id, 
        status: 'Draft',
        instagram_post_id: post.id, 
        media_url: post.media_url, 
        thumbnail_url: post.thumbnail_url, 
        media_type: post.media_type,
      };

      const existingId = existingProductMap.get(post.id);
      if (existingId) {
        (productPayload as any).id = existingId;
        summary.updated++;
      } else {
        summary.created++;
      }
      productsToUpsert.push(productPayload);
    }

    if (productsToUpsert.length > 0) {
      await updateJobProgress(supabaseAdmin, jobId, total, total, `Saving ${productsToUpsert.length} products...`);
      const { error: upsertError } = await supabaseAdmin.from('products').upsert(productsToUpsert);
      if (upsertError) throw upsertError;
    }

    const finalMessage = `Sync complete. Created ${summary.created}, updated ${summary.updated}, skipped ${summary.skipped}.`;
    await supabaseAdmin.from('sync_jobs').update({ status: 'completed', progress: total, total, message: finalMessage, summary }).eq('id', jobId);

  } catch (error) {
    console.error('Background Sync Error:', error.message);
    await supabaseAdmin.from('sync_jobs').update({ status: 'failed', message: error.message, summary }).eq('id', jobId);
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { syncType } = await req.json();
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseAdmin.auth.getUser(token);
    if (!user) throw new Error('User not found');

    const { data: job, error: jobError } = await supabaseAdmin.from('sync_jobs').insert({ user_id: user.id, status: 'starting', message: 'Initiating sync...' }).select('id').single();
    if (jobError) throw jobError;

    syncProcess(supabaseAdmin, { ...user, token }, job.id, syncType);

    return new Response(JSON.stringify({ jobId: job.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});