import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import {
  RESPONSE_SCHEMA,
  getClassifierPrompt,
  IMAGE_ANALYSIS_INSTRUCTION,
  isCaptionInsufficient,
  normalizeAnalysis,
} from './core.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

function getGeminiUrl(model: 'flash' | 'pro' = 'flash'): string {
  const modelId = model === 'flash' ? 'gemini-2.5-flash' : 'gemini-2.5-pro';
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GEMINI_API_KEY}`;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Per-user prompt context (keywords + recent products), cached in instance
// memory. A sync classifies dozens of posts back-to-back for the same user on
// a warm instance — re-reading the same two tables per post was pure waste.
const CONTEXT_TTL_MS = 120_000;
const contextCache = new Map<string, { t: number; keywords: any[]; similarProducts: any[] }>();

async function getUserContext(supabaseAdmin: any, userId: string): Promise<{ keywords: any[]; similarProducts: any[] }> {
  const hit = contextCache.get(userId);
  if (hit && Date.now() - hit.t < CONTEXT_TTL_MS) return hit;
  const [keywordsRes, recentRes] = await Promise.all([
    supabaseAdmin.from('keywords').select('keyword, description').eq('user_id', userId),
    supabaseAdmin.from('products').select('name, category, details, caption').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(5),
  ]);
  if (keywordsRes.error) throw keywordsRes.error;
  if (recentRes.error) console.error("Could not fetch recent products for context:", recentRes.error);
  const entry = { t: Date.now(), keywords: keywordsRes.data || [], similarProducts: recentRes.data || [] };
  contextCache.set(userId, entry);
  if (contextCache.size > 200) contextCache.delete(contextCache.keys().next().value);
  return entry;
}

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 4 * 1024 * 1024) return null;
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > 4 * 1024 * 1024) return null;
    // Chunked conversion — spreading the whole byte array into String.fromCharCode
    // blows the call stack for anything beyond ~100KB, which silently disabled
    // image analysis for every real photo.
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const CHUNK = 0x8000;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)));
    }
    const base64 = btoa(binary);
    const mimeType = response.headers.get('content-type') || 'image/jpeg';
    return { data: base64, mimeType };
  } catch {
    return null;
  }
}

async function getPostMedia(
  post: { media_url?: string; thumbnail_url?: string; media_type?: string; id?: string },
  accessToken?: string
): Promise<Array<{ inline_data: { mime_type: string; data: string } }>> {
  const parts: Array<{ inline_data: { mime_type: string; data: string } }> = [];
  if (post.media_type === 'VIDEO') {
    if (post.thumbnail_url) {
      const img = await fetchImageAsBase64(post.thumbnail_url);
      if (img) parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
    }
  } else if (post.media_type === 'CAROUSEL_ALBUM' && post.id && accessToken) {
    try {
      const childrenRes = await fetch(
        `https://graph.instagram.com/${post.id}/children?fields=id,media_url,media_type,thumbnail_url&access_token=${accessToken}`
      );
      const children = await childrenRes.json();
      const items = (children.data || []).slice(0, 3);
      for (const child of items) {
        const url = child.media_type === 'VIDEO' ? child.thumbnail_url : child.media_url;
        if (url) {
          const img = await fetchImageAsBase64(url);
          if (img) parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
        }
      }
    } catch { /* graceful degradation */ }
  } else if (post.media_url) {
    const img = await fetchImageAsBase64(post.media_url);
    if (img) parts.push({ inline_data: { mime_type: img.mimeType, data: img.data } });
  }
  return parts;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!GEMINI_API_KEY) throw new Error("Gemini API key is not configured.");
    const { caption, user_id, target_currency = 'EUR', include_images, post_media, access_token } = await req.json();
    // Caption-less posts ARE analyzable — via their media. Only reject when
    // there is truly nothing to look at. (Previously `if (!caption) throw`
    // meant background-sync's caption:'' + include_images:true posts could
    // never reach image analysis.)
    if (!caption && !post_media?.media_url && !post_media?.thumbnail_url) {
      throw new Error("Caption or post media is required for analysis.");
    }
    if (!user_id) throw new Error("User ID is required to fetch keywords.");
    const captionText = caption || '';

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Currency is only used as context for the AI; prices are always stored in ALL.
    const userCurrency = target_currency;

    // Keywords + similar products: one parallel round, cached per user across
    // invocations on a warm instance.
    const { keywords, similarProducts } = await getUserContext(supabaseAdmin, user_id);

    const promptText = getClassifierPrompt(captionText, keywords || [], similarProducts);

    // Determine if we should include images in this request
    let usedImages = false;
    const shouldIncludeImages = include_images || isCaptionInsufficient(captionText);
    let imageParts: Array<{ inline_data: { mime_type: string; data: string } }> = [];
    if (shouldIncludeImages && post_media) {
      const mediaObj = {
        media_url: post_media.media_url,
        thumbnail_url: post_media.thumbnail_url,
        media_type: post_media.media_type,
        id: post_media.post_id,
      };
      imageParts = await getPostMedia(mediaObj, access_token);
    }

    let finalPrompt = promptText;
    if (imageParts.length > 0) {
      usedImages = true;
      finalPrompt += IMAGE_ANALYSIS_INSTRUCTION;
    }

    const requestParts = [{ text: finalPrompt }, ...imageParts];

    // Call Gemini WITHOUT Google Search grounding for speed (grounding adds 5-15s per call)
    // Specs are found later via the find-product-specs waterfall.
    // thinkingBudget: 0 — extraction doesn't need chain-of-thought, and 2.5 Flash
    // bills thinking tokens as output; disabling it cuts both latency and cost.
    // Low temperature keeps field extraction deterministic.
    const makeBody = (withSchema: boolean) => JSON.stringify({
      contents: [{ parts: requestParts }],
      generationConfig: {
        responseMimeType: "application/json",
        ...(withSchema ? { responseSchema: RESPONSE_SCHEMA } : {}),
        temperature: 0.2,
        // 512 (not 0): zero thinking + responseSchema makes 2.5-flash emit
        // truncated minimal objects AND corrupt non-ASCII output (live-
        // confirmed: 57-token responses, U+FFFD in Albanian diacritics).
        thinkingConfig: { thinkingBudget: 512 },
      },
    });
    const callGemini = async (withSchema: boolean) => {
      const abortController = new AbortController();
      const geminiTimeout = setTimeout(() => abortController.abort(), 25000); // 25s timeout
      try {
        return await fetch(getGeminiUrl('flash'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: makeBody(withSchema),
          signal: abortController.signal,
        });
      } finally {
        clearTimeout(geminiTimeout);
      }
    };
    // Structured output first; retry once on transient failures (429/5xx/
    // network); if the schema itself is rejected (4xx), fall back to plain
    // JSON mode — the downstream normalization still handles that shape.
    let geminiResponse: Response;
    try {
      geminiResponse = await callGemini(true);
      if (geminiResponse.status === 429 || geminiResponse.status >= 500) {
        await new Promise((r) => setTimeout(r, 1200));
        geminiResponse = await callGemini(true);
      }
    } catch (_firstErr) {
      await new Promise((r) => setTimeout(r, 800));
      geminiResponse = await callGemini(true);
    }
    if (!geminiResponse.ok && geminiResponse.status >= 400 && geminiResponse.status < 500 && geminiResponse.status !== 429) {
      console.warn(`Structured output rejected (${geminiResponse.status}); retrying without schema.`);
      geminiResponse = await callGemini(false);
    }

    if (!geminiResponse.ok) throw new Error(`Gemini API error: ${await geminiResponse.text()}`);
    const geminiData = await geminiResponse.json();

    // Check for empty candidates array which indicates a failure to generate content
    if (!geminiData.candidates || geminiData.candidates.length === 0) {
        throw new Error("AI failed to generate a response. The prompt might be too complex or the model timed out.");
    }

    const analysisText = geminiData.candidates[0].content.parts[0].text;
    let analysis: any;
    try {
        analysis = JSON.parse(analysisText);
    } catch (e) {
        console.error("Failed to parse AI response JSON:", analysisText);
        throw new Error("AI returned invalid JSON format.");
    }

    // The whole deterministic tail (option shape conversion, numeric-key
    // normalization, heuristic multi-product fallback, category inference,
    // required-field defaults) lives in core.ts — shared with the test
    // harness so what we test IS what runs here.
    const normalized = normalizeAnalysis({
      analysis,
      caption: captionText,
      usedImages,
      hasPostMedia: Boolean(post_media?.media_url),
    });

    const result = {
      ...normalized,
      tokenUsage: geminiData.usageMetadata,
      currency_preferences: {
        original_currency: normalized.original_currency,
        display_currency: userCurrency,
        is_converted: false
      }
    };

    // Record token usage + estimated cost so the admin panel can show per-client
    // AI spend. Must be AWAITED: the edge runtime tears down pending promises
    // once the response is returned, so a fire-and-forget insert never lands.
    // Errors are swallowed so a ledger problem can never block classification.
    // Pricing: Gemini 2.5 Flash ($/1M tokens).
    if (geminiData.usageMetadata) {
      try {
        const IN_PER_M = 0.30, OUT_PER_M = 2.50;
        const inputTokens = geminiData.usageMetadata.promptTokenCount ?? 0;
        const outputTokens = (geminiData.usageMetadata.candidatesTokenCount ?? 0) + (geminiData.usageMetadata.thoughtsTokenCount ?? 0);
        const costUsd = (inputTokens * IN_PER_M + outputTokens * OUT_PER_M) / 1_000_000;
        const { error: usageErr } = await supabaseAdmin.from('ai_usage').insert({
          user_id,
          function_name: 'ai-product-classifier',
          model: 'gemini-2.5-flash',
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          cost_usd: Math.round(costUsd * 1_000_000) / 1_000_000,
        });
        if (usageErr) console.warn('ai_usage insert failed:', usageErr.message);
      } catch (e) {
        console.warn('ai_usage logging error:', (e as Error).message);
      }
    }

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Classifier Function Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
