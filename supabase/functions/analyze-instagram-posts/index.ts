import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_PRO_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Types
interface AnalysisResult {
  isProductPost: boolean;
  productName?: string;
  description?: string;
  price?: number;
  currency?: string;
  tags?: string[];
  categoryName?: string;
  typeName?: string;
  inventory?: number;
  pricingType?: 'one_time' | 'subscription';
  billingInterval?: 'month' | 'year' | null;
  specifications?: { [key: string]: string | string[] };
  options?: { [key: string]: string[] };
  tokenUsage?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

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

const analyzeAndEnrichPost = async (post: any, supabase: SupabaseClient, userId: string) => {
    try {
        if (!GEMINI_API_KEY) return { skipped: true, reason: "AI configuration missing." };
        if (!post.caption) return { skipped: true, reason: "Post has no caption to analyze." };

        // Fetch keywords and recent products (similar logic to background sync, but simplified for UI preview)
        const { data: keywords } = await supabase.from('keywords').select('keyword, description').eq('user_id', userId);
        const { data: recentProducts } = await supabase.from('products').select('name, category, details, caption').eq('user_id', userId).limit(5).order('created_at', { ascending: false });

        const prompt = getClassifierPrompt(post.caption, keywords || [], recentProducts || []);
        const requestParts = [{ text: prompt }];

        const geminiResponse = await fetch(GEMINI_PRO_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: requestParts }], generationConfig: { responseMimeType: "application/json" } }),
        });

        if (!geminiResponse.ok) throw new Error(`Gemini API error: ${await geminiResponse.text()}`);
        const geminiData = await geminiResponse.json();
        
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

        // Heuristic helpers
        const parseMultiProducts = (caption?: string): Array<{ productName: string; price?: number; currency?: string; inventory?: number; specifications?: Record<string, string> }> => {
            if (!caption) return [];
            const blocks = caption.split(/\n\s*\n+/).map(b => b.trim()).filter(Boolean);
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

        const looksLikePromotion = (caption?: string) => {
            if (!caption) return false;
            return /(sale|discount|offer|%\s*off|black\s*friday|promo)/i.test(caption);
        };

        if (!analysis.isProductPost) {
            // Fallback: parse list-style multi-product captions
            const parsed = parseMultiProducts(post.caption);
            if (parsed.length > 0) {
                const first = parsed[0];
                const details: Record<string, any> = { type: { value: 'Generic' } };
                if (first.specifications) {
                    for (const [k, v] of Object.entries(first.specifications)) details[k] = { value: v };
                }
                return {
                    skipped: false,
                    product: {
                        name: { value: first.productName },
                        description: { value: post.caption?.slice(0, 180) || '' },
                        price: { value: first.price },
                        currency: { value: first.currency || 'ALL' },
                        inventory: { value: first.inventory ?? 10 },
                        pricing_type: { value: 'one_time' },
                        billing_interval: { value: null },
                        tags: { value: [] },
                        category: { value: 'Generic Product' },
                        details: details,
                    }
                };
            }
            // Mark explicit promotions
            if (looksLikePromotion(post.caption)) {
                return { skipped: true, reason: 'Promotion post detected' };
            }
            return { skipped: true, reason: "AI determined this is not a product post." };
        }

        const { categoryName, typeName, specifications, options, pricingType, billingInterval, inventory, ...productInfo } = analysis;
        
        // Combine specifications and options into the old 'details' structure for compatibility with CreateProductModal
        const details: { [key: string]: any } = {};
        
        // Add specifications (fixed details)
        if (specifications) {
            for (const [key, value] of Object.entries(specifications)) {
                details[key] = { value: value, inputType: 'text' }; // Default inputType for specs
            }
        }

        // Add options (variants)
        if (options) {
            for (const [key, value] of Object.entries(options)) {
                // Determine input type based on key name (simple heuristic)
                let inputType = 'text';
                if (key.toLowerCase().includes('color')) inputType = 'color';
                else if (Array.isArray(value) && value.length > 0) inputType = 'tags'; // Use tags for multi-select options
                
                details[key] = { value: value, inputType: inputType };
            }
        }

        return {
            product: {
                name: { value: productInfo.productName },
                description: { value: productInfo.description },
                price: { value: productInfo.price },
                currency: { value: productInfo.currency },
                inventory: { value: inventory ?? 10 },
                pricing_type: { value: pricingType || 'one_time' },
                billing_interval: { value: pricingType === 'subscription' ? (billingInterval || 'month') : null },
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
      const analysisResult = await analyzeAndEnrichPost(post, supabase, user.id);
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