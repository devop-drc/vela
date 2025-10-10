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

  **Primary Objectives:**
  1. **Currency Detection:** Pay close attention to the currency mentioned in the caption (e.g., ALL, $, €, £). If no currency is specified, default to the local currency (ALL for Albania).
  2. **Product Identification:** Determine if the post is selling a product. If not, return \`{"isProductPost": false}\`.
  3. **Product Name:** Extract a clear and concise product name. If the product has a model number or specific identifier, include it.
  4. **Category & Type:** Determine the most specific category and type based on the product name and description.
  5. **Price Extraction:**
     - Look for price patterns like "1000 ALL", "$10", "10€"
     - If multiple prices are found, use the one that appears to be the main product price
     - If no price is found, set price to null
  6. **Specifications vs Options:**
     - **Specifications (fixed details):** Material, dimensions, weight, model number, compatibility, features
     - **Options (customer choices):** Size, color, quantity, style, configuration
  7. **Attributes Extraction:**
     - Extract all relevant attributes from the caption
     - Use the user-defined keywords as primary guides
     - For each attribute, include:
         - \`"name"\`: Lowercase, snake_case key (e.g., "material", "screen_size")
         - \`"value"\`: Extracted value(s) as string or array
         - \`"inputType"\`: "text", "number", "color", "tags", "dropdown", "textarea"
         - \`"isOption"\`: true if customer-selectable (size, color), false for fixed specs
         - \`"possibleValues"\`: Array of options if applicable
  8. **Description:** Create a compelling 2-3 sentence description highlighting key features and benefits
  9. **Tags:** Generate 3-5 relevant tags for search and categorization
  10. **Subscription Details (if applicable):** If the product is a subscription, extract \`pricing_type\` as "subscription", \`billing_interval\` (e.g., "month", "year"), and \`interval_repetitions\` (number of intervals, e.g., 12 for a yearly subscription billed monthly for a year). Default \`interval_repetitions\` to 1 if not specified.

  **Currency Handling:**
  - If the caption includes "ALL", "Lek", or "Lekë", use "ALL" as currency
  - For other currencies, use standard codes: USD, EUR, GBP, etc.
  - If no currency is specified, default to "ALL"

  **Common Albanian Product Terms:**
  - Çmimi/Çmimi: Price
  - Madhësia: Size
  - Ngjyra: Color
  - Materiali: Material
  - Përmasat: Dimensions
  - Pesha: Weight
  - Përshkrimi: Description

  **User-Defined Keywords:**
  ${keywords.length > 0 ? keywords.map(k => `- **${k.keyword}:** ${k.description}`).join('\n') : 'No custom keywords provided.'}

  ${similarProductsContext}

  **Output Format:**
  Respond ONLY with a single, valid JSON object. Do not include any explanation or markdown.

  **INPUT CAPTION:**
  \`\`\`
  ${caption}
  \`\`\`

  **EXAMPLE JSON OUTPUT:**
  {
    "isProductPost": true,
    "productName": "iPhone 13 Pro Max 256GB",
    "description": "Experience cutting-edge technology with the iPhone 13 Pro Max. Features a stunning Super Retina XDR display, powerful A15 Bionic chip, and professional camera system for breathtaking photos and videos.",
    "categoryName": "Electronics",
    "typeName": "Smartphone",
    "price": 150000,
    "currency": "ALL",
    "tags": ["iphone", "smartphone", "apple", "pro", "5g"],
    "pricing_type": "one_time",
    "attributes": [
      { "name": "storage", "value": "256GB", "inputType": "dropdown", "isOption": true, "possibleValues": ["128GB", "256GB", "512GB"] },
      { "name": "color", "value": ["Graphite", "Silver", "Gold", "Sierra Blue"], "inputType": "dropdown", "isOption": true },
      { "name": "screen_size", "value": "6.7 inches", "inputType": "text", "isOption": false },
      { "name": "camera", "value": "Pro 12MP camera system (Telephoto, Wide, Ultra Wide)", "inputType": "text", "isOption": false },
      { "name": "battery_life", "value": "Up to 28 hours video playback", "inputType": "text", "isOption": false },
      { "name": "condition", "value": "New", "inputType": "dropdown", "isOption": true, "possibleValues": ["New", "Refurbished", "Used"] },
      { "name": "warranty", "value": "2 years", "inputType": "text", "isOption": false }
    ]
  }
  
  **EXAMPLE JSON OUTPUT FOR SUBSCRIPTION:**
  {
    "isProductPost": true,
    "productName": "Premium Coffee Subscription",
    "description": "Receive freshly roasted coffee beans delivered to your door every month. Choose your blend and grind preference.",
    "categoryName": "Food & Beverage",
    "typeName": "Coffee Subscription",
    "price": 25,
    "currency": "USD",
    "tags": ["coffee", "subscription", "gourmet"],
    "pricing_type": "subscription",
    "billing_interval": "month",
    "interval_repetitions": 6,
    "attributes": [
      { "name": "blend", "value": ["Arabica", "Robusta", "Espresso"], "inputType": "dropdown", "isOption": true },
      { "name": "grind", "value": ["Whole Bean", "Filter", "Espresso"], "inputType": "dropdown", "isOption": true }
    ]
  }

  **FOR NON-PRODUCT POSTS:**
  {
    "isProductPost": false
  }
`;
}

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

    // Get user's preferred currency
    const { data: userData, error: userError } = await supabaseAdmin
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
    const analysisText = geminiData.candidates[0].content.parts[0].text;
    let analysis = JSON.parse(analysisText);

    // Store the original price and currency as extracted
    // The conversion will be handled in the UI based on user's display currency
    const result = {
      ...analysis,
      original_price: analysis.price,
      original_currency: analysis.currency,
      is_price_converted: false,
      tokenUsage: geminiData.usageMetadata,
      currency_preferences: {
        original_currency: analysis.currency,
        display_currency: userCurrency,
        is_converted: false
      }
    };

    if (geminiData.usageMetadata) {
      console.log(`AI Product Classifier Token Usage: Prompt: ${geminiData.usageMetadata.promptTokenCount}, Candidates: ${geminiData.usageMetadata.candidatesTokenCount}`);
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