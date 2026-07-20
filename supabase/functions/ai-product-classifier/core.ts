/**
 * ai-product-classifier CORE — every pure piece of the Instagram-post →
 * product extraction pipeline, with zero Deno/Supabase dependencies so the
 * exact same code runs in:
 *   • the edge function (index.ts imports from here), and
 *   • the offline test harness (test/run_extraction_tests.ts, Node 24).
 *
 * Anything that touches the network (Gemini call, image fetching, Instagram
 * children lookup) stays in index.ts; the DECISIONS those steps make
 * (which media to analyze, how to route, how to normalize the model output)
 * live here and are unit-testable.
 */

/* ── structured-output schema ─────────────────────────────────────────── */
export const SPEC_SCHEMA = {
  type: 'OBJECT',
  properties: {
    key: { type: 'STRING' },
    value: { type: 'STRING' },
    unit: { type: 'STRING', nullable: true },
  },
  required: ['key', 'value'],
};
export const OPTION_SCHEMA = {
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
export const RESPONSE_SCHEMA = {
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

/* ── category inference ───────────────────────────────────────────────── */
export const CATEGORY_KEYWORDS: Array<[RegExp, string]> = [
  [/phone|tablet|laptop|computer|pc\b|monitor|tv\b|television|headphone|earbud|speaker|camera|drone|console|watch|smart|electronic|charger|router|printer|keyboard|mouse|gpu|cpu|appliance/i, 'Electronics & Tech'],
  [/app\b|application|software|saas|subscription|digital|license/i, 'Software & Apps'],
  [/shirt|dress|jean|pant|jacket|coat|hoodie|sweater|skirt|suit|sock|underwear|lingerie|clothing|apparel|fashion|shoe|sneaker|boot|sandal|heel|fustan|atlete|bluze|xhaketa/i, 'Clothing & Apparel'],
  [/bag\b|handbag|backpack|luggage|suitcase|wallet|purse|çant/i, 'Bags & Luggage'],
  [/ring\b|necklace|bracelet|earring|jewel|jewelry|unaz|varëse|byzylyk/i, 'Jewelry & Accessories'],
  [/cream|serum|makeup|lipstick|perfume|fragrance|shampoo|cosmetic|skincare|beauty|nail|krem|parfum/i, 'Beauty & Personal Care'],
  [/sofa|chair|table|desk|lamp|rug|curtain|furniture|decor|pillow|bedding|kitchen|cookware|vase|divan|tavolinë|llambë/i, 'Home & Living'],
  [/toy\b|game\b|lego|puzzle|doll|tricycle|scooter(?!.*electric)|playset|board game|lodër/i, 'Toys & Games'],
  [/bike|bicycle|treadmill|dumbbell|yoga|fitness|sport|gym|ball\b|racket|ski|snowboard|biçiklet/i, 'Sports & Fitness'],
  [/coffee|tea\b|chocolate|snack|wine|beer|juice|food|beverage|honey|cake|pastry|kafe|mjaltë|çokollat/i, 'Food & Beverages'],
  [/book|novel|magazine|vinyl|album|media|libër/i, 'Books & Media'],
  [/car\b|auto|tire|engine|motorcycle|vehicle|part\b|makinë|gomë/i, 'Automotive & Parts'],
  [/dog\b|cat\b|pet\b|aquarium|leash|litter|qen\b|mace/i, 'Pet Supplies'],
  [/service|consult|repair|cleaning|design\b|course|class\b|training|shërbim|kurs|stërvitje/i, 'Services'],
  [/art\b|painting|sculpture|handmade|craft|ceramic|print\b|pikturë|punim dore/i, 'Art & Handmade'],
];

export const inferCategoryFromType = (typeName?: string | null, productName?: string | null): string | null => {
  const hay = `${typeName || ''} ${productName || ''}`.trim();
  if (!hay) return null;
  for (const [re, cat] of CATEGORY_KEYWORDS) {
    if (re.test(hay)) return cat;
  }
  return null;
};

/* ── option shape conversion ──────────────────────────────────────────── */
/** Schema-shaped options ([{name, values[]}]) → legacy map ({ Name: values[] }). */
export const optionsArrayToMap = (opts: unknown): unknown => {
  if (!Array.isArray(opts)) return opts;
  const map: Record<string, unknown[]> = {};
  for (const o of opts as Array<{ name?: string; values?: unknown[] }>) {
    if (o?.name && Array.isArray(o.values) && o.values.length > 0) map[o.name] = o.values;
  }
  return map;
};

/* ── routing: is the caption enough on its own? ───────────────────────── */
export function isCaptionInsufficient(caption: string | null): boolean {
  if (!caption || caption.trim().length === 0) return true;
  if (caption.trim().length < 20) return true;
  const words = caption.trim().split(/\s+/);
  if (words.every((w) => w.startsWith('#'))) return true;
  if (!/[a-zA-Z0-9]/.test(caption)) return true;
  const pricePattern = /\b(ALL|EUR|USD|GBP|Lek|Leke|Lekë)\b|\d+[\.,]?\d*\s?k?\s?(ALL|EUR|USD|GBP|Lek|Leke|Lekë|€|\$|L\b)/i;
  if (!pricePattern.test(caption)) return true;
  return false;
}

/* ── media selection (pure mirror of the fetching logic) ──────────────── */
export interface PostMediaDescriptor {
  media_url?: string;
  thumbnail_url?: string;
  media_type?: string; // IMAGE | VIDEO | CAROUSEL_ALBUM
  id?: string;
  /** carousel children, when already known (tests provide them inline) */
  children?: Array<{ id?: string; media_url?: string; media_type?: string; thumbnail_url?: string }>;
}
export interface SelectedMedia {
  /** index into the ORIGINAL post media list (0 = the post itself / first child) */
  index: number;
  source: 'media_url' | 'thumbnail_url' | 'carousel_child';
  url: string;
}

/**
 * Which media the pipeline sends to the model, in order:
 *   VIDEO           → its thumbnail (index 0)
 *   CAROUSEL_ALBUM  → first 3 children (video children use their thumbnail)
 *   IMAGE           → the media_url (index 0)
 * Children beyond 3 are deliberately dropped (cost control) — expected
 * behaviors must not reference indices ≥ 3.
 */
export function selectMediaForAnalysis(post: PostMediaDescriptor): SelectedMedia[] {
  const out: SelectedMedia[] = [];
  if (post.media_type === 'VIDEO') {
    if (post.thumbnail_url) out.push({ index: 0, source: 'thumbnail_url', url: post.thumbnail_url });
  } else if (post.media_type === 'CAROUSEL_ALBUM') {
    const items = (post.children || []).slice(0, 3);
    items.forEach((child, i) => {
      const url = child.media_type === 'VIDEO' ? child.thumbnail_url : child.media_url;
      if (url) out.push({ index: i, source: 'carousel_child', url });
    });
  } else if (post.media_url) {
    out.push({ index: 0, source: 'media_url', url: post.media_url });
  }
  return out;
}

/* ── heuristic multi-product parser (fallback when the model misses) ──── */
export const parseMultiProducts = (
  cap?: string,
): Array<{ productName: string; price?: number; currency?: string; inventory?: number; specifications?: Record<string, string> }> => {
  if (!cap) return [];
  const blocks = cap.split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean);
  const items: Array<{ productName: string; price?: number; currency?: string; inventory?: number; specifications?: Record<string, string> }> = [];
  for (const block of blocks) {
    const lines = block.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    const name = lines[0];
    let refCode: string | undefined;
    let price: number | undefined;
    let currency: string | undefined;
    let inventory: number | undefined;
    for (const line of lines.slice(1)) {
      const refMatch = line.match(/ref\.?\s*code\s*:\s*([A-Za-z0-9\-]+)/i);
      if (refMatch) refCode = refMatch[1];
      const priceMatch =
        line.match(/çmimi\s*:\s*([0-9]+(?:[\.,][0-9]+)?)\s*([A-Za-z]{3})/i) ||
        line.match(/price\s*:\s*([0-9]+(?:[\.,][0-9]+)?)\s*([A-Za-z]{3})/i);
      if (priceMatch) {
        price = parseFloat(priceMatch[1].replace(',', '.'));
        currency = priceMatch[2].toUpperCase();
      }
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

/* ── prompt ───────────────────────────────────────────────────────────── */
export const getClassifierPrompt = (
  caption: string,
  keywords: { keyword: string; description: string }[],
  similarProducts: Array<{ name: string; category?: string; details?: { type?: string } }>,
) => {
  const similarProductsContext = similarProducts.length > 0 ? `
**The user's existing catalog (use ONLY to match their category/type naming style — NEVER copy attributes, specs or features from these into the new product):**
${similarProducts.map((p) => `- ${p.name} (Category: ${p.category}${p.details?.type ? `, Type: ${p.details.type}` : ''})`).join('\n')}
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

  6. **price:** Extract ONLY from the caption or image. Understand Albanian shorthand: "20k lek" / "20 mijë lekë" = 20000 ALL; "1.5k" = 1500. If NO price is stated anywhere, set price to 0 — NEVER estimate or invent a price.

  7. **currency:** "ALL" (Albanian Lek) by default. Use "EUR", "USD", etc. if explicitly stated. "lek", "lekë", "L" after a number all mean "ALL".

  8. **inventory:** Extract from caption (e.g., "5 copë", "stock: 10", "sasi e limituar"). Default to 10.

  9. **pricingType:** "one_time" (default) or "subscription" — use "subscription" when the price is per month/year ("në muaj", "/muaj", "monthly", "abonim"), and set billingInterval accordingly.

  10. **tags:** Generate 3-5 relevant English tags for SEO. Include product type, material, use case.

  11. **specifications:** Extract every spec stated in the caption as an array: \`[{"key": "material", "value": "Cotton", "unit": null}]\`. ALWAYS include \`brand\` and \`model\` as specs when identifiable from the caption or image. For well-known branded products you may add widely known factual specs (processor, battery, screen size…). For generic/unbranded products include ONLY what the caption or image shows — an empty array is better than invented specs (a separate enrichment step fills gaps later). Each spec belongs to THIS product only — never borrow specs from other products or examples.

  12. **options:** Include customer-selectable variants found in caption (colors, sizes, etc.). Return as an ARRAY of option groups: \`[{"name": "Color", "values": [{"value": "Black", "price_difference": 0, "inventory": 10}]}]\`. If caption mentions colors (ngjyra) or sizes (madhësi), extract them.

  **Single vs Multiple products — decide carefully:**
  - ONE product shown in different colors/sizes/angles is ONE product with OPTIONS — never a products[] array. Phrases like "vjen në tre ngjyra", "available in S/M/L", or a carousel of the same item are VARIANTS.
  - Use the \`products\` array ONLY when the caption clearly lists DISTINCT items (different names, or separate price lines per item).
  - Each item in \`products\` carries ONLY its own price/specs/options — when a detail's owner is ambiguous, leave it null rather than guessing.

  **Multi-Product Posts:** If the caption lists multiple DISTINCT products, output them in a \`products\` array. Each item follows this schema:
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
  - If the caption includes "ALL", "Lek", "Lekë", or a number followed by "L", use "ALL".
  - For other currencies, use standard codes: USD, EUR, GBP, etc.
  - Different products in the same post may have DIFFERENT currencies — keep each item's own currency.
  - If no currency is specified, default to "ALL".

  **User-Defined Keywords (IMPORTANT — use these to extract data):**
  ${keywords.length > 0 ? `The user has defined these keywords/symbols that appear in their captions. When you find any of these in the caption, use the description to understand what follows and extract it as a specification or option accordingly.
${keywords.map((k) => `- When you see "${k.keyword}" in the caption: ${k.description}`).join('\n')}` : 'No custom keywords provided.'}

  ${similarProductsContext}

  **Output Format:**
  Respond ONLY with a single, valid JSON object. Do not include any explanation or markdown.

  **REQUIRED FIELDS for product posts — you MUST include ALL of these:**
  - "isProductPost": true
  - "productName": string (max 10 words, clear and concise)
  - "categoryName": string (e.g., "Clothing & Apparel", "Electronics & Tech", "Beauty & Personal Care", "Home & Living", "Food & Beverages", "Sports & Fitness", "Bags & Luggage", etc.)
  - "typeName": string (e.g., "T-Shirts", "Smartphones", "Skincare", "Furniture", etc.)
  - "description": string (compelling 3-4 sentence product description, NOT the raw caption)
  - "price": number (extracted from caption/image ONLY; 0 if not stated)
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
};

/** Extra instruction appended when media parts are attached. */
export const IMAGE_ANALYSIS_INSTRUCTION =
  '\n\nIMPORTANT: The caption for this post is insufficient or missing. Product images have been provided.\nAnalyze the images carefully to identify:\n- The product(s) shown (name, type, brand if visible)\n- Visual attributes (color, material, condition)\n- Any text visible in the image (price tags, labels, brand names)\n- Product category based on visual appearance\nCombine image analysis with any caption text available to produce the most accurate product details.';

/* ── post-model normalization (the whole deterministic tail) ──────────── */
export interface NormalizeInput {
  analysis: any;
  caption: string;
  usedImages?: boolean;
  hasPostMedia?: boolean;
}

export function normalizeAnalysis({ analysis, caption, usedImages = false, hasPostMedia = false }: NormalizeInput): any {
  // Schema-shaped options → legacy map shape.
  if (Array.isArray(analysis.options)) analysis.options = optionsArrayToMap(analysis.options);
  if (Array.isArray(analysis.products)) {
    for (const p of analysis.products) {
      if (!p) continue;
      if (Array.isArray(p.options)) p.options = optionsArrayToMap(p.options);
      if (typeof p.typeName === 'string') p.typeName = p.typeName.replace(/[\s,.;:]+$/, '').trim();
      if (!p.categoryName || /^uncategorized$/i.test(p.categoryName)) {
        p.categoryName = inferCategoryFromType(p.typeName, p.productName || p.name) || analysis.categoryName || null;
      }
    }
  }

  // Flag for the caller's async image retry.
  const needsImageRetry = !usedImages && (
    (analysis.isProductPost === false && hasPostMedia) ||
    (analysis.isProductPost === true && (!analysis.productName || analysis.price === null || analysis.price === undefined))
  );
  if (needsImageRetry) analysis._needsImageRetry = true;

  // Numeric-keyed items ("0","1",...) → products[].
  if (!Array.isArray(analysis.products)) {
    const numericKeys = Object.keys(analysis).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length > 0) {
      const products = numericKeys.map((k) => analysis[k]).filter((v: any) => v && (v.productName || v.name));
      if (products.length > 0) analysis.products = products;
    }
  }
  // Heuristic fallback when the model missed a multi-product caption.
  if (!Array.isArray(analysis.products) || analysis.products.length === 0 || analysis.isProductPost === false) {
    const parsed = parseMultiProducts(caption);
    if (parsed.length > 1) {
      analysis.products = parsed;
      analysis.isProductPost = true;
    }
  }
  const hasProducts = Array.isArray(analysis.products) && analysis.products.length > 0;
  if (hasProducts) analysis.isProductPost = true;
  const isMultiProductPost = hasProducts && analysis.products.length > 1;

  // Defaults for required fields.
  if (analysis.isProductPost) {
    if (!analysis.productName) analysis.productName = caption?.split('\n')[0]?.slice(0, 60) || 'Unknown Product';
    if (typeof analysis.typeName === 'string') analysis.typeName = analysis.typeName.replace(/[\s,.;:]+$/, '').trim();
    if (!analysis.categoryName || /^uncategorized$/i.test(analysis.categoryName)) {
      analysis.categoryName = inferCategoryFromType(analysis.typeName, analysis.productName) || 'Uncategorized';
    }
    if (!analysis.typeName) analysis.typeName = 'General';
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

  return {
    ...analysis,
    isProductPost: Boolean(analysis.isProductPost),
    isMultiProductPost,
    original_price: analysis.price,
    original_currency: analysis.currency,
    pricing_type: analysis.pricingType || 'one_time',
    billing_interval: analysis.billingInterval || null,
    inventory: analysis.inventory ?? 10,
  };
}
