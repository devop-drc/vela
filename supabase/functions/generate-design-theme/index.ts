import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const hexToHsl = (hex: string): string => {
  if (!hex || !hex.startsWith('#')) return '0 0% 0%';
  let r = parseInt(hex.substring(1, 3), 16) / 255;
  let g = parseInt(hex.substring(3, 5), 16) / 255;
  let b = parseInt(hex.substring(5, 7), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

const getDesignPrompt = (profile: any) => {
  return `
    You are a world-class brand identity and UI designer. Your mission is to create a stunning, unique, and functional web application theme based on a user's brand information. You must be creative but also adhere to strict design principles.

    **INPUT:**
    1.  **Brand Logo:** (Attached as an image)
    2.  **Brand Info:**
        - Name: "${profile.shop_name}"
        - Instagram Bio: "${profile.description}"
        - About Section: "${profile.about}"

    **YOUR TASK (Step-by-Step):**

    **Step 1: Deep Brand Analysis**
    - **Visuals:** Scrutinize the logo. What is the dominant color? What are the secondary colors? What is the overall style (e.g., geometric, hand-drawn, minimalist)?
    - **Text:** Analyze the name, bio, and about section. What is the brand's personality? Is it playful, luxurious, modern, rustic, techy? What are they selling?
    - **Synthesize:** Combine your visual and textual analysis to form a cohesive "brand essence."

    **Step 2: Create a Harmonious Color Palette**
    - **The Golden Rule:** The color palette MUST be derived from and harmonious with the logo's colors.
    - **Primary Color:** This MUST be the most dominant and representative color from the logo. No exceptions.
    - **Primary Foreground:** This MUST be a color (typically white or near-black) that has a high contrast ratio (WCAG AA or higher) against the Primary Color.
    - **Background & Card:** Choose a very light, near-white, or subtly tinted neutral. This is for readability. It should complement the primary color.
    - **Foreground (Text):** Choose a very dark, near-black, or tinted charcoal. It MUST have a high contrast ratio (WCAG AA+) against the background.
    - **Accent Color:** This MUST be harmonious with the primary color. First, try to pick a secondary color from the logo. If one isn't available, create an analogous color (next to the primary on the color wheel) or a different shade of the primary color. It should be used for highlights and hover states. **AVOID complementary (opposite) colors.**
    - **Accent Foreground:** This MUST be a color that has a high contrast ratio (WCAG AA or higher) against the Accent Color. It will be used for text on accent backgrounds.
    - **Secondary:** A subtle, neutral color for secondary buttons and elements.

    **Step 3: Select Expressive Typography**
    - Based on the "brand essence," choose a compelling Google Font pairing.
    - **Headings:** Something with personality that matches the brand (e.g., "Syne" for modern, "Playfair Display" for elegant).
    - **Body:** Something highly readable that complements the heading font (e.g., "Inter", "Lato").

    **Step 4: Define the UI Shape & Style**
    - **Corner Radius:** Match the brand. "0.25rem" for sharp/techy, "0.75rem" for modern/friendly, "1.5rem" for soft/playful.
    - **Sidebar Style:** 'primary' for a bold, immersive feel, or 'card' for a clean, minimalist layout.

    **FINAL OUTPUT:**
    Respond ONLY with a single, valid JSON object. Do not include any other text or markdown.

    {
      "themeName": "A creative, evocative name for this unique theme.",
      "colors": {
        "primary": "#HEXCODE", "primaryForeground": "#HEXCODE", "secondary": "#HEXCODE", "secondaryForeground": "#HEXCODE",
        "background": "#HEXCODE", "foreground": "#HEXCODE", "card": "#HEXCODE", "cardForeground": "#HEXCODE", "accent": "#HEXCODE", "accentForeground": "#HEXCODE"
      },
      "fonts": { "heading": "Google Font Name", "body": "Google Font Name" },
      "radius": "X.Xrem", "sidebarStyle": "primary"
    }
  `;
};

const getTextOnlyDesignPrompt = (profile: any) => {
  return `
    You are a world-class brand identity and UI designer. Your mission is to create a stunning, unique, and functional web application theme based *only* on the "vibe" of a user's brand information, as their logo could not be analyzed.

    **INPUT:**
    - Name: "${profile.shop_name}"
    - Instagram Bio: "${profile.description}"
    - About Section: "${profile.about}"

    **YOUR TASK (Step-by-Step):**

    **Step 1: Vibe Check**
    - Analyze the name, bio, and about section. What is the brand's personality? Is it playful, luxurious, modern, rustic, techy? What are they selling? Create a "mood board" in your mind.

    **Step 2: Invent a Harmonious Color Palette**
    - Based on the vibe, invent a harmonious and creative color palette.
    - **CRITICAL:** The palette must be functional for a light-mode UI. Prioritize legibility and accessibility (WCAG AA+ contrast).
    - **Background/Card:** Must be very light and near-neutral.
    - **Foreground/Text:** Must be very dark and high-contrast.
    - **Primary & Accent:** These should be the most expressive colors that capture the brand's essence. They MUST be harmonious. The accent color should complement the primary color, not clash with it. Think analogous colors or different shades, **not complementary (opposite) colors.**
    - **Accent Foreground:** This MUST be a color that has a high contrast ratio (WCAG AA or higher) against the Accent Color.

    **Step 3: Select Expressive Typography**
    - Based on the vibe, choose a compelling Google Font pairing.
    - **Headings:** Something with personality.
    - **Body:** Something highly readable.

    **Step 4: Define the UI Shape & Style**
    - **Corner Radius:** Match the vibe.
    - **Sidebar Style:** 'primary' for bold, 'card' for clean.

    **FINAL OUTPUT:**
    Respond ONLY with a single, valid JSON object. Do not include any other text or markdown.
    
    {
      "themeName": "A creative, evocative name for this unique theme.",
      "colors": {
        "primary": "#HEXCODE", "primaryForeground": "#HEXCODE", "secondary": "#HEXCODE", "secondaryForeground": "#HEXCODE",
        "background": "#HEXCODE", "foreground": "#HEXCODE", "card": "#HEXCODE", "cardForeground": "#HEXCODE", "accent": "#HEXCODE", "accentForeground": "#HEXCODE"
      },
      "fonts": { "heading": "Google Font Name", "body": "Google Font Name" },
      "radius": "X.Xrem", "sidebarStyle": "primary"
    }
  `;
};

const fetchWithTimeout = async (url: string, options: any, timeout = 20000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  options.signal = controller.signal;

  try {
    const response = await fetch(url, options);
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout / 1000} seconds.`);
    }
    throw error;
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }

  try {
    if (!GEMINI_API_KEY) throw new Error("Gemini API key is not configured.");

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not found');

    // 1. Fetch all available brand data
    const { data: business } = await supabase.from('businesses').select('id').eq('user_id', user.id).single();
    const { data: shopDetails } = await supabase.from('shop_details').select('about').eq('business_id', business?.id).single();
    const { data: igProfile, error: profileError } = await supabase.functions.invoke('instagram-profile');
    if (profileError) throw profileError;
    if (igProfile.error) throw new Error(igProfile.error);

    const combinedProfile = { ...igProfile, about: shopDetails?.about || '' };

    let analysis;
    try {
      if (!combinedProfile.logo_url) throw new Error("No profile icon found, falling back to text analysis.");
      
      const imageResponse = await fetch(combinedProfile.logo_url);
      if (!imageResponse.ok) throw new Error(`Failed to fetch profile image. Status: ${imageResponse.status}`);
      
      const imageMimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

      const imagePrompt = getDesignPrompt(combinedProfile);
      
      const geminiResponse = await fetchWithTimeout(GEMINI_API_URL, {
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

      const textPrompt = getTextOnlyDesignPrompt(combinedProfile);
      const geminiResponse = await fetchWithTimeout(GEMINI_API_URL, {
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

    // 2. Save the generated theme as a new custom theme
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { data: currentSettingsData } = await supabaseAdmin.from('design_settings').select('settings').eq('user_id', user.id).single();
    const currentSettings = currentSettingsData?.settings || {};
    const customThemes = currentSettings.customThemes || [];

    const lightScheme: { [key: string]: string } = {};
    for (const [key, value] of Object.entries(analysis.colors)) {
      const cssVar = `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
      lightScheme[cssVar] = hexToHsl(value as string);
    }
    // Add required system colors
    lightScheme['--destructive'] = '0 84.2% 60.2%';
    lightScheme['--destructive-foreground'] = '0 0% 98%';
    lightScheme['--warning'] = '47.9 95.8% 53.1%';
    lightScheme['--warning-foreground'] = '48 96% 10%';
    lightScheme['--info'] = '217.2 91.2% 59.8%';
    lightScheme['--info-foreground'] = '0 0% 98%';

    const newCustomTheme = {
      id: crypto.randomUUID(),
      name: analysis.themeName,
      light: lightScheme,
    };

    customThemes.push(newCustomTheme);
    const updatedSettings = { ...currentSettings, customThemes };

    const { error: upsertError } = await supabaseAdmin.from('design_settings').upsert({ user_id: user.id, settings: updatedSettings }, { onConflict: 'user_id' });
    if (upsertError) throw upsertError;

    // 3. Return the generated theme for immediate application on the frontend
    return new Response(JSON.stringify(analysis), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});