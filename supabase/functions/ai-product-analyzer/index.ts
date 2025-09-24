import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_FLASH_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
const GEMINI_PRO_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getTriagePrompt = (caption: string) => `
  Analyze the following Instagram post caption. Your task is to determine if a specific product or service is being advertised for sale.
  General announcements, questions, or lifestyle content are not product posts.
  ---
  CAPTION: "${caption}"
  ---
  Is a specific product or service being advertised for sale? Answer only with the single word 'YES' or 'NO'.
`;

const getExtractionPrompt = (caption: string) => `
  You are an expert e-commerce analyst. Your task is to meticulously analyze an Instagram post caption and generate a complete, structured JSON object for the product or service being sold.

  **VALID CATEGORIES & TYPES:**
  - "clothing": ["t-shirt"]
  - "electronics": ["generic-device"]
  - "art": ["print"]
  - "service": ["consulting"]
  - "generic": ["generic"]

  **VALID INPUT TYPES:**
  - "text", "textarea", "number", "dropdown", "tags", "color"

  Analyze the following caption:
  ---
  ${caption}
  ---

  **Instructions:**
  1.  **Categorize & Sub-Categorize:** You MUST classify the product into ONE of the valid primary categories and ONE of its valid types.
  2.  **Extract All Details:** Scrutinize the caption for every possible product attribute (sizes, colors, materials, dimensions, specs).
  3.  **Define Field Metadata:** For each extracted detail, you MUST determine the most appropriate 'inputType' from the valid list. If the inputType is 'dropdown', you MUST provide a list of potential 'options' based on the context.
  4.  **Justify Extractions:** For each key-value pair, provide a "justification" field with the exact quote from the caption that supports your extraction.
  5.  **Format Output:** Respond ONLY with a single, valid JSON object.

  **JSON Structure Example:**
  {
    "name": { "value": "Vintage Sunset Tee", "justification": "From '...'" },
    "category": { "value": "clothing", "justification": "Inferred from 'tee'" },
    "description": { "value": "A soft, vintage-style t-shirt.", "justification": "Based on the overall caption." },
    "price": { "value": 35.00, "justification": "From 'Just $35'" },
    "currency": { "value": "USD", "justification": "From '$' symbol" },
    "tags": { "value": ["vintage", "sunset", "graphic tee"], "justification": "Keywords from caption" },
    "details": {
      "type": { "value": "t-shirt", "justification": "Inferred from 'tee'" },
      "material": { "value": "Cotton", "inputType": "dropdown", "options": ["Cotton", "Polyester", "Blend"], "justification": "From '100% cotton'" },
      "sizes": { "value": ["M", "L"], "inputType": "tags", "justification": "From 'Available in M and L'" }
    }
  }
`;

const getCorrectionPrompt = (caption: string, generatedJson: string) => `
  You are a meticulous Quality Assurance agent. Your task is to review an AI's analysis of an Instagram post and correct any errors.

  **ORIGINAL POST CAPTION:**
  ---
  ${caption}
  ---

  **AI-GENERATED JSON:**
  ---
  ${generatedJson}
  ---

  **YOUR TASK:**
  1.  **Verify Every Field:** Compare each "value" in the JSON against the original caption.
  2.  **Check Metadata:** Ensure 'inputType' and 'options' are logical and correct.
  3.  **Correct Errors:** If you find any inaccuracies, misinterpretations, or hallucinations, correct them.
  4.  **Output:** Provide a revised, 100% accurate JSON object in the same format. If no errors are found, return the original JSON unchanged. Respond ONLY with the JSON object.
`;

const callGemini = async (url: string, prompt: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`Gemini API error: ${await response.text()}`);
    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0) throw new Error("AI failed to generate a response.");
    return data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('AI analysis timed out after 20 seconds.');
    throw error;
  }
};

const safeJsonParse = (jsonString: string) => {
  try {
    return JSON.parse(jsonString.replace(/```json|```/g, '').trim());
  } catch (e) {
    console.error("Failed to parse JSON:", jsonString);
    throw new Error("AI returned invalid JSON.");
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });

  try {
    if (!GEMINI_API_KEY) throw new Error("Gemini API key is not configured.");
    const { caption } = await req.json();
    if (!caption) return new Response(JSON.stringify({ isProductPost: false, reasoning: "No caption provided." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const triageResult = await callGemini(GEMINI_FLASH_API_URL, getTriagePrompt(caption));
    if (triageResult.toUpperCase() !== 'YES') {
      return new Response(JSON.stringify({ isProductPost: false, reasoning: "AI determined this is not a product post." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const extractedJsonString = await callGemini(GEMINI_PRO_API_URL, getExtractionPrompt(caption));
    const extractedJson = safeJsonParse(extractedJsonString);

    const correctedJsonString = await callGemini(GEMINI_PRO_API_URL, getCorrectionPrompt(caption, JSON.stringify(extractedJson, null, 2)));
    const correctedJson = safeJsonParse(correctedJsonString);

    return new Response(JSON.stringify({ isProductPost: true, product: correctedJson }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});