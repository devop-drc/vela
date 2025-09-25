import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getPrompt = (productName: string) => `
  You are an AI assistant that emulates a powerful web search engine to find product specifications. Your goal is to return structured, accurate data for a given product name.

  **INPUT:**
  - Product Name: "${productName}"

  **TASK:**
  1.  Perform a simulated web search for the exact product name provided.
  2.  Identify the key technical specifications from reliable sources (like manufacturer websites, tech review sites).
  3.  Extract the most important and common specifications. For a laptop, this would be processor, RAM, storage, display. For headphones, it would be connectivity, battery life, driver size.
  4.  Format the specification keys in snake_case.
  5.  Return the data as a JSON object.

  **OUTPUT FORMAT:**
  Respond ONLY with a single, valid JSON object containing the specifications. Do not include any other text, markdown, or explanations.

  **Example for "Sony WH-1000XM5 Headphones":**
  {
    "connectivity": "Bluetooth 5.2",
    "battery_life": "Up to 30 hours (NC on)",
    "driver_unit": "30mm",
    "noise_cancelling": "Integrated Processor V1"
  }

  **If you cannot find any specifications, return an empty JSON object: {}**
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("Gemini API key is not configured.");
    }

    const { productName } = await req.json();
    if (!productName) {
      throw new Error("Product name is required.");
    }

    const prompt = getPrompt(productName);

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
    console.error('Google Search Specs Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200, // Return 200 so client can parse the error message
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});