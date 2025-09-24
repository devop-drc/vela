import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_PRO_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getClassifierPrompt = (caption: string) => `
  You are an AI database enrichment service. Your goal is to analyze a product from an Instagram post (image and caption) and structure the data for our database.

  **Database Schema:**
  - categories(name)
  - types(name, attributes)

  **Analysis Task:**
  Analyze the provided image and caption. Extract the product's category, type, and all discernible attributes.

  **Rules:**
  1.  **Product Name is Mandatory:** You MUST provide a "productName". If a clear name isn't given, create a concise, descriptive name from the caption (e.g., "Hand-painted Ceramic Mug", "Blue Floral Summer Dress").
  2.  **Be Exhaustive:** Extract every possible detail. Infer from context where necessary.
  3.  **Categorization:** Assign a broad 'categoryName' (e.g., "Clothing") and a specific 'typeName' (e.g., "T-Shirt").
  4.  **Attributes:** For each attribute found (e.g., color, material, size, dimensions, technical specs), create an object with the following keys:
      - "name": The lowercase, snake_case name of the attribute (e.g., "material").
      - "value": The extracted value (e.g., "100% Cotton").
      - "inputType": The best UI input type for this attribute. Choose from: "text", "number", "color", "tags", "dropdown", "textarea".
      - "possibleValues": If the inputType is 'dropdown', provide an array of potential options.
  5.  **Normalization:** Capitalize the first letter of category and type names.
  6.  **Confidence:** If you are not confident this is a product post, return '{"isProductPost": false}'.

  **Output Format:**
  Respond ONLY with a single, valid JSON object. Do not include markdown.

  **Example Output:**
  {
    "isProductPost": true,
    "categoryName": "Clothing",
    "typeName": "T-Shirt",
    "productName": "Vintage Sunset Tee",
    "description": "A soft, vintage-style t-shirt featuring a retro sunset graphic.",
    "price": 35.00,
    "currency": "USD",
    "tags": ["vintage", "sunset", "graphic tee"],
    "attributes": [
      { "name": "material", "value": "Cotton", "inputType": "dropdown", "possibleValues": ["Cotton", "Polyester", "Blend"] },
      { "name": "available_sizes", "value": ["M", "L", "XL"], "inputType": "tags" },
      { "name": "color", "value": "Off-white", "inputType": "text" }
    ]
  }
`;

const toTitleCase = (str: string) => str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

const upsertCategory = async (supabase: SupabaseClient, name: string) => {
  const normalizedName = toTitleCase(name);
  let { data, error } = await supabase.from('categories').select('id').eq('name', normalizedName).single();
  if (error && error.code !== 'PGRST116') throw error;
  if (data) return data.id;
  
  ({ data, error } = await supabase.from('categories').insert({ name: normalizedName }).select('id').single());
  if (error) throw error;
  return data.id;
};

const upsertTypeAndMergeAttributes = async (supabase: SupabaseClient, categoryId: string, typeName: string, newAttributes: any[]) => {
  const normalizedTypeName = toTitleCase(typeName);
  let { data: existingType, error } = await supabase.from('types').select('id, attributes').eq('category_id', categoryId).eq('name', normalizedTypeName).single();
  if (error && error.code !== 'PGRST116') throw error;

  const newAttributesMap = new Map(newAttributes.map(attr => [attr.name, { inputType: attr.inputType, possibleValues: attr.possibleValues }]));

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
    const { error: insertError } = await supabase.from('types').insert({ category_id: categoryId, name: normalizedTypeName, attributes: attributesToInsert });
    if (insertError) throw insertError;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!GEMINI_API_KEY) throw new Error("Gemini API key is not configured.");
    const { caption, imageUrl } = await req.json();
    if (!caption && !imageUrl) throw new Error("Caption or Image URL is required.");

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    
    const prompt = getClassifierPrompt(caption || 'No caption provided.');
    const requestParts = [{ text: prompt }];

    if (imageUrl) {
      const imageResponse = await fetch(imageUrl);
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
      return new Response(JSON.stringify({ skipped: true, reason: "AI determined this is not a product post." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { categoryName, typeName, attributes, ...productInfo } = analysis;
    
    if (categoryName && typeName) {
      const categoryId = await upsertCategory(supabaseAdmin, categoryName);
      await upsertTypeAndMergeAttributes(supabaseAdmin, categoryId, typeName, attributes || []);
    }

    const details: { [key: string]: any } = {};
    if (attributes) {
      for (const attr of attributes) {
        details[attr.name] = attr.value;
      }
    }

    const finalProductPayload = {
      name: productInfo.productName,
      caption: productInfo.description,
      price: productInfo.price,
      currency: productInfo.currency,
      tags: productInfo.tags,
      category: toTitleCase(categoryName),
      details: {
        type: toTitleCase(typeName),
        ...details
      },
    };

    return new Response(JSON.stringify({ product: finalProductPayload, skipped: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Classifier Function Error:', error.message);
    return new Response(JSON.stringify({ skipped: true, reason: error.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});