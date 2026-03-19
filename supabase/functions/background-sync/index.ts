import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";
import { isCaptionInsufficient, extractProductName, normalizeProductName, heuristicParse } from "../_shared/heuristics.ts";

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
  inventory?: number;
  pricingType?: 'one_time' | 'subscription';
  billingInterval?: 'month' | 'year' | null;
  // New fields replacing 'attributes'
  specifications?: { [key: string]: string | string[] };
  options?: { [key: string]: string[] };
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
  instagram_post_id: string | null;
  media_url: string;
  thumbnail_url?: string;
  media_type: string;
  inventory?: number;
  pricing_type?: 'one_time' | 'subscription';
  billing_interval?: 'month' | 'year' | null;
  product_type?: 'physical' | 'digital';
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

const toTitleCase = (str: string) => str.replace(/_/g, ' ').replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

// Currency conversion helper (assumes rates are ALL-based)
const convertCurrencyServer = async (amount: number, fromCurrency: string, toCurrency: string = 'ALL'): Promise<number> => {
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

  // Rates are ALL-based: rate[X] means 1 ALL = X of currency X
  // To convert from A to B: amount_in_B = amount_in_A * (rate[B] / rate[A])
  const convertedAmount = amount * (toRate / fromRate);
  
  return Math.round(convertedAmount * 100) / 100;
};


// Database Functions
// Variant helpers: create product_options, option_values, and product_variants from AI options
const upsertProductOption = async (supabase: SupabaseClient, productId: string, name: string, position: number) => {
  const normalized = toTitleCase(name);
  const { data: existing, error: selErr } = await supabase
    .from('product_options')
    .select('id')
    .eq('product_id', productId)
    .eq('name', normalized)
    .maybeSingle();
  if (selErr && selErr.code !== 'PGRST116') throw selErr;
  if (existing) return existing.id;
  const { data: inserted, error: insErr } = await supabase
    .from('product_options')
    .insert({ product_id: productId, name: normalized, position, is_active: true })
    .select('id')
    .single();
  if (insErr) throw insErr;
  return inserted!.id;
};

const upsertOptionValue = async (supabase: SupabaseClient, optionId: string, value: string) => {
  const val = String(value).trim();
  const { data: existing, error: selErr } = await supabase
    .from('option_values')
    .select('id')
    .eq('option_id', optionId)
    .eq('value', val)
    .maybeSingle();
  if (selErr && selErr.code !== 'PGRST116') throw selErr;
  if (existing) return existing.id;
  const { data: inserted, error: insErr } = await supabase
    .from('option_values')
    .insert({ option_id: optionId, value: val, is_active: true })
    .select('id')
    .single();
  if (insErr) throw insErr;
  return inserted!.id;
};

const combinations = <T,>(arrays: T[][]): T[][] => {
  if (arrays.length === 0) return [];
  return arrays.reduce<T[][]>((acc, curr) => {
    if (acc.length === 0) return curr.map(v => [v]);
    const next: T[][] = [];
    for (const prev of acc) {
      for (const v of curr) next.push([...prev, v]);
    }
    return next;
  }, []);
};

const buildVariantKey = (orderedOptionNames: string[], valueLabels: string[]) => {
  const parts = orderedOptionNames.map((name, idx) => `${name}=${valueLabels[idx]}`);
  return parts.join('|');
};

const upsertVariantsFromOptions = async (supabase: SupabaseClient, productId: string, aiOptions: Record<string, string[]>) => {
  const optionEntries = Object.entries(aiOptions || {}).filter(([_, vals]) => Array.isArray(vals) && vals.length > 0);
  if (optionEntries.length === 0) return;

  const orderedNames = optionEntries.map(([name]) => toTitleCase(name));
  const optionIds: string[] = [];
  for (let i = 0; i < orderedNames.length; i++) {
    const optionId = await upsertProductOption(supabase, productId, orderedNames[i], i);
    optionIds.push(optionId);
  }

  const valueIdMatrix: string[][] = [];
  const valueLabelMatrix: string[][] = [];
  for (let i = 0; i < optionEntries.length; i++) {
    const [, values] = optionEntries[i];
    const ids: string[] = [];
    const labels: string[] = [];
    for (const raw of values) {
      const val = String(raw).trim();
      const id = await upsertOptionValue(supabase, optionIds[i], val);
      ids.push(id);
      labels.push(val);
    }
    valueIdMatrix.push(ids);
    valueLabelMatrix.push(labels);
  }

  const combosIds = combinations(valueIdMatrix);
  const combosLabels = combinations(valueLabelMatrix);

  const { data: existingVariants } = await supabase
    .from('product_variants')
    .select('id, combination_key')
    .eq('product_id', productId);
  const existingKeys = new Set((existingVariants || []).map(v => v.combination_key));

  const toInsert: any[] = [];
  for (let i = 0; i < combosIds.length; i++) {
    const variantKey = buildVariantKey(orderedNames, combosLabels[i]);
    if (existingKeys.has(variantKey)) continue;
    toInsert.push({ product_id: productId, combination_key: variantKey, is_active: true });
  }
  if (toInsert.length > 0) {
    const { error } = await supabase.from('product_variants').insert(toInsert);
    if (error) throw error;
  }
};
const upsertCategory = async (supabase: SupabaseClient, name: string, userId: string): Promise<string> => {
  const normalizedName = toTitleCase(name);
  let { data, error } = await supabase.from('categories').select('id').eq('name', normalizedName).eq('user_id', userId).single();
  if (error && error.code !== 'PGRST116') throw error;
  if (data) return data.id;
  
  ({ data, error } = await supabase.from('categories').insert({ name: normalizedName, user_id: userId }).select('id').single());
  if (error) throw error;
  return data!.id;
};

// Updated upsertTypeAndMergeAttributes to handle the new attribute structure
const upsertTypeAndMergeAttributes = async (supabase: SupabaseClient, categoryId: string, typeName: string, newAttributes: any[], userId: string): Promise<void> => {
  const normalizedTypeName = toTitleCase(typeName);
  const { data: existingType, error } = await supabase.from('types').select('id, attributes').eq('category_id', categoryId).eq('name', normalizedTypeName).single();
  if (error && error.code !== 'PGRST116') throw error;

  const newAttributesMap = new Map((newAttributes || []).map(attr => [attr.name, attr]));

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
    const { error: insertError } = await supabase.from('types').insert({ 
      category_id: categoryId, 
      name: normalizedTypeName, 
      attributes: attributesToInsert, 
      user_id: userId 
    });
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
    combo_created: 0,
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

    // Also fetch existing combos to decide if a post needs processing for multi-products
    const { data: existingCombos } = await supabaseAdmin
      .from('combo_products')
      .select('instagram_post_id');
    const comboPostIds = new Set((existingCombos || []).map((c: any) => c.instagram_post_id));

    // In quick sync: process posts that either don't have a product yet OR don't have a combo yet
    const postsToProcess: InstagramPost[] = syncType === 'quick'
      ? allPosts.filter(p => !existingProductMap.has(p.id) || !comboPostIds.has(p.id))
      : allPosts;
    const total = postsToProcess.length;

    if (total === 0) {
      await updateJobProgress(supabaseAdmin, jobId, { status: 'completed', message: 'No new posts to sync.', summary });
      return;
    }

    const { data: cacheEntries, error: cacheError } = await supabaseAdmin.from('ai_analysis_cache').select('*').eq('user_id', user.id);
    if (cacheError) throw cacheError;
    const cacheMap = new Map<string, any>((cacheEntries || []).map((entry: any) => [entry.instagram_post_id, entry]));

    // Fetch the Instagram access token for image analysis
    const { data: integration } = await supabaseAdmin
      .from('integrations')
      .select('access_token')
      .eq('user_id', user.id)
      .eq('provider', 'facebook')
      .maybeSingle();
    const accessToken: string | null = integration?.access_token || null;

    const postsNeedingAnalysis: (InstagramPost & { captionHash: string; captionInsufficient: boolean })[] = [];
    const analysisFromCache = new Map<string, AnalysisResult>();

    for (const post of postsToProcess) {
      // Allow captionless posts to proceed with image analysis flag
      const captionInsufficient = isCaptionInsufficient(post.caption ?? null);
      const captionHash = await sha256(post.caption || post.id);
      const cached = cacheMap.get(post.id);

      if (cached && cached.caption_hash === captionHash) {
        analysisFromCache.set(post.id, cached.analysis_result as AnalysisResult);
        summary.cache_hits++;
      } else {
        // Try heuristic parse first — skip AI if global intelligence cache has a confident match
        const heuristicResult = heuristicParse(post.caption || '');
        const extractedName = extractProductName(post.caption || null);

        let usedGlobalIntelligence = false;
        if (heuristicResult && extractedName) {
          const normalized = normalizeProductName(extractedName);
          const { data: globalMatch } = await supabaseAdmin
            .from('global_product_intelligence')
            .select('*')
            .eq('normalized_name', normalized)
            .gte('confidence', 0.7)
            .order('confidence', { ascending: false })
            .limit(1);

          if (globalMatch && globalMatch.length > 0) {
            // Build a synthetic AnalysisResult from heuristic price + global intelligence metadata
            const intel = globalMatch[0];
            const syntheticAnalysis: AnalysisResult = {
              isProductPost: true,
              productName: heuristicResult.productName,
              price: heuristicResult.price,
              currency: heuristicResult.currency,
              inventory: heuristicResult.inventory,
              categoryName: intel.category_name || undefined,
              typeName: intel.type_name || undefined,
              description: intel.description || post.caption || undefined,
              tags: intel.tags || [],
              specifications: intel.specifications || undefined,
              options: intel.options || undefined,
              pricingType: 'one_time',
              billingInterval: null,
            };
            analysisFromCache.set(post.id, syntheticAnalysis);
            summary.cache_hits = (summary.cache_hits || 0) + 1;
            usedGlobalIntelligence = true;
          }
        }

        if (!usedGlobalIntelligence) {
          postsNeedingAnalysis.push({ ...post, captionHash, captionInsufficient });
        }
      }
    }

    // --- Step 1: Live Analysis ---
    await updateJobProgress(supabaseAdmin, jobId, { progress: 0, total, message: `Analyzing ${postsNeedingAnalysis.length} new posts...` });

    const analysisPromises = postsNeedingAnalysis.map(post =>
      supabaseAdmin.functions.invoke('ai-product-classifier', {
        body: {
          caption: post.caption || '',
          user_id: user.id,
          include_images: post.captionInsufficient,
          post_media: {
            media_url: post.media_url,
            thumbnail_url: post.thumbnail_url,
            media_type: post.media_type,
            post_id: post.id
          },
          access_token: accessToken
        }
      })
        .then(({ data, error }) => ({ post, analysis: data as AnalysisResult, error } as LiveAnalysisResult))
    );
    
    const liveAnalysisResults: LiveAnalysisResult[] = await Promise.all(analysisPromises);
    const newCacheEntries: any[] = [];

    const inferBrand = (name?: string, tags?: string[]): string | null => {
      const cands: string[] = [];
      if (Array.isArray(tags)) {
        for (const t of tags) {
          const m = String(t).match(/^([A-Za-z0-9][A-Za-z0-9\-]*)\s+/);
          if (m) cands.push(m[1]);
        }
      }
      if (name) {
        const m = String(name).match(/^([A-Za-z0-9][A-Za-z0-9\-]*)\b/);
        if (m) cands.push(m[1]);
      }
      return cands.length ? toTitleCase(cands[0]) : null;
    };

    // Heuristic parser for multi-product captions of the form:
    // Name\nRef. Code: XXX (optional)\nÇmimi: 250EUR\nStock: 5 units
    const parseMultiProducts = (caption?: string): Array<{ productName: string; price?: number; currency?: string; inventory?: number; specifications?: Record<string, string> }> => {
      if (!caption) return [];
      const blocks = caption.split(/\n\s*\n+/).map(b => b.trim()).filter(Boolean);
      const items: Array<{ productName: string; price?: number; currency?: string; inventory?: number; specifications?: Record<string, string> }> = [];
      for (const block of blocks) {
        const lines = block.split(/\n+/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) continue;
        const name = lines[0];
        let refCode: string | undefined;
        let price: number | undefined;
        let currency: string | undefined;
        let inventory: number | undefined;
        for (const line of lines.slice(1)) {
          const refMatch = line.match(/ref\.?\s*code\s*:\s*([A-Za-z0-9\-]+)/i);
          if (refMatch) refCode = refMatch[1];
          const priceMatch = line.match(/çmimi\s*:\s*([0-9]+(?:[\.,][0-9]+)?)\s*([A-Za-z]{3})/i) || line.match(/price\s*:\s*([0-9]+(?:[\.,][0-9]+)?)\s*([A-Za-z]{3})/i);
          if (priceMatch) { price = parseFloat(priceMatch[1].replace(',', '.')); currency = priceMatch[2].toUpperCase(); }
          const stockMatch = line.match(/stock\s*:\s*([0-9]+)/i);
          if (stockMatch) inventory = parseInt(stockMatch[1]);
        }
        const hasSignal = (price !== undefined && !!currency) || inventory !== undefined;
        if (hasSignal) {
          items.push({ productName: name, price, currency, inventory, specifications: refCode ? { ref_code: refCode } : undefined });
        }
      }
      return items;
    };

    // Normalize AI analysis that may come as a numeric-keyed object ("0","1",...) into analysis.products[]
    const normalizeAnalysis = (raw: any, caption?: string): any => {
      const a: any = raw || {};
      // Already normalized
      if (Array.isArray(a.products)) {
        if (a.products.length > 0) a.isProductPost = true;
        return a;
      }
      // Convert numeric-keyed object entries into an array of items
      const numericKeys = Object.keys(a).filter(k => /^\d+$/.test(k));
      if (numericKeys.length > 0) {
        const products = numericKeys
          .map(k => a[k])
          .filter((v: any) => v && (v.productName || v.name));
        if (products.length > 0) {
          a.products = products;
          a.isProductPost = true;
        }
      }
      return a;
    };

    for (const { post, analysis, error } of liveAnalysisResults) {
      const captionSnippet = `"${post.caption?.substring(0, 30) || ''}..."`;
      let effectiveAnalysis = normalizeAnalysis(analysis, post.caption) as AnalysisResult | undefined;
      if (error || !effectiveAnalysis) {
        // Heuristic fallback: if caption contains price or currency signals, mark as product
        const hasPriceSignal = /\b(ALL|EUR|USD|GBP|Lek|Lekë)\b|\d+[\.,]?\d*\s?(ALL|EUR|USD|GBP)/i.test(post.caption || '');
        if (hasPriceSignal) {
          effectiveAnalysis = { isProductPost: true, productName: post.caption?.split('\n')[0]?.slice(0, 40) || 'Product' } as AnalysisResult;
        } else {
          summary.skipped++;
          summary.skipped_items.push({ name: captionSnippet, reason: error?.message || "Analysis function failed.", thumbnail_url: post.thumbnail_url || post.media_url });
          continue;
        }
      }

      if (analysis?.tokenUsage) {
        summary.total_ai_tokens_used.prompt += analysis.tokenUsage.promptTokenCount || 0;
        summary.total_ai_tokens_used.candidates += analysis.tokenUsage.candidatesTokenCount || 0;
      }
      
      analysisFromCache.set(post.id, effectiveAnalysis);
      newCacheEntries.push({
        instagram_post_id: post.id,
        user_id: user.id,
        caption_hash: post.captionHash,
        analysis_result: effectiveAnalysis
      });
    }

    if (newCacheEntries.length > 0) {
      await supabaseAdmin.from('ai_analysis_cache').upsert(newCacheEntries);
    }

    // --- Step 2: Process and Upsert Products ---
    const productsToUpsert: ProductPayload[] = [];
    const postOptionsMap = new Map<string, Record<string, string[]>>();
    const categoriesToUpsert = new Map<string, { id: string, name: string }>();
    const typesToUpsert = new Map<string, { categoryId: string, name: string, attributes: any[] }>();
    const multiItemMap = new Map<string, Array<{ name: string; priceALL: number | null }>>();
    const promotionsToInsert: Array<{ title: string; summary: string; discount_type?: 'percent'|'amount'|null; discount_value?: number|null; currency?: string|null; valid_until?: string|null; post_id: string }>
      = [];
    let progress = 0;
    
    for (const post of postsToProcess) {
      const analysis = normalizeAnalysis(analysisFromCache.get(post.id), post.caption);
      if (!analysis) { // Post was skipped during analysis, so we skip it here too.
        continue;
      }

      progress++;
      // Update progress for EVERY post to give real-time feel, but throttle DB calls slightly if total is huge
      if (total < 20 || progress % 2 === 0 || progress === total) {
        await updateJobProgress(supabaseAdmin, jobId, { 
          progress, 
          total, 
          message: `Processing post ${progress} of ${total}: ${analysis?.productName || 'Analyzing...'}`,
          thumbnail_url: post.thumbnail_url || post.media_url,
          analysis_result: analysis
        });
      }

      // If AI marks as non-product: try promotion branch, else try parsing products; else skip
      if (!analysis.isProductPost) {
        const anyAnalysis: any = analysis as any;
        if (anyAnalysis.isSaleOrPromotion && anyAnalysis.promotion) {
          const promo = anyAnalysis.promotion as { title: string; summary?: string; discount_type?: 'percent'|'amount'|null; discount_value?: number|null; currency?: string|null; valid_until?: string|null };
          promotionsToInsert.push({
            title: promo.title || 'Promotion',
            summary: promo.summary || (post.caption?.slice(0, 180) || ''),
            discount_type: promo.discount_type ?? null,
            discount_value: promo.discount_value ?? null,
            currency: promo.currency ?? null,
            valid_until: promo.valid_until ?? null,
            post_id: post.id,
          });
          continue;
        }
        const parsed = parseMultiProducts(post.caption);
        if (parsed.length > 0) {
          // Emulate minimal analysis so downstream logic creates products from parsed items
          (analysis as any).isProductPost = true;
          (analysis as any).products = parsed;
        } else {
          summary.skipped++;
          summary.skipped_items.push({ name: `"${post.caption?.substring(0, 30) || ''}..."`, reason: "AI determined this is not a product post.", thumbnail_url: post.thumbnail_url || post.media_url });
          continue;
        }
      }

      const { categoryName: rawCategoryName, typeName: rawTypeName, specifications: rawSpecifications, options, pricingType, billingInterval, inventory: aiInventory, ...productInfo } = analysis;

      // Normalize specifications: handle both array [{key,value,unit}] and object {key:value} formats
      let specifications: Record<string, any> | undefined;
      if (Array.isArray(rawSpecifications)) {
        specifications = {};
        for (const spec of rawSpecifications) {
          if (spec && spec.key) specifications[spec.key] = spec.value || '';
        }
      } else if (rawSpecifications && typeof rawSpecifications === 'object') {
        specifications = rawSpecifications;
      }

      // Default category/type if AI didn't return them
      const categoryName = rawCategoryName || 'Uncategorized';
      const typeName = rawTypeName || 'General';

      // If AI returned products array (multi-product), expand them; otherwise, try parser; else fall back to single product
      const multiProducts: Array<any> = (analysis as any).products && Array.isArray((analysis as any).products)
        ? (analysis as any).products
        : [];
      const parsedProducts = multiProducts.length === 0 ? parseMultiProducts(post.caption) : [];
      const itemsToCreate = multiProducts.length > 0 ? multiProducts : parsedProducts.length > 0 ? parsedProducts : [null];
      const isMultiPost = itemsToCreate.filter(Boolean).length > 1;

      // If multiple items were detected (AI or parser), call the dedicated Edge Function to upsert the combo fully
      if ((analysis as any).isMultiProductPost === true || itemsToCreate.filter(Boolean).length > 1) {
        try {
          const enrichedAnalysis: any = { ...analysis, products: itemsToCreate };
          const { error: comboErr, data: comboRes } = await supabaseAdmin.functions.invoke('upsert-combo-from-analysis', {
            body: { instagram_post_id: post.id, user_id: user.id, analysis: enrichedAnalysis },
          });
          if (comboErr) {
            console.error('upsert-combo-from-analysis failed:', comboErr.message);
          } else if ((comboRes as any)?.error) {
            console.error('upsert-combo-from-analysis error:', (comboRes as any).error);
          } else {
            summary.combo_created++;
          }
        } catch (e) {
          console.error('Error invoking upsert-combo-from-analysis:', (e as any).message || e);
        }
        // Avoid creating duplicate item products or combos here; the edge function handles it
        continue;
      }
      
      // 1. Collect Category and Type data for batch upsert later (always runs — creates new categories/types if needed)
      {
        const normalizedCategoryName = toTitleCase(categoryName);
        const normalizedTypeName = toTitleCase(typeName);
        
        if (!categoriesToUpsert.has(normalizedCategoryName)) {
            // We don't know the ID yet, we'll fetch/create it later
            categoriesToUpsert.set(normalizedCategoryName, { id: '', name: normalizedCategoryName });
        }

        // Convert specifications and options into the 'attributes' array format for type upsert
        const attributesForTypeUpsert = [];
        
        // Add specifications (fixed details)
        if (specifications) {
            for (const [name] of Object.entries(specifications)) {
                attributesForTypeUpsert.push({ name, inputType: 'text', isOption: false });
            }
        }
        
        // Add options (variants)
        if (options) {
            for (const [name, values] of Object.entries(options)) {
                let inputType = 'text';
                if (name.toLowerCase().includes('color')) inputType = 'color';
                else if (Array.isArray(values) && values.length > 0) inputType = 'tags';
                
                attributesForTypeUpsert.push({ name, inputType, isOption: true, possibleValues: values });
            }
        }
        
        // Store type data, linking it by name to the category
        typesToUpsert.set(`${normalizedCategoryName}:${normalizedTypeName}`, { 
            categoryId: '', // Will be filled later
            name: normalizedTypeName, 
            attributes: attributesForTypeUpsert 
        });
      }

      for (const item of itemsToCreate) {
        const itemName = item ? item.productName || item.name || productInfo.productName : productInfo.productName;
        const itemPrice = item && typeof item.price === 'number' ? item.price : productInfo.price;
        const itemCurrency = (item && item.currency) ? item.currency : productInfo.currency;
        const itemInventory = item && typeof item.inventory === 'number' ? item.inventory : aiInventory;
        // Normalize item specs (handle array or object format)
        let itemSpecifications = item && item.specifications ? item.specifications : specifications;
        if (Array.isArray(itemSpecifications)) {
          const normalized: Record<string, any> = {};
          for (const spec of itemSpecifications) {
            if (spec && spec.key) normalized[spec.key] = spec.value || '';
          }
          itemSpecifications = normalized;
        }
        const itemOptions = item && item.options ? item.options : options;
        const itemCategoryName = categoryName || 'Generic Product';
        const itemTypeName = typeName || 'Generic';

        // 2. Construct the new 'details' object for the product table
        const details: { [key: string]: any } = { type: toTitleCase(itemTypeName || '') };
        if (itemSpecifications) {
          for (const [key, value] of Object.entries(itemSpecifications)) {
            details[key] = value as any;
          }
        }
        if (itemOptions) {
          for (const [key, value] of Object.entries(itemOptions)) {
            details[key] = value as any;
          }
        }

        // Brand inference
        const hasBrand = Object.keys(details).some(k => k.toLowerCase() === 'brand');
        if (!hasBrand) {
          const inferred = inferBrand(itemName, productInfo.tags);
          if (inferred) details['Brand'] = inferred;
        }

        // Determine pricing and inventory
        const finalPricingType = pricingType || 'one_time';
        const finalBillingInterval = finalPricingType === 'subscription' ? (billingInterval || 'month') : null;
        const inventory = finalPricingType === 'subscription' ? 0 : (itemInventory ?? 10);

        // Convert to ALL
        let priceInALL = itemPrice ?? 0;
        if (itemPrice && itemCurrency && itemCurrency !== 'ALL') {
          priceInALL = await convertCurrencyServer(itemPrice, itemCurrency, 'ALL');
        }

        const productPayload: ProductPayload = {
          name: itemName,
          caption: (productInfo as any).description || post.caption || '',
          price: priceInALL,
          currency: 'ALL',
          tags: (productInfo as any).tags || [],
          category: toTitleCase(itemCategoryName || ''),
          details: details,
          business_id: (business as any).id,
          user_id: user.id,
          status: inventory === 0 ? 'Out of Stock' : 'Draft',
          instagram_post_id: post.id,
          media_url: post.media_url,
          thumbnail_url: post.thumbnail_url || post.media_url,
          media_type: post.media_type,
          inventory: inventory,
          pricing_type: finalPricingType,
          billing_interval: finalBillingInterval,
        };

        // If a single existing product was mapped to this post, update just the first
        const existingId = existingProductMap.get(post.id);
        if (existingId && itemsToCreate.length === 1) {
          productPayload.id = existingId;
          summary.updated++;
          summary.updated_items.push(productPayload);
        } else {
          productPayload.product_type = 'physical';
          summary.created++;
          summary.created_items.push(productPayload);
        }
        productsToUpsert.push(productPayload);

        // Track for combo creation
        const list = multiItemMap.get(post.id) || [];
        list.push({ name: itemName || 'Item', priceALL: priceInALL });
        multiItemMap.set(post.id, list);
      }

      // Prefer explicit options; otherwise, derive from array-valued specifications
      const derivedFromSpecs: Record<string, string[]> = {};
      if (!options || Object.keys(options || {}).length === 0) {
        if (specifications && typeof specifications === 'object') {
          for (const [k, v] of Object.entries(specifications)) {
            if (Array.isArray(v) && v.length > 0) {
              const stringVals = v.map(x => String(x).trim()).filter(Boolean);
              if (stringVals.length > 0) derivedFromSpecs[k] = stringVals;
            }
          }
        }
      }
      const finalOptions = (options && Object.keys(options).length > 0)
        ? (options as Record<string, string[]>)
        : derivedFromSpecs;
      if (finalOptions && Object.keys(finalOptions).length > 0) {
        // Store options by instagram_post_id for variant creation after upsert
        postOptionsMap.set(post.id, finalOptions);
      }
    }
    
    // --- Step 3: Batch Upsert Categories and Types ---
    await updateJobProgress(supabaseAdmin, jobId, { message: `Updating categories and types...` });
    
    // Upsert Categories
    for (const [name] of categoriesToUpsert.entries()) {
        try {
            const id = await upsertCategory(supabaseAdmin, name, user.id);
            categoriesToUpsert.get(name)!.id = id;
        } catch (e) {
            console.error(`Failed to upsert category ${name}:`, e.message);
        }
    }

    // Upsert Types
    for (const [key, typeData] of typesToUpsert.entries()) {
        const [categoryName, typeName] = key.split(':');
        const categoryId = categoriesToUpsert.get(categoryName)?.id;
        if (categoryId) {
            try {
                await upsertTypeAndMergeAttributes(supabaseAdmin, categoryId, typeName, typeData.attributes, user.id);
            } catch (e: any) {
                console.error(`Failed to upsert type ${typeName} in category ${categoryName}:`, e.message);
            }
        }
    }

    // --- Step 4: Batch Upsert Products ---
    await updateJobProgress(supabaseAdmin, jobId, { message: `Saving ${productsToUpsert.length} products...` });
    if (productsToUpsert.length > 0) {
      const { error: upsertError } = await supabaseAdmin.from('products').upsert(productsToUpsert);
      if (upsertError) {
        console.error("CRITICAL: Failed to upsert products batch:", upsertError);
        throw upsertError;
      }
      // Build variants for products with options
      const postIds = Array.from(postOptionsMap.keys());
      if (postIds.length > 0) {
        const { data: productsForVariants, error: fetchErr } = await supabaseAdmin
          .from('products')
          .select('id, instagram_post_id')
          .in('instagram_post_id', postIds);
        if (fetchErr) throw fetchErr;
        for (const p of productsForVariants || []) {
          const aiOpts = postOptionsMap.get(p.instagram_post_id);
          if (aiOpts) {
            try {
              await upsertVariantsFromOptions(supabaseAdmin, p.id, aiOpts);
            } catch (e) {
              console.error(`Failed to upsert variants for product ${p.id}:`, (e as any).message || e);
            }
          }
        }
      }

      // Run spec waterfall for all upserted products
      const allUpsertedPostIds = productsToUpsert.map(p => p.instagram_post_id).filter(Boolean) as string[];
      if (allUpsertedPostIds.length > 0) {
        const { data: upsertedProducts } = await supabaseAdmin
          .from('products')
          .select('id, name, category, instagram_post_id')
          .in('instagram_post_id', allUpsertedPostIds);
        for (const createdProduct of upsertedProducts || []) {
          const postAnalysis = analysisFromCache.get(createdProduct.instagram_post_id);
          const postCaption = postsToProcess.find(p => p.id === createdProduct.instagram_post_id)?.caption;
          try {
            await supabaseAdmin.functions.invoke('find-product-specs', {
              body: {
                product_id: createdProduct.id,
                product_name: createdProduct.name,
                category: createdProduct.category || postAnalysis?.categoryName,
                type: postAnalysis?.typeName,
                user_id: user.id,
                caption: postCaption || ''
              }
            });
          } catch (e) {
            console.error('find-product-specs failed for', createdProduct.name, e);
          }
        }
      }
    }

    // --- Step 5: Create Combo Products for multi-item posts ---
    for (const [postId, items] of multiItemMap.entries()) {
      if (!items || items.length < 2) continue;
      try {
        // Ensure a combo_products row exists per instagram_post_id
        const { data: existingCombo } = await supabaseAdmin
          .from('combo_products')
          .select('id')
          .eq('instagram_post_id', postId)
          .maybeSingle();
        let comboId = existingCombo?.id;
        if (!comboId) {
          const { data: insertedCombo } = await supabaseAdmin
            .from('combo_products')
            .insert({ instagram_post_id: postId, user_id: user.id, business_id: (await supabaseAdmin.from('businesses').select('id').eq('user_id', user.id).single()).data.id })
            .select('id')
            .single();
          comboId = insertedCombo?.id;
        }
        if (!comboId) continue;
        // Upsert combo_items
        let order = 0;
        for (const it of items) {
          await supabaseAdmin.from('combo_items').insert({
            combo_id: comboId,
            item_name: it.name,
            base_price: it.priceALL ?? null,
            required: false,
            min_qty: 0,
            max_qty: 1,
            display_order: order++
          });
        }
      } catch (e: any) {
        console.error('Failed to create combo for post', postId, e.message || e);
      }
    }

    // --- Step 6: Insert Promotions and Announcements (best-effort) ---
    if (promotionsToInsert.length > 0) {
      try {
        const { data: businessData } = await supabaseAdmin.from('businesses').select('id').eq('user_id', user.id).single();
        const businessId = businessData?.id;

        if (businessId) {
          // Insert promotions
          const promotionsPayload = promotionsToInsert.map(p => ({
            user_id: user.id,
            business_id: businessId,
            title: p.title,
            summary: p.summary,
            discount_type: p.discount_type,
            discount_value: p.discount_value,
            currency: p.currency,
            valid_until: p.valid_until,
            instagram_post_id: p.post_id,
          }));
          const { data: insertedPromos } = await supabaseAdmin.from('promotions').insert(promotionsPayload).select('id, title');
          if (insertedPromos && insertedPromos.length > 0) {
            const announcements = insertedPromos.map((pr: any) => ({
              user_id: user.id,
              business_id: businessId,
              title: pr.title,
              message: 'New promotion: ' + pr.title,
              promotion_id: pr.id,
              status: 'active',
            }));
            await supabaseAdmin.from('storefront_announcements').insert(announcements);
          }
        }
      } catch (e: any) {
        console.error('Failed to insert promotions/announcements (missing tables or RLS?):', e.message || e);
      }
    }

    const finalMessage = `Sync complete. Created ${summary.created}, updated ${summary.updated}, skipped ${summary.skipped}, combos ${summary.combo_created}.`;
    await updateJobProgress(supabaseAdmin, jobId, { status: 'completed', progress: total, total, message: finalMessage, summary });

  } catch (error: any) {
    console.error('Background Sync Error:', error.message);
    await updateJobProgress(supabaseAdmin, jobId, { status: 'failed', message: error.message, summary });
  }
};
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    
    // Guard JSON parsing
    let syncType = 'quick';
    try {
      const body = await req.json();
      syncType = body?.syncType || 'quick';
    } catch (e) {
      console.warn('Could not parse JSON body, defaulting to quick sync');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Ensure the sync_jobs table exists and is accessible
    const { data: job, error: jobError } = await supabaseAdmin
      .from('sync_jobs')
      .insert({ 
        user_id: user.id, 
        status: 'starting', 
        message: 'Initiating sync...' 
      })
      .select('id')
      .single();

    if (jobError) {
      console.error('Error creating sync job:', jobError);
      return new Response(JSON.stringify({ error: `Failed to create sync job: ${jobError.message}` }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // Run the sync process asynchronously
    // Use setTimeout to ensure the response is returned immediately while the process continues
    (async () => {
      try {
        await syncProcess(supabaseAdmin, { ...user, token }, job.id, syncType as 'quick' | 'full');
      } catch (e) {
        console.error('Background sync process failed:', e);
      }
    })();

    return new Response(JSON.stringify({ jobId: job.id }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error: unknown) {
    console.error('Outer handler error:', (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});