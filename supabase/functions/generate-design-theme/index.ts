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
    You are a professional UI/UX designer with a deep understanding of color theory, branding, and accessibility (WCAG). Your task is to analyze the attached brand logo and the following brand information to generate a sophisticated and functional design system theme for a web application.

    **Brand Information:**
    - Shop Name: "${profile.shop_name}"
    - Bio: "${profile.description}"

    **CRITICAL INSTRUCTIONS:**

    1.  **LOGO COLOR ANALYSIS (Most Important Step):**
        *   Thoroughly analyze the colors in the attached logo.
        *   Identify the most dominant, brand-representative color. This will be your starting point.
        *   Identify any secondary or accent colors present in the logo.

    2.  **PALETTE GENERATION (Strict Rules):**
        *   **Primary Color:** This MUST be the dominant color you identified from the logo. It will be used for buttons and key interactive elements.
        *   **Primary Foreground:** This MUST be a color (typically white or near-black) that has a high contrast ratio (WCAG AA or higher) against the Primary Color.
        *   **Background & Card:** These MUST be very light, near-neutral colors (e.g., off-white, a very light gray with a hint of the primary color). DO NOT use saturated colors for backgrounds. This is for maximum readability.
        *   **Foreground (Text):** This MUST be a dark color (e.g., a dark charcoal, not pure black) that has a high contrast ratio (WCAG AA or higher) against the Background and Card colors.
        *   **Accent Color:** This should be a secondary color from the logo or a color that is complementary to the Primary Color based on color theory. It's for highlights and secondary actions.

    3.  **UI STYLES:**
        *   Based on the brand's personality (e.g., modern, elegant, playful), select a suitable Google Font pairing.
        *   Choose an appropriate corner 'radius' (e.g., "0.5rem" for modern, "1.5rem" for playful).
        *   Choose a 'sidebarStyle' ('primary' for a bold, branded look, or 'card' for a subtle, integrated look).

    **OUTPUT FORMAT:**
    Respond ONLY with a single, valid JSON object. Do not include markdown backticks or any other text.

    {
      "themeName": "A creative name for the generated theme that reflects the brand.",
      "colors": {
        "primary": "#HEXCODE", "primaryForeground": "#HEXCODE", "secondary": "#HEXCODE", "secondaryForeground": "#HEXCODE",
        "background": "#HEXCODE", "foreground": "#HEXCODE", "card": "#HEXCODE", "cardForeground": "#HEXCODE", "accent": "#HEXCODE"
      },
      "fonts": { "heading": "Google Font Name", "body": "Google Font Name" },
      "radius": "X.Xrem", "sidebarStyle": "primary"
    }
  `;
};

const getTextOnlyDesignPrompt = (profile: any) => {
  return `
    You are a UI/UX design expert. Your task is to generate a complete design system theme based on the "vibe" of a brand's name and bio. The previous attempt to analyze their logo failed, so you must rely solely on the text provided.

    **Brand Information:**
    - Shop Name: "${profile.shop_name}"
    - Bio: "${profile.description}"

    **Instructions:**
    1.  **Determine Brand Vibe:** Analyze the text to understand the brand's personality (e.g., "minimalist and clean," "bold and energetic," "luxurious and elegant").
    2.  **Generate a Random but Cohesive Color Palette:** Create a harmonious color palette that matches the brand's vibe. The palette must be functional for a light-mode UI with excellent contrast (WCAG AA). 'background' and 'card' colors must be light and near-neutral.
    3.  **Generate UI Styles:** Choose a suitable Google Font pairing, corner 'radius', and 'sidebarStyle' ('primary' or 'card') that fits the vibe.

    **Output Format:**
    Respond ONLY with a single, valid JSON object. Do not include markdown backticks.
    {
      "themeName": "A creative name for the generated theme.",
      "colors": {
        "primary": "#HEXCODE", "primaryForeground": "#HEXCODE", "secondary": "#HEXCODE", "secondaryForeground": "#HEXCODE",
        "background": "#HEXCODE", "foreground": "#HEXCODE", "card": "#HEXCODE", "cardForeground": "#HEXCODE", "accent": "#HEXCODE"
      },
      "fonts": { "heading": "Google Font Name", "body": "Google Font Name" },
      "radius": "X.Xrem", "sidebarStyle": "primary"
    }
  `;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response(null, { headers: corsHeaders }); }

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

    let analysis;

    try {
      if (!profileData.logo_url) throw new Error("No profile icon found, falling back to text analysis.");
      
      const imageResponse = await fetch(profileData.logo_url);
      if (!imageResponse.ok) throw new Error(`Failed to fetch profile image. Status: ${imageResponse.status}`);
      
      const imageMimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
      const imageBuffer = await imageResponse.arrayBuffer();
      
      const uint8 = new Uint8Array(imageBuffer);
      let binary = '';
      for (let i = 0; i < uint8.byteLength; i++) {
          binary += String.fromCharCode(uint8[i]);
      }
      const imageBase64 = btoa(binary);

      const imagePrompt = getDesignPrompt(profileData);
      
      const geminiResponse = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: imagePrompt }, { inline_data: { mime_type: imageMimeType, data: imageBase64 } }] }] }),
      });

      if (!geminiResponse.ok) throw new Error(`Gemini API error (image analysis): ${await geminiResponse.text()}`);
      
      const geminiData = await geminiResponse.json();
      if (!geminiData.candidates || geminiData.candidates.length === 0) throw new Error("AI failed to generate a response from image. Falling back.");
      
      const jsonString = geminiData.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
      analysis = JSON.parse(jsonString);

    } catch (imageAnalysisError) {
      console.warn("Image-based design generation failed:", imageAnalysisError.message);
      console.log("Attempting fallback to text-only design generation...");

      const textPrompt = getTextOnlyDesignPrompt(profileData);
      const geminiResponse = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: textPrompt }] }] }),
      });

      if (!geminiResponse.ok) throw new Error(`Gemini API error (text analysis): ${await geminiResponse.text()}`);
      
      const geminiData = await geminiResponse.json();
      if (!geminiData.candidates || geminiData.candidates.length === 0) throw new Error("AI failed to generate a response from text as well.");
      
      const jsonString = geminiData.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
      analysis = JSON.parse(jsonString);
    }

    return new Response(JSON.stringify(analysis), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});