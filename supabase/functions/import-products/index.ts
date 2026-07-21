/**
 * import-products — AI-powered spreadsheet import.
 *
 * The client parses the CSV/Excel into raw rows (any column names, any
 * language, any mess) and sends them here. The system maps them to
 * structured products with Gemini — names, prices ("4,500 L", "20k lek"),
 * inventory, categories, image URL lists, specifications, option groups —
 * then creates everything server-side: product rows (category is a TEXT
 * column), product_specifications, product_options + option_values, and
 * the categories table for the manager.
 *
 * Body: { rows: object[] }  (≤200 rows/call; processed in chunks of 20)
 * Returns: { results: [{ name, ok, error? }], created }
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    products: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', nullable: true },
          description: { type: 'STRING', nullable: true },
          price: { type: 'NUMBER', nullable: true },
          currency: { type: 'STRING', nullable: true },
          inventory: { type: 'NUMBER', nullable: true },
          category: { type: 'STRING', nullable: true },
          imageUrls: { type: 'ARRAY', items: { type: 'STRING' }, nullable: true },
          specifications: {
            type: 'ARRAY', nullable: true,
            items: { type: 'OBJECT', properties: { key: { type: 'STRING' }, value: { type: 'STRING' } }, required: ['key', 'value'] },
          },
          options: {
            type: 'ARRAY', nullable: true,
            items: { type: 'OBJECT', properties: { name: { type: 'STRING' }, values: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['name', 'values'] },
          },
        },
        required: ['name', 'price', 'currency', 'inventory', 'category', 'imageUrls', 'specifications', 'options'],
      },
    },
  },
  required: ['products'],
};

const PROMPT = `You convert a merchant's product spreadsheet rows into structured products for an e-commerce shop. The rows come from arbitrary files: column names may be in Albanian, English or anything else, and data may be messy.

Rules:
- One output product per input row that describes a sellable product. Rows that are clearly headers, totals, notes or empty → skip them (do not output them at all).
- Keep the merchant's original wording for names, categories, specification values and option values. Do not translate.
- Prices: parse formats like "4,500 L", "4500 lek", "20k lek" (= 20000), "45 €"/EUR. Currency is the ISO code (ALL, EUR, USD…); Albanian "L"/"lek"/"lekë" means ALL. If no price is found, price = null — NEVER invent one.
- inventory: integer if present, else null. category: from any category-like column, else null.
- imageUrls: collect every http(s) URL that looks like an image/photo link, from any column, splitting lists on commas, semicolons, pipes or whitespace.
- specifications: durable facts (material, dimensions, weight, origin, care...) as key/value pairs in the merchant's language. Units stay inside the value.
- options: purchasable variations (sizes, colors...) as groups with their value lists. "S/M/L", "S,M,L", "S|M|L" all mean three values.
- Do not put the same data in both specifications and options: if customers choose it, it's an option.

Input rows (JSON):
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!GEMINI_API_KEY) return json({ error: 'Import is not configured on the server.' }, 500);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }, auth: { persistSession: false } }
    );
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const { rows, jobId, jobTotal, jobOffset = 0, jobFinal = true } = await req.json();
    if (!Array.isArray(rows) || !rows.length) return json({ error: 'No rows to import.' }, 400);
    if (rows.length > 200) return json({ error: 'Max 200 rows per import.' }, 400);

    const { data: business } = await admin.from('businesses').select('id').eq('user_id', user.id).single();
    if (!business) return json({ error: 'No business found for this account.' }, 404);

    // Progress lives in sync_jobs (summary.job_kind='import') so the app's
    // sync widget shows the import running in the background.
    const totalRows = Number.isFinite(jobTotal) ? jobTotal : rows.length;
    let importJobId: string | null = typeof jobId === 'string' ? jobId : null;
    if (!importJobId) {
      const { data: job } = await admin.from('sync_jobs').insert({
        user_id: user.id, status: 'in_progress', progress: 0, total: totalRows,
        message: `Importing ${totalRows} rows from file…`,
        summary: { job_kind: 'import', created: 0, failed: 0 },
      }).select('id').single();
      importJobId = job?.id ?? null;
    }
    const updateJob = async (patch: Record<string, unknown>) => {
      if (!importJobId) return;
      await admin.from('sync_jobs').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', importJobId);
    };

    // ── 1. Map raw rows → structured products with Gemini (chunks of 20) ──
    const products: any[] = [];
    let inTokens = 0, outTokens = 0;
    for (let i = 0; i < rows.length; i += 20) {
      const chunk = rows.slice(i, i + 20);
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT + JSON.stringify(chunk) }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            thinkingConfig: { thinkingBudget: 512 },
          },
        }),
      });
      if (!res.ok) return json({ error: `The system could not read the file: ${(await res.text()).slice(0, 200)}` }, 502);
      const data = await res.json();
      inTokens += data.usageMetadata?.promptTokenCount ?? 0;
      outTokens += (data.usageMetadata?.candidatesTokenCount ?? 0) + (data.usageMetadata?.thoughtsTokenCount ?? 0);
      try {
        const parsed = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}');
        products.push(...(parsed.products ?? []).filter((p: any) => p?.name));
      } catch { /* skip unparseable chunk */ }
    }
    try {
      await admin.from('ai_usage').insert({
        user_id: user.id, function_name: 'import-products', model: 'gemini-2.5-flash',
        input_tokens: inTokens, output_tokens: outTokens,
        cost_usd: Math.round(((inTokens * 0.30 + outTokens * 2.50) / 1_000_000) * 1_000_000) / 1_000_000,
      });
    } catch { /* usage log never blocks */ }

    if (!products.length) {
      if (jobFinal) await updateJob({ status: 'completed', progress: totalRows, message: 'No products recognized in the file.' });
      return json({ results: [], created: 0, jobId: importJobId, error: 'No products recognized in the file.' });
    }

    // ── 2. Create everything ──
    const { data: existingCats } = await admin.from('categories').select('name').eq('user_id', user.id);
    const knownCats = new Set((existingCats || []).map((c: any) => c.name.toLowerCase()));
    const results: Array<{ name: string; ok: boolean; error?: string }> = [];
    let created = 0;

    for (const p of products) {
      try {
        const images = (p.imageUrls || []).filter((u: string) => typeof u === 'string' && /^https?:\/\//.test(u));
        const category = p.category?.trim() || null;
        if (category && !knownCats.has(category.toLowerCase())) {
          await admin.from('categories').insert({ name: category, user_id: user.id });
          knownCats.add(category.toLowerCase());
        }

        const { data: product, error: pErr } = await admin.from('products').insert({
          user_id: user.id,
          business_id: business.id,
          source: 'import',
          name: String(p.name).slice(0, 200),
          caption: p.description || null,
          status: 'Active',
          price: typeof p.price === 'number' ? p.price : 0,
          currency: (p.currency || 'ALL').toUpperCase().slice(0, 3),
          inventory: Number.isFinite(p.inventory) ? Math.max(0, Math.round(p.inventory)) : 0,
          pricing_type: 'one_time',
          product_type: 'physical',
          details: { type: 'generic' },
          tags: [],
          category,
          media_url: images[0] ?? null,
          media_type: images[0] ? 'image' : null,
          media_gallery: images.length > 1 ? images : null,
        }).select('id').single();
        if (pErr || !product) throw new Error(pErr?.message || 'insert failed');

        const specs = (p.specifications || []).filter((s: any) => s?.key && s?.value);
        if (specs.length) {
          await admin.from('product_specifications').insert(
            specs.map((s: any, idx: number) => ({
              product_id: product.id, user_id: user.id,
              key: String(s.key).slice(0, 80), value: String(s.value).slice(0, 200), display_order: idx,
            }))
          );
        }

        for (const [gIdx, group] of (p.options || []).entries()) {
          const values = (group?.values || []).map((v: any) => String(v).trim()).filter(Boolean);
          if (!group?.name || !values.length) continue;
          const { data: opt } = await admin.from('product_options')
            .insert({ product_id: product.id, user_id: user.id, name: String(group.name).slice(0, 60), display_order: gIdx, is_active: true })
            .select('id').single();
          if (!opt) continue;
          await admin.from('option_values').insert(
            values.map((v: string, vIdx: number) => ({
              option_id: opt.id, user_id: user.id, value: v.slice(0, 60),
              inventory: Number.isFinite(p.inventory) ? Math.max(0, Math.round(p.inventory)) : 0,
              is_active: true, is_default: vIdx === 0, display_order: vIdx,
            }))
          );
        }

        created++;
        results.push({ name: p.name, ok: true });
      } catch (e) {
        results.push({ name: p.name ?? '?', ok: false, error: (e as Error).message });
      }
      await updateJob({
        progress: Math.min(jobOffset + results.length, totalRows),
        message: `Imported ${created} products…`,
      });
    }

    // Accumulate counts across chunked calls before (maybe) completing.
    const failed = results.filter((r) => !r.ok).length;
    if (importJobId) {
      const { data: cur } = await admin.from('sync_jobs').select('summary').eq('id', importJobId).maybeSingle();
      const totCreated = (cur?.summary?.created ?? 0) + created;
      const totFailed = (cur?.summary?.failed ?? 0) + failed;
      await updateJob({
        summary: { job_kind: 'import', created: totCreated, failed: totFailed },
        ...(jobFinal ? {
          status: 'completed', progress: totalRows,
          message: `Import finished — ${totCreated} products created${totFailed ? `, ${totFailed} failed` : ''}.`,
        } : {}),
      });
    }

    return json({ results, created, jobId: importJobId });
  } catch (e) {
    console.error('import-products:', (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
