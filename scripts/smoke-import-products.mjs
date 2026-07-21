// Smoke for the AI spreadsheet import: messy Albanian rows with mixed column
// names, slang prices and inline size lists — as the demo merchant, then
// cleans up the created rows.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const NL = String.fromCharCode(10);
const parse = (p) => Object.fromEntries(readFileSync(p, 'utf8').split(NL).filter((l) => l.includes('=')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const env = parse('.env');
const demo = parse('scripts/.demo-account.local');

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY);
const { error: aerr } = await sb.auth.signInWithPassword({ email: demo.email, password: demo.password });
if (aerr) { console.error('login failed:', aerr.message); process.exit(1); }

const rows = [
  { 'Emri': 'Çantë lëkure TEST-IMPORT', 'Cmimi': '4,500 L', 'Sasia': '12', 'Pershkrimi': 'Çantë dore prej lëkure natyrale', 'Kategoria': 'Çanta', 'Fotot': 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800', 'Detaje': 'Materiali: Lëkurë natyrale; Përmasat: 28x20 cm', 'Ngjyrat': 'E kuqe, E zezë' },
  { 'Emri': 'Bluzë pambuku TEST-IMPORT', 'Cmimi': '20k lek', 'Sasia': '30', 'Masat': 'S/M/L/XL', 'Kategoria': 'Veshje' },
  { 'Emri': 'SHUMA TOTALE', 'Cmimi': '24,500' },
];
const t0 = Date.now();
const { data, error } = await sb.functions.invoke('import-products', { body: { rows } });
console.log('took', Date.now() - t0, 'ms');
if (error) { console.error('ERROR', error.message); process.exit(1); }
console.log(JSON.stringify(data, null, 1));

// Inspect + clean up
const { data: made } = await sb.from('products').select('id, name, price, currency, inventory, category, media_url').like('name', '%TEST-IMPORT%');
for (const p of made ?? []) {
  const { data: specs } = await sb.from('product_specifications').select('key, value').eq('product_id', p.id);
  const { data: opts } = await sb.from('product_options').select('name, option_values(value)').eq('product_id', p.id);
  console.log('->', p.name, '|', p.price, p.currency, '| inv', p.inventory, '| cat', p.category, '| img', Boolean(p.media_url));
  console.log('   specs:', (specs ?? []).map((s) => `${s.key}=${s.value}`).join(' | ') || '—');
  console.log('   options:', (opts ?? []).map((o) => `${o.name}: ${(o.option_values ?? []).map((v) => v.value).join(',')}`).join(' | ') || '—');
  await sb.from('products').delete().eq('id', p.id);
}
console.log('cleaned up', made?.length ?? 0, 'test products');
await sb.auth.signOut();
