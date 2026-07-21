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

/** Caption style knobs (set in Instagram Studio, overridable per publish). */
interface CaptionStyle {
  structure?: 'descriptive' | 'paragraph' | 'structured' | 'minimal';
  tone?: 'friendly' | 'professional' | 'luxury' | 'playful';
  emojis?: 'none' | 'light' | 'rich';
  hashtags?: number;
  language?: 'sq' | 'en';
}

const STRUCTURE_RULES: Record<string, string> = {
  descriptive: 'a scroll-stopping first line (hook), then 2-4 short lines painting the product vividly (always include the price with its currency), then a call-to-action line',
  paragraph: 'one flowing paragraph (3-5 sentences): hook first, the product story with the price woven in naturally, ending in a call-to-action',
  structured: 'a hook line, then a compact bullet-style list using ▪ for each key fact (price, sizes/options, availability), then a call-to-action line',
  minimal: 'one punchy hook line, one line with product + price, one short call-to-action — nothing else',
};
const TONE_RULES: Record<string, string> = {
  friendly: 'warm, neighborly and direct — like a small-shop owner talking to regulars',
  professional: 'polished and confident, no slang, precise wording',
  luxury: 'elegant and restrained, evocative adjectives, a sense of exclusivity',
  playful: 'fun, energetic, a bit cheeky — allowed to joke',
};
const EMOJI_RULES: Record<string, string> = {
  none: 'Do NOT use any emojis.',
  light: 'Use 1-3 well-placed emojis total.',
  rich: 'Use emojis generously (6-10 total) to add energy, including in the bullet lines.',
};

const buildCaptionPrompt = (p: any, shop: any, style: CaptionStyle) => {
  const lang = style.language === 'en' ? 'ENGLISH' : 'ALBANIAN';
  const sq = p.translations?.sq ?? {};
  const name = (style.language === 'en' ? p.name : (sq.name || p.name));
  const details = Object.entries(p.details || {})
    .filter(([k, v]) => k !== 'type' && v != null && typeof v !== 'object')
    .map(([k, v]) => `${k}: ${v}`).join('; ');
  const shopLink = `${SHOP_ORIGIN}/shop/${shop.slug}`;
  const structure = STRUCTURE_RULES[style.structure ?? 'descriptive'] ?? STRUCTURE_RULES.descriptive;
  const tone = TONE_RULES[style.tone ?? 'friendly'] ?? TONE_RULES.friendly;
  const emoji = EMOJI_RULES[style.emojis ?? 'light'] ?? EMOJI_RULES.light;
  const hashtagCount = Math.min(Math.max(style.hashtags ?? 6, 0), 15);
  return `Write an Instagram caption in ${lang} for a small shop's product post. Output ONLY the caption text, no quotes, no explanation.

Product: ${name}
${p.caption ? `Existing description: ${String(p.caption).slice(0, 300)}` : ''}
Price: ${p.price} ${p.currency || 'ALL'}
${p.inventory != null ? `Stock: ${p.inventory}` : ''}
${details ? `Details: ${details}` : ''}
Shop: ${shop.shop_name || 'our shop'} — order online at ${shopLink}

Rules:
- Structure: ${structure}. The call-to-action points to ${shopLink} where they can order online with card or cash.
- Tone: ${tone}.
- ${emoji}
- Natural ${lang === 'ALBANIAN' ? 'Albanian with correct diacritics (ë, ç)' : 'English'}. Keep brand names and established loanwords as-is ("template" stays "template"${lang === 'ALBANIAN' ? ', never "shabllon"' : ''}).
${hashtagCount > 0 ? `- End with one line of ${Math.max(hashtagCount - 2, 3)}-${hashtagCount} relevant ${lang === 'ALBANIAN' ? 'Albanian' : 'English'} hashtags (no spaces inside tags).` : '- Do not add hashtags.'}
- Max ~130 words total. No markdown.`;
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

    const { productId, mode = 'preview', caption: captionOverride, imageUrl, captionStyle = {} } = await req.json();
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

    /* ── unpublish: toggle the product back to shop-only ── */
    if (mode === 'unpublish') {
      if (!product.instagram_post_id) return json({ error: 'This product is not linked to an Instagram post.' }, 400);
      const mediaId = product.instagram_post_id;
      let deleted = false;
      let permalink: string | null = null;
      if (integration.provider === 'facebook') {
        // The delete endpoint only exists on the Facebook-login API.
        try {
          const delRes = await fetch(`${GRAPH}/${mediaId}?access_token=${token}`, { method: 'DELETE' });
          const del = await delRes.json().catch(() => ({}));
          deleted = delRes.ok && del.success !== false;
        } catch { /* fall through to unlink */ }
      }
      if (!deleted) {
        // IG-login API can't delete/archive — hand back the permalink so the
        // merchant can archive it in one tap; we unlink either way.
        try {
          const info = await (await fetch(`${graphBase}/${mediaId}?fields=permalink&access_token=${token}`)).json();
          permalink = info?.permalink ?? null;
        } catch { /* permalink is best-effort */ }
      }
      await admin.from('products').update({ instagram_post_id: null }).eq('id', product.id);
      return json({ unlinked: true, deleted, permalink });
    }

    /* ── preview: generate the caption ── */
    if (mode === 'preview') {
      if (!GEMINI_API_KEY) return json({ error: 'Caption generation is not configured.' }, 500);
      const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildCaptionPrompt(product, shop, captionStyle) }] }],
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
    // Accept any https image the merchant explicitly chose (Instagram Studio
    // uploads rendered overlays to storage, so it won't be in candidates).
    const rawImage = (typeof imageUrl === 'string' && imageUrl.startsWith('https://')) ? imageUrl : candidates[0];
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
