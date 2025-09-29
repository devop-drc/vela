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

const processUser = async (supabaseAdmin: SupabaseClient, integration: Integration) => {
  const { user_id, access_token } = integration;
  console.log(`Starting sync for user: ${user_id}`);

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
      console.log(`No posts found for user ${user_id}. Sync complete.`);
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
      console.log(`Found ${newPosts.length} new posts for user ${user_id}. Analyzing...`);
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
        const { error: insertError } = await supabaseAdmin.from('products').insert(productsToInsert);
        if (insertError) console.error(`Failed to insert products for user ${user_id}:`, insertError);
        else console.log(`Successfully inserted ${productsToInsert.length} new products for user ${user_id}.`);
      }
    }

    // Step 5: Check for deleted/archived posts
    const allInstagramPostIds = new Set(allPosts.map((p: InstagramPost) => p.id));
    const productsToArchive = existingProducts.filter(p => p.instagram_post_id && !allInstagramPostIds.has(p.instagram_post_id));
    
    if (productsToArchive.length > 0) {
        const idsToUpdate = productsToArchive.map(p => p.id);
        const { error: updateError } = await supabaseAdmin.from('products').update({ status: 'Draft' }).in('id', idsToUpdate);
        if (updateError) console.error(`Failed to archive products for user ${user_id}:`, updateError);
        else console.log(`Archived ${idsToUpdate.length} products for user ${user_id}.`);
    }

    console.log(`Sync complete for user: ${user_id}`);

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

    console.log(`Found ${integrations.length} integrations to process.`);
    
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