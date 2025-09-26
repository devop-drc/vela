import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_PRO_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getClassifierPrompt = () => `
  You are an AI database enrichment service. Your goal is to analyze product information from an Instagram post's caption and structure the data.

  **Analysis Task:**
  Analyze the provided caption text. Extract the product's category, type, and all discernible attributes.

  **Rules:**
  1.  **Be Exhaustive:** Extract every possible detail from the text.
  2.  **Categorization:** Assign a broad 'categoryName' (e.g., "Clothing") and a specific 'typeName' (e.g., "T-Shirt").
  3.  **Attributes:** For each attribute found (e.g., color, material, size), create an object with:
      - "name": The lowercase, snake_case name (e.g., "material").
      - "value": The extracted value (e.g., "100% Cotton").
      - "inputType": The best UI input type. Choose from: "text", "number", "color", "tags", "dropdown", "textarea".
      - "possibleValues": If 'dropdown', provide potential options.
  4.  **Normalization:** Capitalize the first letter of category and type names.
  5.  **Confidence:** If this is not a product post, return '{"isProductPost": false}'.

  **Output Format:**
  Respond ONLY with a single, valid JSON object.

  **Example:**
  {
    "isProductPost": true,
    "categoryName": "Clothing",
    "typeName": "T-Shirt",
    "productName": "Vintage Sunset Tee",
    "description": "A soft, vintage-style t-shirt.",
    "price": 35.00,
    "currency": "USD",
    "tags": ["vintage", "sunset", "graphic tee"],
    "attributes": [
      { "name": "material", "value": "Cotton", "inputType": "dropdown", "possibleValues": ["Cotton", "Polyester", "Blend"] },
      { "name": "available_sizes", "value": ["M", "L", "XL"], "inputType": "tags" }
    ]
  }
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!GEMINI_API_KEY) throw new Error("Gemini API key is not configured.");
    const { caption } = await req.json();
    if (!caption) throw new Error("Caption is required for analysis.");

    const prompt = getClassifierPrompt();
    const requestParts = [{ text: prompt }, { text: `Caption to analyze: ${caption}` }];

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