import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_PRO_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

// --- AI Analysis & DB Enrichment Logic (Consolidated for performance) ---

const getClassifierPrompt = () => `...`; // Abridged for brevity

const toTitleCase = (str: string) => str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

const upsertCategory = async (supabase: SupabaseClient, userId: string, name: string) => {
  const normalizedName = toTitleCase(name);
  let { data, error } = await supabase.from('categories').select('id').eq('name', normalizedName).eq('user_id', userId).single();
  if (error && error.code !== 'PGRST116') throw error;
  if (data) return data.id;
  
  ({ data, error } = await supabase.from('categories').insert({ name: normalizedName, user_id: userId }).select('id').single());
  if (error) throw error;
  return data.id;
};

const upsertTypeAndMergeAttributes = async (supabase: SupabaseClient, userId: string, categoryId: string, typeName: string, newAttributes: any[]) => {
  const normalizedTypeName = toTitleCase(typeName);
  let { data: existingType, error } = await supabase.from('types').select('id, attributes').eq('category_id', categoryId).eq('name', normalizedTypeName).single();
  if (error && error.code !== 'PGRST116') throw error;

  const newAttributesMap = new Map((newAttributes || []).map(attr => [attr.name, { name: attr.name, inputType: attr.inputType, possibleValues: attr.possibleValues }]));

  if (existingType) {
    const existingAttributesMap = new Map((existingType.attributes || []).map((attr: any) => [attr.name, attr]));
    for (const [name, newAttr] of newAttributesMap.entries()) {
      existingAttributesMap.set(name, newAttr);
    }
    const mergedAttributes = Array.from(existingAttributesMap.values());
    const { error: updateError } = await supabase.from('types').update({ attributes: mergedAttributes }).eq('id', existingType.id);
    if (updateError) throw updateError;
  } else {
    const attributesToInsert = Array.from(newAttributesMap.values());
    const { error: insertError } = await supabase.from('types').insert({ category_id: categoryId, name: normalizedTypeName, attributes: attributesToInsert, user_id: userId });
    if (insertError) throw insertError;
  }
};

const analyzeAndEnrichPost = async (supabase: SupabaseClient, userId: string, post: any) => {
    try {
        if (!GEMINI_API_KEY) throw new Error("Gemini API key is not configured.");
        if (!post.caption && !post.media_url) return { skipped: true, reason: "Post has no content to analyze." };

        const prompt = getClassifierPrompt();
        const requestParts = [{ text: prompt }];

        if (post.media_url) {
            const imageResponse = await fetch(post.media_url);
            if (!imageResponse.ok) throw new Error("Failed to fetch image for analysis.");
            const imageBuffer = await imageResponse.arrayBuffer();
            const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
            requestParts.push({ inline_data: { mime_type: imageResponse.headers.get('content-type') || 'image/jpeg', data: imageBase64 } });
        }

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
        
        if (categoryName && typeName) {
            const categoryId = await upsertCategory(supabase, userId, categoryName);
            await upsertTypeAndMergeAttributes(supabase, userId, categoryId, typeName, attributes || []);
        }

        const details: { [key: string]: any } = {};
        if (attributes) {
            for (const attr of attributes) { details[attr.name] = attr.value; }
        }

        return {
            product: {
                name: productInfo.productName, caption: productInfo.description, price: productInfo.price,
                currency: productInfo.currency, tags: productInfo.tags, category: toTitleCase(categoryName),
                details: { type: toTitleCase(typeName), ...details },
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
      const analysisResult = await analyzeAndEnrichPost(supabase, user.id, post);
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