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
    You are an expert e-commerce assistant for a platform that can sell ANY type of product or service. Your task is to creatively interpret an Instagram post caption and generate plausible product details, even if it's not explicitly a sales post. Assume there IS a product or service being sold.

    Analyze the following caption and generate product details:
    ---
    ${caption}
    ---

    Respond ONLY with a valid JSON object. Do not include markdown backticks.
    {
      "name": "A creative and concise name for a potential product or service based on the caption.",
      "category": "A suitable category (e.g., 'Software', 'Art Print', 'Consulting Session', 'Recipe Book').",
      "description": "A compelling one or two-sentence product description derived from the caption's content and tone.",
      "features": ["A list of key features or selling points inferred from the caption.", "Be creative and generate at least 2-3 plausible features."],
      "price": "A plausible price as a number. If a price is mentioned, use it. Otherwise, suggest a reasonable one (e.g., 25).",
      "inventory": "Suggest a plausible inventory count (e.g., 10 for a physical item, 100 for a digital one)."
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