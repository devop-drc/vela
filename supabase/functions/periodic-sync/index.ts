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

interface Integration {
  user_id: string;
  access_token: string;
  provider: string;
}

interface InstagramPost {
  id: string;
  caption?: string;
  media_url: string;
  thumbnail_url?: string;
  media_type: string;
}

// ---------- Variant helpers ----------
const toTitleCase = (str: string) => str.replace(/_/g, ' ').replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

const normalizeOptions = (raw: any): Record<string, string[]> => {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v : []]));
  }
  if (Array.isArray(raw)) {
    const out: Record<string, string[]> = {};
    for (const item of raw) {
      const key = (item?.name ?? '').toString();
      const vals = Array.isArray(item?.values) ? item.values : [];
      if (key && vals.length) out[key] = vals.map((x: any) => String(x));
    }
    return out;
  }
  return {};
};

const upsertProductOption = async (supabase: SupabaseClient, productId: string, name: string, position: number) => {
  const normalized = toTitleCase(name);
  const { data: existing } = await supabase
    .from('product_options')
    .select('id')
    .eq('product_id', productId)
    .eq('name', normalized)
    .maybeSingle();
  if (existing) return existing.id as string;
  const { data: inserted, error: insErr } = await supabase
    .from('product_options')
    .insert({ product_id: productId, name: normalized, position, is_active: true })
    .select('id')
    .single();
  if (insErr) throw insErr;
  return (inserted as any).id as string;
};

const upsertOptionValue = async (supabase: SupabaseClient, optionId: string, value: string) => {
  const val = String(value).trim();
  const { data: existing } = await supabase
    .from('option_values')
    .select('id')
    .eq('option_id', optionId)
    .eq('value', val)
    .maybeSingle();
  if (existing) return existing.id as string;
  const { data: inserted, error: insErr } = await supabase
    .from('option_values')
    .insert({ option_id: optionId, value: val, is_active: true })
    .select('id')
    .single();
  if (insErr) throw insErr;
  return (inserted as any).id as string;
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
  const entries = Object.entries(aiOptions || {}).filter(([_, vals]) => Array.isArray(vals) && vals.length > 0);
  if (entries.length === 0) return;
  const orderedNames = entries.map(([name]) => toTitleCase(name));
  const optionIds: string[] = [];
  for (let i = 0; i < orderedNames.length; i++) {
    const id = await upsertProductOption(supabase, productId, orderedNames[i], i);
    optionIds.push(id);
  }
  const valueLabelMatrix: string[][] = [];
  for (let i = 0; i < entries.length; i++) {
    const [, values] = entries[i];
    const labels: string[] = [];
    for (const raw of values) labels.push(String(raw).trim());
    valueLabelMatrix.push(labels);
  }
  const combosLabels = combinations(valueLabelMatrix);
  const { data: existingVariants } = await supabase
    .from('product_variants')
    .select('combination_key')
    .eq('product_id', productId);
  const existing = new Set((existingVariants || []).map((v: any) => v.combination_key));
  const toInsert: any[] = [];
  for (let i = 0; i < combosLabels.length; i++) {
    const key = buildVariantKey(orderedNames, combosLabels[i]);
    if (existing.has(key)) continue;
    toInsert.push({ product_id: productId, combination_key: key, is_active: true });
  }
  if (toInsert.length > 0) {
    const { error } = await supabase.from('product_variants').insert(toInsert);
    if (error) throw error;
  }
};

const processUser = async (supabaseAdmin: SupabaseClient, integration: Integration) => {
  const { user_id, access_token } = integration;

  try {
    // Step 1: Get business ID
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses').select('id').eq('user_id', user_id).single();
    if (businessError || !business) {
      console.error(`No business found for user ${user_id}`);
      return;
    }

    // Step 2: Fetch Instagram posts using the user's token
    // We invoke the function with the service role key but pass the user's token in the body for it to use
    const { data: postsData, error: postsError } = await supabaseAdmin.functions.invoke('instagram-posts', {
        headers: { 'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}` },
        body: { user_access_token: access_token }
    });

    if (postsError || (postsData && postsData.error)) {
      console.error(`Failed to fetch posts for user ${user_id}:`, postsError || postsData.error);
      return;
    }
    
    const allPosts = postsData.posts || [];
    if (allPosts.length === 0) {
      return;
    }

    // Step 3: Compare with existing products
    const { data: existingProducts, error: productsError } = await supabaseAdmin
      .from('products').select('id, instagram_post_id').eq('business_id', business.id);
    if (productsError) throw productsError;

    const existingPostIds = new Set(existingProducts.map(p => p.instagram_post_id));
    const newPosts = allPosts.filter((p: InstagramPost) => !existingPostIds.has(p.id));

    // Step 4: Parallel analysis of new posts
    if (newPosts.length > 0) {
      const analysisPromises = newPosts
        .filter(post => post.caption)
        .map(post => 
          supabaseAdmin.functions.invoke('ai-product-analyzer', { body: { caption: post.caption } })
            .then(({ data, error }) => ({ post, analysis: data, error }))
        );
      
      const analysisResults = await Promise.all(analysisPromises);
      const productsToInsert = analysisResults
        .filter(r => !r.error && r.analysis && r.analysis.isProductPost)
        .map(({ post, analysis }) => {
          const p = analysis.product;
          return {
            business_id: business.id, name: p.name, caption: p.description, category: p.category,
            price: p.price, currency: p.currency, tags: p.tags, details: p.details,
            status: 'Draft', instagram_post_id: post.id, media_url: post.media_url,
            thumbnail_url: post.thumbnail_url, media_type: post.media_type,
          };
        });

      if (productsToInsert.length > 0) {
        // Insert products and return ids with instagram_post_id for matching
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from('products')
          .insert(productsToInsert)
          .select('id, instagram_post_id');
        if (insertError) console.error(`Failed to insert products for user ${user_id}:`, insertError);

        // Create variants where options are present
        const byPostId = new Map<string, any>();
        for (const r of analysisResults) {
          if (!r.error && r.analysis && r.analysis.isProductPost) {
            const norm = normalizeOptions(r.analysis.options);
            if (Object.keys(norm).length > 0) byPostId.set(r.post.id, norm);
          }
        }
        for (const prod of inserted || []) {
          const opts = byPostId.get(prod.instagram_post_id);
          if (opts) {
            try { await upsertVariantsFromOptions(supabaseAdmin, prod.id, opts); } catch (_) {}
          }
        }
      }
    }

    // Step 5: Check for deleted/archived posts
    const allInstagramPostIds = new Set(allPosts.map((p: InstagramPost) => p.id));
    const productsToArchive = existingProducts.filter(p => p.instagram_post_id && !allInstagramPostIds.has(p.instagram_post_id));
    
    if (productsToArchive.length > 0) {
        const idsToUpdate = productsToArchive.map(p => p.id);
        const { error: updateError } = await supabaseAdmin.from('products').update({ status: 'Draft' }).in('id', idsToUpdate);
        if (updateError) console.error(`Failed to archive products for user ${user_id}:`, updateError);
    }


  } catch (error) {
    console.error(`Error processing user ${user_id}:`, error.message);
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const secret = req.headers.get('x-secret-key');
    const envSecret = Deno.env.get('PERIODIC_SYNC_SECRET');

    if (!secret || secret !== envSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = getSupabaseAdmin();
    
    // Fetch all users with an active Facebook integration
    const { data: integrations, error } = await supabaseAdmin.from('integrations').select('*').eq('provider', 'facebook');
    if (error) throw error;

    // Process each user's sync sequentially to avoid overwhelming the system,
    // but the analysis for each user's posts will be parallel.
    for (const integration of integrations) {
      await processUser(supabaseAdmin, integration);
    }

    return new Response(JSON.stringify({ message: `Sync process initiated for ${integrations.length} users.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});