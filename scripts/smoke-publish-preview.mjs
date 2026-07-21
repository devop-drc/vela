// Smoke: (1) public shop payload embeds product_specifications,
// (2) publish-product-post preview generates a caption for a merchant.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const NL = String.fromCharCode(10);
const parse = (p) => Object.fromEntries(readFileSync(p, 'utf8').split(NL).filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const env = parse('.env');

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY);

// 1) public shop data — specs embedded?
const { data: shop, error: e1 } = await sb.functions.invoke('get-public-shop-data', { body: { shopSlug: "dyqani-yt" } });
if (e1) { console.log('shop-data ERROR:', e1.message); }
else {
  const ps = shop?.products ?? [];
  const withSpecs = ps.filter((p) => (p.product_specifications ?? []).length);
  console.log('shop-data: products=' + ps.length, 'withSpecs=' + withSpecs.length);
  if (withSpecs[0]) console.log('  e.g.', withSpecs[0].name, '->', withSpecs[0].product_specifications.slice(0, 3).map((s) => s.key + '=' + s.value + (s.unit ? ' ' + s.unit : '')).join(' | '));
}

// 2) preview caption as the demo merchant (no IG integration → expect reconnect_required;
//    that path itself proves auth + product/shop resolution works)
const demo = parse('scripts/.demo-account.local');
const { error: aerr } = await sb.auth.signInWithPassword({ email: demo.email, password: demo.password });
if (aerr) { console.log('demo login failed:', aerr.message); process.exit(1); }
const { data: prods } = await sb.from('products').select('id, name').limit(1);
const { data: prev, error: e2 } = await sb.functions.invoke('publish-product-post', { body: { productId: prods[0].id, mode: 'preview' } });
console.log('preview for', JSON.stringify(prods[0].name) + ':', e2 ? 'ERROR ' + e2.message : JSON.stringify(prev).slice(0, 400));
await sb.auth.signOut();
