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
    You are an expert e-commerce assistant for a platform that can sell ANY type of product or service (e.g., software, food, consulting, physical goods). Your task is to analyze an Instagram post caption to determine if it describes something for sale.

    Analyze the following caption:
    ---
    ${caption}
    ---

    Respond ONLY with a valid JSON object. Do not include markdown backticks.
    {
      "isProductPost": boolean,
      "reasoning": "A brief explanation of your decision. Be neutral and objective.",
      "product": {
        "name": "A concise name for the product or service.",
        "category": "A suitable category (e.g., 'Software', 'Food', 'Consulting', 'Apparel'). Be specific but concise.",
        "description": "A one or two-sentence description based on the caption.",
        "features": ["A list of key features or selling points mentioned in the caption.", "Extract at least 2-3 if possible."],
        "price": "A number representing the price. Extract it if available, otherwise null.",
        "currency": "The currency, e.g., 'EUR', 'USD'. Infer if possible, otherwise null."
      } | null
    }

    If isProductPost is false, the "product" field must be null.
  `;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("Gemini API key is not configured.");
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not found');

    const { data: postsData, error: invokeError } = await supabase.functions.invoke('instagram-posts');
    
    if (invokeError) throw invokeError;
    
    if (postsData.error) {
      throw new Error(postsData.error);
    }

    if (!postsData.posts) {
        return new Response(JSON.stringify({ posts: [] }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const { data: existingProducts, error: productsError } = await supabase
      .from('products')
      .select('instagram_post_id')
      .eq('user_id', user.id);
    if (productsError) throw productsError;
    const existingPostIds = new Set(existingProducts.map(p => p.instagram_post_id));

    const analysisPromises = postsData.posts.map(async (post: any) => {
      let analysis = null;
      if (post.caption) {
        try {
          const prompt = getProductAnalysisPrompt(post.caption);
          const geminiResponse = await fetch(GEMINI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
          });

          if (geminiResponse.ok) {
            const geminiData = await geminiResponse.json();
            const jsonString = geminiData.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
            analysis = JSON.parse(jsonString);
          } else {
             console.error(`Gemini API error for post ${post.id}:`, await geminiResponse.text());
          }
        } catch (e) {
          console.error(`Failed to parse Gemini response for post ${post.id}:`, e);
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
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});