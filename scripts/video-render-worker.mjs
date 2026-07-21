// Async Remotion render worker for Instagram Studio videos.
//
//   node scripts/video-render-worker.mjs          # poll loop (10s)
//   node scripts/video-render-worker.mjs --once   # drain queue and exit
//
// Claims queued rows from video_render_jobs, renders the ProductPromo
// composition (format decides canvas: post 1080x1350, story/reel 1080x1920),
// uploads the MP4 to the product-media bucket and marks the row done.
// Needs SUPABASE_SERVICE_ROLE_KEY in scripts/.render-worker.local:
//   SUPABASE_URL=...
//   SUPABASE_SERVICE_ROLE_KEY=...
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

const NL = String.fromCharCode(10);
const parse = (p) => Object.fromEntries(readFileSync(p, 'utf8').split(NL).filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const env = parse('scripts/.render-worker.local');
const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

console.log('bundling remotion project…');
const serveUrl = await bundle({ entryPoint: 'src/remotion.ts' });
console.log('bundle ready');

const SIZES = { post: { width: 1080, height: 1350 }, story: { width: 1080, height: 1920 }, reel: { width: 1080, height: 1920 } };

async function processJob(job) {
  console.log(`[${job.id}] rendering ${job.format}/${job.template}…`);
  try {
    const inputProps = {
      videoUrl: job.props.videoUrl ?? null,
      imageUrl: job.props.imageUrl ?? null,
      name: job.props.name ?? 'Produkt',
      price: job.props.price ?? null,
      currency: job.props.currency ?? 'ALL',
      shopName: job.props.shopName ?? '',
      accent: job.props.accent ?? '#A31234',
      template: job.template,
    };
    const composition = await selectComposition({ serveUrl, id: 'ProductPromo', inputProps });
    const size = SIZES[job.format] ?? SIZES.reel;
    const out = `out/job-${job.id}.mp4`;
    await renderMedia({
      composition: { ...composition, ...size },
      serveUrl, codec: 'h264', crf: 19, outputLocation: out, inputProps,
    });
    const path = `${job.user_id}/ig-videos/${job.id}.mp4`;
    const { error: upErr } = await sb.storage.from('product-media')
      .upload(path, readFileSync(out), { contentType: 'video/mp4', cacheControl: '31536000', upsert: true });
    if (upErr) throw new Error(upErr.message);
    const url = sb.storage.from('product-media').getPublicUrl(path).data.publicUrl;
    await sb.from('video_render_jobs').update({ status: 'done', output_url: url, updated_at: new Date().toISOString() }).eq('id', job.id);
    console.log(`[${job.id}] done → ${url}`);
    if (job.props.publishAfter) await publishVideo(job, url);
  } catch (e) {
    console.error(`[${job.id}] FAILED:`, e.message);
    await sb.from('video_render_jobs').update({ status: 'failed', error: String(e.message).slice(0, 500), updated_at: new Date().toISOString() }).eq('id', job.id);
  }
}

/** Bulk-publish flow: publish the rendered video straight to Instagram. */
async function publishVideo(job, videoUrl) {
  try {
    const { data: rows } = await sb.from('integrations')
      .select('provider, access_token, ig_account_id')
      .eq('user_id', job.user_id).in('provider', ['instagram', 'facebook']);
    const integ = rows?.find((r) => r.provider === 'instagram') ?? rows?.[0];
    if (!integ?.access_token || !integ.ig_account_id) throw new Error('no usable Instagram connection');
    const base = integ.provider === 'instagram' ? 'https://graph.instagram.com' : 'https://graph.facebook.com/v19.0';
    const mediaType = job.props.publishKind === 'story' ? 'STORIES' : 'REELS';
    const params = new URLSearchParams({ media_type: mediaType, video_url: videoUrl, access_token: integ.access_token });
    if (mediaType !== 'STORIES' && job.props.caption) params.set('caption', job.props.caption);
    const cRes = await fetch(`${base}/${integ.ig_account_id}/media`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params,
    });
    const c = await cRes.json();
    if (!cRes.ok || !c.id) throw new Error(c?.error?.message ?? 'container rejected');
    for (let i = 0; i < 60; i++) {
      const st = await (await fetch(`${base}/${c.id}?fields=status_code&access_token=${integ.access_token}`)).json();
      if (st.status_code === 'FINISHED') break;
      if (st.status_code === 'ERROR') throw new Error('Instagram could not process the video');
      await new Promise((r) => setTimeout(r, 3000));
    }
    const pRes = await fetch(`${base}/${integ.ig_account_id}/media_publish`, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ creation_id: c.id, access_token: integ.access_token }),
    });
    const p = await pRes.json();
    if (!pRes.ok || !p.id) throw new Error(p?.error?.message ?? 'publish failed');
    if (job.product_id && mediaType === 'REELS') {
      await sb.from('products').update({ instagram_post_id: p.id }).eq('id', job.product_id);
    }
    console.log(`[${job.id}] published to Instagram as ${mediaType} (${p.id})`);
  } catch (e) {
    console.error(`[${job.id}] publish-after-render failed:`, e.message);
    await sb.from('video_render_jobs').update({ error: `rendered OK; publish failed: ${String(e.message).slice(0, 300)}`, updated_at: new Date().toISOString() }).eq('id', job.id);
  }
}

async function tick() {
  const { data: jobs } = await sb.from('video_render_jobs').select('*').eq('status', 'queued').order('created_at').limit(3);
  for (const job of jobs ?? []) {
    // claim (best-effort; single worker assumed)
    const { data: claimed } = await sb.from('video_render_jobs')
      .update({ status: 'rendering', updated_at: new Date().toISOString() })
      .eq('id', job.id).eq('status', 'queued').select('id');
    if (claimed?.length) await processJob(job);
  }
  return (jobs ?? []).length;
}

if (process.argv.includes('--once')) {
  while (await tick() > 0) { /* drain */ }
  console.log('queue drained');
  process.exit(0);
} else {
  console.log('worker polling every 10s — Ctrl+C to stop');
  for (;;) {
    await tick().catch((e) => console.error('tick error:', e.message));
    await new Promise((r) => setTimeout(r, 10_000));
  }
}
