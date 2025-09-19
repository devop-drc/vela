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
    1.  **Categorize:** Classify the product into ONE of the following categories: "Clothing", "Electronics", "Art", "Service", "Generic".
    2.  **Extract All Details:** Scrutinize the caption for every possible product attribute. This includes, but is not limited to:
        - **Options:** Sizes (S, M, L), colors (Red, Blue), flavors, etc.
        - **Specifications:** Materials (Cotton, Linen), dimensions (e.g., "24x36 inches", "50ml"), technical specs (Processor, RAM), ingredients, etc.
        - **Identifiers:** SKU, model number, reference code.
        - **Pricing:** Extract the price as a number. Crucially, identify the currency symbol or code (e.g., $, €, £, USD, EUR) and include it. If no price is mentioned, suggest a plausible one.
    3.  **Format Output:** Respond ONLY with a single, valid JSON object. Do not include markdown backticks or any other text.

    **JSON Structure:**
    {
      "name": "A creative and concise name for the product/service.",
      "category": "The category you identified (e.g., 'Clothing').",
      "description": "A compelling one or two-sentence product description.",
      "price": "A plausible price as a number (e.g., 25.99).",
      "currency": "The currency symbol or code extracted from the caption (e.g., '$', '€', 'USD'). Default to 'USD' if not specified.",
      "tags": ["A list of 3-5 relevant keywords or tags."],
      "details": {
        // This object's content depends on the category and the caption.
        // Populate it with ALL extracted details.
        // For "Clothing": { "sizes": ["S", "M", "L"], "material": "100% Organic Cotton", "colors": ["Ocean Blue", "Sunset Orange"], "reference_code": "TSHIRT-001" }
        // For "Art": { "dimensions": "24x36 inches", "medium": "Oil on canvas", "framing": "Unframed" }
        // For "Service": { "duration": "60 minutes", "format": "1-on-1 video call" }
        // Be precise with units (e.g., inches, cm, ml, oz).
      }
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