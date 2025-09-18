import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { encode } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getDesignPrompt = (profile: any) => {
  return `
    You are a UI/UX design expert specializing in creating accessible and beautiful color palettes for web applications. Your task is to analyze the attached brand logo and the following brand information to generate a complete design system theme.

    **Brand Information:**
    - Shop Name: "${profile.shop_name}"
    - Bio: "${profile.description}"

    **Instructions:**

    1.  **Generate a Color Palette:**
        *   Derive a harmonious color palette *inspired by the logo*.
        *   **CRITICAL:** The palette must be functional for a light-mode UI. Prioritize legibility and accessibility above all else.
        *   `background` and `card` colors must be light, near-neutral colors (like off-white or very light gray).
        *   `foreground` (text color) MUST have a WCAG AA contrast ratio against both `background` and `card`.
        *   `primary` (for buttons) should be a vibrant, representative color inspired by the logo.
        *   `accent` should be a complementary color for highlights.

    2.  **Generate UI Styles:**
        *   Based on the brand's personality from its name and bio, select a suitable Google Font pairing (one for headings, one for body).
        *   Choose an appropriate corner `radius` (e.g., "0.5rem" for modern, "1.5rem" for playful).
        *   Choose a `sidebarStyle` ('primary' for a bold look, 'card' for a subtle, integrated look).

    **Output Format:**
    Respond ONLY with a single, valid JSON object. Do not include markdown backticks or any other text.

    {
      "themeName": "A creative name for the generated theme.",
      "colors": {
        "primary": "#HEXCODE",
        "primaryForeground": "#HEXCODE",
        "secondary": "#HEXCODE",
        "secondaryForeground": "#HEXCODE",
        "background": "#HEXCODE",
        "foreground": "#HEXCODE",
        "card": "#HEXCODE",
        "cardForeground": "#HEXCODE",
        "accent": "#HEXCODE"
      },
      "fonts": {
        "heading": "Google Font Name",
        "body": "Google Font Name"
      },
      "radius": "X.Xrem",
      "sidebarStyle": "primary"
    }
  `;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) throw new Error("Gemini API key is not configured.");

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not found');

    const { data: profileData, error: profileError } = await supabase.functions.invoke('instagram-profile');
    if (profileError) throw profileError;
    if (profileData.error) throw new Error(profileData.error);

    if (!profileData.logo_url) {
      throw new Error("No profile icon found to analyze.");
    }

    const imageResponse = await fetch(profileData.logo_url);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch profile image. Status: ${imageResponse.status}`);
    }
    const imageMimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = encode(imageBuffer);

    const prompt = getDesignPrompt(profileData);
    
    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: imageMimeType,
                data: imageBase64
              }
            }
          ]
        }]
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API error: ${errorText}`);
    }

    const geminiData = await geminiResponse.json();
    if (!geminiData.candidates || geminiData.candidates.length === 0) {
        console.error("Gemini response missing candidates:", geminiData);
        throw new Error("AI failed to generate a response. Please try again.");
    }
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