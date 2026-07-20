import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";
import { isCaptionInsufficient, extractProductName, normalizeProductName, heuristicParse } from "../_shared/heuristics.ts";
import { toTitleCase, upsertCategory, upsertTypeAndMergeAttributes, upsertVariantsFromOptions, ensureCategoryAndType } from "../_shared/catalog.ts";
import { invalidateShopCache } from "../_shared/cache.ts";

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
  productNameSq?: string;
  description?: string;
  descriptionSq?: string;
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
  /** Per-locale overrides for customer-facing text: { sq: { name, caption } } */
  translations?: { [locale: string]: { name?: string; caption?: string } };
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

const fileExt = (url: string): string => {
  const clean = url.split('?')[0];
  const parts = clean.split('.');
  const ext = parts.length > 1 ? parts.pop() : '';
  return (ext && ext.length <= 5) ? ext.toLowerCase() : 'jpg';
};

// Uploads Instagram CDN media to Supabase storage so URLs don't expire.
// Returns { media_url, thumbnail_url } with permanent storage URLs (or originals if upload fails).
const persistPostMedia = async (
  supabase: SupabaseClient,
  userId: string,
  post: { id: string; media_url: string; thumbnail_url?: string; media_type: string }
): Promise<{ media_url: string; thumbnail_url?: string }> => {
  const uploadOne = async (sourceUrl: string, kind: 'media' | 'thumbnail'): Promise<string | null> => {
    if (!sourceUrl) return null;
    try {
      // Hard timeout: a stalled Instagram CDN download (especially large video
      // files) used to hang the whole sync for minutes with zero progress.
      // On timeout we keep the CDN URL — refresh-product-media can re-persist later.
      const isVideoFile = post.media_type === 'VIDEO' && kind === 'media';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), isVideoFile ? 20000 : 12000);
      let resp: Response;
      try {
        resp = await fetch(sourceUrl, { signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
      if (!resp.ok) {
        console.warn(`[persistPostMedia] fetch ${kind} failed ${resp.status} for post ${post.id}`);
        return null;
      }
      const blob = await resp.blob();
      const path = `${userId}/${post.id}/${kind}_${Date.now()}.${fileExt(sourceUrl)}`;
      const { error: upErr } = await supabase.storage
        .from('product-media')
        .upload(path, blob, {
          contentType: resp.headers.get('content-type') || 'image/jpeg',
          // Paths are timestamped (immutable), so cache long-term in the browser
          // — synced product images then reload instantly on repeat visits.
          cacheControl: '31536000',
          upsert: true,
        });
      if (upErr) {
        console.warn(`[persistPostMedia] upload ${kind} failed for post ${post.id}:`, upErr.message);
        return null;
      }
      return supabase.storage.from('product-media').getPublicUrl(path).data.publicUrl;
    } catch (err: any) {
      console.warn(`[persistPostMedia] error ${kind} for post ${post.id}:`, err?.message);
      return null;
    }
  };

  let mediaUrl = post.media_url;
  let thumbUrl = post.thumbnail_url;

  if (post.media_type === 'VIDEO') {
    const [m, t] = await Promise.all([
      post.media_url ? uploadOne(post.media_url, 'media') : Promise.resolve(null),
      post.thumbnail_url ? uploadOne(post.thumbnail_url, 'thumbnail') : Promise.resolve(null),
    ]);
    if (m) mediaUrl = m;
    if (t) thumbUrl = t;
  } else {
    const m = await uploadOne(post.media_url, 'media');
    if (m) {
      mediaUrl = m;
      thumbUrl = m;
    }
  }

  return { media_url: mediaUrl, thumbnail_url: thumbUrl };
};

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


const updateJobProgress = async (supabase: SupabaseClient, jobId: string, update: Partial<any>): Promise<void> => {
  const payload = { ...update, updated_at: new Date().toISOString() };
  // Interim progress writes carry only the summary COUNTERS — the item arrays
  // grow with every processed post, and rewriting the full jsonb dozens of
  // times per sync was a major disk-IO drain. Terminal writes keep everything.
  const terminal = update.status === 'completed' || update.status === 'failed';
  if (payload.summary && !terminal) {
    const { skipped_items: _s, created_items: _c, updated_items: _u, ...counters } = payload.summary;
    payload.summary = counters;
  }
  await supabase.from('sync_jobs').update(payload).eq('id', jobId);
};

// Main Sync Logic
const syncProcess = async (supabaseAdmin: SupabaseClient, user: { id: string; token?: string }, jobId: string, syncType: 'quick' | 'full') => {
  const summary = {
    created: 0, updated: 0, skipped: 0, cache_hits: 0,
    combo_created: 0,
    skipped_items: [] as { name: string; reason: string; thumbnail_url?: string }[],
    created_items: [] as ProductPayload[],
    updated_items: [] as ProductPayload[],
    total_ai_tokens_used: { prompt: 0, candidates: 0 },
  };

  // Per-run caches: many products share a category/type, and re-reading and
  // re-writing the same categories/types/templates rows for every product was
  // a large share of the sync's disk IO. Rows are touched again only when a
  // product introduces attribute/spec keys not yet seen this run.
  const categoryIdCache = new Map<string, string>();
  const ensuredTypeAttrs = new Map<string, Set<string>>();
  const mergedTemplateKeys = new Map<string, Set<string>>();

  try {
    await updateJobProgress(supabaseAdmin, jobId, { progress: 0, total: 0, message: "Starting sync...", status: 'in_progress', summary });

    const { data: business, error: businessError } = await supabaseAdmin.from('businesses').select('id').eq('user_id', user.id).single();
    if (businessError || !business) throw new Error("Could not find business profile.");

    await fetchExchangeRates(supabaseAdmin);

    await updateJobProgress(supabaseAdmin, jobId, { message: "Fetching Instagram posts...", summary });

    // Existing products are loaded BEFORE the Graph API fetch so quick syncs
    // can pass `since` and skip re-paginating the merchant's entire history.
    const { data: existingProducts, error: productsError } = await supabaseAdmin.from('products').select('id, instagram_post_id, media_url, thumbnail_url, category, created_at').eq('business_id', business.id);
    if (productsError) throw productsError;
    const existingProductMap = new Map((existingProducts || []).map(p => [p.instagram_post_id, p]));

    // Quick syncs only need the diff: `since` = newest synced product's
    // created_at (always at/after its post's publish time, so no new post is
    // ever excluded). Full syncs re-fetch everything.
    let since: string | undefined;
    if (syncType === 'quick') {
      const newest = (existingProducts || [])
        .filter((p: any) => p.instagram_post_id && p.created_at)
        .reduce((max: number, p: any) => Math.max(max, new Date(p.created_at).getTime()), 0);
      if (newest > 0) since = new Date(newest).toISOString();
    }

    // User-initiated syncs carry the user's JWT; internal (webhook) syncs fall
    // back to the admin client's service-role auth + explicit user_id.
    const { data: postsData, error: postsError } = await supabaseAdmin.functions.invoke('instagram-posts', {
      ...(user.token ? { headers: { Authorization: `Bearer ${user.token}` } } : {}),
      body: { skip_upload: true, user_id: user.id, ...(since ? { since } : {}) },
    });
    if (postsError) throw postsError;
    if (postsData.error) throw new Error(postsData.error);

    const allPosts: InstagramPost[] = postsData.posts || [];
    if (allPosts.length === 0) {
      await updateJobProgress(supabaseAdmin, jobId, { status: 'completed', message: 'No posts found to sync.', summary });
      return;
    }

    await updateJobProgress(supabaseAdmin, jobId, { message: `Found ${allPosts.length} posts. Checking for new content...`, summary });

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

    // Content-addressable analysis cache: keyed by sha256(caption + keywords
    // hash) instead of instagram_post_id. Identical captions (restocks, repeat
    // promos) share one Gemini call, and a keyword edit changes the hash so
    // stale analyses miss naturally. caption_hash stores the content hash;
    // instagram_post_id stays populated for reference (it is the table's PK).
    const { data: keywordRows } = await supabaseAdmin.from('keywords').select('keyword, description').eq('user_id', user.id);
    const keywordsHash = await sha256(JSON.stringify(
      (keywordRows || []).map((k: any) => `${k.keyword}|${k.description ?? ''}`).sort()
    ));

    const { data: cacheEntries, error: cacheError } = await supabaseAdmin.from('ai_analysis_cache').select('*').eq('user_id', user.id);
    if (cacheError) throw cacheError;
    const cacheMap = new Map<string, any>((cacheEntries || []).map((entry: any) => [entry.caption_hash, entry]));

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
    const BATCH_SIZE = 8;
    const allProductsCreated: string[] = []; // track for spec waterfall at end
    const promotionsToInsert: Array<{ title: string; summary: string; discount_type?: 'percent'|'amount'|null; discount_value?: number|null; currency?: string|null; valid_until?: string|null; post_id: string }>
      = [];

    for (let batchStart = 0; batchStart < postsToProcess.length; batchStart += BATCH_SIZE) {
      // Honor a user abort: the widget's Abort button flips the job to
      // 'failed' — previously the server kept running to the end regardless.
      const { data: jobRow } = await supabaseAdmin.from('sync_jobs').select('status').eq('id', jobId).single();
      if (jobRow?.status === 'failed') {
        console.log(`Sync ${jobId} aborted by user — stopping.`);
        return;
      }

      const batch = postsToProcess.slice(batchStart, batchStart + BATCH_SIZE);
      const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(postsToProcess.length / BATCH_SIZE);

      // --- a) AI Analyze this batch ---
      // Filter batch into cached vs needs-analysis
      const batchCached: Array<{post: InstagramPost, analysis: AnalysisResult}> = [];
      const batchNeedsAnalysis: Array<InstagramPost & {contentHash: string, captionInsufficient: boolean}> = [];

      // A FULL sync is documented (and priced, in the UI hint) as "re-analyze
      // everything with AI" — it bypasses the global-intelligence shortcut.
      // The analysis cache, however, is now content-addressable (caption +
      // keywords hash): an unchanged caption with unchanged keywords is by
      // definition the same analysis, so full syncs reuse it too — any caption
      // or keyword change misses via the new hash and re-runs Gemini.
      const useGlobalShortcuts = syncType !== 'full';

      for (const post of batch) {
        const captionInsufficient = isCaptionInsufficient(post.caption ?? null);
        const contentHash = await sha256(`${post.caption || post.id}|${keywordsHash}`);
        const cached = cacheMap.get(contentHash);

        if (cached) {
          batchCached.push({post, analysis: cached.analysis_result});
          summary.cache_hits++;
        } else {
          // Check global intelligence
          const heuristicResult = heuristicParse(post.caption || '');
          const extractedName = extractProductName(post.caption || null);
          let usedGlobal = false;
          if (useGlobalShortcuts && heuristicResult && extractedName && heuristicResult.productName && typeof heuristicResult.price === 'number' && heuristicResult.currency) {
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
            batchNeedsAnalysis.push({ ...post, contentHash, captionInsufficient });
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

      // AI analysis with a hard timeout per post to prevent hanging. 45s covers
      // the classifier's own 25s budget plus one internal transient retry.
      const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
        Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`AI analysis timed out after ${ms/1000}s`)), ms))]);

      // Per-post progress ticks (throttled to ~1/s) so the widget's progress
      // bar and ETA move DURING a batch instead of jumping once per batch.
      let analyzedCount = batchCached.length;
      let lastTick = 0;
      const tickProgress = async () => {
        analyzedCount++;
        const now = Date.now();
        if (now - lastTick < 900) return;
        lastTick = now;
        const done = Math.min(batchStart + analyzedCount, postsToProcess.length);
        await updateJobProgress(supabaseAdmin, jobId, {
          progress: done, total: postsToProcess.length,
          message: `Analyzing posts… (${done}/${postsToProcess.length})`,
          summary,
        });
      };

      const aiResults = await Promise.all(
        batchNeedsAnalysis.map(post =>
          withTimeout(
            supabaseAdmin.functions.invoke('ai-product-classifier', {
              body: { caption: post.caption || '', user_id: user.id, include_images: post.captionInsufficient, post_media: { media_url: post.media_url, thumbnail_url: post.thumbnail_url, media_type: post.media_type, post_id: post.id }, access_token: accessToken }
            }),
            45000
          )
            .then(({data, error}: any) => ({post, analysis: data as AnalysisResult, error}))
            .catch(error => ({post, analysis: null as any, error}))
            .then(res => { tickProgress().catch(() => { /* progress is best-effort */ }); return res; })
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
        const entry = { instagram_post_id: post.id, user_id: user.id, caption_hash: (post as any).contentHash, analysis_result: effective };
        newCacheEntries.push(entry);
        // Also register in-memory so identical captions in later batches of
        // THIS run hit the cache instead of paying another Gemini call.
        cacheMap.set(entry.caption_hash, entry);
      }

      // Save cache entries
      if (newCacheEntries.length > 0) {
        await supabaseAdmin.from('ai_analysis_cache').upsert(newCacheEntries);
      }

      // Persist this batch's media in parallel, BEFORE the (serial) payload
      // build. Products that already carry a storage URL keep it — a full sync
      // used to re-upload every image with a fresh timestamped path, bloating
      // storage and slowing the run for nothing.
      const isPersistedUrl = (u?: string | null) => !!u && u.includes('/product-media/');
      const mediaByPost = new Map<string, { media_url: string; thumbnail_url?: string }>();
      await Promise.all(batchAnalyzed.map(async ({ post, analysis }) => {
        const a: any = analysis || {};
        const looksProductish = a.isProductPost || (Array.isArray(a.products) && a.products.length > 0);
        if (!looksProductish) return; // skipped posts shouldn't cost an upload
        const existing = existingProductMap.get(post.id);
        if (existing && isPersistedUrl(existing.media_url)) {
          mediaByPost.set(post.id, {
            media_url: existing.media_url,
            thumbnail_url: isPersistedUrl(existing.thumbnail_url) ? existing.thumbnail_url : existing.media_url,
          });
          return;
        }
        mediaByPost.set(post.id, await persistPostMedia(supabaseAdmin, user.id, {
          id: post.id, media_url: post.media_url, thumbnail_url: post.thumbnail_url, media_type: post.media_type,
        }));
      }));
      // Fallback for posts that become products later (e.g. via the caption parser).
      const mediaFor = async (post: InstagramPost): Promise<{ media_url: string; thumbnail_url?: string }> => {
        const hit = mediaByPost.get(post.id);
        if (hit) return hit;
        const persisted = await persistPostMedia(supabaseAdmin, user.id, {
          id: post.id, media_url: post.media_url, thumbnail_url: post.thumbnail_url, media_type: post.media_type,
        });
        mediaByPost.set(post.id, persisted);
        return persisted;
      };

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
          // Combo posts bail out of this loop before the per-product
          // category/type block below — ensure their category + type (and
          // attribute definitions) exist too.
          try {
            await ensureCategoryAndType(supabaseAdmin, user.id, categoryName, typeName, specifications, options);
          } catch (e: any) { console.error('Combo category/type upsert failed:', e.message); }
          try {
            // Give each split product its own image: carousel child i → item i
            // (multi-product posts are usually carousels with one photo per
            // product, in order), falling back to the post's main media.
            // Everything is persisted to storage so URLs don't expire.
            let childUrls: string[] = [];
            if (post.media_type === 'CAROUSEL_ALBUM' && accessToken) {
              try {
                const kidsRes = await fetch(`https://graph.instagram.com/${post.id}/children?fields=id,media_url,media_type,thumbnail_url&access_token=${accessToken}`);
                const kids = await kidsRes.json();
                childUrls = (kids.data || [])
                  .map((c: any) => (c.media_type === 'VIDEO' ? c.thumbnail_url : c.media_url))
                  .filter(Boolean);
              } catch { /* fall back to the main post media */ }
            }
            const mainMedia = await mediaFor(post);
            const itemsWithMedia = await Promise.all(itemsToCreate.filter(Boolean).map(async (it: any, i: number) => {
              if (it.media_url) return it;
              const childSrc = childUrls[i];
              if (childSrc) {
                const persisted = await persistPostMedia(supabaseAdmin, user.id, {
                  id: `${post.id}_item${i}`, media_url: childSrc, media_type: 'IMAGE',
                });
                return { ...it, media_url: persisted.media_url };
              }
              return { ...it, media_url: mainMedia.media_url };
            }));
            const enrichedAnalysis: any = { ...analysis, products: itemsWithMedia };
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
          const itemCategoryName = (item && ((item as any).categoryName || (item as any).category_name)) || categoryName;
          const itemTypeName = (item && ((item as any).typeName || (item as any).type_name)) || typeName || 'Generic';

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

          // Permanent storage URLs (persisted in parallel above, reused on update)
          const persisted = await mediaFor(post);

          // Albanian counterparts from the classifier → translations.sq
          // (base name/caption stay English-canonical; storefront picks by
          // visitor language with fallback).
          const itemNameSq = (item as any)?.productNameSq || (analysis as any).productNameSq || null;
          const descriptionSq = (analysis as any).descriptionSq || null;
          const translations = (itemNameSq || descriptionSq)
            ? { sq: { ...(itemNameSq ? { name: itemNameSq } : {}), ...(descriptionSq ? { caption: descriptionSq } : {}) } }
            : undefined;

          const productPayload: ProductPayload = {
            name: itemName || post.caption?.split('\n')[0]?.slice(0, 60) || 'Product',
            caption: aiDescription || post.caption || '',
            ...(translations ? { translations } : {}),
            price: priceInALL,
            currency: 'ALL',
            tags: aiTags || [],
            category: toTitleCase(itemCategoryName || ''),
            details: itemDetails,
            business_id: business.id,
            user_id: user.id,
            status: inventory === 0 ? 'Out of Stock' : 'Draft',
            instagram_post_id: post.id,
            media_url: persisted.media_url,
            thumbnail_url: persisted.thumbnail_url || persisted.media_url,
            media_type: post.media_type,
            inventory: inventory,
            pricing_type: finalPricingType,
            billing_interval: finalBillingInterval,
          };

          const existingRow = existingProductMap.get(post.id);
          const existingId = existingRow?.id;
          // Re-syncs must never downgrade a categorized product back to
          // Uncategorized (e.g. when the AI call failed and the heuristic
          // caption fallback built this payload without a category).
          const existingCat = ((existingRow as any)?.category || '').trim();
          if (existingId && existingCat && existingCat.toLowerCase() !== 'uncategorized' && productPayload.category.toLowerCase() === 'uncategorized') {
            productPayload.category = existingCat;
          }
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
          let catId = categoryIdCache.get(normCat);
          if (!catId) {
            catId = await upsertCategory(supabaseAdmin, normCat, user.id);
            categoryIdCache.set(normCat, catId);
          }
          const attrList: any[] = [];
          if (specifications) for (const [name] of Object.entries(specifications)) attrList.push({ name, inputType: 'text', isOption: false });
          if (options) for (const [name, vals] of Object.entries(options)) attrList.push({ name, inputType: name.toLowerCase().includes('color') ? 'color' : 'tags', isOption: true, possibleValues: vals });
          const typeKey = `${catId}:${normType}`;
          const ensuredAttrs = ensuredTypeAttrs.get(typeKey);
          if (!ensuredAttrs || attrList.some((a) => !ensuredAttrs.has(a.name))) {
            await upsertTypeAndMergeAttributes(supabaseAdmin, catId, normType, attrList, user.id);
            const s = ensuredAttrs ?? new Set<string>();
            attrList.forEach((a) => s.add(a.name));
            ensuredTypeAttrs.set(typeKey, s);
          }

          // Auto-create/update category template so the system learns from new products
          const templateSpecs = specifications ? (Array.isArray(rawSpecifications)
            ? rawSpecifications.map((s: any) => ({ key: s.key, label: toTitleCase(s.key), unit: s.unit || null, common_values: s.value ? [s.value] : null }))
            : Object.entries(specifications).map(([k, v]) => ({ key: k, label: toTitleCase(k), unit: null, common_values: v ? [String(v)] : null }))
          ) : [];
          const templateOpts = options ? Object.entries(options).map(([name, vals]) => ({
            name, common_values: Array.isArray(vals) ? vals.map((v: any) => typeof v === 'object' ? v.value : String(v)).filter(Boolean) : []
          })) : [];

          // Re-merge the template only when this product brings something not
          // already merged this run. Track key+VALUE tuples (not just keys) —
          // the merge also learns new common_values into existing keys, so a
          // second product adding "Blue" to an existing "Color" option must not
          // be skipped just because the "Color" key was already seen.
          const tplKey = `${normCat}:${normType}`;
          const mergedKeys = mergedTemplateKeys.get(tplKey);
          const newTplKeys = [
            ...templateSpecs.flatMap((s: any) => [`s:${s.key}`, ...((s.common_values || []).map((v: any) => `s:${s.key}=${v}`))]),
            ...templateOpts.flatMap((o: any) => [`o:${o.name}`, ...((o.common_values || []).map((v: any) => `o:${o.name}=${v}`))]),
          ];
          const tplNeedsWork = (templateSpecs.length > 0 || templateOpts.length > 0)
            && (!mergedKeys || newTplKeys.some((k) => !mergedKeys.has(k)));
          if (tplNeedsWork) {
            const ks = mergedKeys ?? new Set<string>();
            newTplKeys.forEach((k) => ks.add(k));
            mergedTemplateKeys.set(tplKey, ks);
            // Merge with existing template if one exists
            const { data: existingTpl } = await supabaseAdmin.from('category_templates')
              .select('id, default_specifications, default_options')
              .eq('category_name', normCat).eq('type_name', normType).is('user_id', null).maybeSingle();

            if (existingTpl) {
              // Merge new specs/options into existing template (add new keys, merge common_values)
              const mergedSpecs = [...(existingTpl.default_specifications || [])];
              for (const ns of templateSpecs) {
                const existing = mergedSpecs.find((s: any) => s.key === ns.key);
                if (existing) {
                  if (ns.common_values?.[0] && !existing.common_values?.includes(ns.common_values[0])) {
                    existing.common_values = [...(existing.common_values || []), ...ns.common_values].slice(0, 20);
                  }
                } else { mergedSpecs.push(ns); }
              }
              const mergedOpts = [...(existingTpl.default_options || [])];
              for (const no of templateOpts) {
                const existing = mergedOpts.find((o: any) => o.name === no.name);
                if (existing) {
                  const merged = new Set([...(existing.common_values || []), ...no.common_values]);
                  existing.common_values = Array.from(merged).slice(0, 30);
                } else { mergedOpts.push(no); }
              }
              await supabaseAdmin.from('category_templates').update({ default_specifications: mergedSpecs, default_options: mergedOpts }).eq('id', existingTpl.id);
            } else {
              // Create new system template from this product's data
              await supabaseAdmin.from('category_templates').insert({
                category_name: normCat, type_name: normType,
                default_specifications: templateSpecs, default_options: templateOpts,
                is_system: true, user_id: null
              }).then(({ error }) => { if (error) console.log('Template auto-create skipped (may exist):', error.message); });
            }
          }
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
        // One invoke per chunk of 10 products instead of one invoke per product;
        // find-product-specs accepts a `products: [...]` batch payload.
        const SPEC_CHUNK_SIZE = 10;
        const specPromises: Promise<any>[] = [];
        for (let i = 0; i < allProds.length; i += SPEC_CHUNK_SIZE) {
          const chunk = allProds.slice(i, i + SPEC_CHUNK_SIZE);
          specPromises.push(
            supabaseAdmin.functions.invoke('find-product-specs', {
              body: {
                user_id: user.id,
                products: chunk.map(p => ({
                  product_id: p.id, product_name: p.name, category: p.category,
                  caption: postsToProcess.find(pp => pp.id === p.instagram_post_id)?.caption || ''
                }))
              }
            }).catch(e => console.error('Spec waterfall batch failed:', e))
          );
        }
        await Promise.allSettled(specPromises);
      }
    }

    // --- Insert Promotions (best-effort), mapped to the real promotions schema ---
    if (promotionsToInsert.length > 0) {
      try {
        // Map AI-extracted promos to the actual promotions columns:
        // (user_id, name, type, value jsonb, end_date, target_products, is_active).
        const promotionsPayload = promotionsToInsert.map(p => ({
          user_id: user.id,
          name: p.title,
          type: 'discount',
          value: {
            discountType: p.discount_type || 'percentage',
            discountValue: p.discount_value,
            currency: p.currency || null,
            summary: p.summary || null,
          },
          end_date: p.valid_until || null,
          is_active: true,
        }));
        const { error: promoErr } = await supabaseAdmin.from('promotions').insert(promotionsPayload);
        if (promoErr) console.error('Failed to insert promotions:', promoErr.message || promoErr);
      } catch (e: any) {
        console.error('Failed to insert promotions:', e.message || e);
      }
    }

    // Products/promotions changed — drop the cached public storefront payloads
    // so shoppers see the new catalog immediately. Fails open inside the helper.
    await invalidateShopCache({ userId: user.id });

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
    let bodyUserId: string | null = null;
    try {
      const body = await req.json();
      syncType = body?.syncType || 'quick';
      bodyUserId = typeof body?.user_id === 'string' ? body.user_id : null;
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

    // Internal (server-to-server) calls — e.g. the Instagram webhook reacting
    // to a new post — authenticate with the service-role key + an explicit
    // user_id. Regular calls carry the user's own JWT.
    let user: { id: string; token?: string };
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    if (SERVICE_KEY && token === SERVICE_KEY && bodyUserId) {
      user = { id: bodyUserId };
    } else {
      const { data: { user: authedUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (authError || !authedUser) {
        console.error('Auth failed:', authError?.message, 'Token prefix:', token.substring(0, 20) + '...');
        return new Response(JSON.stringify({ error: `Authentication failed: ${authError?.message || 'Invalid token'}. Please log out and log back in.` }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      user = { id: authedUser.id, token };
    }

    // Server-side overlap guard: a second call (second tab, race, direct hit)
    // must not double-run Gemini + product upserts. Mirrors the webhook's
    // check, but enforced here so EVERY caller is covered.
    const { data: runningJobs } = await supabaseAdmin
      .from('sync_jobs')
      .select('id')
      .eq('user_id', user.id)
      .in('status', ['starting', 'in_progress'])
      .limit(1);
    if (runningJobs && runningJobs.length > 0) {
      return new Response(JSON.stringify({ jobId: runningJobs[0].id, alreadyRunning: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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

    // Run the sync asynchronously, but register it with the runtime: without
    // EdgeRuntime.waitUntil the isolate may be torn down right after the
    // response is sent, killing the sync mid-run.
    const syncPromise = (async () => {
      try {
        await syncProcess(supabaseAdmin, user, job.id, syncType as 'quick' | 'full');
      } catch (e) {
        console.error('Background sync process failed:', e);
      }
    })();
    // @ts-ignore — EdgeRuntime is injected by the Supabase Edge runtime.
    if (typeof EdgeRuntime !== 'undefined' && typeof EdgeRuntime.waitUntil === 'function') {
      // @ts-ignore
      EdgeRuntime.waitUntil(syncPromise);
    }

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