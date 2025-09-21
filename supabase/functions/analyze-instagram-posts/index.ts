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

    // Step 1: Get all Instagram posts
    const { data: postsData, error: invokeError } = await supabase.functions.invoke('instagram-posts');
    if (invokeError) throw invokeError;
    if (postsData.error) {
      return new Response(JSON.stringify({ error: postsData.error }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }
    if (!postsData.posts) {
        return new Response(JSON.stringify({ posts: [] }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // Step 2: Get existing products to check for imports
    const { data: business, error: businessError } = await supabase
      .from('businesses').select('id').eq('user_id', user.id).single();

    let existingPostIds = new Set();
    if (business && !businessError) {
      const { data: existingProducts, error: productsError } = await supabase
        .from('products').select('instagram_post_id').eq('business_id', business.id);
      if (productsError) throw productsError;
      existingPostIds = new Set(existingProducts.map(p => p.instagram_post_id));
    }

    // Step 3: Analyze each post using the new chain-of-thought function
    const analysisPromises = postsData.posts.map(async (post: any) => {
      let analysis = null;
      if (post.caption) {
        try {
          const { data: analysisData, error: analysisError } = await supabase.functions.invoke('ai-product-analyzer', {
            body: { caption: post.caption },
          });
          if (analysisError) throw analysisError;
          if (analysisData.error) console.error(`Analysis error for post ${post.id}:`, analysisData.error);
          else analysis = analysisData;
        } catch (e) {
          console.error(`Failed to analyze post ${post.id}:`, e.message);
        }
      }
      return {
        ...post,
        isImported: existingPostIds.has(post.id),
        analysis,
      };
    });

    const analyzedPosts = await Promise.all(analysisPromises);

    return new Response(JSON.stringify({ posts: analyzedPosts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});