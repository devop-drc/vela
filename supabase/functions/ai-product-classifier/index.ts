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

// ── Structured output schema ───────────────────────────────────────────────────
// Guarantees the response SHAPE at the API level: no numeric-keyed objects, no
// markdown-wrapped JSON, no invented field names. Options are an array of
// { name, values[] } groups (Gemini schemas can't express dynamic map keys);
// they're converted back to the legacy { Name: [...] } map after parsing.
const SPEC_SCHEMA = {
  type: 'OBJECT',
  properties: {
    key: { type: 'STRING' },
    value: { type: 'STRING' },
    unit: { type: 'STRING', nullable: true },
  },
  required: ['key', 'value'],
};
const OPTION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    values: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          value: { type: 'STRING' },
          price_difference: { type: 'NUMBER', nullable: true },
          inventory: { type: 'INTEGER', nullable: true },
        },
        required: ['value'],
      },
    },
  },
  required: ['name', 'values'],
};
/** Deterministic type→category fallback for when the model fills typeName but
    not categoryName (a failure mode observed in production). Keyword-based so
    "Gaming Laptops" or "Smart TV 55&quot;" still land in the right bucket. */
const CATEGORY_KEYWORDS: Array<[RegExp, string]> = [
  [/phone|tablet|laptop|computer|pc\b|monitor|tv\b|television|headphone|earbud|speaker|camera|drone|console|watch|smart|electronic|charger|router|printer|keyboard|mouse|gpu|cpu|appliance/i, 'Electronics & Tech'],
  [/app\b|application|software|saas|subscription|digital|license/i, 'Software & Apps'],
  [/shirt|dress|jean|pant|jacket|coat|hoodie|sweater|skirt|suit|sock|underwear|lingerie|clothing|apparel|fashion|shoe|sneaker|boot|sandal|heel/i, 'Clothing & Apparel'],
  [/bag\b|handbag|backpack|luggage|suitcase|wallet|purse/i, 'Bags & Luggage'],
  [/ring\b|necklace|bracelet|earring|jewel|jewelry/i, 'Jewelry & Accessories'],
  [/cream|serum|makeup|lipstick|perfume|fragrance|shampoo|cosmetic|skincare|beauty|nail/i, 'Beauty & Personal Care'],
  [/sofa|chair|table|desk|lamp|rug|curtain|furniture|decor|pillow|bedding|kitchen|cookware|vase/i, 'Home & Living'],
  [/toy\b|game\b|lego|puzzle|doll|tricycle|scooter(?!.*electric)|playset|board game/i, 'Toys & Games'],
  [/bike|bicycle|treadmill|dumbbell|yoga|fitness|sport|gym|ball\b|racket|ski|snowboard/i, 'Sports & Fitness'],
  [/coffee|tea\b|chocolate|snack|wine|beer|juice|food|beverage|honey|cake|pastry/i, 'Food & Beverages'],
  [/book|novel|magazine|vinyl|album|media/i, 'Books & Media'],
  [/car\b|auto|tire|engine|motorcycle|vehicle|part\b/i, 'Automotive & Parts'],
  [/dog\b|cat\b|pet\b|aquarium|leash|litter/i, 'Pet Supplies'],
  [/service|consult|repair|cleaning|design\b|course|class\b|training/i, 'Services'],
  [/art\b|painting|sculpture|handmade|craft|ceramic|print\b/i, 'Art & Handmade'],
];

const inferCategoryFromType = (typeName?: string | null, productName?: string | null): string | null => {
  const hay = `${typeName || ''} ${productName || ''}`.trim();
  if (!hay) return null;
  for (const [re, cat] of CATEGORY_KEYWORDS) {
    if (re.test(hay)) return cat;
  }
  return null;
};

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    isProductPost: { type: 'BOOLEAN' },
    isSaleOrPromotion: { type: 'BOOLEAN', nullable: true },
    productName: { type: 'STRING', nullable: true },
    productNameSq: { type: 'STRING', nullable: true },
    categoryName: { type: 'STRING', nullable: true },
    typeName: { type: 'STRING', nullable: true },
    description: { type: 'STRING', nullable: true },
    descriptionSq: { type: 'STRING', nullable: true },
    price: { type: 'NUMBER', nullable: true },
    currency: { type: 'STRING', nullable: true },
    inventory: { type: 'INTEGER', nullable: true },
    pricingType: { type: 'STRING', enum: ['one_time', 'subscription'], nullable: true },
    billingInterval: { type: 'STRING', enum: ['month', 'year'], nullable: true },
    tags: { type: 'ARRAY', items: { type: 'STRING' }, nullable: true },
    specifications: { type: 'ARRAY', items: SPEC_SCHEMA, nullable: true },
    options: { type: 'ARRAY', items: OPTION_SCHEMA, nullable: true },
    products: {
      type: 'ARRAY',
      nullable: true,
      items: {
        type: 'OBJECT',
        properties: {
          productName: { type: 'STRING' },
          productNameSq: { type: 'STRING', nullable: true },
          categoryName: { type: 'STRING', nullable: true },
          typeName: { type: 'STRING', nullable: true },
          price: { type: 'NUMBER', nullable: true },
          currency: { type: 'STRING', nullable: true },
          inventory: { type: 'INTEGER', nullable: true },
          specifications: { type: 'ARRAY', items: SPEC_SCHEMA, nullable: true },
          options: { type: 'ARRAY', items: OPTION_SCHEMA, nullable: true },
        },
        required: ['productName'],
      },
    },
    promotion: {
      type: 'OBJECT',
      nullable: true,
      properties: {
        title: { type: 'STRING' },
        summary: { type: 'STRING', nullable: true },
        discount_type: { type: 'STRING', enum: ['percent', 'amount'], nullable: true },
        discount_value: { type: 'NUMBER', nullable: true },
        currency: { type: 'STRING', nullable: true },
        valid_until: { type: 'STRING', nullable: true },
      },
      required: ['title'],
    },
  },
  required: ['isProductPost'],
};

/** Convert schema-shaped options ([{name, values[]}]) back to the legacy map
    shape ({ Name: values[] }) the rest of the pipeline expects. */
const optionsArrayToMap = (opts: any): any => {
  if (!Array.isArray(opts)) return opts;
  const map: Record<string, any[]> = {};
  for (const o of opts) {
    if (o?.name && Array.isArray(o.values) && o.values.length > 0) map[o.name] = o.values;
  }
  return map;
};

const getClassifierPrompt = (caption: string, keywords: { keyword: string, description: string }[], similarProducts: any[]) => {
  // Naming/categorization style ONLY — deliberately no attributes, specs or
  // descriptions: including them made the model COPY one product's features
  // into every other product it analyzed.
  const similarProductsContext = similarProducts.length > 0 ? `
**The user's existing catalog (use ONLY to match their category/type naming style — NEVER copy attributes, specs or features from these into the new product):**
${similarProducts.map(p => `- ${p.name} (Category: ${p.category}${p.details?.type ? `, Type: ${p.details.type}` : ''})`).join('\n')}
` : '';

  return `
  You are an expert AI product analyst for e-commerce. Your job is to extract MAXIMUM product information from Instagram post captions. Captions may be in Albanian, English, or mixed. You MUST understand Albanian product terms (e.g., "Çmimi" = Price, "Ngjyra" = Color, "Madhësia" = Size, "Materiali" = Material, "Sasi" = Quantity/Stock, "Transporti" = Shipping, "Porosit" = Order).

  **Primary Directive:** Thoroughly analyze the caption to extract every possible product detail. For well-known, clearly identifiable products (e.g., "iPhone 16 Pro"), you may add widely known factual specifications from your knowledge. NEVER invent or guess specifications for unknown or generic products — only extract what the caption (and images, if provided) actually state.
  
  **Input Caption:**
  ---
  ${caption}
  ---
  
  **EXTRACTION RULES — Follow ALL of these carefully:**

  1. **Product Identification:** If there is ANY indication of a product, item, or service, treat it as a product post. Only return \`{"isProductPost": false}\` for clearly personal content (selfies, quotes, memes, holiday greetings).
     - Sales/promotions: set \`"isSaleOrPromotion": true\` with a \`promotion\` object.

  2. **productName:** Extract a clear, concise product name (max 10 words). Remove emojis, hashtags, and promotional text. If in Albanian, translate to English for the name.

  2b. **productNameSq:** The SAME product name in natural Albanian (max 10 words). Keep brand names, model numbers and established loanwords exactly as-is (e.g. "template" stays "template", never "shabllon"; "smartphone" stays "smartphone"). If the caption was Albanian, prefer the merchant's own wording.

  3. **categoryName:** ALWAYS assign a specific category — top-level AND on every item inside "products" for multi-product posts. Choose from: "Clothing & Apparel", "Electronics & Tech", "Home & Living", "Beauty & Personal Care", "Art & Handmade", "Food & Beverages", "Sports & Fitness", "Books & Media", "Services", "Automotive & Parts", "Toys & Games", "Pet Supplies", "Bags & Luggage". Or create a fitting category if none match. NEVER return "Uncategorized".

  4. **typeName:** ALWAYS assign a specific product type within the category (e.g., "T-Shirts", "Smartphones", "Skincare"). NEVER return "General".

  5. **description:** Write a compelling 3-4 sentence product description in English that would attract customers. Do NOT just copy the caption. Describe the product's key features, benefits, and use cases. This must be a professional e-commerce description.

  5b. **descriptionSq:** The same description written natively in Albanian (not a word-for-word translation) — same length and quality, correct diacritics (ë, ç). Keep brand names and established loanwords as-is ("template" stays "template", never "shabllon").

  6. **price:** Extract from caption. Look for patterns like "1500 ALL", "1500 Lek", "€25", "$30", "Çmimi: 1500". If no price found, set to 0.

  7. **currency:** "ALL" (Albanian Lek) by default. Use "EUR", "USD", etc. if explicitly stated.

  8. **inventory:** Extract from caption (e.g., "5 copë", "stock: 10", "sasi e limituar"). Default to 10.

  9. **pricingType:** "one_time" (default) or "subscription".

  10. **tags:** Generate 3-5 relevant English tags for SEO. Include product type, material, use case.

  11. **specifications:** Extract every spec stated in the caption as an array: \`[{"key": "material", "value": "Cotton", "unit": null}]\`. ALWAYS include \`brand\` and \`model\` as specs when identifiable from the caption or image. For well-known branded products you may add widely known factual specs (processor, battery, screen size…). For generic/unbranded products include ONLY what the caption or image shows — an empty array is better than invented specs (a separate enrichment step fills gaps later). Each spec belongs to THIS product only — never borrow specs from other products or examples.

  12. **options:** Include customer-selectable variants found in caption (colors, sizes, etc.). Return as an ARRAY of option groups: \`[{"name": "Color", "values": [{"value": "Black", "price_difference": 0, "inventory": 10}]}]\`. If caption mentions colors (ngjyra) or sizes (madhësi), extract them.

  **Multi-Product Posts:** If the caption lists multiple products, output them in a \`products\` array. Each item follows this schema:
  {
    "productName": string,
    "productNameSq": string | null,
    "price": number | null,
    "currency": string | null,
    "inventory": number | null,
    "specifications": Array<{ key: string, value: string, unit: string | null }>,
    "options": Array<{ name: string, values: Array<{ value: string, price_difference?: number, inventory?: number }> }>
  }

  **Sales/Promotions:** If the post is primarily a sale/discount without specific product details, include a \`promotion\` object.

  **Currency Handling:**
  - If the caption includes "ALL", "Lek", or "Lekë", use "ALL".
  - For other currencies, use standard codes: USD, EUR, GBP, etc.
  - If no currency is specified, default to "ALL".

  **User-Defined Keywords (IMPORTANT — use these to extract data):**
  ${keywords.length > 0 ? `The user has defined these keywords/symbols that appear in their captions. When you find any of these in the caption, use the description to understand what follows and extract it as a specification or option accordingly.
${keywords.map(k => `- When you see "${k.keyword}" in the caption: ${k.description}`).join('\n')}` : 'No custom keywords provided.'}

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
  - "specifications": array of {key, value, unit} — everything the caption/image states, plus widely known facts for identifiable branded products. Never fabricate.
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
    "options": [
      { "name": "strap_material", "values": [
        { "value": "Silicone", "price_difference": 0, "inventory": 20 },
        { "value": "Titanium Link", "price_difference": 50, "inventory": 5 }
      ]},
      { "name": "color", "values": [
        { "value": "Midnight Black", "price_difference": 0, "inventory": 15 },
        { "value": "Starlight Silver", "price_difference": 0, "inventory": 10 }
      ]}
    ],
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
        "options": [
          { "name": "color", "values": [{ "value": "Black" }, { "value": "White" }] },
          { "name": "size", "values": [{ "value": "S" }, { "value": "M" }, { "value": "L" }] }
        ]
      },
      {
        "productName": "Kabell USB-C",
        "price": 10,
        "currency": "ALL",
        "inventory": 250,
        "specifications": [{ "key": "ref_code", "value": "x3185494", "unit": null }],
        "options": []
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

// Per-user prompt context (keywords + recent products), cached in instance
// memory. A sync classifies dozens of posts back-to-back for the same user on
// a warm instance — re-reading the same two tables per post was pure waste.
const CONTEXT_TTL_MS = 120_000;
const contextCache = new Map<string, { t: number; keywords: any[]; similarProducts: any[] }>();

async function getUserContext(supabaseAdmin: any, userId: string): Promise<{ keywords: any[]; similarProducts: any[] }> {
  const hit = contextCache.get(userId);
  if (hit && Date.now() - hit.t < CONTEXT_TTL_MS) return hit;
  const [keywordsRes, recentRes] = await Promise.all([
    supabaseAdmin.from('keywords').select('keyword, description').eq('user_id', userId),
    supabaseAdmin.from('products').select('name, category, details, caption').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(5),
  ]);
  if (keywordsRes.error) throw keywordsRes.error;
  if (recentRes.error) console.error("Could not fetch recent products for context:", recentRes.error);
  const entry = { t: Date.now(), keywords: keywordsRes.data || [], similarProducts: recentRes.data || [] };
  contextCache.set(userId, entry);
  if (contextCache.size > 200) contextCache.delete(contextCache.keys().next().value);
  return entry;
}

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
    // Chunked conversion — spreading the whole byte array into String.fromCharCode
    // blows the call stack for anything beyond ~100KB, which silently disabled
    // image analysis for every real photo.
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
    }
    const base64 = btoa(binary);
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

    // Currency is only used as context for the AI; prices are always stored in ALL.
    // (The previous `profiles.currency` lookup hit a non-existent column.)
    const userCurrency = target_currency;

    // Keywords + similar products: one parallel round, cached per user across
    // invocations on a warm instance.
    const { keywords, similarProducts } = await getUserContext(supabaseAdmin, user_id);

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
    // Specs are found later via the find-product-specs waterfall.
    // thinkingBudget: 0 — extraction doesn't need chain-of-thought, and 2.5 Flash
    // bills thinking tokens as output; disabling it cuts both latency and cost.
    // Low temperature keeps field extraction deterministic.
    const makeBody = (withSchema: boolean) => JSON.stringify({
      contents: [{ parts: requestParts }],
      generationConfig: {
        responseMimeType: "application/json",
        ...(withSchema ? { responseSchema: RESPONSE_SCHEMA } : {}),
        temperature: 0.2,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    const callGemini = async (withSchema: boolean) => {
      const abortController = new AbortController();
      const geminiTimeout = setTimeout(() => abortController.abort(), 25000); // 25s timeout
      try {
        return await fetch(getGeminiUrl('flash'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: makeBody(withSchema),
          signal: abortController.signal,
        });
      } finally {
        clearTimeout(geminiTimeout);
      }
    };
    // Structured output first; retry once on transient failures (429/5xx/
    // network); if the schema itself is rejected (4xx), fall back to plain
    // JSON mode — the downstream normalization still handles that shape.
    let geminiResponse: Response;
    try {
      geminiResponse = await callGemini(true);
      if (geminiResponse.status === 429 || geminiResponse.status >= 500) {
        await new Promise((r) => setTimeout(r, 1200));
        geminiResponse = await callGemini(true);
      }
    } catch (_firstErr) {
      await new Promise((r) => setTimeout(r, 800));
      geminiResponse = await callGemini(true);
    }
    if (!geminiResponse.ok && geminiResponse.status >= 400 && geminiResponse.status < 500 && geminiResponse.status !== 429) {
      console.warn(`Structured output rejected (${geminiResponse.status}); retrying without schema.`);
      geminiResponse = await callGemini(false);
    }

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

    // Schema-shaped options ([{name, values[]}]) → legacy map shape so caching,
    // background-sync and the combo path all keep working unchanged.
    if (Array.isArray(analysis.options)) analysis.options = optionsArrayToMap(analysis.options);
    if (Array.isArray(analysis.products)) {
      for (const p of analysis.products) {
        if (!p) continue;
        if (Array.isArray(p.options)) p.options = optionsArrayToMap(p.options);
        // Per-item category, inferred from the item's own type/name when the
        // model didn't set it (the post-level category may not fit every item).
        if (typeof p.typeName === 'string') p.typeName = p.typeName.replace(/[\s,.;:]+$/, '').trim();
        if (!p.categoryName || /^uncategorized$/i.test(p.categoryName)) {
          p.categoryName = inferCategoryFromType(p.typeName, p.productName || p.name) || analysis.categoryName || null;
        }
      }
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
      // The model reliably fills typeName but often leaves categoryName empty
      // (observed in production: good types, null categories). Clean the type
      // and derive the category from it instead of stamping 'Uncategorized'.
      if (typeof analysis.typeName === 'string') analysis.typeName = analysis.typeName.replace(/[\s,.;:]+$/, '').trim();
      if (!analysis.categoryName || /^uncategorized$/i.test(analysis.categoryName)) {
        analysis.categoryName = inferCategoryFromType(analysis.typeName, analysis.productName) || 'Uncategorized';
      }
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

    // Record token usage + estimated cost so the admin panel can show per-client
    // AI spend. Must be AWAITED: the edge runtime tears down pending promises
    // once the response is returned, so a fire-and-forget insert never lands.
    // Errors are swallowed so a ledger problem can never block classification.
    // Pricing: Gemini 2.5 Flash ($/1M tokens).
    if (geminiData.usageMetadata) {
      try {
        const IN_PER_M = 0.30, OUT_PER_M = 2.50;
        const inputTokens = geminiData.usageMetadata.promptTokenCount ?? 0;
        const outputTokens = (geminiData.usageMetadata.candidatesTokenCount ?? 0) + (geminiData.usageMetadata.thoughtsTokenCount ?? 0);
        const costUsd = (inputTokens * IN_PER_M + outputTokens * OUT_PER_M) / 1_000_000;
        const { error: usageErr } = await supabaseAdmin.from('ai_usage').insert({
          user_id,
          function_name: 'ai-product-classifier',
          model: 'gemini-2.5-flash',
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cost_usd: Math.round(costUsd * 1_000_000) / 1_000_000,
        });
        if (usageErr) console.warn('ai_usage insert failed:', usageErr.message);
      } catch (e) {
        console.warn('ai_usage logging error:', (e as Error).message);
      }
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