import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
// Using Gemini 1.5 Flash for speed and cost-effectiveness in the first step
const GEMINI_FLASH_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;
// Using Gemini 1.5 Pro for power and reasoning in the main steps
const GEMINI_PRO_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- PROMPT DEFINITIONS ---

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

  Analyze the following caption:
  ---
  ${caption}
  ---

  **Instructions:**
  1.  **Categorize:** Classify the product into ONE of the following primary categories: "clothing", "electronics", "art", "service", "generic".
  2.  **Sub-Categorize (Type):** Based on the primary category, choose the most fitting "type". For "clothing", it could be "t-shirt". For "art", it could be "print".
  3.  **Extract All Details:** Scrutinize the caption for every possible product attribute (sizes, colors, materials, dimensions, specs).
  4.  **Find Specifications:** Use your internal knowledge to find relevant specs for the identified product and include them in the "details" object.
  5.  **Currency Detection:** Identify currency symbols ($, €, £) or codes (USD, EUR) and use the ISO code. Default to "USD" if none are found.
  6.  **Justify Extractions:** For each key-value pair, provide a "justification" field with the exact quote from the caption that supports your extraction.
  7.  **Format Output:** Respond ONLY with a single, valid JSON object.

  **JSON Structure:**
  {
    "name": { "value": "A creative and concise name.", "justification": "Extracted from '...'" },
    "category": { "value": "The primary category you identified (e.g., 'clothing').", "justification": "Inferred from '...'" },
    "description": { "value": "A compelling product description.", "justification": "Based on the overall caption." },
    "price": { "value": 25.99, "justification": "Extracted from '...'" },
    "currency": { "value": "USD", "justification": "Extracted from '$' symbol." },
    "tags": { "value": ["tag1", "tag2"], "justification": "Based on keywords '...'" },
    "details": {
      "type": { "value": "The specific type within the category (e.g., 't-shirt').", "justification": "Inferred from '...'" }
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
  2.  **Check Justifications:** Does the "justification" accurately point to the source of the information in the caption?
  3.  **Correct Errors:** If you find any inaccuracies, misinterpretations, or hallucinations, correct them.
  4.  **Output:** Provide a revised, 100% accurate JSON object in the same format. If no errors are found, return the original JSON unchanged. Respond ONLY with the JSON object.
`;

const callGemini = async (url: string, prompt: string) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${errorText}`);
    }
    const data = await response.json();
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("AI failed to generate a response.");
    }
    return data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('AI analysis timed out after 20 seconds.');
    }
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) throw new Error("Gemini API key is not configured.");

    const { caption } = await req.json();
    if (!caption) {
      return new Response(JSON.stringify({ isProductPost: false, reasoning: "No caption provided." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- STAGE A: Triage ---
    const triagePrompt = getTriagePrompt(caption);
    const triageResult = await callGemini(GEMINI_FLASH_API_URL, triagePrompt);

    if (triageResult.toUpperCase() !== 'YES') {
      return new Response(JSON.stringify({ isProductPost: false, reasoning: "AI triage determined this is not a product post." }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- STAGE B: Detailed Extraction ---
    const extractionPrompt = getExtractionPrompt(caption);
    const extractedJsonString = await callGemini(GEMINI_PRO_API_URL, extractionPrompt);
    const extractedJson = safeJsonParse(extractedJsonString);

    // --- STAGE C: Self-Correction ---
    const correctionPrompt = getCorrectionPrompt(caption, JSON.stringify(extractedJson, null, 2));
    const correctedJsonString = await callGemini(GEMINI_PRO_API_URL, correctionPrompt);
    const correctedJson = safeJsonParse(correctedJsonString);

    // --- Final Processing: Flatten the { value, justification } structure ---
    const finalProduct = Object.entries(correctedJson).reduce((acc, [key, val]) => {
        if (key === 'details') {
            acc[key] = Object.entries(val as object).reduce((detailsAcc, [detailKey, detailVal]) => {
                detailsAcc[detailKey] = (detailVal as any).value;
                return detailsAcc;
            }, {} as any);
        } else {
            acc[key] = (val as any).value;
        }
        return acc;
    }, {} as any);

    return new Response(JSON.stringify({ isProductPost: true, product: finalProduct }), {
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