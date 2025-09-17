import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getProductAnalysisPrompt = (caption: string) => {
  return `
    You are an expert e-commerce assistant for a fashion store. Your task is to analyze an Instagram post caption and determine if it describes a product for sale.

    Analyze the following caption:
    ---
    ${caption}
    ---

    Respond in JSON format with the following structure:
    {
      "isProductPost": boolean,
      "reasoning": "A brief explanation of why you decided it is or is not a product post.",
      "product": {
        "name": "The product name, extracted from the 'Art-' line or inferred. Be concise.",
        "category": "e.g., 'Kepuce', 'Sandale', 'Cante'",
        "material": "e.g., 'lekure', 'kamosh'",
        "referenceCode": "The code following 'Art-'",
        "sizes": ["An", "array", "of", "available", "sizes"],
        "price": "A number representing the price.",
        "currency": "The currency, e.g., 'leke' or 'EUR'"
      } | null
    }

    If isProductPost is false, the "product" field should be null.
    If the caption is a product post, extract all details accurately. The price and sizes are the most critical fields. The currency is usually 'leke'.
  `;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in Supabase secrets.");
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not found');

    // 1. Fetch Instagram posts using the existing function
    const { data: postsData, error: invokeError } = await supabase.functions.invoke('instagram-posts');
    if (invokeError) throw invokeError;
    if (postsData.error) throw new Error(postsData.error);
    if (!postsData.posts || postsData.posts.length === 0) {
      return new Response(JSON.stringify({ message: "No new Instagram posts to process." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Get existing product post IDs to avoid reprocessing
    const { data: existingProducts, error: productsError } = await supabase
      .from('products')
      .select('instagram_post_id')
      .eq('user_id', user.id);
    if (productsError) throw productsError;
    const existingPostIds = new Set(existingProducts.map(p => p.instagram_post_id));

    const newPosts = postsData.posts.filter((post: any) => !existingPostIds.has(post.id));
    if (newPosts.length === 0) {
      return new Response(JSON.stringify({ message: "All Instagram posts are already processed." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let productsCreated = 0;
    for (const post of newPosts) {
      if (!post.caption) continue;

      const prompt = getProductAnalysisPrompt(post.caption);
      const geminiResponse = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      });

      if (!geminiResponse.ok) {
        console.error(`Gemini API error for post ${post.id}:`, await geminiResponse.text());
        continue;
      }

      const geminiData = await geminiResponse.json();
      const jsonString = geminiData.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
      const analysis = JSON.parse(jsonString);

      if (analysis.isProductPost && analysis.product) {
        const p = analysis.product;
        const { error: insertError } = await supabase.from('products').insert({
          user_id: user.id,
          name: p.name || p.referenceCode,
          status: 'Draft',
          price: p.price,
          inventory: p.sizes?.length || 0,
          instagram_post_id: post.id,
          media_url: post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url,
          caption: post.caption,
          category: p.category,
          material: p.material,
          reference_code: p.referenceCode,
          sizes: p.sizes?.join(', '),
        });

        if (insertError) {
          console.error(`Failed to insert product for post ${post.id}:`, insertError);
        } else {
          productsCreated++;
        }
      }
    }

    return new Response(JSON.stringify({ message: `Processing complete. Created ${productsCreated} new products.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});