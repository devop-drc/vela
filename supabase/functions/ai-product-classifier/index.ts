import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

function getGeminiUrl(model: 'flash' | 'pro' = 'flash'): string {
  const modelId = model === 'flash' ? 'gemini-2.5-flash' : 'gemini-2.5-pro';
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`;
}

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
  You are an expert AI for e-commerce, specializing in analyzing Instagram captions and using Google Search to find detailed product information.
  
  **Primary Directive:** Use Google Search to find accurate specifications, options, and variants for the product mentioned in the caption. If the caption is sparse, the product name alone is your primary search query.
  
  **Input Caption:**
  ---
  ${caption}
  ---
  
  **Primary Objectives:**
  1. **Product Identification:** Determine if the post is selling a product. If not, return \`{"isProductPost": false}\`.
     - If the post is primarily about a sale, discount, promotion, event, or offer (e.g., lists multiple products with prices, or general promo without a specific product), set \`"isSaleOrPromotion": true\` and provide a summary \`promotion\` object.
  2. **Product Name:** Extract the clearest and most concise product name directly from the caption (max 10 words).
  3. **Category & Type:** Determine the most specific category and type based on the product name and caption content.
  4. **Pricing Model:**
     - Determine \`pricingType\`: "one_time" or "subscription". Default to "one_time".
     - If "subscription", determine \`billingInterval\`: "month" or "year". Default to "month".
  5. **Price Extraction:** Extract the numerical base price and the currency code (e.g., USD, EUR, ALL). **If a price and currency are present in the caption, use them.** Default currency to "ALL" if none is specified.
  6. **Inventory/Stock:** Infer \`inventory\` (base stock) as an integer. If stock is mentioned (e.g., "only 5 left"), use that number. Defaults to 10 if not mentioned but clearly a product.
  7. **Attributes Extraction (Crucial):**

     CRITICAL DISTINCTION between specifications and options:

     SPECIFICATIONS are fixed product attributes that describe what the product IS. The customer CANNOT change these.
       Examples: material, processor, screen_size, battery_mah, weight, dimensions
       Return as: "specifications": [{"key": "material", "value": "Cotton", "unit": null}, {"key": "weight", "value": "200", "unit": "grams"}]

     OPTIONS are attributes the customer CHOOSES when purchasing. These create variant combinations.
       Examples: color, size, storage capacity, RAM amount
       Return as: "options": {"Size": [{"value": "M", "price_difference": 0, "inventory": 10}], "Color": [...]}

     Do NOT put customer-selectable attributes in specifications. Do NOT put fixed attributes in options.

     - **Specifications (Fixed Details):** An array of spec objects with key, value, and optional unit. Use snake_case for keys. Use Google Search to find standard specs for the product.
     - **Options (Metadata-Rich Variants):** A map of customer-selectable options (e.g., Color, Size). Each option should be an object containing values and their specific impact on price and stock. Search for common variants of this product.
       \`\`\`json
       "options": {
         "color": [
           { "value": "Red", "price_difference": 0, "inventory": 10 },
           { "value": "Gold", "price_difference": 500, "inventory": 2 }
         ]
       }
       \`\`\`
     - **Individual Variants (Optional):** If the caption specifies exact combinations (e.g., "XL Blue only"), provide them in the \`variants\` array.
  8. **Description:** Generate a compelling, detailed 3-4 sentence description.
  9. **Tags:** Generate 3-5 relevant tags.

  **Multi-Product Posts:** If the caption lists multiple products, output them in a \`products\` array. Each item follows this schema:
  {
    "productName": string,
    "price": number | null,
    "currency": string | null,
    "inventory": number | null,
    "specifications": Array<{ key: string, value: string, unit: string | null }>,
    "options": Record<string, Array<{ value: string, price_difference: number, inventory: number }>>,
    "variants": Array<{ option_values: Record<string, string>, price_difference: number, inventory: number, is_active: boolean }>
  }

  **Sales/Promotions:** If the post is primarily a sale/discount without specific product details, include a \`promotion\` object.

  **Currency Handling:**
  - If the caption includes "ALL", "Lek", or "Lekë", use "ALL".
  - For other currencies, use standard codes: USD, EUR, GBP, etc.
  - If no currency is specified, default to "ALL".

  **User-Defined Keywords:**
  ${keywords.length > 0 ? keywords.map(k => `- **${k.keyword}:** ${k.description}`).join('\n') : 'No custom keywords provided.'}

  ${similarProductsContext}

  **Output Format:**
  Respond ONLY with a single, valid JSON object. Do not include any explanation or markdown.

  **Example JSON (Single Product with options):**
  {
    "isProductPost": true,
    "productName": "Titanium Smartwatch Pro",
    "categoryName": "Electronics",
    "typeName": "Smartwatch",
    "price": 199,
    "currency": "USD",
    "options": {
      "strap_material": [
        { "value": "Silicone", "price_difference": 0, "inventory": 20 },
        { "value": "Titanium Link", "price_difference": 50, "inventory": 5 }
      ],
      "color": [
        { "value": "Midnight Black", "price_difference": 0, "inventory": 15 },
        { "value": "Starlight Silver", "price_difference": 0, "inventory": 10 }
      ]
    },
    "specifications": [
      { "key": "water_resistance", "value": "5ATM", "unit": null },
      { "key": "battery_life", "value": "14", "unit": "days" },
      { "key": "display_size", "value": "1.4", "unit": "inches" },
      { "key": "weight", "value": "52", "unit": "grams" }
    ]
  }

  
  **EXAMPLE JSON OUTPUT (Multiple products):**
  {
    "isProductPost": true,
    "isSaleOrPromotion": false,
    "products": [
      {
        "productName": "Kufje Smart",
        "price": 250,
        "currency": "ALL",
        "inventory": 150,
        "specifications": [{ "key": "ref_code", "value": "x3185794", "unit": null }],
        "options": { "color": ["Black", "White"], "size": ["S", "M", "L"] },
        "variants": [
          { "option_values": { "color": "Black", "size": "M" }, "inventory": 10, "is_active": true },
          { "option_values": { "color": "White", "size": "M" }, "inventory": 8, "is_active": true }
        ],
        "required": true,
        "min_qty": 1,
        "max_qty": 2,
        "media_url": null
      },
      {
        "productName": "Kabell USB-C",
        "price": 10,
        "currency": "ALL",
        "inventory": 250,
        "specifications": [{ "key": "ref_code", "value": "x3185494", "unit": null }],
        "options": {},
        "variants": [],
        "required": false,
        "min_qty": 0,
        "max_qty": 3,
        "media_url": null
      }
    ]
  }

  **EXAMPLE JSON OUTPUT (Promotion only):**
  {
    "isProductPost": false,
    "isSaleOrPromotion": true,
    "promotion": {
      "title": "Back to School Sale",
      "summary": "Up to 20% off on laptops and accessories",
      "discount_type": "percent",
      "discount_value": 20,
      "currency": "EUR",
      "valid_until": null
    }
  }
  
  **FOR NON-PRODUCT POSTS:**
  {
    "isProductPost": false
  }
`;
}

const toTitleCase = (str: string) => str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 4 * 1024 * 1024) return null;
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > 4 * 1024 * 1024) return null;
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    return { data: base64, mimeType };
  } catch {
    return null;
  }
}

async function getPostMedia(
  post: { media_url?: string; thumbnail_url?: string; media_type?: string; id?: string },
  accessToken?: string
): Promise<Array<{ inline_data: { mime_type: string; data: string } }>> {
  const parts: Array<{ inline_data: { mime_type: string; data: string } }> = [];
  if (post.media_type === 'VIDEO') {
    if (post.thumbnail_url) {
      const img = await fetchImageAsBase64(post.thumbnail_url);
      if (img) parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
    }
  } else if (post.media_type === 'CAROUSEL_ALBUM' && post.id && accessToken) {
    try {
      const childrenRes = await fetch(
        `https://graph.instagram.com/${post.id}/children?fields=id,media_url,media_type,thumbnail_url&access_token=${accessToken}`
      );
      const children = await childrenRes.json();
      const items = (children.data || []).slice(0, 3);
      for (const child of items) {
        const url = child.media_type === 'VIDEO' ? child.thumbnail_url : child.media_url;
        if (url) {
          const img = await fetchImageAsBase64(url);
          if (img) parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
        }
      }
    } catch { /* graceful degradation */ }
  } else if (post.media_url) {
    const img = await fetchImageAsBase64(post.media_url);
    if (img) parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
  }
  return parts;
}

function isCaptionInsufficient(caption: string | null): boolean {
  if (!caption || caption.trim().length === 0) return true;
  if (caption.trim().length < 20) return true;
  const words = caption.trim().split(/\s+/);
  if (words.every(w => w.startsWith('#'))) return true;
  if (!/[a-zA-Z0-9]/.test(caption)) return true;
  const pricePattern = /\b(ALL|EUR|USD|GBP|Lek|Leke)\b|\d+[\.,]?\d*\s?(ALL|EUR|USD|GBP|€|\$)/i;
  if (!pricePattern.test(caption)) return true;
  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!GEMINI_API_KEY) throw new Error("Gemini API key is not configured.");
    const { caption, user_id, target_currency = 'EUR', include_images, post_media, access_token } = await req.json();
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

    const promptText = getClassifierPrompt(caption, keywords || [], similarProducts);

    // Determine if we should include images in this request
    let usedImages = false;
    const shouldIncludeImages = include_images || isCaptionInsufficient(caption);
    let imageParts: Array<{ inline_data: { mime_type: string; data: string } }> = [];
    if (shouldIncludeImages && post_media) {
      const mediaObj = {
        media_url: post_media.media_url,
        thumbnail_url: post_media.thumbnail_url,
        media_type: post_media.media_type,
        id: post_media.post_id,
      };
      imageParts = await getPostMedia(mediaObj, access_token);
    }

    let finalPrompt = promptText;
    if (imageParts.length > 0) {
      usedImages = true;
      finalPrompt += '\n\nIMPORTANT: The caption for this post is insufficient or missing. Product images have been provided.\nAnalyze the images carefully to identify:\n- The product(s) shown (name, type, brand if visible)\n- Visual attributes (color, material, condition)\n- Any text visible in the image (price tags, labels, brand names)\n- Product category based on visual appearance\nCombine image analysis with any caption text available to produce the most accurate product details.';
    }

    const requestParts = [{ text: finalPrompt }, ...imageParts];

    const geminiResponse = await fetch(getGeminiUrl('flash'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: requestParts }],
        tools: [{ google_search: {} }], // Enable grounding
        generationConfig: { responseMimeType: "application/json" }
      }),
    });

    if (!geminiResponse.ok) throw new Error(`Gemini API error: ${await geminiResponse.text()}`);
    const geminiData = await geminiResponse.json();
    
    // Check for empty candidates array which indicates a failure to generate content
    if (!geminiData.candidates || geminiData.candidates.length === 0) {
        throw new Error("AI failed to generate a response. The prompt might be too complex or the model timed out.");
    }

    const analysisText = geminiData.candidates[0].content.parts[0].text;
    let analysis: any;
    try {
        analysis = JSON.parse(analysisText);
    } catch (e) {
        console.error("Failed to parse AI response JSON:", analysisText);
        throw new Error("AI returned invalid JSON format.");
    }

    // Check if retry with images is needed
    const needsImageRetry = !usedImages && (
      (analysis.isProductPost === false && post_media?.media_url) ||
      (analysis.isProductPost === true && (!analysis.productName || analysis.price === null || analysis.price === undefined))
    );

    if (needsImageRetry && post_media) {
      const retryMediaObj = {
        media_url: post_media.media_url,
        thumbnail_url: post_media.thumbnail_url,
        media_type: post_media.media_type,
        id: post_media.post_id,
      };
      const retryImageParts = await getPostMedia(retryMediaObj, access_token);
      if (retryImageParts.length > 0) {
        // Rebuild prompt with image analysis instruction
        const retryPromptText = promptText + '\n\nIMPORTANT: The caption for this post is insufficient or missing. Product images have been provided.\nAnalyze the images carefully to identify:\n- The product(s) shown (name, type, brand if visible)\n- Visual attributes (color, material, condition)\n- Any text visible in the image (price tags, labels, brand names)\n- Product category based on visual appearance\nCombine image analysis with any caption text available to produce the most accurate product details.';

        const retryParts = [{ text: retryPromptText }, ...retryImageParts];
        const retryResponse = await fetch(getGeminiUrl('flash'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: retryParts }],
            tools: [{ google_search: {} }],
            generationConfig: { responseMimeType: "application/json" }
          })
        });
        const retryData = await retryResponse.json();
        const retryText = retryData.candidates?.[0]?.content?.parts?.[0]?.text;
        if (retryText) {
          try {
            const retryAnalysis = JSON.parse(retryText);
            if (retryAnalysis.isProductPost || retryAnalysis.productName) {
              analysis = retryAnalysis; // Use the better result
            }
          } catch { /* keep original analysis */ }
        }
      }
    }

    // Heuristic parser for multi-product captions of the form:
    // Name\nRef. Code: XXX (optional)\nÇmimi: 250EUR\nStock: 5 units
    const parseMultiProducts = (cap?: string): Array<{ productName: string; price?: number; currency?: string; inventory?: number; specifications?: Record<string, string> }> => {
      if (!cap) return [];
      const blocks = cap.split(/\n\s*\n+/).map(b => b.trim()).filter(Boolean);
      const items: Array<{ productName: string; price?: number; currency?: string; inventory?: number; specifications?: Record<string, string> }> = [];
      for (const block of blocks) {
        const lines = block.split(/\n+/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) continue;
        const name = lines[0];
        let refCode: string | undefined;
        let price: number | undefined;
        let currency: string | undefined;
        let inventory: number | undefined;
        for (const line of lines.slice(1)) {
          const refMatch = line.match(/ref\.?\s*code\s*:\s*([A-Za-z0-9\-]+)/i);
          if (refMatch) refCode = refMatch[1];
          const priceMatch = line.match(/çmimi\s*:\s*([0-9]+(?:[\.,][0-9]+)?)\s*([A-Za-z]{3})/i) || line.match(/price\s*:\s*([0-9]+(?:[\.,][0-9]+)?)\s*([A-Za-z]{3})/i);
          if (priceMatch) { price = parseFloat(priceMatch[1].replace(',', '.')); currency = priceMatch[2].toUpperCase(); }
          const stockMatch = line.match(/stock\s*:\s*([0-9]+)/i);
          if (stockMatch) inventory = parseInt(stockMatch[1]);
        }
        const hasSignal = (price !== undefined && !!currency) || inventory !== undefined;
        if (hasSignal) {
          items.push({ productName: name, price, currency, inventory, specifications: refCode ? { ref_code: refCode } : undefined });
        }
      }
      return items;
    };

    // Normalize: convert numeric-keyed items ("0","1",...) into products[]
    if (!Array.isArray(analysis.products)) {
      const numericKeys = Object.keys(analysis).filter(k => /^\d+$/.test(k));
      if (numericKeys.length > 0) {
        const products = numericKeys
          .map(k => analysis[k])
          .filter((v: any) => v && (v.productName || v.name));
        if (products.length > 0) analysis.products = products;
      }
    }
    // Fallback: if AI missed products[] or set isProductPost false, try heuristic parser
    if (!Array.isArray(analysis.products) || analysis.products.length === 0 || analysis.isProductPost === false) {
      const parsed = parseMultiProducts(caption);
      if (parsed.length > 1) {
        analysis.products = parsed;
        analysis.isProductPost = true;
      }
    }
    // Flags: ensure isProductPost when products exist, and set isMultiProductPost
    const hasProducts = Array.isArray(analysis.products) && analysis.products.length > 0;
    if (hasProducts) analysis.isProductPost = true;
    const isMultiProductPost = hasProducts && analysis.products.length > 1;

    // Map the new fields to the expected output structure
    const result = {
      ...analysis,
      isProductPost: Boolean(analysis.isProductPost),
      isMultiProductPost,
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