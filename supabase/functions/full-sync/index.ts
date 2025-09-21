import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not found');

    const { data: business, error: businessError } = await supabase
      .from('businesses').select('id').eq('user_id', user.id).single();
    if (businessError || !business) throw new Error("Could not find your business profile.");

    const { data: postsData, error: postsError } = await supabase.functions.invoke('instagram-posts');
    if (postsError) throw postsError;
    if (postsData.error) throw new Error(postsData.error);
    if (!postsData.posts || postsData.posts.length === 0) {
      return new Response(JSON.stringify({ message: "No posts found to sync." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: existingProducts, error: productsError } = await supabase
      .from('products').select('instagram_post_id').eq('business_id', business.id);
    if (productsError) throw productsError;
    const existingPostIds = new Set(existingProducts.map(p => p.instagram_post_id));
    
    const allNewPosts = postsData.posts.filter((p: any) => !existingPostIds.has(p.id));

    if (allNewPosts.length === 0) {
      return new Response(JSON.stringify({ message: "Everything is up to date!" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let newProductsCount = 0;
    for (const post of allNewPosts) {
      if (!post.caption) continue;

      const { data: analysis, error: analysisError } = await supabase.functions.invoke('ai-product-analyzer', {
        body: { caption: post.caption },
      });

      if (analysisError || analysis.error) {
        console.error(`Failed to analyze post ${post.id}:`, analysisError || analysis.error);
        continue;
      }

      if (analysis.isProductPost) {
        const p = analysis.product;
        const { error: insertError } = await supabase.from('products').insert({
          business_id: business.id,
          name: p.name,
          caption: p.description,
          category: p.category,
          price: p.price,
          currency: p.currency,
          tags: p.tags,
          details: p.details,
          status: 'Draft',
          instagram_post_id: post.id,
          media_url: post.media_url,
          thumbnail_url: post.thumbnail_url,
          media_type: post.media_type,
        });
        if (insertError) {
          console.error(`Failed to insert product for post ${post.id}:`, insertError);
        } else {
          newProductsCount++;
        }
      }
    }

    // Update the last full sync timestamp
    const { error: updateError } = await supabase
      .from('businesses')
      .update({ last_full_sync_at: new Date().toISOString() })
      .eq('id', business.id);
    if (updateError) console.error("Failed to update sync timestamp:", updateError);

    const message = newProductsCount > 0
      ? `Full sync complete! Added ${newProductsCount} new product(s).`
      : "Full sync complete. No new products found.";

    return new Response(JSON.stringify({ message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200, // Return 200 so the client can parse the error message
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});