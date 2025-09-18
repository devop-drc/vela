import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const getDesignPrompt = (profile: any, posts: any[]) => {
  const postCaptions = posts.map(p => `- ${p.caption}`).join('\n');
  return `
    You are a world-class branding and UI/UX designer. Your task is to analyze an Instagram profile and generate a complete design system theme for a web dashboard.

    **Analysis Data:**
    - Shop Name: ${profile.shop_name}
    - Bio: ${profile.description}
    - Latest Post Captions:
    ${postCaptions}

    **Instructions:**
    1.  **Analyze the Brand Identity:** Based on all the provided data, determine the brand's personality (e.g., "minimalist and clean," "bold and energetic," "earthy and organic," "luxurious and elegant").
    2.  **Generate a Color Palette:** Create a harmonious light-mode color palette that reflects the brand identity. Provide colors in HEX format. Ensure text is legible on backgrounds (WCAG AA).
    3.  **Select Typography:** Choose one font for headings and one for body text from the Google Fonts library that matches the brand's style.
    4.  **Determine UI Style:** Decide on an appropriate corner radius and sidebar style.

    **Output Format:**
    Respond ONLY with a single, valid JSON object. Do not include markdown backticks or any other text.

    {
      "themeName": "A creative name for the generated theme (e.g., 'Urban Explorer', 'Coastal Calm').",
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

    const [profileRes, postsRes] = await Promise.all([
      supabase.functions.invoke('instagram-profile'),
      supabase.functions.invoke('instagram-posts', { body: { limit: 5 } })
    ]);

    if (profileRes.error) throw profileRes.error;
    if (profileRes.data.error) throw new Error(profileRes.data.error);
    if (postsRes.error) throw postsRes.error;
    if (postsRes.data.error) throw new Error(postsRes.data.error);

    const prompt = getDesignPrompt(profileRes.data, postsRes.data.posts || []);
    
    const geminiResponse = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API error: ${errorText}`);
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