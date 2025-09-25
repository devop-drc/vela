import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getPrompt = (productName: string, categoryName: string, typeName: string) => `
  You are an AI assistant that finds technical specifications for products. Your goal is to return structured data.

  **INPUT:**
  - Product Name: "${productName}"
  - Category: "${categoryName}"
  - Type: "${typeName}"

  **TASK:**
  Find the key technical specifications or relevant attributes for this product.
  - Be concise and accurate.
  - Prioritize objective specs (e.g., dimensions, material, model number) over subjective descriptions.
  - Format the keys in snake_case.

  **OUTPUT FORMAT:**
  Respond ONLY with a single, valid JSON object containing the specifications. Do not include any other text, markdown, or explanations.

  **Example for a "MacBook Pro" in "Electronics" -> "Laptop":**
  {
    "processor": "Apple M3 Pro",
    "ram": "18GB Unified Memory",
    "storage": "512GB SSD",
    "display_size": "14.2-inch",
    "resolution": "3024x1964"
  }

  **If no relevant specifications can be found, return an empty JSON object: {}**
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("Gemini API key is not configured.");
    }

    const { productName, categoryName, typeName } = await req.json();
    if (!productName) {
      throw new Error("Product name is required.");
    }

    const prompt = getPrompt(productName, categoryName, typeName);

    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API error: ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    const analysisText = geminiData.candidates[0].content.parts[0].text;
    const specs = JSON.parse(analysisText);

    return new Response(JSON.stringify(specs), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI Spec Finder Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200, // Return 200 so client can parse the error message
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});