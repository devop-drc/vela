import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_PRO_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const getClassifierPrompt = () => `
  You are an AI that analyzes an Instagram post's caption to determine if it's a product and extracts its details.

  **Rules:**
  1.  **Categorization:** Assign a broad 'categoryName' and a specific 'typeName'.
  2.  **Attributes:** For each attribute (e.g., color, material), create an object with "name", "value", "inputType", and optional "possibleValues".
  3.  **Normalization:** Capitalize the first letter of category and type names.
  4.  **Confidence:** If not a product, return '{"isProductPost": false}'.

  **Output Format:**
  Respond ONLY with a single, valid JSON object.

  **Example:**
  {
    "isProductPost": true,
    "categoryName": "Clothing",
    "typeName": "T-Shirt",
    "productName": "Vintage Sunset Tee",
    "description": "A soft, vintage-style t-shirt.",
    "price": 35.00,
    "currency": "USD",
    "tags": ["vintage", "sunset", "graphic tee"],
    "attributes": [
      { "name": "material", "value": "Cotton", "inputType": "dropdown", "possibleValues": ["Cotton", "Polyester", "Blend"] }
    ]
  }
`;

const toTitleCase = (str: string) => str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

const analyzeAndEnrichPost = async (post: any) => {
    try {
        if (!GEMINI_API_KEY) throw new Error("Gemini API key is not configured.");
        if (!post.caption) return { skipped: true, reason: "Post has no caption to analyze." };

        const prompt = getClassifierPrompt();
        const requestParts = [{ text: prompt }, { text: `Caption to analyze: ${post.caption}` }];

        const geminiResponse = await fetch(GEMINI_PRO_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: requestParts }], generationConfig: { responseMimeType: "application/json" } }),
        });

        if (!geminiResponse.ok) throw new Error(`Gemini API error: ${await geminiResponse.text()}`);
        const geminiData = await geminiResponse.json();
        const analysis = JSON.parse(geminiData.candidates[0].content.parts[0].text);

        if (!analysis.isProductPost) {
            return { skipped: true, reason: "AI determined this is not a product post." };
        }

        const { categoryName, typeName, attributes, ...productInfo } = analysis;
        
        const details: { [key: string]: any } = {};
        if (attributes) {
            for (const attr of attributes) { details[attr.name] = { value: attr.value }; }
        }

        return {
            product: {
                name: { value: productInfo.productName },
                description: { value: productInfo.description },
                price: { value: productInfo.price },
                currency: { value: productInfo.currency },
                tags: { value: productInfo.tags },
                category: { value: toTitleCase(categoryName) },
                details: { type: { value: toTitleCase(typeName) }, ...details },
            },
            skipped: false
        };
    } catch (e) {
        console.error(`Error analyzing post ${post.id}:`, e.message);
        return { skipped: true, reason: e.message };
    }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not found');

    const { data: postsData, error: invokeError } = await supabase.functions.invoke('instagram-posts');
    if (invokeError) throw invokeError;
    if (postsData.error) return new Response(JSON.stringify({ error: postsData.error }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (!postsData.posts) return new Response(JSON.stringify({ posts: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: business } = await supabase.from('businesses').select('id').eq('user_id', user.id).single();
    const { data: existingProducts } = await supabase.from('products').select('instagram_post_id').eq('business_id', business?.id);
    const existingPostIds = new Set((existingProducts || []).map(p => p.instagram_post_id));

    const analysisPromises = postsData.posts.map(async (post: any) => {
      const analysisResult = await analyzeAndEnrichPost(post);
      return {
        ...post,
        isImported: existingPostIds.has(post.id),
        analysis: {
            isProductPost: !analysisResult.skipped,
            product: analysisResult.product,
            reasoning: analysisResult.reason
        },
      };
    });

    const analyzedPosts = await Promise.all(analysisPromises);
    return new Response(JSON.stringify({ posts: analyzedPosts }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});