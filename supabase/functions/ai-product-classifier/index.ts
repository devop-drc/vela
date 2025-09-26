import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_PRO_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getClassifierPrompt = (caption: string, keywords: { keyword: string, description: string }[]) => `
  You are an expert AI for e-commerce, specializing in analyzing Instagram captions to create compelling and structured product listings.

  **Primary Objectives:**
  1.  **Identify & Extract:** Determine if the caption is for a product. If so, extract all relevant details.
  2.  **Generate Sales Copy:** Write a persuasive and engaging product description.
  3.  **Structure Data:** Format all extracted information into a specific JSON structure.

  **User-Defined Keywords:**
  The user has provided these keywords to help you. Use them as a primary guide for extraction. When you find a keyword, extract the data that follows it based on its description.
  ${keywords.map(k => `- **${k.keyword}:** ${k.description}`).join('\n')}

  **Analysis & Extraction Rules:**
  1.  **Product Identification:** First, decide if the post is selling a product. If not, return \`{"isProductPost": false}\`.
  2.  **Product Name:** Extract a clear and concise product name.
  3.  **Sales Description:** Based on the caption, generate a new, compelling product description (2-3 sentences) that highlights the key benefits and appeals to the target audience. This should be sales-oriented, not just a summary.
  4.  **Categorization:** Assign a broad 'categoryName' (e.g., "Clothing") and a specific 'typeName' (e.g., "T-Shirt").
  5.  **Attributes Extraction:**
      - Use the user-defined keywords as your primary guide.
      - Also, find other common attributes (e.g., dimensions, weight, compatibility).
      - For each attribute, create an object with:
          - \`"name"\`: A lowercase, snake_case key (e.g., "material", "available_sizes").
          - \`"value"\`: The extracted value(s). If there are multiple values (like sizes or colors), return them as an array of strings.
          - \`"inputType"\`: The best UI input type. Choose from: "text", "number", "color", "tags", "dropdown", "textarea".
          - \`"possibleValues"\`: If 'dropdown', provide potential options based on the context.
  6.  **Pricing:** Extract price and currency code (e.g., USD, EUR). If not found, default to null.
  7.  **Tags:** Generate an array of 3-5 relevant tags.

  **Output Format:**
  Respond ONLY with a single, valid JSON object. Do not include any explanation or markdown.

  **INPUT CAPTION:**
  \`\`\`
  ${caption}
  \`\`\`

  **EXAMPLE JSON OUTPUT:**
  {
    "isProductPost": true,
    "productName": "Vintage Sunset Tee",
    "description": "Embrace golden hour vibes with our incredibly soft Vintage Sunset Tee. Its retro-inspired graphic and relaxed fit make it the perfect staple for any casual occasion.",
    "categoryName": "Clothing",
    "typeName": "T-Shirt",
    "price": 35.00,
    "currency": "USD",
    "tags": ["vintage", "sunset", "graphic tee"],
    "attributes": [
      { "name": "material", "value": "100% Ring-Spun Cotton", "inputType": "text" },
      { "name": "available_sizes", "value": ["M", "L", "XL"], "inputType": "tags" },
      { "name": "colors", "value": ["Off-white", "Heather Grey"], "inputType": "tags" }
    ]
  }
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!GEMINI_API_KEY) throw new Error("Gemini API key is not configured.");
    const { caption, user_id } = await req.json();
    if (!caption) throw new Error("Caption is required for analysis.");
    if (!user_id) throw new Error("User ID is required to fetch keywords.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { data: keywords, error: keywordsError } = await supabaseAdmin
      .from('keywords')
      .select('keyword, description')
      .eq('user_id', user_id);
    
    if (keywordsError) throw keywordsError;

    const prompt = getClassifierPrompt(caption, keywords || []);
    const requestParts = [{ text: prompt }];

    const geminiResponse = await fetch(GEMINI_PRO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: requestParts }], generationConfig: { responseMimeType: "application/json" } }),
    });

    if (!geminiResponse.ok) throw new Error(`Gemini API error: ${await geminiResponse.text()}`);
    const geminiData = await geminiResponse.json();
    const analysisText = geminiData.candidates[0].content.parts[0].text;
    const analysis = JSON.parse(analysisText);

    return new Response(JSON.stringify(analysis), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Classifier Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});