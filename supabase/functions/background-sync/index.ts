import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

// Types
interface InstagramPost {
  id: string;
  caption?: string;
  media_url: string;
  thumbnail_url?: string;
  media_type: string;
}

interface AnalysisResult {
  isProductPost: boolean;
  productName?: string;
  description?: string;
  price?: number;
  currency?: string;
  tags?: string[];
  categoryName?: string;
  typeName?: string;
  attributes?: { name: string; value: string | string[]; inputType?: string; possibleValues?: string[] }[];
  tokenUsage?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

interface LiveAnalysisResult {
  post: InstagramPost & { captionHash: string };
  analysis: AnalysisResult;
  error: any;
}

interface ProductPayload {
  id?: string;
  name?: string;
  caption?: string;
  price?: number;
  currency?: string;
  tags?: string[];
  category?: string;
  details: { [key: string]: any };
  business_id: string;
  user_id: string;
  status: string;
  instagram_post_id: string;
  media_url: string;
  thumbnail_url?: string;
  media_type: string;
  inventory?: number; // Added inventory to payload
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper Functions
const sha256 = async (text: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const getSupabaseAdmin = () => createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false } }
);

const toTitleCase = (str: string) => str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

// Currency conversion helper (simplified for server-side, assumes rates are USD-based)
const convertCurrencyServer = async (amount: number, fromCurrency: string, toCurrency: string = 'USD'): Promise<number> => {
  if (fromCurrency === toCurrency) return amount;

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.functions.invoke('exchange-rates');
  if (error || data.error) {
    console.error("Server-side currency conversion: Failed to fetch exchange rates.", error || data.error);
    return amount; // Return original amount on error
  }
  const exchangeRates = data.rates;

  const fromRate = exchangeRates[fromCurrency];
  const toRate = exchangeRates[toCurrency];

  if (!fromRate || !toRate) {
    console.warn(`Server-side currency conversion: Missing exchange rate for conversion from ${fromCurrency} to ${toCurrency}.`);
    return amount; // Return original amount if rates are missing
  }

  // Convert from source currency to USD, then from USD to target currency
  const amountInUSD = amount / fromRate;
  const convertedAmount = amountInUSD * toRate;
  
  return Math.round(convertedAmount * 100) / 100;
};


// Database Functions
const upsertCategory = async (supabase: SupabaseClient, name: string, userId: string): Promise<string> => {
  const normalizedName = toTitleCase(name);
  let { data, error } = await supabase.from('categories').select('id').eq('name', normalizedName).eq('user_id', userId).single();
  if (error && error.code !== 'PGRST116') throw error;
  if (data) return data.id;
  
  ({ data, error } = await supabase.from('categories').insert({ name: normalizedName, user_id: userId }).select('id').single());
  if (error) throw error;
  return data!.id;
};

const upsertTypeAndMergeAttributes = async (supabase: SupabaseClient, categoryId: string, typeName: string, newAttributes: AnalysisResult['attributes'], userId: string): Promise<void> => {
  const normalizedTypeName = toTitleCase(typeName);
  const { data: existingType, error } = await supabase.from('types').select('id, attributes').eq('category_id', categoryId).eq('name', normalizedTypeName).eq('user_id', userId).single();
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

const updateJobProgress = async (supabase: SupabaseClient, jobId: string, update: Partial<any>): Promise<void> => {
  const payload = { ...update, updated_at: new Date().toISOString() };
  await supabase.from('sync_jobs').update(payload).eq('id', jobId);
};

// Main Sync Logic
const syncProcess = async (supabaseAdmin: SupabaseClient, user: { id: string; token: string }, jobId: string, syncType: 'quick' | 'full') => {
  const summary = {
    created: 0, updated: 0, skipped: 0, cache_hits: 0,
    skipped_items: [] as { name: string; reason: string; thumbnail_url?: string }[],
    created_items: [] as ProductPayload[],
    updated_items: [] as ProductPayload[],
    total_ai_tokens_used: { prompt: 0, candidates: 0 },
  };

  try {
    const { data: business, error: businessError } = await supabaseAdmin.from('businesses').select('id').eq('user_id', user.id).single();
    if (businessError || !business) throw new Error("Could not find business profile.");

    await updateJobProgress(supabaseAdmin, jobId, { progress: 0, total: 100, message: "Fetching Instagram posts...", status: 'in_progress' });
    
    const { data: postsData, error: postsError } = await supabaseAdmin.functions.invoke('instagram-posts', { headers: { Authorization: `Bearer ${user.token}` } });
    if (postsError) throw postsError;
    if (postsData.error) throw new Error(postsData.error);

    const allPosts: InstagramPost[] = postsData.posts || [];
    if (allPosts.length === 0) {
      await updateJobProgress(supabaseAdmin, jobId, { status: 'completed', message: 'No posts found to sync.', summary });
      return;
    }

    const { data: existingProducts, error: productsError } = await supabaseAdmin.from('products').select('id, instagram_post_id').eq('business_id', business.id);
    if (productsError) throw productsError;
    const existingProductMap = new Map((existingProducts || []).map(p => [p.instagram_post_id, p.id]));

    const postsToProcess: InstagramPost[] = syncType === 'quick' ? allPosts.filter(p => !existingProductMap.has(p.id)) : allPosts;
    const total = postsToProcess.length;

    if (total === 0) {
      await updateJobProgress(supabaseAdmin, jobId, { status: 'completed', message: 'No new posts to sync.', summary });
      return;
    }

    const { data: cacheEntries, error: cacheError } = await supabaseAdmin.from('ai_analysis_cache').select('*').eq('user_id', user.id);
    if (cacheError) throw cacheError;
    const cacheMap = new Map((cacheEntries || []).map((entry: any) => [entry.instagram_post_id, entry]));

    const postsNeedingAnalysis: (InstagramPost & { captionHash: string })[] = [];
    const analysisFromCache = new Map<string, AnalysisResult>();

    for (const post of postsToProcess) {
      if (!post.caption) {
        summary.skipped++;
        summary.skipped_items.push({ name: `Post without caption`, reason: "Post has no caption to analyze.", thumbnail_url: post.thumbnail_url || post.media_url });
        continue;
      }
      const captionHash = await sha256(post.caption);
      const cached = cacheMap.get(post.id);

      if (cached && cached.caption_hash === captionHash) {
        analysisFromCache.set(post.id, cached.analysis_result as AnalysisResult);
        summary.cache_hits++;
      } else {
        postsNeedingAnalysis.push({ ...post, captionHash });
      }
    }

    if (postsToProcess.length > 0 && postsNeedingAnalysis.length === 0) {
      await updateJobProgress(supabaseAdmin, jobId, { status: 'completed', message: 'All posts are already up to date.', summary });
      return;
    }

    await updateJobProgress(supabaseAdmin, jobId, { progress: 0, total, message: `Analyzing ${postsNeedingAnalysis.length} new posts...`, status: 'in_progress' });

    const analysisPromises = postsNeedingAnalysis.map(post => 
      supabaseAdmin.functions.invoke('ai-product-classifier', { body: { caption: post.caption, user_id: user.id } })
        .then(({ data, error }) => ({ post, analysis: data as AnalysisResult, error }))
    );
    
    const liveAnalysisResults: LiveAnalysisResult[] = await Promise.all(analysisPromises);
    const newCacheEntries: any[] = [];

    for (const { post, analysis, error } of liveAnalysisResults) {
      const captionSnippet = `"${post.caption?.substring(0, 30) || ''}..."`;
      if (error || !analysis) {
        summary.skipped++;
        summary.skipped_items.push({ name: captionSnippet, reason: error?.message || "Analysis function failed.", thumbnail_url: post.thumbnail_url || post.media_url });
        continue;
      }

      if (analysis.tokenUsage) {
        summary.total_ai_tokens_used.prompt += analysis.tokenUsage.promptTokenCount || 0;
        summary.total_ai_tokens_used.candidates += analysis.tokenUsage.candidatesTokenCount || 0;
      }
      
      analysisFromCache.set(post.id, analysis);
      newCacheEntries.push({
        instagram_post_id: post.id,
        user_id: user.id,
        caption_hash: post.captionHash,
        analysis_result: analysis
      });
    }

    if (newCacheEntries.length > 0) {
      await supabaseAdmin.from('ai_analysis_cache').upsert(newCacheEntries);
    }

    const productsToUpsert: ProductPayload[] = [];
    let progress = 0;
    for (const post of postsToProcess) {
      const analysis = analysisFromCache.get(post.id);
      if (!analysis) { // Post was skipped during analysis, so we skip it here too.
        continue;
      }

      progress++;
      await updateJobProgress(supabaseAdmin, jobId, { progress, total, message: `Saving products...` });

      if (!analysis.isProductPost) {
        summary.skipped++;
        summary.skipped_items.push({ name: `"${post.caption?.substring(0, 30) || ''}..."`, reason: "AI determined this is not a product post.", thumbnail_url: post.thumbnail_url || post.media_url });
        continue;
      }

      const { categoryName, typeName, attributes, ...productInfo } = analysis;
      if (categoryName && typeName) {
        const categoryId = await upsertCategory(supabaseAdmin, categoryName, user.id);
        await upsertTypeAndMergeAttributes(supabaseAdmin, categoryId, typeName, attributes, user.id);
      }

      const details: { [key: string]: any } = { type: toTitleCase(typeName || '') };
      if (attributes) {
        for (const attr of attributes) { details[attr.name] = attr.value; }
      }

      // Default inventory to 0 if not provided by AI
      const inventory = productInfo.inventory ?? 0; 

      // Convert AI-suggested price to USD for storage
      let priceInUSD = productInfo.price ?? 0;
      if (productInfo.price && productInfo.currency && productInfo.currency !== 'USD') {
        priceInUSD = await convertCurrencyServer(productInfo.price, productInfo.currency, 'USD');
        console.log(`Background Sync: Converted AI price ${productInfo.price} ${productInfo.currency} to ${priceInUSD} USD for storage.`);
      }

      const productPayload: ProductPayload = {
        name: productInfo.productName,
        caption: productInfo.description,
        price: priceInUSD, // Store price in USD
        currency: 'USD', // Always store currency as USD
        tags: productInfo.tags,
        category: toTitleCase(categoryName || ''),
        details: details,
        business_id: business.id, 
        user_id: user.id, 
        status: inventory === 0 ? 'Out of Stock' : 'Draft', // Set status based on inventory
        instagram_post_id: post.id, 
        media_url: post.media_url, 
        thumbnail_url: post.thumbnail_url || post.media_url, 
        media_type: post.media_type,
        inventory: inventory, // Include inventory in payload
      };

      const existingId = existingProductMap.get(post.id);
      if (existingId) {
        productPayload.id = existingId;
        summary.updated++;
        summary.updated_items.push(productPayload);
      } else {
        summary.created++;
        summary.created_items.push(productPayload);
      }
      productsToUpsert.push(productPayload);
    }

    if (productsToUpsert.length > 0) {
      const { error: upsertError } = await supabaseAdmin.from('products').upsert(productsToUpsert);
      if (upsertError) throw upsertError;
    }

    const finalMessage = `Sync complete. Created ${summary.created}, updated ${summary.updated}, skipped ${summary.skipped}.`;
    await updateJobProgress(supabaseAdmin, jobId, { status: 'completed', progress: total, total, message: finalMessage, summary });
    console.log(`Sync AI Token Summary for Job ${jobId}: Prompt Tokens: ${summary.total_ai_tokens_used.prompt}, Candidate Tokens: ${summary.total_ai_tokens_used.candidates}`);

  } catch (error) {
    console.error('Background Sync Error:', error.message);
    await updateJobProgress(supabaseAdmin, jobId, { status: 'failed', message: error.message, summary });
  }
};

// Server Entry Point
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