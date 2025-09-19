import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getForceProductAnalysisPrompt = (caption: string) => {
  return `
    You are an expert e-commerce analyst. Your task is to meticulously analyze an Instagram post caption and generate a complete, structured JSON object for a potential product or service.

    Analyze the following caption:
    ---
    ${caption}
    ---

    **Instructions:**
    1.  **Extract All Details:** Scrutinize the caption for every possible product attribute.
    2.  **Structure Details:** For each attribute, create an object with the following keys:
        *   \`name\`: A user-friendly name for the attribute (e.g., "Available Sizes", "Material").
        *   \`value\`: The extracted value. If there are multiple options (like sizes or colors), this should be an array of strings. For a boolean option, use \`true\` or \`false\`. Otherwise, it's a string or number.
        *   \`unit\`: The unit of measurement, if applicable (e.g., "inches", "kg", null).
        *   \`type\`: The best UI input type for this attribute. Choose from: "tags" (for multiple freeform options like colors or sizes), "select" (for a single choice from a limited set), "input" (for short text/numbers), "textarea" (for long text), "switch" (for boolean yes/no options).
    3.  **Format Output:** Respond ONLY with a single, valid JSON object. Do not include markdown backticks or any other text.

    **JSON Structure Example:**
    {
      "name": "A creative and concise name for the product/service.",
      "description": "A compelling one or two-sentence product description.",
      "price": 29.99,
      "currency": "USD",
      "tags": ["handmade", "organic", "summer"],
      "details": [
        { "name": "Available Sizes", "value": ["S", "M", "L"], "unit": null, "type": "tags" },
        { "name": "Material", "value": "100% Organic Cotton", "unit": null, "type": "input" },
        { "name": "Care Instructions", "value": "Machine wash cold, tumble dry low.", "unit": null, "type": "textarea" },
        { "name": "Gift Wrapping", "value": true, "unit": null, "type": "switch" }
      ]
    }
  `;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not set in Supabase secrets.");
    }

    const { caption } = await req.json();
    if (!caption) {
      throw new Error("Caption is required.");
    }

    const prompt = getForceProductAnalysisPrompt(caption);
    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error(`Gemini API error:`, errorText);
      throw new Error("Failed to get analysis from AI.");
    }

    const geminiData = await geminiResponse.json();
    const jsonString = geminiData.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
    const analysis = JSON.parse(jsonString);

    // Ensure details is always an array
    if (!analysis.details || !Array.isArray(analysis.details)) {
      analysis.details = [];
    }

    return new Response(JSON.stringify(analysis), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});