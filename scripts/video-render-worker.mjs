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
  } catch (e) {
    console.error(`[${job.id}] FAILED:`, e.message);
    await sb.from('video_render_jobs').update({ status: 'failed', error: String(e.message).slice(0, 500), updated_at: new Date().toISOString() }).eq('id', job.id);
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
