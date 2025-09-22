import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_PRO_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getSpecFinderPrompt = (productName: string, categoryName: string, typeName: string) => `
  You are a product data specialist with access to a vast internal knowledge base. Your task is to provide key specifications for a given product.

  **Product Information:**
  - Name: "${productName}"
  - Category: "${categoryName}"
  - Type: "${typeName}"

  **Instructions:**
  1.  Based on your knowledge, identify the key specifications for this type of product.
  2.  Provide the values for these specifications for the specific product name given.
  3.  If a specification is not applicable or you cannot find a reliable value, omit it entirely. Do not guess or invent data.
  4.  The output MUST be a single, valid JSON object containing key-value pairs of the specifications. Do not include markdown or any other text.

  **Example for a "T-Shirt":**
  {
    "material": "100% Combed Cotton",
    "fit": "Regular Fit",
    "neckline": "Crew Neck"
  }

  **Example for a "Smartphone":**
  {
    "processor": "A17 Bionic",
    "display_size": "6.1 inches",
    "ram": "8 GB",
    "storage": "256 GB",
    "main_camera": "48MP"
  }
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) throw new Error("Gemini API key is not configured.");

    const { productName, categoryName, typeName } = await req.json();
    if (!productName || !categoryName || !typeName) {
      throw new Error("Product name, category, and type are required.");
    }

    const prompt = getSpecFinderPrompt(productName, categoryName, typeName);

    const response = await fetch(GEMINI_PRO_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${errorText}`);
    }

    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("AI failed to generate a response.");
    }

    const jsonString = data.candidates[0].content.parts[0].text;
    const specs = JSON.parse(jsonString);

    return new Response(JSON.stringify(specs), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200, // Return 200 so client can parse the error
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});