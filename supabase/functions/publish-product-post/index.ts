/**
 * publish-product-post — the REVERSE pipeline: a product created in Vela
 * becomes an Instagram post on the merchant's connected Business profile.
 *
 * Two-step flow so the merchant stays in control:
 *   { productId, mode: 'preview' }
 *     → generates a ready-to-post caption with Gemini (Albanian-first, uses
 *       the product's translations when present) + lists image candidates.
 *   { productId, mode: 'publish', caption, imageUrl? }
 *     → creates the IG media container (image transcoded to JPEG via the
 *       wsrv.nl proxy — Instagram only accepts JPEG), waits for it to be
 *       ready, publishes it, stores the media id on the product
 *       (instagram_post_id — which also makes the next background-sync
 *       recognize the post as this product instead of duplicating it),
 *       and returns the permalink.
 *
 * Publishing needs the `instagram_content_publish` scope. Connections made
 * before 2026-07-21 don't have it — those get { error: 'reconnect_required' }
 * and the UI sends the merchant to reconnect Instagram.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
const GRAPH = 'https://graph.facebook.com/v19.0';
const SHOP_ORIGIN = Deno.env.get('SHOP_PUBLIC_ORIGIN') ?? 'https://instantshop.al';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

/** Instagram only accepts publicly-reachable JPEGs — proxy everything. */
const asJpeg = (url: string) =>
  `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg&q=88&w=1080&h=1350&fit=inside`;

/** FB error → is this a permissions problem the merchant fixes by reconnecting? */
const isPermissionError = (err: any) => {
  const code = err?.error?.code;
  const sub = err?.error?.error_subcode;
  return code === 10 || code === 200 || code === 190 || sub === 463 || sub === 460;
};

const buildCaptionPrompt = (p: any, shop: any) => {
  const sq = p.translations?.sq ?? {};
  const name = sq.name || p.name;
  const details = Object.entries(p.details || {})
    .filter(([k, v]) => k !== 'type' && v != null && typeof v !== 'object')
    .map(([k, v]) => `${k}: ${v}`).join('; ');
  const shopLink = `${SHOP_ORIGIN}/shop/${shop.slug}`;
  return `Write an Instagram caption in ALBANIAN for a small shop's product post. Output ONLY the caption text, no quotes, no explanation.

Product: ${name}
${p.caption ? `Existing description: ${String(p.caption).slice(0, 300)}` : ''}
Price: ${p.price} ${p.currency || 'ALL'}
${p.inventory != null ? `Stock: ${p.inventory}` : ''}
${details ? `Details: ${details}` : ''}
Shop: ${shop.shop_name || 'our shop'} — order online at ${shopLink}

Rules:
- Structure: a scroll-stopping first line (hook, may use 1-2 emojis), then 1-3 short lines with the key details (always include the price with its currency), then a call-to-action line pointing to ${shopLink} where they can order online with card or cash.
- Natural, warm Albanian with correct diacritics (ë, ç). Keep brand names and established loanwords as-is ("template" stays "template", never "shabllon").
- End with one line of 5-8 relevant Albanian hashtags (no spaces inside tags).
- Max ~120 words total. No markdown.`;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
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

    const { productId, mode = 'preview', caption: captionOverride, imageUrl } = await req.json();
    if (!productId) return json({ error: 'productId is required' }, 400);

    const { data: product } = await admin.from('products')
      .select('id, user_id, name, caption, price, currency, inventory, details, media_url, media_gallery, media_type, translations, instagram_post_id')
      .eq('id', productId).eq('user_id', user.id).maybeSingle();
    if (!product) return json({ error: 'Product not found' }, 404);

    const { data: shop } = await admin.from('shop_details')
      .select('slug, shop_name, businesses!inner(user_id)')
      .eq('businesses.user_id', user.id).maybeSingle();
    if (!shop) return json({ error: 'Shop not found' }, 404);

    const { data: integrationRows } = await admin.from('integrations')
      .select('provider, access_token, ig_account_id')
      .eq('user_id', user.id).in('provider', ['instagram', 'facebook']);
    const integration = integrationRows?.find((r: any) => r.provider === 'instagram') ?? integrationRows?.[0];
    if (!integration?.access_token) return json({ error: 'reconnect_required', detail: 'No Instagram connection.' }, 200);
    const token = integration.access_token;
    const graphBase = integration.provider === 'instagram' ? 'https://graph.instagram.com' : GRAPH;

    // Image candidates: gallery first, then the primary media (skip videos).
    const candidates: string[] = [
      ...(Array.isArray(product.media_gallery) ? product.media_gallery : []),
      ...(product.media_url && product.media_type !== 'video' ? [product.media_url] : []),
    ].filter((u, i, arr) => typeof u === 'string' && u.startsWith('http') && arr.indexOf(u) === i);

    /* ── preview: generate the caption ── */
    if (mode === 'preview') {
      if (!GEMINI_API_KEY) return json({ error: 'Caption generation is not configured.' }, 500);
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildCaptionPrompt(product, shop) }] }],
          generationConfig: { temperature: 0.8, thinkingConfig: { thinkingBudget: 0 } },
        }),
      });
      if (!res.ok) return json({ error: `Caption generation failed: ${await res.text()}` }, 500);
      const data = await res.json();
      const caption = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!caption) return json({ error: 'Caption generation returned nothing.' }, 500);
      // usage ledger (never blocks)
      try {
        const u = data.usageMetadata;
        if (u) await admin.from('ai_usage').insert({
          user_id: user.id, function_name: 'publish-product-post', model: 'gemini-2.5-flash',
          input_tokens: u.promptTokenCount ?? 0,
          output_tokens: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0),
          cost_usd: Math.round((((u.promptTokenCount ?? 0) * 0.30 + ((u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0)) * 2.50) / 1_000_000) * 1_000_000) / 1_000_000,
        });
      } catch { /* ignore */ }
      return json({ caption, imageCandidates: candidates, alreadyPublished: Boolean(product.instagram_post_id) });
    }

    /* ── publish ── */
    const rawImage = imageUrl && candidates.includes(imageUrl) ? imageUrl : candidates[0];
    if (!rawImage) return json({ error: 'This product has no image to post.' }, 400);
    const finalCaption = (captionOverride || '').trim();
    if (!finalCaption) return json({ error: 'A caption is required to publish.' }, 400);

    // Resolve the IG account id (stored; else /me for direct-IG, Pages
    // discovery for legacy Facebook connections).
    let igId: string | null = integration.ig_account_id ?? null;
    if (!igId && integration.provider === 'instagram') {
      const meRes = await fetch(`${graphBase}/me?fields=user_id&access_token=${token}`);
      const me = await meRes.json();
      if (!meRes.ok) return json(isPermissionError(me) ? { error: 'reconnect_required' } : { error: 'Could not resolve the Instagram account.' }, 200);
      igId = me.user_id ? String(me.user_id) : null;
    } else if (!igId) {
      const pagesRes = await fetch(`${GRAPH}/me/accounts?fields=instagram_business_account&access_token=${token}`);
      const pages = await pagesRes.json();
      if (!pagesRes.ok) return json(isPermissionError(pages) ? { error: 'reconnect_required' } : { error: 'Could not resolve the Instagram account.' }, 200);
      igId = pages.data?.find((p: any) => p.instagram_business_account)?.instagram_business_account?.id ?? null;
    }
    if (igId && !integration.ig_account_id) {
      await admin.from('integrations').update({ ig_account_id: igId }).eq('user_id', user.id).eq('provider', integration.provider);
    }
    if (!igId) return json({ error: 'reconnect_required', detail: 'No Instagram Business account linked.' }, 200);

    // 1) media container
    const containerRes = await fetch(`${graphBase}/${igId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ image_url: asJpeg(rawImage), caption: finalCaption, access_token: token }),
    });
    const container = await containerRes.json();
    if (!containerRes.ok || !container.id) {
      return json(isPermissionError(container)
        ? { error: 'reconnect_required' }
        : { error: `Instagram rejected the post: ${container?.error?.message ?? 'unknown error'}` }, 200);
    }

    // 2) wait for the container to be ready (images are usually instant)
    for (let i = 0; i < 6; i++) {
      const st = await (await fetch(`${graphBase}/${container.id}?fields=status_code&access_token=${token}`)).json();
      if (st.status_code === 'FINISHED') break;
      if (st.status_code === 'ERROR') return json({ error: 'Instagram could not process the image.' }, 200);
      await new Promise((r) => setTimeout(r, 1500));
    }

    // 3) publish
    const pubRes = await fetch(`${graphBase}/${igId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ creation_id: container.id, access_token: token }),
    });
    const pub = await pubRes.json();
    if (!pubRes.ok || !pub.id) {
      return json(isPermissionError(pub)
        ? { error: 'reconnect_required' }
        : { error: `Publishing failed: ${pub?.error?.message ?? 'unknown error'}` }, 200);
    }

    // 4) permalink + link the product to its post (background-sync will now
    //    match this media to THIS product instead of creating a duplicate).
    let permalink: string | null = null;
    try {
      const info = await (await fetch(`${graphBase}/${pub.id}?fields=permalink&access_token=${token}`)).json();
      permalink = info?.permalink ?? null;
    } catch { /* permalink is nice-to-have */ }
    await admin.from('products').update({ instagram_post_id: pub.id }).eq('id', product.id);

    return json({ mediaId: pub.id, permalink });
  } catch (e) {
    console.error('publish-product-post:', (e as Error).message);
    return json({ error: (e as Error).message }, 500);
  }
});
