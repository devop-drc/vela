import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_PRO_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getClassifierPrompt = (caption: string, keywords: { keyword: string, description: string }[], similarProducts: any[]) => {
  const similarProductsContext = similarProducts.length > 0 ? `
**Similar Product Examples from User's Catalog (Use as a Style Guide):**
${similarProducts.map(p => `- **${p.name}**: Category: ${p.category}, Type: ${p.details?.type}, Description: ${p.caption?.substring(0, 100)}..., Attributes: ${JSON.stringify(p.details)}`).join('\n')}
` : '';

  return `
  You are an expert AI for e-commerce, specializing in analyzing Instagram captions to create structured product listings. Your task is to extract product information with high accuracy.

  **Input Caption:**
  ---
  ${caption}
  ---

  **Primary Objectives:**
  1. **Product Identification:** Determine if the post is selling a product. If not, return \`{"isProductPost": false}\`.
  2. **Product Name:** Extract the clearest and most concise product name directly from the caption (max 10 words).
  3. **Category & Type:** Determine the most specific category and type based on the product name and caption content.
  4. **Pricing Model:**
     - Determine \`pricingType\`: "one_time" or "subscription". Default to "one_time".
     - If "subscription", determine \`billingInterval\`: "month" or "year". Default to "month".
  5. **Price Extraction:** Extract the numerical price and the currency code (e.g., USD, EUR, ALL). **Crucially, if a price and currency are present in the caption, use them.** Default currency to "ALL" if none is specified.
  6. **Inventory/Stock:** Infer \`inventory\` as an integer. If stock is mentioned (e.g., "only 5 left"), use that number. If it's clearly a product post but stock is not mentioned, default to 10. If explicitly "sold out" or "out of stock", default to 0.
  7. **Attributes Extraction (Crucial):**
     - **Specifications (Fixed Details):** A key-value object of fixed, unchangeable attributes (e.g., Material, Dimensions, Weight). **If the caption is sparse, use your general knowledge about the product name and category to infer 2-3 relevant specifications (e.g., for a scooter: Max Speed, Battery Life, Weight).** Use snake_case for keys.
     - **Options (Variants):** A key-value object where values are arrays of customer-selectable variants (e.g., Color, Size, Storage). Extract these directly from the caption. Use snake_case for keys.
  8. **Description:** Generate a compelling, detailed 3-4 sentence description highlighting key features, benefits, and materials, based on the caption and inferred specifications.
  9. **Tags:** Generate 3-5 relevant tags.

  **Currency Handling:**
  - If the caption includes "ALL", "Lek", or "Lekë", use "ALL" as currency.
  - For other currencies, use standard codes: USD, EUR, GBP, etc.
  - If no currency is specified, default to "ALL".

  **User-Defined Keywords:**
  ${keywords.length > 0 ? keywords.map(k => `- **${k.keyword}:** ${k.description}`).join('\n') : 'No custom keywords provided.'}

  ${similarProductsContext}

  **Output Format:**
  Respond ONLY with a single, valid JSON object. Do not include any explanation or markdown.

  **EXAMPLE JSON OUTPUT:**
  {
    "isProductPost": true,
    "productName": "Vintage Sunset Tee",
    "description": "A soft, vintage-style t-shirt made from 100% organic cotton. Features a stunning, faded sunset graphic print. Perfect for casual wear and sustainable fashion enthusiasts.",
    "categoryName": "Clothing",
    "typeName": "T-Shirt",
    "pricingType": "one_time",
    "billingInterval": null,
    "price": 35.00,
    "currency": "USD",
    "inventory": 50,
    "tags": ["vintage", "sunset", "graphic tee", "organic cotton"],
    "specifications": {
      "material": "100% Organic Cotton",
      "fit": "Regular"
    },
    "options": {
      "color": ["Cream", "Faded Blue"],
      "size": ["S", "M", "L", "XL"]
    }
  }
  
  **FOR NON-PRODUCT POSTS:**
  {
    "isProductPost": false
  }
`;
}

const toTitleCase = (str: string) => str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!GEMINI_API_KEY) throw new Error("Gemini API key is not configured.");
    const { caption, user_id, target_currency = 'EUR' } = await req.json();
    if (!caption) throw new Error("Caption is required for analysis.");
    if (!user_id) throw new Error("User ID is required to fetch keywords.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get user's preferred currency (though we store in ALL, this is for context)
    const { data: userData } = await supabaseAdmin
      .from('profiles')
      .select('currency')
      .eq('id', user_id)
      .single();
    
    const userCurrency = userData?.currency || target_currency;

    const { data: keywords, error: keywordsError } = await supabaseAdmin
      .from('keywords')
      .select('keyword, description')
      .eq('user_id', user_id);
    
    if (keywordsError) throw keywordsError;

    // Fetch recent products to use as context
    let similarProducts = [];
    const { data: recentProducts, error: recentProductsError } = await supabaseAdmin
        .from('products')
        .select('name, category, details, caption')
        .eq('user_id', user_id)
        .limit(5)
        .order('created_at', { ascending: false });

    if (recentProductsError) {
        console.error("Could not fetch recent products for context:", recentProductsError);
    } else {
        similarProducts = recentProducts;
    }

    const prompt = getClassifierPrompt(caption, keywords || [], similarProducts);
    const requestParts = [{ text: prompt }];

    const geminiResponse = await fetch(GEMINI_PRO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: requestParts }], generationConfig: { responseMimeType: "application/json" } }),
    });

    if (!geminiResponse.ok) throw new Error(`Gemini API error: ${await geminiResponse.text()}`);
    const geminiData = await geminiResponse.json();
    
    // Check for empty candidates array which indicates a failure to generate content
    if (!geminiData.candidates || geminiData.candidates.length === 0) {
        throw new Error("AI failed to generate a response. The prompt might be too complex or the model timed out.");
    }

    const analysisText = geminiData.candidates[0].content.parts[0].text;
    let analysis;
    try {
        analysis = JSON.parse(analysisText);
    } catch (e) {
        console.error("Failed to parse AI response JSON:", analysisText);
        throw new Error("AI returned invalid JSON format.");
    }

    // Map the new fields to the expected output structure
    const result = {
      ...analysis,
      original_price: analysis.price,
      original_currency: analysis.currency,
      pricing_type: analysis.pricingType || 'one_time',
      billing_interval: analysis.billingInterval || null,
      inventory: analysis.inventory ?? 10, // Ensure inventory is set
      tokenUsage: geminiData.usageMetadata,
      currency_preferences: {
        original_currency: analysis.currency,
        display_currency: userCurrency,
        is_converted: false
      }
    };

    if (geminiData.usageMetadata) {
    }

    return new Response(JSON.stringify(result), { 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
    });

  } catch (error) {
    console.error('Classifier Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});