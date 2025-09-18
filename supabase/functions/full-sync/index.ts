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
    You are an expert e-commerce assistant. Your task is to analyze an Instagram post caption to determine if it describes a product or service for sale.

    Analyze the following caption:
    ---
    ${caption}
    ---

    Respond in JSON format with the following structure:
    {
      "isProductPost": boolean,
      "reasoning": "A brief explanation of why you decided it is or is not a product post.",
      "product": {
        "name": "A concise name for the product or service.",
        "category": "A suitable category (e.g., 'Clothing', 'Food', 'Digital Service', 'Jewelry'). Be generic.",
        "description": "A one or two-sentence description based on the caption.",
        "price": "A number representing the price. Extract it if available, otherwise null.",
        "currency": "The currency, e.g., 'leke', 'EUR', 'USD'. Infer if possible, otherwise null."
      } | null
    }

    If isProductPost is false, the "product" field should be null.
    If the caption is a product post, extract all available details accurately.
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

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (businessError || !business) {
      throw new Error(`No business found for user ${user.id}.`);
    }

    const { data: postsData, error: invokeError } = await supabase.functions.invoke('instagram-posts');
    if (invokeError) throw invokeError;
    if (postsData.error) throw new Error(postsData.error);
    
    const allPosts = postsData.posts || [];
    if (allPosts.length === 0) {
      return new Response(JSON.stringify({ message: "No Instagram posts found to process." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let productsCreatedOrUpdated = 0;
    for (const post of allPosts) {
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
        const { error: upsertError } = await supabase.from('products').upsert({
          business_id: business.id,
          instagram_post_id: post.id,
          name: p.name,
          price: p.price,
          media_url: post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url,
          caption: p.description || post.caption,
          category: p.category,
        }, {
          onConflict: 'business_id,instagram_post_id',
          ignoreDuplicates: false
        });

        if (upsertError) {
          console.error(`Failed to upsert product for post ${post.id}:`, upsertError);
        } else {
          productsCreatedOrUpdated++;
        }
      }
    }

    await supabase
      .from('businesses')
      .update({ last_full_sync_at: new Date().toISOString() })
      .eq('id', business.id);

    return new Response(JSON.stringify({ message: `Full sync complete. ${productsCreatedOrUpdated} products created or updated.` }), {
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