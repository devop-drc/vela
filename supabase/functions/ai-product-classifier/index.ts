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
  You are an expert AI product analyst for e-commerce. Your job is to extract MAXIMUM product information from Instagram post captions. Captions may be in Albanian, English, or mixed. You MUST understand Albanian product terms (e.g., "Çmimi" = Price, "Ngjyra" = Color, "Madhësia" = Size, "Materiali" = Material, "Sasi" = Quantity/Stock, "Transporti" = Shipping, "Porosit" = Order).

  **Primary Directive:** Thoroughly analyze the caption to extract every possible product detail. Use Google Search to find real specifications for identifiable products (e.g., if the caption mentions "iPhone 16 Pro", search for its actual specs). If the caption is sparse, use the product name as your search query.
  
  **Input Caption:**
  ---
  ${caption}
  ---
  
  **EXTRACTION RULES — Follow ALL of these carefully:**

  1. **Product Identification:** If there is ANY indication of a product, item, or service, treat it as a product post. Only return \`{"isProductPost": false}\` for clearly personal content (selfies, quotes, memes, holiday greetings).
     - Sales/promotions: set \`"isSaleOrPromotion": true\` with a \`promotion\` object.

  2. **productName:** Extract a clear, concise product name (max 10 words). Remove emojis, hashtags, and promotional text. If in Albanian, translate to English for the name.

  3. **categoryName:** ALWAYS assign a specific category. Choose from: "Clothing & Apparel", "Electronics & Tech", "Home & Living", "Beauty & Personal Care", "Art & Handmade", "Food & Beverages", "Sports & Fitness", "Books & Media", "Services", "Automotive & Parts", "Toys & Games", "Pet Supplies", "Bags & Luggage". Or create a fitting category if none match. NEVER return "Uncategorized".

  4. **typeName:** ALWAYS assign a specific product type within the category (e.g., "T-Shirts", "Smartphones", "Skincare"). NEVER return "General".

  5. **description:** Write a compelling 3-4 sentence product description in English that would attract customers. Do NOT just copy the caption. Describe the product's key features, benefits, and use cases. This must be a professional e-commerce description.

  6. **price:** Extract from caption. Look for patterns like "1500 ALL", "1500 Lek", "€25", "$30", "Çmimi: 1500". If no price found, set to 0.

  7. **currency:** "ALL" (Albanian Lek) by default. Use "EUR", "USD", etc. if explicitly stated.

  8. **inventory:** Extract from caption (e.g., "5 copë", "stock: 10", "sasi e limituar"). Default to 10.

  9. **pricingType:** "one_time" (default) or "subscription".

  10. **tags:** Generate 3-5 relevant English tags for SEO. Include product type, material, use case.

  11. **specifications:** ALWAYS include at least 3-5 specs. Extract from caption AND use Google Search for identifiable products. Return as array: \`[{"key": "material", "value": "Cotton", "unit": null}]\`. For electronics: processor, battery, screen size, weight, etc. For clothing: material, fit, care instructions, etc.

  12. **options:** Include customer-selectable variants found in caption (colors, sizes, etc.). Return as: \`{"Color": [{"value": "Black", "price_difference": 0, "inventory": 10}]}\`. If caption mentions colors (ngjyra) or sizes (madhësi), extract them.

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

  **REQUIRED FIELDS for product posts — you MUST include ALL of these:**
  - "isProductPost": true
  - "productName": string (max 10 words, clear and concise)
  - "categoryName": string (e.g., "Clothing & Apparel", "Electronics & Tech", "Beauty & Personal Care", "Home & Living", "Food & Beverages", "Sports & Fitness", "Bags & Luggage", etc.)
  - "typeName": string (e.g., "T-Shirts", "Smartphones", "Skincare", "Furniture", etc.)
  - "description": string (compelling 3-4 sentence product description, NOT the raw caption)
  - "price": number (extracted from caption, or estimated from product type, or 0 if unknown)
  - "currency": string (e.g., "ALL", "EUR", "USD")
  - "inventory": number (default 10 if not mentioned)
  - "pricingType": "one_time" or "subscription"
  - "tags": string[] (3-5 relevant tags)
  - "specifications": array of {key, value, unit} — ALWAYS include at least basic specs like material, dimensions, weight etc. Use Google Search to find real specs if the product is identifiable.
  - "options": object — include common customer-selectable options (color, size, etc.) if applicable

  **Example JSON (Single Product — ALL fields required):**
  {
    "isProductPost": true,
    "productName": "Titanium Smartwatch Pro",
    "categoryName": "Electronics & Tech",
    "typeName": "Smartwatches",
    "description": "The Titanium Smartwatch Pro combines elegant design with cutting-edge fitness tracking. Features a vibrant 1.4-inch AMOLED display and up to 14 days of battery life. Water-resistant to 5ATM, perfect for swimming and outdoor activities.",
    "price": 199,
    "currency": "USD",
    "inventory": 10,
    "pricingType": "one_time",
    "tags": ["smartwatch", "fitness tracker", "wearable", "titanium"],
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
      { "key": "weight", "value": "52", "unit": "grams" },
      { "key": "connectivity", "value": "Bluetooth 5.2", "unit": null },
      { "key": "os", "value": "Wear OS", "unit": null }
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

    // Call Gemini WITHOUT Google Search grounding for speed (grounding adds 5-15s per call)
    // Specs are found later via the find-product-specs waterfall
    const abortController = new AbortController();
    const geminiTimeout = setTimeout(() => abortController.abort(), 25000); // 25s timeout
    const geminiResponse = await fetch(getGeminiUrl('flash'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: requestParts }],
        generationConfig: { responseMimeType: "application/json" }
      }),
      signal: abortController.signal,
    });
    clearTimeout(geminiTimeout);

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

    // Flag if this analysis might benefit from image retry (used by caller for async retry)
    const needsImageRetry = !usedImages && (
      (analysis.isProductPost === false && post_media?.media_url) ||
      (analysis.isProductPost === true && (!analysis.productName || analysis.price === null || analysis.price === undefined))
    );
    if (needsImageRetry) {
      analysis._needsImageRetry = true;
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

    // Validate and default required fields
    if (analysis.isProductPost) {
      if (!analysis.productName) analysis.productName = caption?.split('\n')[0]?.slice(0, 60) || 'Unknown Product';
      if (!analysis.categoryName) analysis.categoryName = 'Uncategorized';
      if (!analysis.typeName) analysis.typeName = 'General';
      // Description must be AI-generated, NOT the raw caption
      if (!analysis.description || analysis.description === caption) {
        const name = analysis.productName || 'This product';
        const cat = analysis.categoryName || '';
        const type = analysis.typeName || '';
        analysis.description = `${name} is a high-quality ${type.toLowerCase()} in the ${cat.toLowerCase()} category. ${caption ? 'Originally described as: ' + caption.slice(0, 150) : ''}`.trim();
      }
      if (!analysis.currency) analysis.currency = 'ALL';
      if (!analysis.tags || !Array.isArray(analysis.tags)) analysis.tags = [];
      if (analysis.price === undefined || analysis.price === null) analysis.price = 0;
      if (analysis.inventory === undefined || analysis.inventory === null) analysis.inventory = 10;
      if (!analysis.pricingType) analysis.pricingType = 'one_time';
      if (!analysis.specifications) analysis.specifications = [];
      if (!analysis.options) analysis.options = {};
    }

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