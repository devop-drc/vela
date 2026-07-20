// translate-products — backfills Albanian translations for existing products.
//
// The AI classifier writes English-canonical name/caption; NEW syncs also get
// translations.sq from the classifier. This function fills the gap for
// products created before that: it batches the caller's untranslated products
// through Gemini Flash (translation-only — far cheaper than re-analysis) and
// stores { sq: { name, caption } } in products.translations.
//
// Auth: the merchant's own JWT — only their products are touched. Call
// repeatedly until { remaining: 0 }; each invocation handles up to BATCHES×BATCH_SIZE.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const BATCH_SIZE = 20;   // products per Gemini call
const BATCHES = 5;       // max Gemini calls per invocation

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    items: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          id: { type: 'STRING' },
          nameSq: { type: 'STRING' },
          captionSq: { type: 'STRING', nullable: true },
        },
        required: ['id', 'nameSq'],
      },
    },
  },
  required: ['items'],
};

const prompt = (items: Array<{ id: string; name: string; caption: string | null }>) => `
You are a professional Albanian e-commerce translator. Translate each product's
name and description into natural, fluent Albanian for an online shop.

Rules:
- Keep brand names, model numbers and established loanwords EXACTLY as-is
  (e.g. "template" stays "template" — never "shabllon"; "smartphone" stays
  "smartphone"; "Nike Air Max" stays "Nike Air Max").
- Names: max 10 words, no emojis or hashtags.
- Descriptions: same meaning and selling tone, correct diacritics (ë, ç).
  If a description is empty or null, return captionSq as null.
- If the source text is ALREADY Albanian, return it lightly cleaned (fix
  obvious typos/diacritics) rather than re-translating.
- Return every input id exactly once.

Products (JSON):
${JSON.stringify(items)}
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!GEMINI_API_KEY) throw new Error('Gemini API key is not configured.');

    // Caller-scoped client: RLS restricts everything to the merchant's rows.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }, auth: { persistSession: false } },
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Not authenticated.' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let translated = 0;
    let failed = 0;

    for (let b = 0; b < BATCHES; b++) {
      const { data: rows, error } = await supabase
        .from('products')
        .select('id, name, caption, translations')
        .eq('user_id', user.id)
        .or('translations.is.null,translations->sq.is.null')
        .order('created_at', { ascending: true })
        .limit(BATCH_SIZE);
      if (error) throw error;
      if (!rows || rows.length === 0) break;

      const items = rows.map((r: any) => ({ id: r.id, name: r.name || '', caption: r.caption || null }));
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt(items) }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0.2,
            // Translation needs no reasoning — keep it cheap and fast.
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      let parsed: any;
      try { parsed = JSON.parse(text); } catch { throw new Error('Gemini returned unparseable JSON.'); }

      const byId = new Map<string, any>((parsed.items || []).map((it: any) => [it.id, it]));
      for (const row of rows as any[]) {
        const t = byId.get(row.id);
        if (!t?.nameSq) { failed++; continue; }
        const sq: Record<string, string> = { name: String(t.nameSq).slice(0, 200) };
        if (t.captionSq) sq.caption = String(t.captionSq).slice(0, 4000);
        const merged = { ...(row.translations || {}), sq };
        const { error: upErr } = await supabase.from('products').update({ translations: merged }).eq('id', row.id);
        if (upErr) { failed++; continue; }
        translated++;
      }
      if (rows.length < BATCH_SIZE) break; // caught up
    }

    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .or('translations.is.null,translations->sq.is.null');

    return new Response(JSON.stringify({ translated, failed, remaining: count ?? 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('translate-products failed:', e?.message || e);
    return new Response(JSON.stringify({ error: e?.message || 'Unexpected error.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
