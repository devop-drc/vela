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

// Cache exchange rates - fetched once per sync, used for all conversions
let cachedExchangeRates: Record<string, number> | null = null;

const fetchExchangeRates = async (supabaseAdmin: SupabaseClient): Promise<Record<string, number>> => {
  if (cachedExchangeRates) return cachedExchangeRates;
  const { data, error } = await supabaseAdmin.functions.invoke('exchange-rates');
  if (error || data?.error || !data?.rates) {
    console.error("Failed to fetch exchange rates:", error || data?.error);
    cachedExchangeRates = { ALL: 1, EUR: 0.0094, USD: 0.01 }; // Safe fallback
    return cachedExchangeRates;
  }
  cachedExchangeRates = data.rates;
  return cachedExchangeRates;
};

const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string = 'ALL'): number => {
  if (fromCurrency === toCurrency || !cachedExchangeRates) return amount;
  const fromRate = cachedExchangeRates[fromCurrency];
  const toRate = cachedExchangeRates[toCurrency];
  if (!fromRate || !toRate) return amount;
  return Math.round((amount * (toRate / fromRate)) * 100) / 100;
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

const upsertOptionValue = async (supabase: SupabaseClient, optionId: string, value: string, priceDifference: number = 0, inventory: number = 10) => {
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
    .insert({ option_id: optionId, value: val, is_active: true, price_difference: priceDifference, inventory })
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
      let val: string;
      let priceDiff = 0;
      let optInventory = 10;

      if (typeof raw === 'object' && raw !== null) {
        val = String(raw.value || raw).trim();
        priceDiff = raw.price_difference || 0;
        optInventory = raw.inventory || 10;
      } else {
        val = String(raw).trim();
      }

      const id = await upsertOptionValue(supabase, optionIds[i], val, priceDiff, optInventory);
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
    await updateJobProgress(supabaseAdmin, jobId, { progress: 0, total: 0, message: "Starting sync...", status: 'in_progress', summary });

    const { data: business, error: businessError } = await supabaseAdmin.from('businesses').select('id').eq('user_id', user.id).single();
    if (businessError || !business) throw new Error("Could not find business profile.");

    await fetchExchangeRates(supabaseAdmin);

    await updateJobProgress(supabaseAdmin, jobId, { message: "Fetching Instagram posts...", summary });

    const { data: postsData, error: postsError } = await supabaseAdmin.functions.invoke('instagram-posts', { headers: { Authorization: `Bearer ${user.token}` }, body: { skip_upload: true } });
    if (postsError) throw postsError;
    if (postsData.error) throw new Error(postsData.error);

    const allPosts: InstagramPost[] = postsData.posts || [];
    if (allPosts.length === 0) {
      await updateJobProgress(supabaseAdmin, jobId, { status: 'completed', message: 'No posts found to sync.', summary });
      return;
    }

    await updateJobProgress(supabaseAdmin, jobId, { message: `Found ${allPosts.length} posts. Checking for new content...`, summary });

    const { data: existingProducts, error: productsError } = await supabaseAdmin.from('products').select('id, instagram_post_id').eq('business_id', business.id);
    if (productsError) throw productsError;
    const existingProductMap = new Map((existingProducts || []).map(p => [p.instagram_post_id, p.id]));

    // Also fetch existing combos to decide if a post needs processing for multi-products
    const { data: existingCombos } = await supabaseAdmin
      .from('combo_products')
      .select('instagram_post_id');
    const comboPostIds = new Set((existingCombos || []).map((c: any) => c.instagram_post_id));

    // In quick sync: only process posts that don't have a product yet
    const postsToProcess: InstagramPost[] = syncType === 'quick'
      ? allPosts.filter(p => !existingProductMap.has(p.id))
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

    // --- Helper functions (defined before batch loop) ---
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

    // --- Process posts in batches (analyze → create products → update live feed) ---
    const BATCH_SIZE = 5;
    const allProductsCreated: string[] = []; // track for spec waterfall at end
    const promotionsToInsert: Array<{ title: string; summary: string; discount_type?: 'percent'|'amount'|null; discount_value?: number|null; currency?: string|null; valid_until?: string|null; post_id: string }>
      = [];

    for (let batchStart = 0; batchStart < postsToProcess.length; batchStart += BATCH_SIZE) {
      const batch = postsToProcess.slice(batchStart, batchStart + BATCH_SIZE);
      const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(postsToProcess.length / BATCH_SIZE);

      // --- a) AI Analyze this batch ---
      // Filter batch into cached vs needs-analysis
      const batchCached: Array<{post: InstagramPost, analysis: AnalysisResult}> = [];
      const batchNeedsAnalysis: Array<InstagramPost & {captionHash: string, captionInsufficient: boolean}> = [];

      for (const post of batch) {
        const captionInsufficient = isCaptionInsufficient(post.caption ?? null);
        const captionHash = await sha256(post.caption || post.id);
        const cached = cacheMap.get(post.id);

        if (cached && cached.caption_hash === captionHash) {
          batchCached.push({post, analysis: cached.analysis_result});
          summary.cache_hits++;
        } else {
          // Check global intelligence
          const heuristicResult = heuristicParse(post.caption || '');
          const extractedName = extractProductName(post.caption || null);
          let usedGlobal = false;
          if (heuristicResult && extractedName && heuristicResult.productName && typeof heuristicResult.price === 'number' && heuristicResult.currency) {
            const normalized = normalizeProductName(extractedName);
            const { data: globalMatch } = await supabaseAdmin.from('global_product_intelligence').select('*')
              .eq('normalized_name', normalized).gte('confidence', 0.7).order('confidence', { ascending: false }).limit(1);
            if (globalMatch?.length > 0) {
              const intel = globalMatch[0];
              batchCached.push({post, analysis: { isProductPost: true, productName: heuristicResult.productName, price: heuristicResult.price, currency: heuristicResult.currency, inventory: heuristicResult.inventory, categoryName: intel.category_name, typeName: intel.type_name, description: intel.description || post.caption, tags: intel.tags || [], specifications: intel.specifications, options: intel.options, pricingType: 'one_time', billingInterval: null } as AnalysisResult});
              summary.cache_hits++;
              usedGlobal = true;
            }
          }
          if (!usedGlobal) {
            batchNeedsAnalysis.push({ ...post, captionHash, captionInsufficient });
          }
        }
      }

      // Run AI on posts that need it (parallel within batch)
      await updateJobProgress(supabaseAdmin, jobId, {
        progress: batchStart, total: postsToProcess.length,
        message: `Batch ${batchNum}/${totalBatches}: analyzing ${batchNeedsAnalysis.length} posts...`,
        thumbnail_url: batch[0]?.thumbnail_url || batch[0]?.media_url,
        summary
      });

      const aiResults = await Promise.all(
        batchNeedsAnalysis.map(post =>
          supabaseAdmin.functions.invoke('ai-product-classifier', {
            body: { caption: post.caption || '', user_id: user.id, include_images: post.captionInsufficient, post_media: { media_url: post.media_url, thumbnail_url: post.thumbnail_url, media_type: post.media_type, post_id: post.id }, access_token: accessToken }
          })
            .then(({data, error}) => ({post, analysis: data as AnalysisResult, error}))
            .catch(error => ({post, analysis: null as any, error}))
        )
      );

      // Process AI results + cached results for this batch
      const batchAnalyzed: Array<{post: InstagramPost, analysis: AnalysisResult}> = [...batchCached];
      const newCacheEntries: any[] = [];

      for (const {post, analysis, error} of aiResults) {
        let effective = normalizeAnalysis(analysis, post.caption);
        if (error || !effective) {
          const hasPriceSignal = /\b(ALL|EUR|USD|GBP|Lek|Lekë)\b|\d+[\.,]?\d*\s?(ALL|EUR|USD|GBP)/i.test(post.caption || '');
          if (hasPriceSignal) {
            effective = { isProductPost: true, productName: post.caption?.split('\n')[0]?.slice(0, 40) || 'Product' };
          } else {
            summary.skipped++;
            summary.skipped_items.push({ name: `"${post.caption?.substring(0, 30) || ''}..."`, reason: error?.message || "Analysis failed.", thumbnail_url: post.thumbnail_url || post.media_url });
            continue;
          }
        }
        if (analysis?.tokenUsage) {
          summary.total_ai_tokens_used.prompt += analysis.tokenUsage.promptTokenCount || 0;
          summary.total_ai_tokens_used.candidates += analysis.tokenUsage.candidatesTokenCount || 0;
        }
        batchAnalyzed.push({post, analysis: effective});
        newCacheEntries.push({ instagram_post_id: post.id, user_id: user.id, caption_hash: (post as any).captionHash, analysis_result: effective });
      }

      // Save cache entries
      if (newCacheEntries.length > 0) {
        await supabaseAdmin.from('ai_analysis_cache').upsert(newCacheEntries);
      }

      // --- b) Build product payloads from this batch ---
      const batchProducts: ProductPayload[] = [];
      const batchOptionsMap = new Map<string, Record<string, string[]>>();

      for (const {post, analysis: rawAnalysis} of batchAnalyzed) {
        const analysis = normalizeAnalysis(rawAnalysis, post.caption);
        if (!analysis) continue;

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
            (analysis as any).isProductPost = true;
            (analysis as any).products = parsed;
          } else {
            summary.skipped++;
            summary.skipped_items.push({ name: `"${post.caption?.substring(0, 30) || ''}..."`, reason: "Not a product post.", thumbnail_url: post.thumbnail_url || post.media_url });
            continue;
          }
        }

        // Extract fields directly
        const categoryName = analysis.categoryName || (analysis as any).category_name || 'Uncategorized';
        const typeName = analysis.typeName || (analysis as any).type_name || 'General';
        const aiDescription = analysis.description || (analysis as any).desc || null;
        const aiTags = analysis.tags || [];
        const aiProductName = analysis.productName || (analysis as any).product_name || null;
        const aiPrice = analysis.price;
        const aiCurrency = analysis.currency || 'ALL';
        const pricingType = analysis.pricingType || (analysis as any).pricing_type || 'one_time';
        const billingInterval = analysis.billingInterval || (analysis as any).billing_interval || null;
        const aiInventory = analysis.inventory;
        const rawSpecifications = analysis.specifications;
        const options = analysis.options;

        // Normalize specifications
        let specifications: Record<string, any> | undefined;
        if (Array.isArray(rawSpecifications)) {
          specifications = {};
          for (const spec of rawSpecifications) {
            if (spec && spec.key) specifications[spec.key] = spec.value || '';
          }
        } else if (rawSpecifications && typeof rawSpecifications === 'object') {
          specifications = rawSpecifications as Record<string, any>;
        }

        // If AI returned products array (multi-product), expand them; otherwise, try parser; else fall back to single product
        const multiProducts: Array<any> = (analysis as any).products && Array.isArray((analysis as any).products)
          ? (analysis as any).products
          : [];
        const parsedProducts = multiProducts.length === 0 ? parseMultiProducts(post.caption) : [];
        const itemsToCreate = multiProducts.length > 0 ? multiProducts : parsedProducts.length > 0 ? parsedProducts : [null];

        // If multiple items were detected (AI or parser), call the dedicated Edge Function to upsert the combo fully
        if ((analysis as any).isMultiProductPost === true || itemsToCreate.filter(Boolean).length > 1) {
          try {
            const enrichedAnalysis: any = { ...analysis, products: itemsToCreate };
            const { error: comboErr, data: comboRes } = await supabaseAdmin.functions.invoke('upsert-combo-from-analysis', {
              body: { instagram_post_id: post.id, user_id: user.id, analysis: enrichedAnalysis },
            });
            if (comboErr) {
              console.error('upsert-combo-from-analysis failed:', comboErr.message);
              summary.skipped++;
              summary.skipped_items.push({ name: `Multi-product: "${post.caption?.substring(0, 30) || ''}..."`, reason: `Combo creation failed: ${comboErr.message}`, thumbnail_url: post.thumbnail_url || post.media_url });
            } else if ((comboRes as any)?.error) {
              console.error('upsert-combo-from-analysis error:', (comboRes as any).error);
            } else {
              summary.combo_created++;
            }
          } catch (e) {
            console.error('Error invoking upsert-combo-from-analysis:', (e as any).message || e);
          }
          continue;
        }

        // Details JSONB only stores type + brand (specs go to product_specifications, options go to product_options)

        for (const item of itemsToCreate) {
          const itemName = item ? item.productName || item.name || aiProductName : aiProductName;
          const itemPrice = item && typeof item.price === 'number' ? item.price : aiPrice;
          const itemCurrency = (item && item.currency) ? item.currency : aiCurrency;
          const itemInventory = item && typeof item.inventory === 'number' ? item.inventory : aiInventory;
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

          // Details only stores type + brand (specs → product_specifications table, options → product_options table)
          const itemDetails: { [key: string]: any } = { type: toTitleCase(itemTypeName || '') };
          const inferred = inferBrand(itemName, aiTags);
          if (inferred) itemDetails['Brand'] = inferred;

          const finalPricingType = pricingType || 'one_time';
          const finalBillingInterval = finalPricingType === 'subscription' ? (billingInterval || 'month') : null;
          const inventory = finalPricingType === 'subscription' ? 0 : (itemInventory ?? 10);

          let priceInALL = itemPrice ?? 0;
          if (itemPrice && itemCurrency && itemCurrency !== 'ALL') {
            priceInALL = convertCurrency(itemPrice, itemCurrency, 'ALL');
          }

          const productPayload: ProductPayload = {
            name: itemName || post.caption?.split('\n')[0]?.slice(0, 60) || 'Product',
            caption: aiDescription || post.caption || '',
            price: priceInALL,
            currency: 'ALL',
            tags: aiTags || [],
            category: toTitleCase(itemCategoryName || ''),
            details: itemDetails,
            business_id: business.id,
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
          batchProducts.push(productPayload);
        }

        // Track options for variant creation
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
          batchOptionsMap.set(post.id, finalOptions);
        }

        // Upsert category/type immediately for this batch
        const normCat = toTitleCase(categoryName);
        const normType = toTitleCase(typeName);
        try {
          const catId = await upsertCategory(supabaseAdmin, normCat, user.id);
          const attrList: any[] = [];
          if (specifications) for (const [name] of Object.entries(specifications)) attrList.push({ name, inputType: 'text', isOption: false });
          if (options) for (const [name, vals] of Object.entries(options)) attrList.push({ name, inputType: name.toLowerCase().includes('color') ? 'color' : 'tags', isOption: true, possibleValues: vals });
          await upsertTypeAndMergeAttributes(supabaseAdmin, catId, normType, attrList, user.id);
        } catch (e: any) { console.error('Category/type upsert failed:', e.message); }
      }

      // --- c) Upsert this batch's products ---
      if (batchProducts.length > 0) {
        const { error: upsertErr } = await supabaseAdmin.from('products').upsert(batchProducts, { onConflict: 'instagram_post_id,user_id' });
        if (upsertErr) console.error('Batch product upsert failed:', upsertErr);

        // Track for spec waterfall
        for (const p of batchProducts) if (p.instagram_post_id) allProductsCreated.push(p.instagram_post_id);

        // --- d) Create variants for this batch ---
        const postIds = Array.from(batchOptionsMap.keys());
        if (postIds.length > 0) {
          const { data: prods } = await supabaseAdmin.from('products').select('id, instagram_post_id').in('instagram_post_id', postIds);
          const variantPromises = (prods || []).filter(p => batchOptionsMap.has(p.instagram_post_id)).map(p =>
            upsertVariantsFromOptions(supabaseAdmin, p.id, batchOptionsMap.get(p.instagram_post_id)!)
              .catch(e => console.error('Variant upsert failed:', e))
          );
          await Promise.allSettled(variantPromises);
        }
      }

      // --- e) Update live feed with this batch's results ---
      await updateJobProgress(supabaseAdmin, jobId, {
        progress: batchStart + batch.length, total: postsToProcess.length,
        message: `Batch ${batchNum}/${totalBatches} done — ${summary.created} created, ${summary.updated} updated, ${summary.skipped} skipped`,
        summary
      });
    }

    // --- After all batches: run spec waterfall in parallel (non-blocking) ---
    if (allProductsCreated.length > 0) {
      await updateJobProgress(supabaseAdmin, jobId, { message: `Finding specifications for ${allProductsCreated.length} products...`, summary });
      const { data: allProds } = await supabaseAdmin.from('products').select('id, name, category, instagram_post_id').in('instagram_post_id', allProductsCreated);
      if (allProds?.length) {
        const specPromises = allProds.map(p =>
          supabaseAdmin.functions.invoke('find-product-specs', {
            body: { product_id: p.id, product_name: p.name, category: p.category, user_id: user.id, caption: postsToProcess.find(pp => pp.id === p.instagram_post_id)?.caption || '' }
          }).catch(e => console.error('Spec waterfall failed for', p.name, e))
        );
        await Promise.allSettled(specPromises);
      }
    }

    // --- Insert Promotions and Announcements (best-effort) ---
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
    const errorMsg = error?.message || String(error);
    console.error('Background Sync Error:', errorMsg, error?.stack || '');
    try {
      await updateJobProgress(supabaseAdmin, jobId, { status: 'failed', message: `Sync failed: ${errorMsg}`, summary });
    } catch (e) {
      console.error('Failed to update job with error status:', e);
    }
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
      console.error('No Authorization header received. Headers:', JSON.stringify(Object.fromEntries(req.headers.entries())));
      return new Response(JSON.stringify({ error: 'Missing Authorization header. Please log out and log back in.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth failed:', authError?.message, 'Token prefix:', token.substring(0, 20) + '...');
      return new Response(JSON.stringify({ error: `Authentication failed: ${authError?.message || 'Invalid token'}. Please log out and log back in.` }), {
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